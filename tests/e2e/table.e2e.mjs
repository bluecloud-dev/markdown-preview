import { expect, browser } from '@wdio/globals';
import {
  executeWorkbenchCommandAndWaitForWorkspaceFileText,
  openWorkspaceFile,
  readWorkspaceFileText,
  waitForWorkspaceFileText,
  waitForCustomEditor,
  waitForCustomEditorWebviewReady,
  withCustomEditorWebview,
} from './helpers.mjs';

const waitForSampleMarkdown = (predicate, errorMessage) =>
  waitForWorkspaceFileText('sample.md', predicate, errorMessage);

const executeCommandAndWaitForSampleMarkdown = (command, predicate, errorMessage) =>
  executeWorkbenchCommandAndWaitForWorkspaceFileText('sample.md', command, predicate, errorMessage);

const readAnnouncementRegions = async () =>
  browser.execute(() => {
    const status = document.querySelector('#status');
    const alert = document.querySelector('#status-alert');
    return {
      alertHidden: alert?.hasAttribute('hidden') ?? null,
      alertLive: alert?.getAttribute('aria-live') ?? null,
      alertRole: alert?.getAttribute('role') ?? null,
      alertText: alert?.textContent ?? null,
      statusHidden: status?.hasAttribute('hidden') ?? null,
      statusLive: status?.getAttribute('aria-live') ?? null,
      statusRole: status?.getAttribute('role') ?? null,
      statusText: status?.textContent ?? null,
    };
  });

const readActiveTableCellState = async () =>
  browser.execute(() => {
    const activeElement = document.activeElement;
    return {
      isBody: activeElement === document.body,
      row:
        activeElement instanceof HTMLInputElement
          ? activeElement.dataset.tableRow ?? null
          : null,
      col:
        activeElement instanceof HTMLInputElement
          ? activeElement.dataset.tableColumn ?? null
          : null,
      value: activeElement instanceof HTMLInputElement ? activeElement.value : null,
    };
  });

const expectTableGridSemantics = async ({ columnCount, rowCount, tableIndex = 1 }) => {
  await withCustomEditorWebview(async () => {
    const tableNode = await browser.$('[data-testid="muninn-table-node"]');
    const gridTable = await tableNode.$('.muninn-table-node-grid-table');
    await gridTable.waitForDisplayed({ timeout: 5_000 });
    await expect(gridTable).toHaveAttribute(
      'aria-label',
      `Table ${tableIndex}: ${columnCount} columns, ${rowCount} rows`,
    );

    const headerCells = await gridTable.$$('th');
    expect(headerCells.length).toBe(columnCount);
    for (const headerCell of headerCells) {
      await expect(headerCell).toHaveAttribute('scope', 'col');
    }
  });
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
};

describe('Table node view workflow', () => {
  it('routes failures and successes through separate live regions', async () => {
    await openWorkspaceFile('sample.md');
    await waitForCustomEditor('sample.md');
    await waitForCustomEditorWebviewReady();

    await withCustomEditorWebview(async () => {
      await browser.execute(() => {
        window.dispatchEvent(
          new MessageEvent('message', {
            data: { type: 'host.executeCommand', payload: { command: 'addTableRow' } },
          }),
        );
      });

      await browser.waitUntil(
        async () => {
          const regions = await readAnnouncementRegions();
          return regions.alertText?.startsWith('Error: Insert a table first');
        },
        {
          timeout: 5_000,
          timeoutMsg: 'Expected table command failure to use the alert live region.',
        },
      );

      const regions = await readAnnouncementRegions();
      expect(regions).toEqual({
        alertHidden: false,
        alertLive: 'assertive',
        alertRole: 'alert',
        alertText: 'Error: Insert a table first before adding a row.',
        statusHidden: true,
        statusLive: 'polite',
        statusRole: 'status',
        statusText: '',
      });
    });

    await executeCommandAndWaitForSampleMarkdown(
      'muninn.insertTable',
      (text) => text.includes('| Column 1 | Column 2 |'),
      'Expected table insertion command to persist in markdown.',
    );

    await withCustomEditorWebview(async () => {
      const regions = await readAnnouncementRegions();
      expect(regions.alertText).toBe('');
      expect(regions.alertHidden).toBe(true);
      expect(regions.statusText).toBe('Inserted table.');
      expect(regions.statusHidden).toBe(false);
    });
  });

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
    await expectTableGridSemantics({ columnCount: 2, rowCount: 1 });

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
    await expectTableGridSemantics({ columnCount: 3, rowCount: 2 });

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
    await expectTableGridSemantics({ columnCount: 2, rowCount: 1 });

    await applyTableSourceFromWebview(
      ['| Name | Score |', '| --- | --- |', '| Ben | 9 |'].join('\n'),
      'keyboard',
    );

    const text = await waitForSampleMarkdown(
      (nextText) => nextText.includes('| Name | Score |') && nextText.includes('| Ben | 9 |'),
      'Expected Ctrl/Cmd+Enter source-apply path to persist edited markdown table source.',
    );
    expect(text).not.toContain('```muninn-table');
    await expectTableGridSemantics({ columnCount: 2, rowCount: 1 });
  });

  it('commits cells with Enter and keeps focus in the grid for Escape', async () => {
    await openWorkspaceFile('sample.md');
    await waitForCustomEditor('sample.md');

    await executeCommandAndWaitForSampleMarkdown(
      'muninn.insertTable',
      (text) => text.includes('| Column 1 | Column 2 |'),
      'Expected table insertion command to persist before keyboard checks.',
    );
    await executeCommandAndWaitForSampleMarkdown(
      'muninn.addTableRow',
      (text) => /\|\s*\|\s*\|\s*\|/.test(text),
      'Expected second table row before keyboard checks.',
    );

    await withCustomEditorWebview(async () => {
      const tableNode = await browser.$('[data-testid="muninn-table-node"]');
      const firstBodyCell = await tableNode.$(
        '.muninn-table-node-cell[data-table-row="1"][data-table-column="0"]',
      );
      await firstBodyCell.waitForDisplayed({ timeout: 5_000 });
      await firstBodyCell.setValue('Alice');
      await browser.keys('Enter');

      await browser.waitUntil(
        async () => {
          const activeState = await readActiveTableCellState();
          return (
            !activeState.isBody &&
            activeState.row === '2' &&
            activeState.col === '0' &&
            activeState.value === ''
          );
        },
        {
          timeout: 5_000,
          timeoutMsg: 'Expected Enter to focus the same column in the next table row.',
        },
      );

      const refreshedTableNode = await browser.$('[data-testid="muninn-table-node"]');
      const secondBodyCell = await refreshedTableNode.$(
        '.muninn-table-node-cell[data-table-row="2"][data-table-column="0"]',
      );
      await secondBodyCell.setValue('Draft');
      await browser.keys('Escape');

      await browser.waitUntil(
        async () => {
          const activeState = await readActiveTableCellState();
          return (
            !activeState.isBody &&
            activeState.row === '2' &&
            activeState.col === '0' &&
            activeState.value === ''
          );
        },
        {
          timeout: 5_000,
          timeoutMsg: 'Expected Escape to restore the committed value and keep cell focus.',
        },
      );
    });

    const text = await waitForSampleMarkdown(
      (nextText) => nextText.includes('| Alice |'),
      'Expected Enter to commit the edited table cell.',
    );
    expect(text).not.toContain('Draft');
  });
});
