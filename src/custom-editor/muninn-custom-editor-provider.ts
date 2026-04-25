import * as vscode from 'vscode';
import { ConfigService } from '../services/config-service';
import { Logger } from '../services/logger';
import { isMermaidIntegrationActive } from '../integrations/mermaid-adapter';
import { t } from '../utils/l10n';
import { DocumentSync } from './document-sync';
import { FocusModeState } from './focus-mode-state';
import {
  HostToViewMessage,
  isViewToHostMessage,
  SectionRevealTarget,
  ToolbarMode,
  ViewEditorCommand,
  ViewToHostMessage,
} from './protocol';

export const MUNINN_MARKDOWN_EDITOR_VIEW_TYPE = 'muninn.markdownEditor';

type EditorSession = {
  document: vscode.TextDocument;
  panel: vscode.WebviewPanel;
  sync: DocumentSync;
  ready: boolean;
  pendingMessages: HostToViewMessage[];
  disposables: vscode.Disposable[];
};

type SessionSettings = {
  mermaidEnabled: boolean;
  toolbarMode: ToolbarMode;
  focusModeEnabled: boolean;
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
    private readonly focusModeState: FocusModeState,
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
      localResourceRoots: [vscode.Uri.joinPath(this.extensionUri, 'media')],
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
      pendingMessages: [],
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
    if (!session) {
      return;
    }

    await this.postSessionMessage(session, {
      type: 'host.executeCommand',
      payload: { command },
    });
  }

  async revealSectionInActiveEditor(section: SectionRevealTarget): Promise<boolean> {
    const session = this.getActiveSession();
    if (!session) {
      return false;
    }

    await this.postSessionMessage(session, {
      type: 'host.revealSection',
      payload: section,
    });
    return true;
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

  async notifyFocusModeChanged(): Promise<void> {
    const focusModeEnabled = this.focusModeState.isEnabled();
    for (const session of this.sessions.values()) {
      if (!session.ready) {
        continue;
      }
      await this.postMessage(session.panel.webview, {
        type: 'host.focusModeChanged',
        payload: { focusModeEnabled },
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
            ...session.sync.getSnapshot(),
            ...settings,
          },
        });
        await this.flushPendingMessages(session);
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
            payload: session.sync.getSnapshot(),
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
      focusModeEnabled: this.focusModeState.isEnabled(),
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
        payload: snapshot,
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
    let latestSession: EditorSession | undefined;
    for (const sessionId of sessionIds) {
      const session = this.sessions.get(sessionId);
      if (session) {
        latestSession = session;
      }
    }
    return latestSession;
  }

  private async postMessage(webview: vscode.Webview, message: HostToViewMessage): Promise<void> {
    const sent = await webview.postMessage(message);
    if (!sent) {
      this.logger.warn('Failed to post message to Muninn webview editor.');
    }
  }

  private async postSessionMessage(
    session: EditorSession,
    message: HostToViewMessage,
  ): Promise<void> {
    if (!session.ready) {
      session.pendingMessages.push(message);
      return;
    }

    await this.postMessage(session.panel.webview, message);
  }

  private async flushPendingMessages(session: EditorSession): Promise<void> {
    const pendingMessages = session.pendingMessages.splice(0);
    for (const message of pendingMessages) {
      await this.postMessage(session.panel.webview, message);
    }
  }

  private getHtml(webview: vscode.Webview): string {
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, 'media', 'editor-webview.js'),
    );
    const styleUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, 'media', 'editor-webview.css'),
    );
    const nonce = createNonce();

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta
    http-equiv="Content-Security-Policy"
    content="default-src 'none'; img-src ${webview.cspSource} data: https:; style-src ${webview.cspSource} 'unsafe-inline'; script-src ${webview.cspSource} 'nonce-${nonce}';"
  />
  <link rel="stylesheet" href="${styleUri}" />
  <title>Muninn</title>
</head>
<body>
  <div id="app"></div>
  <script type="module" nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
  }
}

const createNonce = (): string =>
  Array.from({ length: 16 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
