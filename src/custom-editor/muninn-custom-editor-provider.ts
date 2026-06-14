import path from 'node:path';
import * as vscode from 'vscode';
import MarkdownIt from 'markdown-it';
import { ConfigService } from '../services/config-service';
import { Logger } from '../services/logger';
import { isMermaidIntegrationActive } from '../integrations/mermaid-adapter';
import { t } from '../utils/l10n';
import { DEFAULT_WEBVIEW_STRINGS, type WebviewStrings } from '../shared/webview-strings';
import {
  appendDeduplicationSuffix,
  formatPasteImageFileName,
  getImageDestinationDirectory,
  getMarkdownImagePath,
  resolveMarkdownImageUri,
  sanitizeImageFileName,
  validateImageAsset,
  type ImageInsertKind,
  type ImageValidationFailure,
} from './image-assets';
import { DocumentSync } from './document-sync';
import {
  HostToViewMessage,
  ImageUriMap,
  isViewToHostMessage,
  SerializedMarkdownPayload,
  ToolbarMode,
  ViewEditorCommand,
  ViewToHostMessage,
} from './protocol';

export const MUNINN_MARKDOWN_EDITOR_VIEW_TYPE = 'muninn.markdownEditor';

let cachedLocalizedWebviewStrings: WebviewStrings | undefined;

const getLocalizedWebviewStrings = (): WebviewStrings => {
  if (!cachedLocalizedWebviewStrings) {
    cachedLocalizedWebviewStrings = Object.fromEntries(
      Object.entries(DEFAULT_WEBVIEW_STRINGS).map(([key, value]) => [key, t(value)]),
    ) as WebviewStrings;
  }
  return cachedLocalizedWebviewStrings;
};

const serializeForInlineScript = (value: unknown): string =>
  JSON.stringify(value).replaceAll('<', String.raw`\u003c`);

const markdownItParser = MarkdownIt('commonmark', {
  html: false,
  linkify: true,
});

type EditorSession = {
  document: vscode.TextDocument;
  panel: vscode.WebviewPanel;
  sync: DocumentSync;
  ready: boolean;
  disposables: vscode.Disposable[];
};

type SessionSettings = {
  mermaidEnabled: boolean;
  toolbarMode: ToolbarMode;
};

type HostMarkdownPayload = SerializedMarkdownPayload & {
  imageSources: ImageUriMap;
};

type ImageSourceInput = {
  kind: ImageInsertKind | 'command';
  name?: string;
  mime?: string;
  bytes: Uint8Array;
};

export class MuninnCustomEditorProvider
  implements vscode.CustomTextEditorProvider, vscode.Disposable
{
  private readonly sessionsByUri = new Map<string, Set<string>>();
  private readonly sessions = new Map<string, EditorSession>();
  private readonly disposables: vscode.Disposable[] = [];
  private nextSessionId = 1;

  constructor(
    private readonly extensionUri: vscode.Uri,
    private readonly configService: ConfigService,
    private readonly logger: Logger,
  ) {
    this.disposables.push(
      vscode.workspace.onDidChangeTextDocument((event) => {
        this.handleDocumentChanged(event);
      }),
    );
  }

  dispose(): void {
    for (const disposable of this.disposables) {
      disposable.dispose();
    }
    for (const session of this.sessions.values()) {
      for (const disposable of session.disposables) {
        disposable.dispose();
      }
    }
    this.sessions.clear();
    this.sessionsByUri.clear();
  }

  async resolveCustomTextEditor(
    document: vscode.TextDocument,
    webviewPanel: vscode.WebviewPanel,
  ): Promise<void> {
    webviewPanel.webview.options = {
      enableScripts: true,
      localResourceRoots: this.getLocalResourceRoots(document.uri),
    };
    webviewPanel.webview.html = this.getHtml(webviewPanel.webview);

    const sessionId = String(this.nextSessionId++);
    const uriKey = document.uri.toString();
    const sync = new DocumentSync(document);
    const session: EditorSession = {
      document,
      panel: webviewPanel,
      sync,
      ready: false,
      disposables: [],
    };
    this.sessions.set(sessionId, session);
    if (!this.sessionsByUri.has(uriKey)) {
      this.sessionsByUri.set(uriKey, new Set());
    }
    this.sessionsByUri.get(uriKey)?.add(sessionId);

    session.disposables.push(
      webviewPanel.webview.onDidReceiveMessage(async (rawMessage: unknown) => {
        if (!isViewToHostMessage(rawMessage)) {
          this.logger.warn('Ignoring invalid message payload from Muninn webview editor.');
          return;
        }
        const message: ViewToHostMessage = rawMessage;
        await this.handleViewMessage(sessionId, message);
      }),
      webviewPanel.onDidDispose(() => {
        this.disposeSession(sessionId);
      }),
    );
  }

  async openRawMarkdownForActiveEditor(): Promise<void> {
    const uri = this.getActiveCustomEditorUri();
    if (uri) {
      await this.openRawMarkdown(uri);
      return;
    }

    const activeEditor = vscode.window.activeTextEditor;
    if (activeEditor?.document.languageId === 'markdown') {
      await this.openRawMarkdown(activeEditor.document.uri);
    }
  }

  async executeCommandInActiveEditor(command: ViewEditorCommand): Promise<void> {
    const session = this.getActiveSession();
    if (!session || !session.ready) {
      return;
    }

    await this.postMessage(session.panel.webview, {
      type: 'host.executeCommand',
      payload: { command },
    });
  }

  async insertImageInActiveEditor(): Promise<void> {
    const session = this.getActiveSession();
    if (!session || !session.ready) {
      return;
    }

    const selection = await vscode.window.showOpenDialog({
      title: t('Insert Image'),
      canSelectFiles: true,
      canSelectFolders: false,
      canSelectMany: false,
      filters: {
        [t('Images')]: ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'],
      },
    });

    const sourceUri = selection?.[0];
    if (!sourceUri) {
      return;
    }

    try {
      const bytes = await vscode.workspace.fs.readFile(sourceUri);
      await this.insertImageForSession(session, {
        kind: 'command',
        name: path.basename(sourceUri.fsPath),
        bytes,
      });
    } catch (error) {
      this.logger.error(t('Image insertion failed.'), error);
      await this.rejectImageForSession(session, t('Could not add image. Please retry.'));
    }
  }

  async notifyConfigurationChanged(): Promise<void> {
    for (const session of this.sessions.values()) {
      if (!session.ready) {
        continue;
      }
      const settings = this.getSessionSettings(session.document.uri);
      await this.postMessage(session.panel.webview, {
        type: 'host.settingsChanged',
        payload: settings,
      });
    }
  }

  private async handleViewMessage(sessionId: string, message: ViewToHostMessage): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return;
    }

    switch (message.type) {
      case 'view.ready': {
        session.ready = true;
        const settings = this.getSessionSettings(session.document.uri);
        await this.postMessage(session.panel.webview, {
          type: 'host.init',
          payload: {
            ...this.getHostMarkdownPayload(session),
            ...settings,
          },
        });
        return;
      }
      case 'view.executeCommand': {
        if (message.payload.command === 'openRawMarkdown') {
          await this.openRawMarkdown(session.document.uri);
        }
        return;
      }
      case 'view.requestLinkInput': {
        await this.requestLinkInputForSession(session, message.payload.selectedText);
        return;
      }
      case 'view.requestImageInsert': {
        await this.handleRequestedImageInsert(session, message.payload);
        return;
      }
      case 'view.applyDocument': {
        const applyResult = await session.sync.applyDocument(
          message.payload.markdown,
          message.payload.revision,
        );
        if (!applyResult.ok) {
          await this.postMessage(session.panel.webview, {
            type: 'host.error',
            payload: {
              code: applyResult.code,
              message: applyResult.message,
            },
          });
          await this.postMessage(session.panel.webview, {
            type: 'host.documentChanged',
            payload: this.getHostMarkdownPayload(session),
          });
        }
        return;
      }
      default: {
        return;
      }
    }
  }

  private async requestLinkInputForSession(
    session: EditorSession,
    selectedText?: string,
  ): Promise<void> {
    const trimmedSelectedText = selectedText?.trim();
    const href = await vscode.window.showInputBox({
      title: t('Insert Link'),
      placeHolder: t('https://example.com or /relative/path'),
      prompt:
        trimmedSelectedText && trimmedSelectedText.length > 0
          ? t('Enter the link destination for "{0}".', trimmedSelectedText)
          : t('Enter the link destination.'),
      ignoreFocusOut: true,
      validateInput: (value) => {
        const trimmed = value.trim();
        if (trimmed.length === 0) {
          return t('Link URL is required.');
        }
        if (/\s/.test(trimmed)) {
          return t('Link URL cannot contain spaces.');
        }
        return;
      },
    });

    if (!href) {
      return;
    }

    await this.postMessage(session.panel.webview, {
      type: 'host.insertLink',
      payload: {
        href: href.trim(),
        text: trimmedSelectedText,
      },
    });
  }

  private getSessionSettings(resource: vscode.Uri): SessionSettings {
    return {
      mermaidEnabled: isMermaidIntegrationActive(this.configService, resource),
      toolbarMode: this.configService.getToolbarMode(resource),
    };
  }

  private handleDocumentChanged(event: vscode.TextDocumentChangeEvent): void {
    const uriKey = event.document.uri.toString();
    const sessionIds = this.sessionsByUri.get(uriKey);
    if (!sessionIds || sessionIds.size === 0) {
      return;
    }

    for (const sessionId of sessionIds) {
      const session = this.sessions.get(sessionId);
      if (!session) {
        continue;
      }
      const snapshot = session.sync.handleDocumentChanged(event);
      if (!snapshot || !session.ready) {
        continue;
      }
      void this.postMessage(session.panel.webview, {
        type: 'host.documentChanged',
        payload: this.withImageSources(snapshot, session),
      });
    }
  }

  private disposeSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return;
    }
    for (const disposable of session.disposables) {
      disposable.dispose();
    }
    this.sessions.delete(sessionId);

    const uriKey = session.document.uri.toString();
    const sessionIds = this.sessionsByUri.get(uriKey);
    if (!sessionIds) {
      return;
    }
    sessionIds.delete(sessionId);
    if (sessionIds.size === 0) {
      this.sessionsByUri.delete(uriKey);
    }
  }

  private async openRawMarkdown(uri: vscode.Uri): Promise<void> {
    try {
      await vscode.commands.executeCommand('vscode.openWith', uri, 'default', {
        preview: false,
      });
      return;
    } catch {
      const document = await vscode.workspace.openTextDocument(uri);
      await vscode.window.showTextDocument(document, {
        preview: false,
        preserveFocus: false,
      });
    }
  }

  private getActiveCustomEditorUri(): vscode.Uri | undefined {
    const activeTab = vscode.window.tabGroups.activeTabGroup?.activeTab;
    if (!activeTab) {
      return undefined;
    }
    const input = activeTab.input;
    if (!(input instanceof vscode.TabInputCustom)) {
      return undefined;
    }
    if (input.viewType !== MUNINN_MARKDOWN_EDITOR_VIEW_TYPE) {
      return undefined;
    }
    return input.uri;
  }

  private getActiveSession(): EditorSession | undefined {
    const uri = this.getActiveCustomEditorUri();
    if (!uri) {
      return undefined;
    }
    return this.getFirstSessionForUri(uri);
  }

  private getFirstSessionForUri(uri: vscode.Uri): EditorSession | undefined {
    const uriKey = uri.toString();
    const sessionIds = this.sessionsByUri.get(uriKey);
    if (!sessionIds || sessionIds.size === 0) {
      return undefined;
    }
    for (const sessionId of sessionIds) {
      const session = this.sessions.get(sessionId);
      if (session) {
        return session;
      }
    }
    return undefined;
  }

  private async postMessage(webview: vscode.Webview, message: HostToViewMessage): Promise<void> {
    const sent = await webview.postMessage(message);
    if (!sent) {
      this.logger.warn('Failed to post message to Muninn webview editor.');
    }
  }

  private async handleRequestedImageInsert(
    session: EditorSession,
    payload: Extract<ViewToHostMessage, { type: 'view.requestImageInsert' }>['payload'],
  ): Promise<void> {
    let bytes: Uint8Array;
    try {
      bytes = Buffer.from(payload.bytesBase64, 'base64');
    } catch {
      await this.rejectImageForSession(session, t('Could not read image data.'));
      return;
    }

    await this.insertImageForSession(session, {
      kind: payload.kind,
      name: payload.name,
      mime: payload.mime,
      bytes,
    });
  }

  private async insertImageForSession(
    session: EditorSession,
    input: ImageSourceInput,
  ): Promise<void> {
    const validation = validateImageAsset({
      byteLength: input.bytes.byteLength,
      name: input.name,
      mime: input.mime,
    });
    if (!validation.ok) {
      await this.rejectImageForSession(session, this.formatImageRejection(validation.reason));
      return;
    }

    const destinationDirectory = getImageDestinationDirectory(
      session.document.uri,
      this.configService.getImageDestination(session.document.uri),
    );
    const requestedFileName =
      input.kind === 'paste'
        ? formatPasteImageFileName(new Date(), validation.extension)
        : sanitizeImageFileName(input.name ?? 'image', validation.extension);

    try {
      await vscode.workspace.fs.createDirectory(destinationDirectory);
      const imageUri = await this.getAvailableImageUri(destinationDirectory, requestedFileName);
      await vscode.workspace.fs.writeFile(imageUri, input.bytes);

      const markdownPath = getMarkdownImagePath(session.document.uri, imageUri);
      await this.postMessage(session.panel.webview, {
        type: 'host.imageInserted',
        payload: {
          path: markdownPath,
          webviewUri: session.panel.webview.asWebviewUri(imageUri).toString(),
          filename: path.basename(imageUri.fsPath),
        },
      });
    } catch (error) {
      this.logger.error(t('Image insertion failed.'), error);
      await this.rejectImageForSession(session, t('Could not add image. Please retry.'));
    }
  }

  private async getAvailableImageUri(
    directory: vscode.Uri,
    requestedFileName: string,
  ): Promise<vscode.Uri> {
    let suffix = 0;
    while (true) {
      const fileName =
        suffix === 0 ? requestedFileName : appendDeduplicationSuffix(requestedFileName, suffix);
      const candidate = vscode.Uri.joinPath(directory, fileName);
      try {
        await vscode.workspace.fs.stat(candidate);
        suffix += 1;
      } catch {
        return candidate;
      }
    }
  }

  private async rejectImageForSession(session: EditorSession, reason: string): Promise<void> {
    await this.postMessage(session.panel.webview, {
      type: 'host.imageRejected',
      payload: { reason },
    });
  }

  private formatImageRejection(reason: ImageValidationFailure): string {
    if (reason === 'tooLarge') {
      return t('Images must be 10 MB or smaller.');
    }
    if (reason === 'empty') {
      return t('Image data is empty.');
    }
    return t('Unsupported image type. Use PNG, JPG, JPEG, GIF, SVG, or WEBP.');
  }

  private getLocalResourceRoots(documentUri: vscode.Uri): vscode.Uri[] {
    const workspaceRoots = vscode.workspace.workspaceFolders?.map((folder) => folder.uri) ?? [];
    return [
      vscode.Uri.joinPath(this.extensionUri, 'media'),
      vscode.Uri.file(path.dirname(documentUri.fsPath)),
      ...workspaceRoots,
    ];
  }

  private getHostMarkdownPayload(session: EditorSession): HostMarkdownPayload {
    return this.withImageSources(session.sync.getSnapshot(), session);
  }

  private withImageSources(
    payload: SerializedMarkdownPayload,
    session: EditorSession,
  ): HostMarkdownPayload {
    return {
      ...payload,
      imageSources: this.createImageUriMap(
        payload.markdown,
        session.document.uri,
        session.panel.webview,
      ),
    };
  }

  private createImageUriMap(
    markdown: string,
    documentUri: vscode.Uri,
    webview: vscode.Webview,
  ): ImageUriMap {
    const imageSources: ImageUriMap = {};
    for (const source of collectMarkdownImageSources(markdown)) {
      const imageUri = resolveMarkdownImageUri(documentUri, source);
      if (!imageUri) {
        continue;
      }
      imageSources[source] = webview.asWebviewUri(imageUri).toString();
    }
    return imageSources;
  }

  private getHtml(webview: vscode.Webview): string {
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, 'media', 'editor-webview.js'),
    );
    const styleUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, 'media', 'editor-webview.css'),
    );
    const nonce = createNonce();
    const localizedWebviewStrings = serializeForInlineScript(getLocalizedWebviewStrings());

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta
    http-equiv="Content-Security-Policy"
    content="default-src 'none'; img-src ${webview.cspSource} data: https:; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';"
  />
  <link rel="stylesheet" href="${styleUri}" />
  <title>Muninn</title>
</head>
<body>
  <div id="app"></div>
  <script nonce="${nonce}">
    window.__MUNINN_WEBVIEW_STRINGS__ = ${localizedWebviewStrings};
  </script>
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
  }
}

const createNonce = (): string =>
  Array.from({ length: 16 }, () => Math.floor(Math.random() * 16).toString(16)).join('');

const collectMarkdownImageSources = (markdown: string): string[] => {
  const sources = new Set<string>();
  for (const token of markdownItParser.parse(markdown, {})) {
    const children = token.children ?? [];
    for (const child of children) {
      if (child.type !== 'image') {
        continue;
      }
      const source = child.attrGet('src');
      if (source) {
        sources.add(source);
      }
    }
  }
  return [...sources];
};
