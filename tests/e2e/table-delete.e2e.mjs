import { expect, browser } from '@wdio/globals';
import {
  executeUntil,
  openWorkspaceFile,
  waitForCustomEditor,
  waitForWorkspaceMarkdown,
  withCustomEditorWebview,
} from './helpers.mjs';

describe('Table delete workflow', () => {
  it('deletes the selected table from the document', async () => {
    await openWorkspaceFile('sample.md');
    await waitForCustomEditor('sample.md');

    await executeUntil(
      'muninn.insertTable',
      (text) => text.includes('| Column 1 | Column 2 |'),
      'Expected table insertion before delete validation.',
    );

    await withCustomEditorWebview(async () => {
      const tableNode = await browser.$('[data-testid="muninn-table-node"]');
      const deleteButton = await tableNode.$('[data-testid="muninn-table-delete"]');
      await deleteButton.waitForDisplayed({ timeout: 5_000 });
      await deleteButton.click();
      await tableNode.waitForExist({ reverse: true, timeout: 2_000 }).catch(async (error) => {
        const debug = await browser.execute(() => ({
          status: document.querySelector('#status-message')?.textContent ?? '',
          tableCount: document.querySelectorAll('[data-testid="muninn-table-node"]').length,
        }));
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`${message} debug=${JSON.stringify(debug)}`);
      });
    });

    const text = await waitForWorkspaceMarkdown(
      (nextText) => !nextText.includes('| Column 1 | Column 2 |'),
      'Expected Delete action to remove the inserted table markdown.',
    );
    expect(text).not.toContain('```muninn-table');
  });
});
