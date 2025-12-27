import * as vscode from 'vscode';
import {
  formatBold,
  formatBulletList,
  formatCodeBlock,
  formatHeading1,
  formatHeading2,
  formatHeading3,
  formatInlineCode,
  formatItalic,
  formatLink,
  formatNumberedList,
  formatStrikethrough,
} from './commands/format-commands';
import { MarkdownFileHandler } from './handlers/markdown-file-handler';
import { enterEditMode, exitEditMode, toggleEditMode } from './commands/mode-commands';
import { ConfigService } from './services/config-service';
import { FormattingService } from './services/formatting-service';
import { PreviewService } from './services/preview-service';
import { StateService } from './services/state-service';
import { ValidationService } from './services/validation-service';
import { TitleBarController } from './ui/title-bar-controller';

export function activate(context: vscode.ExtensionContext): void {
  const disposables: vscode.Disposable[] = [];
  const stateService = new StateService();
  const configService = new ConfigService();
  const outputChannel = vscode.window.createOutputChannel('Markdown Preview');
  const validationService = new ValidationService();
  const formattingService = new FormattingService();
  const previewService = new PreviewService(
    stateService,
    configService,
    validationService,
    context.workspaceState
  );

  const fileHandler = new MarkdownFileHandler(
    previewService,
    stateService,
    configService,
    validationService,
    context.globalState
  );
  const titleBarController = new TitleBarController(stateService);

  const updateEnabledContext = (resource?: vscode.Uri): Thenable<unknown> =>
    vscode.commands.executeCommand(
      'setContext',
      'markdownReader.enabled',
      configService.getEnabled(resource)
    );

  const formatInspectValue = <T>(
    inspect?: vscode.ConfigurationInspect<T>
  ): string => {
    if (!inspect) {
      return 'unavailable';
    }

    const parts = [
      ['default', inspect.defaultValue],
      ['user', inspect.globalValue],
      ['workspace', inspect.workspaceValue],
      ['folder', inspect.workspaceFolderValue],
    ].filter(([, value]) => value !== undefined);

    if (parts.length === 0) {
      return 'unset';
    }

    return parts
      .map(([label, value]) => `${label}=${JSON.stringify(value)}`)
      .join(' | ');
  };

  const logConfigInspection = (resource?: vscode.Uri): void => {
    const inspection = configService.inspect(resource);
    outputChannel.clear();
    outputChannel.appendLine('Markdown Preview configuration');
    outputChannel.appendLine(`Resource: ${resource?.toString() ?? 'global'}`);
    outputChannel.appendLine(
      `enabled: ${formatInspectValue(inspection.enabled)}`
    );
    outputChannel.appendLine(
      `excludePatterns: ${formatInspectValue(inspection.excludePatterns)}`
    );
    outputChannel.appendLine(
      `maxFileSize: ${formatInspectValue(inspection.maxFileSize)}`
    );
    outputChannel.show(true);
  };

  void updateEnabledContext(vscode.window.activeTextEditor?.document.uri);

  fileHandler.register();
  titleBarController.register();
  disposables.push(
    fileHandler,
    titleBarController,
    outputChannel,
    vscode.workspace.onDidChangeConfiguration((event) => {
      const resource = vscode.window.activeTextEditor?.document.uri;
      const workspaceFolders = vscode.workspace.workspaceFolders ?? [];
      const affectedFolders = workspaceFolders.filter((folder) =>
        event.affectsConfiguration('markdownReader', folder.uri)
      );
      const affectsResource =
        resource !== undefined &&
        event.affectsConfiguration('markdownReader', resource);
      const affectsGlobal = event.affectsConfiguration('markdownReader');

      if (!affectsGlobal && !affectsResource && affectedFolders.length === 0) {
        return;
      }

      configService.clearCache();

      if (affectsGlobal) {
        configService.reload();
      }

      for (const folder of affectedFolders) {
        configService.reload(folder.uri);
      }

      if (affectsResource) {
        configService.reload(resource);
      }

      void updateEnabledContext(resource);
    }),
    vscode.commands.registerCommand('markdownReader.inspectConfiguration', () =>
      logConfigInspection(vscode.window.activeTextEditor?.document.uri)
    ),
    vscode.commands.registerCommand('markdownReader.enterEditMode', () =>
      enterEditMode(previewService)
    ),
    vscode.commands.registerCommand('markdownReader.exitEditMode', () =>
      exitEditMode(previewService)
    ),
    vscode.commands.registerCommand('markdownReader.toggleEditMode', () =>
      toggleEditMode(previewService, stateService)
    ),
    vscode.commands.registerTextEditorCommand('markdownReader.formatBold', (editor) =>
      formatBold(editor, formattingService)
    ),
    vscode.commands.registerTextEditorCommand('markdownReader.formatItalic', (editor) =>
      formatItalic(editor, formattingService)
    ),
    vscode.commands.registerTextEditorCommand(
      'markdownReader.formatStrikethrough',
      (editor) => formatStrikethrough(editor, formattingService)
    ),
    vscode.commands.registerTextEditorCommand('markdownReader.formatBulletList', (editor) =>
      formatBulletList(editor, formattingService)
    ),
    vscode.commands.registerTextEditorCommand(
      'markdownReader.formatNumberedList',
      (editor) => formatNumberedList(editor, formattingService)
    ),
    vscode.commands.registerTextEditorCommand('markdownReader.formatInlineCode', (editor) =>
      formatInlineCode(editor, formattingService)
    ),
    vscode.commands.registerTextEditorCommand('markdownReader.formatCodeBlock', (editor) =>
      formatCodeBlock(editor, formattingService)
    ),
    vscode.commands.registerTextEditorCommand('markdownReader.formatLink', (editor) =>
      formatLink(editor, formattingService)
    ),
    vscode.commands.registerTextEditorCommand('markdownReader.formatHeading1', (editor) =>
      formatHeading1(editor, formattingService)
    ),
    vscode.commands.registerTextEditorCommand('markdownReader.formatHeading2', (editor) =>
      formatHeading2(editor, formattingService)
    ),
    vscode.commands.registerTextEditorCommand('markdownReader.formatHeading3', (editor) =>
      formatHeading3(editor, formattingService)
    )
  );

  context.subscriptions.push(...disposables);
}

export function deactivate(): void {
  // No-op.
}
