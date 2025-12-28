/**
 * @fileoverview Controller for managing editor title bar context keys.
 *
 * This controller synchronizes VS Code context keys with the extension's state,
 * enabling conditional visibility for toolbar buttons and menu items. The context
 * keys are used in package.json `when` clauses to show/hide UI elements:
 *
 * - `markdownReader.editMode`: true when the current file is in edit mode
 * - `markdownReader.isMarkdown`: true when the current file is a markdown file
 *
 * The controller listens for active editor changes and updates context keys
 * accordingly, ensuring the UI always reflects the current state.
 *
 * @module ui/title-bar-controller
 */

import * as vscode from 'vscode';
import { StateService } from '../services/state-service';
import { ViewMode } from '../types/state';

/**
 * Controller for keeping VS Code context keys synchronized with extension state.
 *
 * Context keys control the visibility of toolbar buttons, menu items, and
 * other contributed UI elements via `when` clause expressions in package.json.
 *
 * @example
 * ```typescript
 * const controller = new TitleBarController(stateService);
 * controller.register();
 *
 * // Don't forget to dispose
 * context.subscriptions.push(controller);
 * ```
 *
 * @example package.json when clause usage
 * ```json
 * {
 *   "command": "markdownReader.formatBold",
 *   "when": "markdownReader.editMode && markdownReader.isMarkdown"
 * }
 * ```
 */
export class TitleBarController implements vscode.Disposable {
  private readonly disposables: vscode.Disposable[] = [];

  constructor(private readonly stateService: StateService) {}

  /**
   * Register editor change listeners to keep context keys in sync.
   * @returns void
   * @throws No errors expected.
   */
  register(): void {
    this.disposables.push(
      vscode.window.onDidChangeActiveTextEditor(this.handleEditorChange.bind(this))
    );
    void this.updateContext(vscode.window.activeTextEditor);
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

  private handleEditorChange(editor: vscode.TextEditor | undefined): void {
    void this.updateContext(editor);
  }

  private async updateContext(editor: vscode.TextEditor | undefined): Promise<void> {
    const isMarkdown = editor?.document.languageId === 'markdown';
    await vscode.commands.executeCommand('setContext', 'markdownReader.isMarkdown', isMarkdown);

    if (!editor || !isMarkdown) {
      await vscode.commands.executeCommand('setContext', 'markdownReader.editMode', false);
      return;
    }

    const state = this.stateService.getExistingState(editor.document.uri);
    await vscode.commands.executeCommand(
      'setContext',
      'markdownReader.editMode',
      state?.mode === ViewMode.Edit
    );
  }
}
