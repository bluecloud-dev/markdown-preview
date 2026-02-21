import { expect, browser } from '@wdio/globals';
import {
  focusWorkspaceFile,
  openWorkspaceFile,
  readEditorState,
  waitForEditMode,
  waitForPreviewMode,
} from './helpers.mjs';

describe('Mermaid journey', () => {
  it('renders mermaid fixture in preview mode without breaking the workflow', async () => {
    await openWorkspaceFile('mermaid.md');
    await waitForPreviewMode('mermaid.md');
    await focusWorkspaceFile('mermaid.md');

    await browser.executeWorkbench(async (vscode) => {
      await vscode.commands.executeCommand('muninn.enterEditMode');
    });
    await waitForEditMode();

    const editState = await readEditorState();
    expect(editState.languageId).toBe('markdown');

    await browser.executeWorkbench(async (vscode) => {
      await vscode.commands.executeCommand('muninn.exitEditMode');
    });
    await waitForPreviewMode('mermaid.md');
  });
});
