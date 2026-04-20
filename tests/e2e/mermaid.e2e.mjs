import { expect, browser } from '@wdio/globals';
import {
  openWorkspaceFile,
  readEditorState,
  readWorkspaceFileText,
  waitForCustomEditor,
  waitForRawEditor,
  withCustomEditorWebview,
} from './helpers.mjs';

describe('Mermaid journey', () => {
  it('inserts a mermaid block and preserves it across raw/custom transitions', async () => {
    await openWorkspaceFile('sample.md');
    await waitForCustomEditor('sample.md');

    let inserted = false;
    for (let attempt = 0; attempt < 8; attempt += 1) {
      await browser.executeWorkbench(async (vscode) => {
        await vscode.commands.executeCommand('muninn.insertMermaidBlock');
      });
      await browser.pause(180);
      const text = await readWorkspaceFileText('sample.md');
      if (text.includes('```mermaid') || text.includes('A[Start] --> B[Finish]')) {
        inserted = true;
        break;
      }
    }
    if (!inserted) {
      throw new Error('Expected inserted Mermaid block to be serialized into markdown text.');
    }

    await withCustomEditorWebview(async () => {
      await browser.waitUntil(
        async () => {
          const hasVisibleLabel = await browser.execute(() => {
            const labels = [
              ...document.querySelectorAll('#mermaid-preview-body svg text'),
              ...document.querySelectorAll('#mermaid-preview-body svg tspan'),
            ]
              .map((node) => node.textContent?.trim() ?? '')
              .filter((value) => value.length > 0);
            return labels.length > 0;
          });
          return hasVisibleLabel;
        },
        {
          timeout: 10_000,
          timeoutMsg: 'Expected Mermaid preview to render visible text labels.',
        },
      );
    });

    await browser.executeWorkbench(async (vscode) => {
      await vscode.commands.executeCommand('muninn.openRawMarkdown');
    });
    await waitForRawEditor('sample.md');

    await browser.executeWorkbench(async (vscode) => {
      const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
      if (!workspaceFolder) {
        throw new Error('No workspace folder available.');
      }
      const uri = vscode.Uri.joinPath(workspaceFolder.uri, 'sample.md');
      await vscode.commands.executeCommand('vscode.open', uri);
    });
    await waitForCustomEditor('sample.md');

    const state = await readEditorState();
    expect(state.activeCustomViewType).toBe('muninn.markdownEditor');
  });
});
