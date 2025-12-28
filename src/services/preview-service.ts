/**
 * @fileoverview Preview service for managing markdown preview/edit modes.
 *
 * This service is the core business logic layer for the extension, responsible for:
 * - Deciding whether to show preview or edit mode for a document
 * - Managing transitions between preview and edit modes
 * - Handling large file opt-in/opt-out behavior
 * - Coordinating with VS Code's native markdown preview commands
 *
 * The service uses VS Code's built-in `markdown.showPreview` and
 * `markdown.showPreviewToSide` commands rather than custom webviews,
 * following the extension's "native integration" design principle.
 *
 * @module services/preview-service
 */

import * as vscode from 'vscode';
import { ConfigService } from './config-service';
import { Logger } from './logger';
import { StateService } from './state-service';
import { ValidationService } from './validation-service';
import { ViewMode } from '../types/state';
import { t } from '../utils/l10n';

/**
 * Storage key for tracking which large files the user has opted out of previewing.
 * The value is a Record<string, boolean> where keys are file URI strings.
 */
const LARGE_FILE_OPT_OUT_KEY = 'markdownReader.largeFileOptOut';

/**
 * Service for managing markdown preview and edit mode transitions.
 *
 * This service coordinates between VS Code's native markdown preview commands
 * and the extension's state management. It implements the "reading-first"
 * experience by defaulting to preview mode while providing smooth transitions
 * to edit mode when needed.
 *
 * @example
 * ```typescript
 * const previewService = new PreviewService(
 *   stateService,
 *   configService,
 *   validationService,
 *   context.workspaceState,
 *   logger
 * );
 *
 * // Check if a document should be previewed
 * if (await previewService.shouldShowPreview(document)) {
 *   await previewService.showPreview(document.uri);
 * }
 *
 * // Enter split-view edit mode
 * await previewService.enterEditMode(document.uri);
 * ```
 */
export class PreviewService {
  constructor(
    private readonly stateService: StateService,
    private readonly configService: ConfigService,
    private readonly validationService: ValidationService,
    private readonly workspaceState: vscode.Memento,
    private readonly logger: Logger
  ) {}

  /**
   * Decide whether the document should open in preview mode.
   * @param document The document to evaluate.
   * @returns True if preview should be shown.
   * @throws Propagates VS Code UI errors.
   */
  async shouldShowPreview(document: vscode.TextDocument): Promise<boolean> {
    const config = this.configService.getConfig(document.uri);

    if (!config.enabled) {
      this.logger.info(
        t('Preview disabled in settings for {0}', document.uri.toString())
      );
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
      this.logger.info(
        t('File matches exclude patterns; skipping preview for {0}', document.uri.toString())
      );
      return false;
    }

    if (await this.validationService.isLargeFile(document.uri, config.maxFileSize)) {
      // Large files are opt-in for preview to avoid UI slowdowns.
      this.logger.warn(
        t('Large file detected; prompting for preview decision.')
      );
      const actionPreview = t('Open Preview Anyway');
      const actionDontShow = t("Don't Show Again for This File");
      const optOut = this.workspaceState.get<Record<string, boolean>>(
        LARGE_FILE_OPT_OUT_KEY,
        {}
      );
      const uriKey = document.uri.toString();
      if (optOut[uriKey]) {
        this.logger.info(
          t('Large file opt-out enabled; skipping preview for {0}', uriKey)
        );
        return false;
      }

      const selection = await vscode.window.showInformationMessage(
        t('Large file detected. Open preview?'),
        actionPreview,
        actionDontShow
      );

      if (selection === actionPreview) {
        this.logger.info(
          t('User opted to preview large file: {0}', uriKey)
        );
        await this.showPreview(document.uri);
      }

      if (selection === actionDontShow) {
        optOut[uriKey] = true;
        await this.workspaceState.update(LARGE_FILE_OPT_OUT_KEY, optOut);
        this.logger.info(
          t('Large file opt-out stored for {0}', uriKey)
        );
      }

      return false;
    }

    if (await this.validationService.isBinaryFile(document.uri)) {
      this.logger.warn(
        t('Binary file detected; opening in editor instead of preview.')
      );
      void vscode.window.showErrorMessage(
        t('Cannot preview binary file')
      );
      return false;
    }

    return true;
  }

  /**
   * Open markdown preview for a given URI.
   * @param uri The URI to preview.
   * @returns Promise resolved when the preview opens.
   * @throws Propagates VS Code command errors.
   */
  async showPreview(uri: vscode.Uri): Promise<void> {
    const success = await this.executePreviewCommand('markdown.showPreview', uri);
    if (!success) {
      return;
    }
    this.stateService.setMode(uri, ViewMode.Preview);
    this.stateService.setEditorVisible(uri, false);
  }

  /**
   * Enter edit mode with a split editor + preview.
   * @param uri The URI to edit.
   * @returns Promise resolved when edit mode opens.
   * @throws Propagates VS Code command errors.
   */
  async enterEditMode(uri: vscode.Uri): Promise<void> {
    const editor = await vscode.window.showTextDocument(uri, {
      viewColumn: vscode.ViewColumn.One,
      preview: false,
    });

    // Mirror the preview to the side while keeping the cursor in the editor.
    await this.executePreviewCommand('markdown.showPreviewToSide', uri);
    this.stateService.setMode(uri, ViewMode.Edit);
    this.stateService.setEditorVisible(uri, true);

    const lastSelection = this.stateService.getLastSelection(uri);
    const position = lastSelection ?? new vscode.Position(0, 0);
    editor.selection = new vscode.Selection(position, position);
    editor.revealRange(new vscode.Range(position, position));
  }

  /**
   * Exit edit mode and return to preview-only.
   * @param uri The URI to return to preview mode.
   * @returns Promise resolved when preview-only mode is restored.
   * @throws Propagates VS Code command errors.
   */
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

  private async executePreviewCommand(
    command: string,
    uri: vscode.Uri
  ): Promise<boolean> {
    try {
      await vscode.commands.executeCommand(command, uri);
      return true;
    } catch (error) {
      const actionOpen = t('Open in Editor');
      const message = t('Unable to open markdown preview.');
      this.logger.error(
        t('Preview command failed: {0}', command),
        error
      );
      this.logger.show(true);
      const selection = await vscode.window.showErrorMessage(
        message,
        actionOpen
      );
      if (selection === actionOpen) {
        await vscode.window.showTextDocument(uri, { preview: false });
      }
      return false;
    }
  }
}
