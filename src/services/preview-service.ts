import * as vscode from 'vscode';
import { ConfigService } from './config-service';
import { StateService } from './state-service';
import { ValidationService } from './validation-service';
import { ViewMode } from '../types/state';
import { t } from '../utils/l10n';

const LARGE_FILE_OPT_OUT_KEY = 'markdownReader.largeFileOptOut';

export class PreviewService {
  constructor(
    private readonly stateService: StateService,
    private readonly configService: ConfigService,
    private readonly validationService: ValidationService,
    private readonly workspaceState: vscode.Memento
  ) {}

  async shouldShowPreview(document: vscode.TextDocument): Promise<boolean> {
    const config = this.configService.getConfig();

    if (!config.enabled) {
      return false;
    }

    if (!this.validationService.isMarkdownFile(document)) {
      return false;
    }

    if (document.isUntitled) {
      return false;
    }

    if (this.validationService.isDiffView(document)) {
      return false;
    }

    if (this.configService.isExcluded(document.uri)) {
      return false;
    }

    if (await this.validationService.isLargeFile(document.uri, config.maxFileSize)) {
      const actionPreview = t('Open Preview Anyway');
      const actionDontShow = t("Don't Show Again for This File");
      const optOut = this.workspaceState.get<Record<string, boolean>>(
        LARGE_FILE_OPT_OUT_KEY,
        {}
      );
      const uriKey = document.uri.toString();
      if (optOut[uriKey]) {
        return false;
      }

      const selection = await vscode.window.showInformationMessage(
        t('Large file detected. Open preview?'),
        actionPreview,
        actionDontShow
      );

      if (selection === actionPreview) {
        await this.showPreview(document.uri);
      }

      if (selection === actionDontShow) {
        optOut[uriKey] = true;
        await this.workspaceState.update(LARGE_FILE_OPT_OUT_KEY, optOut);
      }

      return false;
    }

    if (await this.validationService.isBinaryFile(document.uri)) {
      void vscode.window.showErrorMessage(
        t('This file appears to be binary and cannot be previewed')
      );
      return false;
    }

    return true;
  }

  async showPreview(uri: vscode.Uri): Promise<void> {
    await vscode.commands.executeCommand('markdown.showPreview', uri);
    this.stateService.setMode(uri, ViewMode.Preview);
    this.stateService.setEditorVisible(uri, false);
  }

  async enterEditMode(uri: vscode.Uri): Promise<void> {
    const editor = await vscode.window.showTextDocument(uri, {
      viewColumn: vscode.ViewColumn.One,
      preview: false,
    });

    await vscode.commands.executeCommand('markdown.showPreviewToSide', uri);
    this.stateService.setMode(uri, ViewMode.Edit);
    this.stateService.setEditorVisible(uri, true);

    const lastSelection = this.stateService.getLastSelection(uri);
    const position = lastSelection ?? new vscode.Position(0, 0);
    editor.selection = new vscode.Selection(position, position);
    editor.revealRange(new vscode.Range(position, position));
  }

  async exitEditMode(uri: vscode.Uri): Promise<void> {
    const activeEditor = vscode.window.activeTextEditor;
    if (activeEditor && activeEditor.document.uri.toString() === uri.toString()) {
      const document = activeEditor.document;
      const autoSave = vscode.workspace.getConfiguration('files').get<string>('autoSave', 'off');
      if (document.isDirty && autoSave === 'off') {
        const actionSave = t('Save & Exit');
        const actionDiscard = t('Exit Without Saving');
        const actionCancel = t('Cancel');
        const selection = await vscode.window.showWarningMessage(
          t('You have unsaved changes. Save before exiting edit mode?'),
          actionSave,
          actionDiscard,
          actionCancel
        );

        if (selection === actionCancel || selection === undefined) {
          return;
        }

        if (selection === actionSave) {
          await document.save();
        }

        if (selection === actionDiscard) {
          await vscode.commands.executeCommand('workbench.action.revertAndCloseActiveEditor');
          await this.showPreview(uri);
          return;
        }
      }

      this.stateService.setLastSelection(uri, activeEditor.selection.active);
    }

    this.stateService.setMode(uri, ViewMode.Preview);
    this.stateService.setEditorVisible(uri, false);
    await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
    await this.showPreview(uri);
  }
}
