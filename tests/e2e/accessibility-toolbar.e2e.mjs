import { browser } from '@wdio/globals';
import { openWorkspaceFile, readWorkspaceFileText, waitForCustomEditor } from './helpers.mjs';

const executeUntil = async (command, predicate, errorMessage) => {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    await browser.executeWorkbench(async (vscode, commandName) => {
      await vscode.commands.executeCommand(commandName);
    }, command);
    await browser.pause(200);

    const text = await readWorkspaceFileText('with-formatting.md');
    if (predicate(text)) {
      return;
    }
  }

  throw new Error(errorMessage);
};

describe('Toolbar accessibility workflow', () => {
  it('supports keyboard-driven editing commands without opening raw source mode', async () => {
    await openWorkspaceFile('with-formatting.md');
    await waitForCustomEditor('with-formatting.md');

    await executeUntil(
      'muninn.insertMermaidBlock',
      (text) => text.includes('```mermaid') || text.includes('A[Start] --> B[Finish]'),
      'Expected command-driven mermaid insertion to apply in custom editor.',
    );

    await executeUntil(
      'muninn.insertTable',
      (text) => text.includes('| Column 1 | Column 2 |'),
      'Expected command-driven table insertion to apply in custom editor.',
    );
  });
});
