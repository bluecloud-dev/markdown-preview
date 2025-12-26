import * as vscode from 'vscode';
import { MarkdownFileHandler } from './handlers/markdown-file-handler';
import { enterEditMode, exitEditMode, toggleEditMode } from './commands/mode-commands';
import { ConfigService } from './services/config-service';
import { PreviewService } from './services/preview-service';
import { StateService } from './services/state-service';
import { ValidationService } from './services/validation-service';

export function activate(context: vscode.ExtensionContext): void {
  const disposables: vscode.Disposable[] = [];
  const stateService = new StateService();
  const configService = new ConfigService();
  const validationService = new ValidationService();
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
  fileHandler.register();
  disposables.push(
    fileHandler,
    vscode.commands.registerCommand('markdownReader.enterEditMode', () =>
      enterEditMode(previewService)
    ),
    vscode.commands.registerCommand('markdownReader.exitEditMode', () =>
      exitEditMode(previewService)
    ),
    vscode.commands.registerCommand('markdownReader.toggleEditMode', () =>
      toggleEditMode(previewService, stateService)
    )
  );

  context.subscriptions.push(...disposables);
}

export function deactivate(): void {
  // No-op.
}
