import { expect, browser } from '@wdio/globals';
import {
  openWorkspaceFile,
  readEditorState,
  readWorkspaceFileText,
  waitForCustomEditor,
  waitForRawEditor,
  withCustomEditorWebview,
} from './helpers.mjs';

describe('Edit mode workflow', () => {
  it('accepts editing commands immediately and supports raw fallback command', async () => {
    await openWorkspaceFile('sample.md');
    await waitForCustomEditor('sample.md');

    await browser.waitUntil(async () => {
      await browser.executeWorkbench(async (vscode) => {
        await vscode.commands.executeCommand('muninn.toggleBold');
      });
      const text = await readWorkspaceFileText('sample.md');
      return text.includes('**Sample**');
    }, {
      timeout: 20_000,
      timeoutMsg: 'Expected custom editor to process bold command immediately.',
    });

    await withCustomEditorWebview(async () => {
      const rawButton = await browser.$('button[data-command="openRawMarkdown"]');
      await rawButton.waitForDisplayed({ timeout: 5_000 });
      await rawButton.click();
    });
    await waitForRawEditor('sample.md');

    const rawState = await readEditorState();
    expect(rawState.activeEditor).toBe(true);
    expect(rawState.languageId).toBe('markdown');
    expect(rawState.activeTextUri?.toLowerCase()).toContain('/sample.md');
    const text = await readWorkspaceFileText('sample.md');
    expect(text).toContain('# Sample Markdown');
    expect(text).toContain('**Bold**');
  });
});
