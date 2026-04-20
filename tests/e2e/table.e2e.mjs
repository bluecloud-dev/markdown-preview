import { expect, browser } from '@wdio/globals';
import {
  executeUntil,
  openWorkspaceFile,
  readWorkspaceFileText,
  waitForCustomEditor,
  waitForWorkspaceMarkdown,
  withCustomEditorWebview,
} from './helpers.mjs';

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
      const applyShortcut = process.platform === 'darwin' ? ['Meta', 'Enter'] : ['Control', 'Enter'];
      await browser.keys(applyShortcut);
    }

    await sourceTextarea.waitForDisplayed({ reverse: true, timeout: 5_000 });
    await expect(tableGrid).toBeDisplayed();
  });
};

describe('Table node view workflow', () => {
  it('keeps markdown table serialization stable while applying table actions', async () => {
    await openWorkspaceFile('sample.md');
    await waitForCustomEditor('sample.md');

    await executeUntil(
      'muninn.insertTable',
      (text) => text.includes('| Column 1 | Column 2 |'),
      'Expected table insertion command to persist in markdown.',
    );

    await executeUntil(
      'muninn.addTableColumn',
      (text) => text.includes('| Column 1 | Column 2 | Column 3 |'),
      'Expected add-table-column command to persist in markdown.',
    );

    await executeUntil(
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

    await executeUntil(
      'muninn.insertTable',
      (text) => text.includes('| Column 1 | Column 2 |'),
      'Expected table insertion command to persist before source-apply checks.',
    );

    await applyTableSourceFromWebview(
      ['| Name | Score |', '| --- | --- |', '| Alice | 7 |'].join('\n'),
      'button',
    );

    await waitForWorkspaceMarkdown(
      (text) => text.includes('| Name | Score |') && text.includes('| Alice | 7 |'),
      'Expected Apply Source button path to persist edited markdown table source.',
    );

    await applyTableSourceFromWebview(
      ['| Name | Score |', '| --- | --- |', '| Ben | 9 |'].join('\n'),
      'keyboard',
    );

    const text = await waitForWorkspaceMarkdown(
      (nextText) => nextText.includes('| Name | Score |') && nextText.includes('| Ben | 9 |'),
      'Expected Ctrl/Cmd+Enter source-apply path to persist edited markdown table source.',
    );
    expect(text).not.toContain('```muninn-table');
  });

});
