import { expect, browser } from '@wdio/globals';
import {
  focusWorkspaceFile,
  openWorkspaceFile,
  readEditorState,
  waitForEditMode,
  waitForPreviewMode,
} from './helpers.mjs';

describe('Formatting journey', () => {
  it('formats selected text with command execution in edit mode', async () => {
    await openWorkspaceFile('with-formatting.md');
    await waitForPreviewMode('with-formatting.md');
    await focusWorkspaceFile('with-formatting.md');

    await browser.executeWorkbench(async (vscode) => {
      await vscode.commands.executeCommand('muninn.enterEditMode');
    });
    await waitForEditMode();

    await browser.executeWorkbench(async (vscode) => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        throw new Error('No active markdown editor to prepare formatting test.');
      }

      const heading = editor.document.lineAt(0).text;
      const token = 'Formatting';
      const start = heading.indexOf(token);
      if (start === -1) {
        throw new Error('Formatting fixture heading did not include expected token.');
      }

      editor.selection = new vscode.Selection(new vscode.Position(0, start), new vscode.Position(0, start + token.length));
      await vscode.commands.executeCommand('muninn.formatBold');
    });

    await browser.waitUntil(
      async () => {
        const state = await readEditorState();
        return state.documentText?.includes('**Formatting**');
      },
      {
        timeout: 15_000,
        timeoutMsg: 'Expected bold formatting command to wrap selected heading text.',
      }
    );

    const state = await readEditorState();
    expect(state.documentText).toContain('**Formatting**');
  });
});
