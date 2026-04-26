import { browser } from '@wdio/globals';
import { openWorkspaceFile, waitForCustomEditor, withCustomEditorWebview } from './helpers.mjs';

describe('Outline navigation workflow', () => {
  it('reveals sections through the host-backed outline navigation command', async () => {
    await openWorkspaceFile('mermaid.md');
    await waitForCustomEditor('mermaid.md');

    await browser.executeWorkbench(async (vscode) => {
      await vscode.commands.executeCommand('muninn.goToSection', 'h1-l1-mermaid-fixture');
    });

    await withCustomEditorWebview(async () => {
      await browser.waitUntil(
        async () =>
          browser.execute(
            () =>
              document.querySelector('#status-message')?.textContent ===
              'Revealed Mermaid Fixture.',
          ),
        {
          timeout: 5_000,
          timeoutMsg: 'Expected outline navigation to reveal the Mermaid Fixture heading.',
        },
      );
    });
  });
});
