/**
 * @fileoverview State management service for per-file view mode tracking.
 *
 * This service maintains an in-memory map of file states, tracking whether each
 * markdown file is in preview or edit mode. It also handles:
 * - Cursor position persistence for edit mode restoration
 * - Context key updates for UI visibility control
 * - Accessibility announcements for mode changes
 *
 * State is intentionally kept in-memory (not persisted to disk) since preview/edit
 * mode is considered a transient UI state. Cursor positions are stored per-session
 * to improve the editing experience when toggling modes.
 *
 * @module services/state-service
 */

import * as vscode from 'vscode';
import { FileState, ViewMode } from '../types/state';
import { t } from '../utils/l10n';

/**
 * Service for managing per-file state including view mode and cursor position.
 *
 * Each markdown file maintains independent state, allowing users to have
 * different files in different modes simultaneously. The service also handles
 * VS Code context key updates to control toolbar visibility.
 *
 * @example
 * ```typescript
 * const stateService = new StateService();
 *
 * // Get or create state for a file
 * const state = stateService.getState(uri);
 * console.log(state.mode); // ViewMode.Preview
 *
 * // Update mode (also updates context key and announces change)
 * stateService.setMode(uri, ViewMode.Edit);
 *
 * // Store cursor position for later restoration
 * stateService.setLastSelection(uri, editor.selection.active);
 * ```
 */
export class StateService {
  private readonly states = new Map<string, FileState>();

  /**
   * Get the cached state for a URI, if it exists.
   * @param uri The file URI.
   * @returns The cached state or undefined.
   * @throws No errors expected.
   */
  getExistingState(uri: vscode.Uri): FileState | undefined {
    return this.states.get(uri.toString());
  }

  /**
   * Get or create state for a URI.
   * @param uri The file URI.
   * @returns The current state for the URI.
   * @throws No errors expected.
   */
  getState(uri: vscode.Uri): FileState {
    const key = uri.toString();
    const existing = this.states.get(key);
    if (existing) {
      return existing;
    }

    const state: FileState = {
      uri: key,
      mode: ViewMode.Preview,
      lastModeChange: Date.now(),
      editorVisible: false,
    };
    this.states.set(key, state);
    return state;
  }

  /**
   * Update the view mode for a URI and announce the change.
   * @param uri The file URI.
   * @param mode The target view mode.
   * @returns void
   * @throws No errors expected.
   */
  setMode(uri: vscode.Uri, mode: ViewMode): void {
    const state = this.getState(uri);
    const previousMode = state.mode;
    state.mode = mode;
    state.lastModeChange = Date.now();
    void vscode.commands.executeCommand(
      'setContext',
      'markdownReader.editMode',
      mode === ViewMode.Edit
    );
    if (previousMode !== mode) {
      const message =
        mode === ViewMode.Edit ? t('Edit mode enabled') : t('Preview mode enabled');
      vscode.window.setStatusBarMessage(message, 2000);
    }
  }

  /**
   * Update editor visibility for a URI.
   * @param uri The file URI.
   * @param visible Whether the editor is visible.
   * @returns void
   * @throws No errors expected.
   */
  setEditorVisible(uri: vscode.Uri, visible: boolean): void {
    const state = this.getState(uri);
    state.editorVisible = visible;
  }

  /**
   * Store the last cursor position for a URI.
   * @param uri The file URI.
   * @param position The cursor position.
   * @returns void
   * @throws No errors expected.
   */
  setLastSelection(uri: vscode.Uri, position: vscode.Position): void {
    const state = this.getState(uri);
    state.lastSelection = { line: position.line, character: position.character };
  }

  /**
   * Retrieve the last cursor position for a URI.
   * @param uri The file URI.
   * @returns The cursor position or undefined.
   * @throws No errors expected.
   */
  getLastSelection(uri: vscode.Uri): vscode.Position | undefined {
    const state = this.getExistingState(uri);
    if (!state?.lastSelection) {
      return undefined;
    }
    return new vscode.Position(state.lastSelection.line, state.lastSelection.character);
  }

  /**
   * Clear state for a URI.
   * @param uri The file URI.
   * @returns void
   * @throws No errors expected.
   */
  clear(uri: vscode.Uri): void {
    this.states.delete(uri.toString());
  }
}
