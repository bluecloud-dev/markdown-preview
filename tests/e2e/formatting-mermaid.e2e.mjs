import { browser } from '@wdio/globals';
import {
  executeWorkbenchCommandUntilWorkspaceFileText,
  openWorkspaceFile,
  waitForCustomEditor,
} from './helpers.mjs';

const executeFormattingCommandUntil = (command, predicate, errorMessage) =>
  executeWorkbenchCommandUntilWorkspaceFileText(
    'with-formatting.md',
    command,
    predicate,
    errorMessage,
    { attempts: 20, interval: 250 },
  );

describe('Formatting journey', () => {
  it('toggles bold and italic on/off without stacking markers', async () => {
    await openWorkspaceFile('with-formatting.md');
    await waitForCustomEditor('with-formatting.md');
    await browser.pause(400);

    await executeFormattingCommandUntil(
      'muninn.toggleBold',
      (text) => text.includes('**Formatting**'),
      'Expected first bold toggle to apply markdown emphasis.',
    );

    await executeFormattingCommandUntil(
      'muninn.toggleBold',
      (text) => !text.includes('**Formatting**'),
      'Expected second bold toggle to remove markdown emphasis.',
    );

    await executeFormattingCommandUntil(
      'muninn.toggleItalic',
      (text) => text.includes('_Formatting_') || text.includes('*Formatting*'),
      'Expected italic toggle to apply emphasis after bold toggles.',
    );

    await executeFormattingCommandUntil(
      'muninn.toggleItalic',
      (text) => !text.includes('_Formatting_') && !text.includes('*Formatting*'),
      'Expected second italic toggle to remove emphasis cleanly.',
    );
  });
});
