import { browser, expect } from '@wdio/globals';
import {
  openWorkspaceFile,
  readEditorState,
  waitForCustomEditor,
  withCustomEditorWebview,
} from './helpers.mjs';

const readContentWidthState = async () =>
  browser.execute(() => {
    const shell = document.querySelector('#editor-shell');
    const editor = document.querySelector('.ProseMirror');
    const panel = document.querySelector('.muninn-mermaid-preview-panel');
    if (!(shell instanceof HTMLElement) || !(editor instanceof HTMLElement)) {
      throw new Error('Muninn content-width elements are missing.');
    }

    const editorRect = editor.getBoundingClientRect();
    const shellRect = shell.getBoundingClientRect();
    return {
      contentWidth: getComputedStyle(shell).getPropertyValue('--muninn-content-width').trim(),
      editorLeft: editorRect.left,
      editorRight: shellRect.right - editorRect.right,
      editorMaxWidth: getComputedStyle(editor).maxWidth,
      panelMaxWidth: panel instanceof HTMLElement ? getComputedStyle(panel).maxWidth : '',
      proofMarker: window.__muninnContentWidthProof,
    };
  });

const dispatchHostSettingsChanged = async (contentWidth) => {
  await browser.execute((nextContentWidth) => {
    window.dispatchEvent(
      new MessageEvent('message', {
        data: {
          type: 'host.settingsChanged',
          payload: {
            mermaidEnabled: true,
            toolbarMode: 'basic',
            contentWidth: nextContentWidth,
          },
        },
      }),
    );
  }, contentWidth);
};

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

  it('updates the document content width live without reopening the webview', async () => {
    await openWorkspaceFile('sample.md');
    await waitForCustomEditor('sample.md');

    await withCustomEditorWebview(async () => {
      await browser.execute(() => {
        window.__muninnContentWidthProof = 'same-webview-instance';
      });

      await browser.waitUntil(async () => (await readContentWidthState()).contentWidth === '70ch', {
        timeout: 5_000,
        timeoutMsg: 'Expected comfortable content width to apply.',
      });

      const comfortable = await readContentWidthState();
      expect(Math.abs(comfortable.editorLeft - comfortable.editorRight)).toBeLessThan(2);
      expect(comfortable.editorMaxWidth).not.toBe('none');
      expect(comfortable.panelMaxWidth).not.toBe('none');

      await dispatchHostSettingsChanged('full');
      await browser.waitUntil(
        async () => {
          const state = await readContentWidthState();
          return state.contentWidth === 'none' && state.proofMarker === 'same-webview-instance';
        },
        {
          timeout: 5_000,
          timeoutMsg: 'Expected full content width to apply without reopening.',
        },
      );

      await dispatchHostSettingsChanged(88);
      await browser.waitUntil(
        async () => {
          const state = await readContentWidthState();
          return state.contentWidth === '88ch' && state.proofMarker === 'same-webview-instance';
        },
        {
          timeout: 5_000,
          timeoutMsg: 'Expected numeric content width to apply without reopening.',
        },
      );
    });
  });
});
