import { browser, expect } from '@wdio/globals';
import {
  openWorkspaceFile,
  readWorkspaceFileText,
  waitForCustomEditor,
  withCustomEditorWebview,
} from './helpers.mjs';

const waitForWorkspaceMarkdown = async (predicate, errorMessage) => {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const text = await readWorkspaceFileText('sample.md');
    if (predicate(text)) {
      return text;
    }
    await browser.pause(200);
  }

  throw new Error(errorMessage);
};

describe('Code block language workflow', () => {
  it('updates markdown fence language from the code block dropdown', async () => {
    await openWorkspaceFile('sample.md');
    await waitForCustomEditor('sample.md');

    let inserted = false;
    for (let attempt = 0; attempt < 8; attempt += 1) {
      await browser.executeWorkbench(async (vscode) => {
        await vscode.commands.executeCommand('muninn.insertCodeBlock');
      });
      await browser.pause(200);
      const text = await readWorkspaceFileText('sample.md');
      if ((text.match(/^```/gm)?.length ?? 0) > 0) {
        inserted = true;
        break;
      }
    }

    if (!inserted) {
      throw new Error('Expected code block insertion before language selection.');
    }

    await withCustomEditorWebview(async () => {
      await browser.waitUntil(
        async () => {
          const count = await browser.execute(
            () => document.querySelectorAll('[data-testid="muninn-code-language"]').length,
          );
          return count > 0;
        },
        {
          timeout: 10_000,
          timeoutMsg: 'Expected a code language dropdown to be rendered.',
        },
      );

      const languageSelect = await browser.$('[data-testid="muninn-code-language"]');
      await languageSelect.waitForDisplayed({ timeout: 10_000 });
      await languageSelect.selectByVisibleText('Mermaid');
    });

    const text = await waitForWorkspaceMarkdown(
      (nextText) => nextText.includes('```mermaid'),
      'Expected code language dropdown to persist a mermaid fence.',
    );
    expect(text).toContain('```mermaid');
  });
});
