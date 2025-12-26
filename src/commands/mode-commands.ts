import * as vscode from 'vscode';
import { PreviewService } from '../services/preview-service';
import { StateService } from '../services/state-service';
import { ViewMode } from '../types/state';

const getActiveMarkdownEditor = (): vscode.TextEditor | undefined =>
  vscode.window.activeTextEditor ??
  vscode.window.visibleTextEditors.find((editor) => editor.document.languageId === 'markdown');

export const enterEditMode = async (
  previewService: PreviewService
): Promise<void> => {
  const editor = getActiveMarkdownEditor();
  if (!editor) {
    return;
  }

  await previewService.enterEditMode(editor.document.uri);
};

export const exitEditMode = async (
  previewService: PreviewService
): Promise<void> => {
  const editor = getActiveMarkdownEditor();
  if (!editor) {
    return;
  }

  await previewService.exitEditMode(editor.document.uri);
};

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
