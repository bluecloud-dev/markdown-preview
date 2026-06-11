import { expect, browser } from '@wdio/globals';
import {
  openWorkspaceFile,
  waitForCustomEditor,
  waitForCustomEditorWebviewReady,
  waitForWorkspaceFileText,
  withCustomEditorWebview,
} from './helpers.mjs';

const typeInProseMirror = async (keys) => {
  await withCustomEditorWebview(async () => {
    const editor = await browser.$('.ProseMirror');
    await editor.waitForDisplayed({ timeout: 5_000 });
    await editor.click();
    await browser.keys(['End']);
    await browser.keys(keys);
  });
};

const readDiskText = async (fileName) =>
  browser.executeWorkbench(async (vscode, relativeFileName) => {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
      throw new Error('No workspace folder available in VS Code test session.');
    }
    const uri = vscode.Uri.joinPath(workspaceFolder.uri, relativeFileName);
    const bytes = await vscode.workspace.fs.readFile(uri);
    return new TextDecoder().decode(bytes);
  }, fileName);

describe('Save integrity', () => {
  it('keeps syncing keystrokes after a no-op apply and persists them on save', async () => {
    await openWorkspaceFile('save-pipeline.md');
    await waitForCustomEditor('save-pipeline.md');
    await waitForCustomEditorWebviewReady();

    await typeInProseMirror('zulu');
    await waitForWorkspaceFileText(
      'save-pipeline.md',
      (text) => text.includes('zulu'),
      'Expected typed text to reach the host document.',
      { attempts: 25, interval: 200 },
    );

    // Char + immediate backspace serializes to unchanged markdown -> the host
    // treats the apply as a no-op. Typing afterwards must still sync.
    await typeInProseMirror(['x', 'Backspace']);
    await typeInProseMirror('yankee');
    await waitForWorkspaceFileText(
      'save-pipeline.md',
      (text) => text.includes('yankee'),
      'Expected keystrokes after a no-op apply to keep reaching the host document.',
      { attempts: 25, interval: 200 },
    );

    await browser.executeWorkbench(async (vscode) => {
      await vscode.commands.executeCommand('workbench.action.files.save');
    });

    await browser.waitUntil(
      async () => {
        const diskText = await readDiskText('save-pipeline.md');
        return diskText.includes('zulu') && diskText.includes('yankee');
      },
      {
        timeout: 10_000,
        timeoutMsg: 'Expected saved file on disk to contain all typed text.',
      },
    );

    const finalDiskText = await readDiskText('save-pipeline.md');
    expect(finalDiskText).toContain('Alpha bravo charlie delta.');
  });
});
