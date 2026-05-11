import { expect, browser } from '@wdio/globals';
import {
  openWorkspaceFile,
  readWorkspaceFileText,
  waitForCustomEditor,
  withCustomEditorWebview,
} from './helpers.mjs';

const executeCommand = async (command) => {
  await browser.executeWorkbench(async (vscode, commandName) => {
    await vscode.commands.executeCommand(commandName);
  }, command);
};

const waitForWorkspaceMarkdown = async (predicate, errorMessage) => {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const text = await readWorkspaceFileText('sample.md');
    if (predicate(text)) {
      return text;
    }
    await browser.pause(200);
  }

  throw new Error(errorMessage);
};

const waitForEditorWebviewReady = async () => {
  await withCustomEditorWebview(async () => {
    const editor = await browser.$('.ProseMirror');
    await editor.waitForDisplayed({ timeout: 5_000 });
  });
  // Closing a VS Code webview detaches its inner frame asynchronously. Avoid
  // dispatching commands while WebDriver is still processing that detach event.
  await browser.pause(500);
};

const executeCommandAndWaitForMarkdown = async (command, predicate, errorMessage) => {
  await waitForEditorWebviewReady();
  await executeCommand(command);
  await waitForWorkspaceMarkdown(predicate, errorMessage);
};

describe('Table node view delete workflow', () => {
  it('deletes the selected table from the document', async () => {
    await openWorkspaceFile('sample.md');
    await waitForCustomEditor('sample.md');

    await executeCommandAndWaitForMarkdown(
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
