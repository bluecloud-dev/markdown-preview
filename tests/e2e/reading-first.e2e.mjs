import { expect } from '@wdio/globals';
import {
  openWorkspaceFile,
  readEditorState,
  readWorkspaceFileText,
  waitForCustomEditor,
  waitForRawEditor,
  withCustomEditorWebview,
} from './helpers.mjs';

describe('Reading-first workflow', () => {
  it('opens markdown files in Muninn custom editor by default', async () => {
    await openWorkspaceFile('sample.md');
    await waitForCustomEditor('sample.md');

    const state = await readEditorState();
    expect(state.activeCustomViewType).toBe('muninn.markdownEditor');
    expect(state.activeTabLabel.toLowerCase()).toContain('sample.md');
  });

  it('toggles focus mode as a persisted reading UI state', async () => {
    await openWorkspaceFile('sample.md');
    await waitForCustomEditor('sample.md');

    await browser.executeWorkbench(async (vscode) => {
      await vscode.commands.executeCommand('muninn.toggleFocusMode');
    });

    await withCustomEditorWebview(async () => {
      await browser.waitUntil(
        async () =>
          browser.execute(() => {
            const app = document.querySelector('#app');
            return app?.classList.contains('muninn-focus-mode') === true;
          }),
        {
          timeout: 5_000,
          timeoutMsg: 'Expected focus mode class to apply in the Muninn webview.',
        },
      );

      const focusState = await browser.execute(() => {
        const app = document.querySelector('#app');
        const toolbar = document.querySelector('.muninn-toolbar');
        const editor = document.querySelector('.ProseMirror');
        return {
          hasFocusClass: app?.classList.contains('muninn-focus-mode') ?? false,
          toolbarHidden: toolbar?.hasAttribute('hidden') ?? false,
          readableWidthConstrained: getComputedStyle(editor).maxWidth !== 'none',
        };
      });

      expect(focusState).toEqual({
        hasFocusClass: true,
        toolbarHidden: true,
        readableWidthConstrained: true,
      });
    });

    await browser.executeWorkbench(async (vscode) => {
      await vscode.commands.executeCommand('muninn.toggleFocusMode');
    });
  });

  it('round-trips raw markdown edits back into the Muninn editor', async () => {
    await openWorkspaceFile('sample.md');
    await waitForCustomEditor('sample.md');

    await browser.executeWorkbench(async (vscode) => {
      await vscode.commands.executeCommand('muninn.openRawMarkdown');
    });
    await waitForRawEditor('sample.md');

    await browser.executeWorkbench(async (vscode) => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        throw new Error('Expected raw markdown editor to be active.');
      }

      const end = editor.document.lineAt(editor.document.lineCount - 1).range.end;
      await editor.edit((builder) => {
        builder.insert(end, '\n\n## Raw Round Trip\n\nRaw markdown escape hatch content.');
      });
      await editor.document.save();
    });

    await browser.executeWorkbench(async (vscode) => {
      const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
      if (!workspaceFolder) {
        throw new Error('No workspace folder available.');
      }
      const uri = vscode.Uri.joinPath(workspaceFolder.uri, 'sample.md');
      await vscode.commands.executeCommand('vscode.openWith', uri, 'muninn.markdownEditor');
    });
    await waitForCustomEditor('sample.md');

    await withCustomEditorWebview(async () => {
      await browser.waitUntil(
        async () =>
          browser.execute(() =>
            Boolean(
              [...document.querySelectorAll('.ProseMirror h2')].find(
                (node) => node.textContent?.trim() === 'Raw Round Trip',
              ),
            ),
          ),
        {
          timeout: 5_000,
          timeoutMsg: 'Expected raw markdown heading to render after returning to Muninn.',
        },
      );
    });

    const text = await readWorkspaceFileText('sample.md');
    expect(text).toContain('## Raw Round Trip');
  });
});
