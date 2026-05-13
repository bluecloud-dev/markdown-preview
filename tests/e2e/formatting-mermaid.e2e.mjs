import {
  executeWorkbenchCommandOnceAndWaitForWorkspaceFileText,
  openWorkspaceFile,
  waitForCustomEditor,
} from './helpers.mjs';

const executeFormattingCommand = (command, predicate, errorMessage) =>
  executeWorkbenchCommandOnceAndWaitForWorkspaceFileText(
    'with-formatting.md',
    command,
    predicate,
    errorMessage,
    { attempts: 12, interval: 250 },
  );

describe('Formatting journey', () => {
  it('toggles bold and italic on/off without stacking markers', async () => {
    await openWorkspaceFile('with-formatting.md');
    await waitForCustomEditor('with-formatting.md');

    await executeFormattingCommand(
      'muninn.toggleBold',
      (text) => text.includes('**Formatting**'),
      'Expected first bold toggle to apply markdown emphasis.',
    );

    await executeFormattingCommand(
      'muninn.toggleBold',
      (text) => !text.includes('**Formatting**'),
      'Expected second bold toggle to remove markdown emphasis.',
    );

    await executeFormattingCommand(
      'muninn.toggleItalic',
      (text) => text.includes('_Formatting_') || text.includes('*Formatting*'),
      'Expected italic toggle to apply emphasis after bold toggles.',
    );

    await executeFormattingCommand(
      'muninn.toggleItalic',
      (text) => !text.includes('_Formatting_') && !text.includes('*Formatting*'),
      'Expected second italic toggle to remove emphasis cleanly.',
    );
  });
});
