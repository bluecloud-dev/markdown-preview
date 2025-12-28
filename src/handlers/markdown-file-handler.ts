/**
 * @fileoverview File open event handler for markdown documents.
 *
 * This handler intercepts VS Code's file open events to implement the
 * "preview by default" behavior. It coordinates with other services to:
 * - Validate files before processing
 * - Decide between preview mode and edit mode
 * - Handle special cases (untitled, diff, conflicts, large files)
 * - Show one-time welcome message for new users
 * - Clean up state when files are closed or deleted
 *
 * The handler uses debouncing to prevent duplicate processing when VS Code
 * fires multiple open events in quick succession (e.g., during session restore).
 *
 * @module handlers/markdown-file-handler
 */

import * as vscode from 'vscode';
import { ConfigService } from '../services/config-service';
import { Logger } from '../services/logger';
import { PreviewService } from '../services/preview-service';
import { StateService } from '../services/state-service';
import { ValidationService } from '../services/validation-service';
import { ViewMode } from '../types/state';
import { t } from '../utils/l10n';

/**
 * Storage key for tracking whether the welcome message has been shown.
 * Stored in globalState to persist across workspaces.
 */
const WELCOME_KEY = 'markdownReader.welcomeShown';

/**
 * Handler for intercepting markdown file open events.
 *
 * Implements the core "reading-first" experience by redirecting markdown
 * file opens to VS Code's native preview. Also manages state cleanup
 * when files are closed or deleted.
 *
 * @example
 * ```typescript
 * const fileHandler = new MarkdownFileHandler(
 *   previewService,
 *   stateService,
 *   configService,
 *   validationService,
 *   context.globalState,
 *   logger
 * );
 *
 * // Register event listeners
 * fileHandler.register();
 *
 * // Don't forget to dispose when extension deactivates
 * context.subscriptions.push(fileHandler);
 * ```
 */
export class MarkdownFileHandler implements vscode.Disposable {
  private readonly disposables: vscode.Disposable[] = [];
  private readonly pendingOpens = new Map<string, ReturnType<typeof setTimeout>>();
  private readonly openDebounceMs = 75;

  constructor(
    private readonly previewService: PreviewService,
    private readonly stateService: StateService,
    private readonly configService: ConfigService,
    private readonly validationService: ValidationService,
    private readonly globalState: vscode.Memento,
    private readonly logger: Logger
  ) {}

  /**
   * Register file and tab event listeners.
   * @returns void
   * @throws No errors expected.
   */
  register(): void {
    this.disposables.push(
      vscode.workspace.onDidOpenTextDocument(this.handleDocumentOpen.bind(this)),
      vscode.workspace.onDidCloseTextDocument(this.handleDocumentClose.bind(this)),
      vscode.workspace.onDidDeleteFiles(this.handleFilesDeleted.bind(this)),
      vscode.window.tabGroups.onDidChangeTabs(this.handleTabsChanged.bind(this))
    );
  }

  /**
   * Dispose all registered listeners.
   * @returns void
   * @throws No errors expected.
   */
  dispose(): void {
    for (const disposable of this.disposables) {
      disposable.dispose();
    }
  }

  private handleDocumentOpen(document: vscode.TextDocument): void {
    const key = document.uri.toString();
    const existing = this.pendingOpens.get(key);
    if (existing) {
      clearTimeout(existing);
    }

    // Debounce rapid open events (quick open, restore, etc.) to avoid duplicate work.
    const timeout = setTimeout(() => {
      this.pendingOpens.delete(key);
      void this.processDocumentOpen(document);
    }, this.openDebounceMs);
    this.pendingOpens.set(key, timeout);
  }

  private async processDocumentOpen(document: vscode.TextDocument): Promise<void> {
    const isMarkdown = this.validationService.isMarkdownFile(document);
    const isEnabled = this.configService.getEnabled(document.uri);

    if (!isMarkdown) {
      return;
    }

    if (!isEnabled) {
      this.logger.info(
        t('Preview disabled via settings for {0}', document.uri.toString())
      );
      return;
    }

    const existingState = this.stateService.getExistingState(document.uri);

    if (existingState?.mode === ViewMode.Edit) {
      this.logger.info(
        t('Already in edit mode; skipping auto-preview for {0}', document.uri.toString())
      );
      return;
    }

    if (existingState?.mode === ViewMode.Preview) {
      const activeEditor = vscode.window.activeTextEditor;
      if (activeEditor && activeEditor.document.uri.toString() === document.uri.toString()) {
        this.stateService.setMode(document.uri, ViewMode.Edit);
        this.stateService.setEditorVisible(document.uri, true);
        return;
      }
    }

    if (document.isUntitled) {
      this.logger.info(t('Untitled markdown opened; entering edit mode.'));
      await this.previewService.enterEditMode(document.uri);
      await this.maybeShowWelcome();
      return;
    }

    if (this.validationService.isDiffView(document)) {
      this.logger.info(t('Diff view detected; skipping auto-preview.'));
      return;
    }

    if (this.validationService.hasConflictMarkers(document)) {
      this.logger.warn(
        t('Conflict markers detected. Opening in edit mode for resolution.')
      );
      this.logger.show(true);
      await this.previewService.enterEditMode(document.uri);
      await this.maybeShowWelcome();
      return;
    }

    const shouldPreview = await this.previewService.shouldShowPreview(document);
    if (!shouldPreview) {
      return;
    }

    this.logger.info(t('Opening preview for {0}', document.uri.toString()));
    await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
    await this.previewService.showPreview(document.uri);
    await this.maybeShowWelcome();
  }

  private handleTabsChanged(event: vscode.TabChangeEvent): void {
    void this.handleClosedTabs(event.closed);
  }

  private async handleClosedTabs(tabs: readonly vscode.Tab[]): Promise<void> {
    for (const tab of tabs) {
      const input = tab.input;
      if (input instanceof vscode.TabInputText) {
        if (!this.hasOpenTab(input.uri)) {
          this.stateService.clear(input.uri);
          continue;
        }

        const state = this.stateService.getExistingState(input.uri);
        if (state?.mode === ViewMode.Edit) {
          // If the edit tab closes but the file is still open elsewhere, restore preview.
          this.stateService.setEditorVisible(input.uri, false);
          await this.previewService.showPreview(input.uri);
        }
      }
    }
  }

  private handleDocumentClose(document: vscode.TextDocument): void {
    const key = document.uri.toString();
    const pending = this.pendingOpens.get(key);
    if (pending) {
      clearTimeout(pending);
      this.pendingOpens.delete(key);
    }
    this.stateService.clear(document.uri);
  }

  private handleFilesDeleted(event: vscode.FileDeleteEvent): void {
    for (const uri of event.files) {
      this.stateService.clear(uri);
    }
  }

  private hasOpenTab(uri: vscode.Uri): boolean {
    return vscode.window.tabGroups.all.some((group) =>
      group.tabs.some((tab) => {
        const input = tab.input;
        if (input instanceof vscode.TabInputText) {
          return input.uri.toString() === uri.toString();
        }
        if (input instanceof vscode.TabInputCustom) {
          return input.uri.toString() === uri.toString();
        }
        if (input instanceof vscode.TabInputTextDiff) {
          return (
            input.original.toString() === uri.toString() ||
            input.modified.toString() === uri.toString()
          );
        }
        return false;
      })
    );
  }

  private async maybeShowWelcome(): Promise<void> {
    const alreadyShown = this.globalState.get<boolean>(WELCOME_KEY, false);
    if (alreadyShown) {
      return;
    }

    // Store a one-time welcome prompt in global state to avoid repeating it.
    const tutorialAction = t('View Tutorial');
    this.logger.info(t('Showing welcome message.'));
    const selection = await vscode.window.showInformationMessage(
      t('Welcome to Markdown Preview! Open any markdown file to preview by default.'),
      tutorialAction
    );

    if (selection === tutorialAction) {
      this.logger.info(t('Opening tutorial link.'));
      await vscode.env.openExternal(
        vscode.Uri.parse('https://github.com/ayhammouda/markdown-preview#quick-start')
      );
    }

    await this.globalState.update(WELCOME_KEY, true);
  }
}
