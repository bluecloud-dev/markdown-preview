/**
 * @fileoverview Command handlers for view mode switching.
 *
 * This module exports command handlers for switching between preview and edit modes:
 * - enterEditMode: Opens split view with text editor and live preview
 * - exitEditMode: Returns to preview-only mode
 * - toggleEditMode: Toggles between the two modes (bound to Ctrl+Shift+V)
 *
 * These commands work with both the active editor and any visible markdown editor,
 * allowing users to switch modes even when focused on the preview pane.
 *
 * @module commands/mode-commands
 */

import * as vscode from 'vscode';
import { PreviewService } from '../services/preview-service';
import { StateService } from '../services/state-service';
import { ViewMode } from '../types/state';

/**
 * Get the active markdown editor, with fallback to any visible markdown editor.
 *
 * This fallback is necessary because when the preview pane is focused,
 * there's no "active text editor" even though the markdown file is visible.
 * The fallback allows mode commands to work from either the editor or preview pane.
 *
 * @returns The markdown text editor, or undefined if none is available
 * @internal
 */
const getActiveMarkdownEditor = (): vscode.TextEditor | undefined =>
  vscode.window.activeTextEditor ??
  vscode.window.visibleTextEditors.find((editor) => editor.document.languageId === 'markdown');

/**
 * Enter edit mode for the active markdown editor.
 * @param previewService Preview service instance.
 * @returns Promise resolved when edit mode opens.
 * @throws Propagates VS Code command errors.
 */
export const enterEditMode = async (
  previewService: PreviewService
): Promise<void> => {
  const editor = getActiveMarkdownEditor();
  if (!editor) {
    return;
  }

  await previewService.enterEditMode(editor.document.uri);
};

/**
 * Exit edit mode for the active markdown editor.
 * @param previewService Preview service instance.
 * @returns Promise resolved when edit mode exits.
 * @throws Propagates VS Code command errors.
 */
export const exitEditMode = async (
  previewService: PreviewService
): Promise<void> => {
  const editor = getActiveMarkdownEditor();
  if (!editor) {
    return;
  }

  await previewService.exitEditMode(editor.document.uri);
};

/**
 * Toggle edit/preview mode for the active markdown editor.
 * @param previewService Preview service instance.
 * @param stateService State service instance.
 * @returns Promise resolved when the mode toggle completes.
 * @throws Propagates VS Code command errors.
 */
export const toggleEditMode = async (
  previewService: PreviewService,
  stateService: StateService
): Promise<void> => {
  const editor = getActiveMarkdownEditor();
  if (!editor) {
    return;
  }

  const state = stateService.getState(editor.document.uri);
  if (state.mode === ViewMode.Edit) {
    await exitEditMode(previewService);
    return;
  }

  await enterEditMode(previewService);
};
