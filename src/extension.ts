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
  fileHandler.register();
  titleBarController.register();
  disposables.push(
    fileHandler,
    titleBarController,
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
