import { expect, browser } from '@wdio/globals';
import {
  executeWorkbenchCommandAndWaitForWorkspaceFileText,
  openWorkspaceFile,
  readWorkspaceFileText,
  waitForWorkspaceFileText,
  waitForCustomEditor,
  withCustomEditorWebview,
} from './helpers.mjs';

const waitForSampleMarkdown = (predicate, errorMessage) =>
  waitForWorkspaceFileText('sample.md', predicate, errorMessage);

const executeCommandAndWaitForSampleMarkdown = (command, predicate, errorMessage) =>
  executeWorkbenchCommandAndWaitForWorkspaceFileText('sample.md', command, predicate, errorMessage);

const isRetryableWebviewError = (error) => {
  const message = String(error?.message ?? error).toLowerCase();
  return (
    message.includes('stale element') ||
    message.includes('invalid session id') ||
    message.includes('detached') ||
    message.includes('frame') ||
    message.includes('target closed')
  );
};

const isTableInPreviewMode = async () => {
  let previewVisible = false;
  await withCustomEditorWebview(async () => {
    const tableNode = await browser.$('[data-testid="muninn-table-node"]');
    if (!(await tableNode.isExisting())) {
      previewVisible = false;
      return;
    }

    const sourceTextarea = await tableNode.$('[data-testid="muninn-table-source-text"]');
    const tableGrid = await tableNode.$('.muninn-table-node-grid');
    previewVisible = !(await sourceTextarea.isDisplayed()) && (await tableGrid.isDisplayed());
  });

  return previewVisible;
};

const applyTableSourceFromWebview = async (source, mode) => {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      await withCustomEditorWebview(async () => {
        const tableNode = await browser.$('[data-testid="muninn-table-node"]');
        const sourceToggle = await tableNode.$('[data-testid="muninn-table-toggle-source"]');
        const sourceTextarea = await tableNode.$('[data-testid="muninn-table-source-text"]');
        const tableGrid = await tableNode.$('.muninn-table-node-grid');
        if (!(await sourceTextarea.isDisplayed())) {
          await sourceToggle.click();
          await sourceTextarea.waitForDisplayed({ timeout: 5_000 });
          await expect(tableGrid).not.toBeDisplayed();
        }

        await sourceTextarea.click();
        await sourceTextarea.clearValue();
        await sourceTextarea.setValue(source);

        if (mode === 'button') {
          const applySourceButton = await tableNode.$('[data-testid="muninn-table-apply-source"]');
          await applySourceButton.waitForEnabled({ timeout: 5_000 });
          await applySourceButton.click();
        } else {
          const applyShortcut =
            process.platform === 'darwin' ? ['Meta', 'Enter'] : ['Control', 'Enter'];
          await browser.keys(applyShortcut);
        }
      });

      await browser.waitUntil(
        async () => {
          try {
            return await isTableInPreviewMode();
          } catch {
            return false;
          }
        },
        {
          timeout: 10_000,
          timeoutMsg: 'Expected table source mode to close and grid mode to return after apply.',
        },
      );
      return;
    } catch (error) {
      if (!isRetryableWebviewError(error) || attempt === 2) {
        throw error;
      }
      await browser.pause(300);
    }
  }
};

describe('Table node view workflow', () => {
  it('keeps markdown table serialization stable while applying table actions', async () => {
    await openWorkspaceFile('sample.md');
    await waitForCustomEditor('sample.md');

    await executeCommandAndWaitForSampleMarkdown(
      'muninn.insertTable',
      (text) => text.includes('| Column 1 | Column 2 |'),
      'Expected table insertion command to persist in markdown.',
    );

    await withCustomEditorWebview(async () => {
      const tableNode = await browser.$('[data-testid="muninn-table-node"]');
      const firstCell = await tableNode.$('.muninn-table-node-cell');
      await firstCell.waitForDisplayed({ timeout: 5_000 });
      await expect(firstCell).toHaveAttribute(
        'aria-label',
        expect.stringContaining('Header column 1'),
      );

      const deleteButton = await tableNode.$('[data-testid="muninn-table-delete"]');
      await deleteButton.waitForDisplayed({ timeout: 5_000 });
      await expect(deleteButton).toHaveAttribute('aria-label', 'Delete table');
      await expect(deleteButton).toHaveElementClass('muninn-button-danger');
    });

    await executeCommandAndWaitForSampleMarkdown(
      'muninn.addTableColumn',
      (text) => text.includes('| Column 1 | Column 2 | Column 3 |'),
      'Expected add-table-column command to persist in markdown.',
    );

    await executeCommandAndWaitForSampleMarkdown(
      'muninn.addTableRow',
      (text) => /\|\s*\|\s*\|\s*\|/.test(text),
      'Expected add-table-row command to persist in markdown.',
    );

    const text = await readWorkspaceFileText('sample.md');
    expect(text).not.toContain('```muninn-table');
  });

  it('applies source panel edits by button and keyboard shortcut', async () => {
    await openWorkspaceFile('sample.md');
    await waitForCustomEditor('sample.md');

    await executeCommandAndWaitForSampleMarkdown(
      'muninn.insertTable',
      (text) => text.includes('| Column 1 | Column 2 |'),
      'Expected table insertion command to persist before source-apply checks.',
    );

    await applyTableSourceFromWebview(
      ['| Name | Score |', '| --- | --- |', '| Alice | 7 |'].join('\n'),
      'button',
    );

    await waitForSampleMarkdown(
      (text) => text.includes('| Name | Score |') && text.includes('| Alice | 7 |'),
      'Expected Apply Source button path to persist edited markdown table source.',
    );

    await applyTableSourceFromWebview(
      ['| Name | Score |', '| --- | --- |', '| Ben | 9 |'].join('\n'),
      'keyboard',
    );

    const text = await waitForSampleMarkdown(
      (nextText) => nextText.includes('| Name | Score |') && nextText.includes('| Ben | 9 |'),
      'Expected Ctrl/Cmd+Enter source-apply path to persist edited markdown table source.',
    );
    expect(text).not.toContain('```muninn-table');
  });
});
