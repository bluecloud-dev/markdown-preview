import { browser, expect } from '@wdio/globals';
import {
  executeWorkbenchCommandUntilWorkspaceFileText,
  openWorkspaceFile,
  waitForCustomEditor,
  withCustomEditorWebview,
} from './helpers.mjs';

describe('Toolbar accessibility workflow', () => {
  it('names the editable markdown surface with the document file name', async () => {
    await openWorkspaceFile('sample.md');
    await waitForCustomEditor('sample.md');

    await withCustomEditorWebview(async () => {
      const attributes = await browser.execute(() => {
        const editor = document.querySelector('.ProseMirror');
        return {
          ariaLabel: editor?.getAttribute('aria-label') ?? null,
          ariaMultiline: editor?.getAttribute('aria-multiline') ?? null,
          role: editor?.getAttribute('role') ?? null,
        };
      });

      expect(attributes).toEqual({
        ariaLabel: 'Markdown editor — sample.md',
        ariaMultiline: 'true',
        role: 'textbox',
      });
    });
  });

  it('keeps the editable markdown surface named after host document replacement', async () => {
    await openWorkspaceFile('sample.md');
    await waitForCustomEditor('sample.md');

    await browser.executeWorkbench(async (vscode) => {
      const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
      if (!workspaceFolder) {
        throw new Error('No workspace folder available in VS Code test session.');
      }

      const uri = vscode.Uri.joinPath(workspaceFolder.uri, 'sample.md');
      const document = await vscode.workspace.openTextDocument(uri);
      const edit = new vscode.WorkspaceEdit();
      edit.replace(
        uri,
        new vscode.Range(
          new vscode.Position(0, 0),
          document.lineAt(document.lineCount - 1).range.end,
        ),
        '# Replaced\n\nHost-driven update.\n',
      );
      await vscode.workspace.applyEdit(edit);
    });

    await withCustomEditorWebview(async () => {
      await browser.waitUntil(
        async () =>
          browser.execute(() =>
            document.querySelector('.ProseMirror')?.textContent?.includes('Replaced'),
          ),
        {
          timeout: 5_000,
          timeoutMsg: 'Expected host-driven document replacement to reach the webview editor.',
        },
      );

      const attributes = await browser.execute(() => {
        const editor = document.querySelector('.ProseMirror');
        return {
          ariaLabel: editor?.getAttribute('aria-label') ?? null,
          ariaMultiline: editor?.getAttribute('aria-multiline') ?? null,
          role: editor?.getAttribute('role') ?? null,
        };
      });

      expect(attributes).toEqual({
        ariaLabel: 'Markdown editor — sample.md',
        ariaMultiline: 'true',
        role: 'textbox',
      });
    });
  });

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
      const textLabel = await browser.$('#muninn-toolbar-group-text-label');
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

      const controlledAdvancedButtons = await browser.execute(() => {
        const more = document.querySelector('[data-testid="muninn-toolbar-more"]');
        const ids = more?.getAttribute('aria-controls')?.trim().split(/\s+/).filter(Boolean) ?? [];
        return ids.map((id) => {
          const controlledElement = document.getElementById(id);
          return {
            advanced: controlledElement?.getAttribute('data-advanced') ?? null,
            exists: Boolean(controlledElement),
            id,
          };
        });
      });
      expect(controlledAdvancedButtons).toHaveLength(4);
      expect(
        controlledAdvancedButtons.every((entry) => entry.exists && entry.advanced === 'true'),
      ).toBe(true);

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

  it('uses one toolbar tab stop and arrow navigation exits cleanly to the editor', async () => {
    await openWorkspaceFile('with-formatting.md');
    await waitForCustomEditor('with-formatting.md');

    await withCustomEditorWebview(async () => {
      await browser.execute(() => {
        document.body.tabIndex = -1;
        document.body.focus();
      });

      await browser.keys('Tab');
      await browser.waitUntil(
        async () => {
          const activeCommand = await browser.execute(() =>
            document.activeElement?.getAttribute('data-command'),
          );
          return activeCommand === 'toggleBold';
        },
        {
          timeout: 2_000,
          timeoutMsg: 'Expected one Tab to land on the first toolbar action.',
        },
      );

      let tabStops = await browser.execute(() =>
        [...document.querySelectorAll('.muninn-toolbar button')]
          .filter((button) => !button.hidden && button.getAttribute('tabindex') === '0')
          .map(
            (button) =>
              button.getAttribute('data-command') ?? button.getAttribute('data-testid') ?? '',
          ),
      );
      expect(tabStops).toEqual(['toggleBold']);

      for (let index = 0; index < 8; index += 1) {
        await browser.keys('ArrowRight');
      }
      await browser.waitUntil(
        async () => {
          const activeCommand = await browser.execute(() =>
            document.activeElement?.getAttribute('data-command'),
          );
          return activeCommand === 'openRawMarkdown';
        },
        {
          timeout: 2_000,
          timeoutMsg: 'Expected ArrowRight navigation to reach the Source button.',
        },
      );

      tabStops = await browser.execute(() =>
        [...document.querySelectorAll('.muninn-toolbar button')]
          .filter((button) => !button.hidden && button.getAttribute('tabindex') === '0')
          .map(
            (button) =>
              button.getAttribute('data-command') ?? button.getAttribute('data-testid') ?? '',
          ),
      );
      expect(tabStops).toEqual(['openRawMarkdown']);

      await browser.keys('Tab');
      await browser.waitUntil(
        async () =>
          browser.execute(() => {
            const editor = document.querySelector('.ProseMirror');
            return Boolean(editor && document.activeElement === editor);
          }),
        {
          timeout: 2_000,
          timeoutMsg: 'Expected Tab from the toolbar roving stop to exit to the editor.',
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
