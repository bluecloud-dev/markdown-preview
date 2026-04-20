import { browser } from '@wdio/globals';
import {
  openWorkspaceFile,
  readWorkspaceFileText,
  waitForCustomEditor,
} from './helpers.mjs';

const executeUntil = async (command, predicate, errorMessage) => {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    await browser.executeWorkbench(async (vscode, commandName) => {
      await vscode.commands.executeCommand(commandName);
    }, command);
    await browser.pause(180);

    const text = await readWorkspaceFileText('with-formatting.md');
    if (predicate(text)) {
      return;
    }
  }
  throw new Error(errorMessage);
};

describe('Formatting journey', () => {
  it('toggles bold and italic on/off without stacking markers', async () => {
    await openWorkspaceFile('with-formatting.md');
    await waitForCustomEditor('with-formatting.md');

    await executeUntil(
      'muninn.toggleBold',
      (text) => text.includes('**Formatting**'),
      'Expected first bold toggle to apply markdown emphasis.'
    );

    await executeUntil(
      'muninn.toggleBold',
      (text) => !text.includes('**Formatting**'),
      'Expected second bold toggle to remove markdown emphasis.'
    );

    await executeUntil(
      'muninn.toggleItalic',
      (text) => text.includes('_Formatting_') || text.includes('*Formatting*'),
      'Expected italic toggle to apply emphasis after bold toggles.'
    );

    await executeUntil(
      'muninn.toggleItalic',
      (text) => !text.includes('_Formatting_') && !text.includes('*Formatting*'),
      'Expected second italic toggle to remove emphasis cleanly.'
    );
  });
});
