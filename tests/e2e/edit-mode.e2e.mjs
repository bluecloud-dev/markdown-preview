import { expect, browser } from '@wdio/globals';
import {
  focusWorkspaceFile,
  openWorkspaceFile,
  readEditorState,
  waitForEditMode,
  waitForPreviewMode,
} from './helpers.mjs';

describe('Edit mode workflow', () => {
  it('toggles preview <-> edit using extension commands', async () => {
    await openWorkspaceFile('sample.md');
    await waitForPreviewMode('sample.md');
    await focusWorkspaceFile('sample.md');

    await browser.executeWorkbench(async (vscode) => {
      await vscode.commands.executeCommand('muninn.enterEditMode');
    });
    await waitForEditMode();

    const editState = await readEditorState();
    expect(editState.activeEditor).toBe(true);
    expect(editState.languageId).toBe('markdown');
    expect(editState.tabGroups).toBeGreaterThan(0);

    await browser.executeWorkbench(async (vscode) => {
      await vscode.commands.executeCommand('muninn.exitEditMode');
    });
    await waitForPreviewMode('sample.md');

    const previewState = await readEditorState();
    expect(previewState.activeEditor).toBe(false);
  });
});
