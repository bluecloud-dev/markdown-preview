import {
  describeSelectionState,
  getVisibleToolbarCommands,
  isTransientToolbarCommand,
} from '../../src/webview/editor/toolbar-state';

let expect: Chai.ExpectStatic;

before(async () => {
  ({ expect } = await import('chai'));
});

describe('webview toolbar state', () => {
  const commands = [
    'toggleBold',
    'toggleItalic',
    'insertLink',
    'setHeading1',
    'setHeading2',
    'setHeading3',
    'setParagraph',
    'toggleBulletList',
    'toggleNumberedList',
    'insertTable',
    'insertCodeBlock',
    'insertMermaidBlock',
    'openRawMarkdown',
  ];

  it('keeps basic mode reading-oriented and advanced mode editing-expanded', () => {
    expect(
      getVisibleToolbarCommands(commands, {
        toolbarMode: 'basic',
        focusModeEnabled: false,
      }),
    ).to.deep.equal([
      'toggleBold',
      'toggleItalic',
      'insertLink',
      'setHeading1',
      'setHeading2',
      'setParagraph',
      'insertTable',
      'insertCodeBlock',
      'openRawMarkdown',
    ]);

    expect(
      getVisibleToolbarCommands(commands, {
        toolbarMode: 'advanced',
        focusModeEnabled: false,
      }),
    ).to.deep.equal(commands);
  });

  it('lets focus mode ignore toolbar density and stay minimal', () => {
    expect(
      getVisibleToolbarCommands(commands, {
        toolbarMode: 'advanced',
        focusModeEnabled: true,
      }),
    ).to.deep.equal([]);
  });

  it('describes the active selection for status feedback', () => {
    expect(
      describeSelectionState({
        bold: true,
        italic: false,
        link: true,
        headingLevel: 2,
        paragraph: false,
        bulletList: false,
        numberedList: false,
        table: false,
        code: false,
      }),
    ).to.equal('Selection: Heading 2, bold, link');

    expect(
      describeSelectionState({
        bold: false,
        italic: false,
        link: false,
        paragraph: true,
        bulletList: false,
        numberedList: false,
        table: false,
        code: false,
      }),
    ).to.equal('Selection: Paragraph');
  });

  it('limits transient active feedback to insertion and raw commands', () => {
    expect(isTransientToolbarCommand('insertLink')).to.equal(true);
    expect(isTransientToolbarCommand('insertTable')).to.equal(true);
    expect(isTransientToolbarCommand('toggleBold')).to.equal(false);
  });
});
