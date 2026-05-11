import { browser, expect } from '@wdio/globals';
import {
  openWorkspaceFile,
  readEditorState,
  waitForCustomEditor,
  withCustomEditorWebview,
} from './helpers.mjs';

describe('Reading-first workflow', () => {
  it('opens markdown files in Muninn custom editor by default', async () => {
    await openWorkspaceFile('sample.md');
    await waitForCustomEditor('sample.md');

    const state = await readEditorState();
    expect(state.activeCustomViewType).toBe('muninn.markdownEditor');
    expect(state.activeTabLabel.toLowerCase()).toContain('sample.md');

    await withCustomEditorWebview(async () => {
      const header = await browser.$('[data-testid="muninn-editor-header"]');
      await expect(header).toBeDisplayed();
      await expect(header).toHaveText(expect.stringContaining('Muninn'));

      const sourceButton = await browser.$('[data-command="openRawMarkdown"]');
      await expect(sourceButton).toHaveText('Source');
      await expect(sourceButton).toHaveAttribute('title', expect.stringContaining('raw Markdown'));
    });
  });
});
