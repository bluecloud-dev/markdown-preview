import { browser, expect } from '@wdio/globals';
import {
  executeWorkbenchCommandUntilWorkspaceFileText,
  openWorkspaceFile,
  waitForCustomEditor,
  withCustomEditorWebview,
} from './helpers.mjs';

describe('Toolbar accessibility workflow', () => {
  it('shows the editor shell focus ring when the document is focused', async () => {
    await openWorkspaceFile('with-formatting.md');
    await waitForCustomEditor('with-formatting.md');

    await withCustomEditorWebview(async () => {
      const editor = await browser.$('.ProseMirror');
      await editor.click();
      await expect(editor).toBeFocused();

      const shell = await browser.$('.muninn-editor-shell');
      const outlineStyle = await shell.getCSSProperty('outline-style');
      const outlineWidth = await shell.getCSSProperty('outline-width');
      expect(outlineStyle.value).toBe('solid');
      expect(outlineWidth.value).not.toBe('0px');
    });
  });

  it('labels toolbar groups and exposes the More affordance', async () => {
    await openWorkspaceFile('with-formatting.md');
    await waitForCustomEditor('with-formatting.md');

    await withCustomEditorWebview(async () => {
      const textLabel = await browser.$('[data-group-label="Text"]');
      await expect(textLabel).toBeDisplayed();

      const textGroup = await browser.$('[data-group="text"]');
      await expect(textGroup).toHaveAttribute('role', 'group');
      await expect(textGroup).toHaveAttribute('aria-labelledby', 'muninn-toolbar-group-text-label');

      const boldButton = await browser.$('[data-command="toggleBold"]');
      await expect(boldButton).toHaveAttribute('title', expect.stringContaining('Bold'));

      const heading3Button = await browser.$('[data-command="setHeading3"]');
      await expect(heading3Button).not.toBeDisplayed();

      const moreButton = await browser.$('[data-testid="muninn-toolbar-more"]');
      await expect(moreButton).toBeDisplayed();
      await expect(moreButton).toHaveText('More');
      await expect(moreButton).toHaveAttribute('aria-expanded', 'false');

      await moreButton.click();

      await expect(heading3Button).toBeDisplayed();
      await expect(moreButton).toHaveAttribute('aria-expanded', 'true');
      await browser.waitUntil(
        async () => {
          const activeCommand = await browser.execute(() =>
            document.activeElement?.getAttribute('data-command'),
          );
          return activeCommand === 'setHeading3';
        },
        {
          timeout: 2_000,
          timeoutMsg: 'Expected More to move focus to the first revealed advanced action.',
        },
      );
    });
  });

  it('supports keyboard-driven editing commands without opening raw source mode', async () => {
    await openWorkspaceFile('with-formatting.md');
    await waitForCustomEditor('with-formatting.md');

    await executeWorkbenchCommandUntilWorkspaceFileText(
      'with-formatting.md',
      'muninn.insertMermaidBlock',
      (text) => text.includes('```mermaid') || text.includes('A[Start] --> B[Finish]'),
      'Expected command-driven mermaid insertion to apply in custom editor.',
    );

    await executeWorkbenchCommandUntilWorkspaceFileText(
      'with-formatting.md',
      'muninn.insertTable',
      (text) => text.includes('| Column 1 | Column 2 |'),
      'Expected command-driven table insertion to apply in custom editor.',
    );
  });
});
