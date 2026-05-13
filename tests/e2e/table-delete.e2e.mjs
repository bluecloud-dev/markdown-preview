import { expect, browser } from '@wdio/globals';
import {
  executeWorkbenchCommandAndWaitForWorkspaceFileText,
  openWorkspaceFile,
  readWorkspaceFileText,
  waitForCustomEditor,
  withCustomEditorWebview,
} from './helpers.mjs';

describe('Table node view delete workflow', () => {
  it('deletes the selected table from the document', async () => {
    await openWorkspaceFile('sample.md');
    await waitForCustomEditor('sample.md');

    await executeWorkbenchCommandAndWaitForWorkspaceFileText(
      'sample.md',
      'muninn.insertTable',
      (text) => text.includes('| Column 1 | Column 2 |'),
      'Expected table insertion before delete validation.',
    );

    let textAfterDelete = '';
    await withCustomEditorWebview(async () => {
      const tableNode = await browser.$('[data-testid="muninn-table-node"]');
      const deleteButton = await tableNode.$('[data-testid="muninn-table-delete"]');
      await deleteButton.waitForDisplayed({ timeout: 5_000 });
      await deleteButton.click();
      await tableNode.waitForExist({ reverse: true, timeout: 5_000 });
      await browser.waitUntil(
        async () => {
          textAfterDelete = await readWorkspaceFileText('sample.md');
          return !textAfterDelete.includes('| Column 1 | Column 2 |');
        },
        {
          timeout: 10_000,
          timeoutMsg: 'Expected Delete action to remove the inserted table markdown.',
        },
      );
    });

    expect(textAfterDelete).not.toContain('```muninn-table');
  });
});
