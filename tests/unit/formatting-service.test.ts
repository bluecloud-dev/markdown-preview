import sinon from 'sinon';
import * as vscode from 'vscode';
import { FormattingService } from '../../src/services/formatting-service';
let expect: Chai.ExpectStatic;

before(async () => {
  ({ expect } = await import('chai'));
});



const isWordCharacter = (character: string): boolean => /\w/.test(character);

const createEditor = (initialText: string) => {
  let text = initialText;

  const getLines = () => text.split('\n');

  const positionAt = (offset: number): vscode.Position => {
    let remaining = offset;
    for (const [lineIndex, lineText] of getLines().entries()) {
      const lineLength = lineText.length;
      if (remaining <= lineLength) {
        return new vscode.Position(lineIndex, remaining);
      }
      remaining -= lineLength + 1;
    }
    const lines = getLines();
    const lastLineIndex = Math.max(lines.length - 1, 0);
    const lastLineText = lines[lastLineIndex] ?? '';
    return new vscode.Position(lastLineIndex, lastLineText.length);
  };

  const offsetAt = (position: vscode.Position): number => {
    const lines = getLines();
    let offset = 0;
    for (const lineText of lines.slice(0, position.line)) {
      offset += lineText.length + 1;
    }
    return offset + position.character;
  };

  const document: vscode.TextDocument = {
    getText: (range?: vscode.Range) => {
      if (!range) {
        return text;
      }
      const start = offsetAt(range.start);
      const end = offsetAt(range.end);
      return text.slice(start, end);
    },
    offsetAt,
    positionAt,
    lineAt: (line: number) => {
      const lines = getLines();
      const lineText = lines[line] ?? '';
      let startOffset = 0;
      for (const previousLineText of lines.slice(0, line)) {
        startOffset += previousLineText.length + 1;
      }
      const endOffset = startOffset + lineText.length;
      return {
        text: lineText,
        range: new vscode.Range(positionAt(startOffset), positionAt(endOffset)),
      } as vscode.TextLine;
    },
    getWordRangeAtPosition: (position: vscode.Position) => {
      const offset = offsetAt(position);
      if (offset < 0 || offset >= text.length) {
        return;
      }
      const character = text[offset];
      if (character === undefined || !isWordCharacter(character)) {
        return;
      }
      let start = offset;
      while (start > 0 && isWordCharacter(text[start - 1] ?? '')) {
        start -= 1;
      }
      let end = offset;
      while (end < text.length && isWordCharacter(text[end] ?? '')) {
        end += 1;
      }
      return new vscode.Range(positionAt(start), positionAt(end));
    },
  } as vscode.TextDocument;

  const editor = {
    document,
    selection: new vscode.Selection(new vscode.Position(0, 0), new vscode.Position(0, 0)),
    edit: async (callback: (builder: vscode.TextEditorEdit) => void) => {
      const edits: Array<{
        type: 'replace' | 'insert';
        range?: vscode.Range;
        position?: vscode.Position;
        text: string;
      }> = [];
      const editBuilder: vscode.TextEditorEdit = {
        replace: (range: vscode.Range, newText: string) => {
          edits.push({ type: 'replace', range, text: newText });
        },
        insert: (position: vscode.Position, newText: string) => {
          edits.push({ type: 'insert', position, text: newText });
        },
      } as vscode.TextEditorEdit;

      callback(editBuilder);

      for (const edit of edits) {
        if (edit.type === 'replace' && edit.range) {
          const start = offsetAt(edit.range.start);
          const end = offsetAt(edit.range.end);
          text = text.slice(0, start) + edit.text + text.slice(end);
        }
        if (edit.type === 'insert' && edit.position) {
          const start = offsetAt(edit.position);
          text = text.slice(0, start) + edit.text + text.slice(start);
        }
      }
      return true;
    },
  } as unknown as vscode.TextEditor;

  return {
    editor,
    getText: () => text,
    setSelection: (start: number, end: number) => {
      editor.selection = new vscode.Selection(positionAt(start), positionAt(end));
    },
  };
};

describe('FormattingService', () => {
  afterEach(() => {
    sinon.restore();
  });

  it('inserts placeholder text when selection is empty and no word exists', async () => {
    const { editor, getText } = createEditor('');
    editor.selection = new vscode.Selection(new vscode.Position(0, 0), new vscode.Position(0, 0));

    const service = new FormattingService();
    await service.wrapSelection(editor, '**', '**', 'bold text');

    expect(getText()).to.equal('**bold text**');
    expect(editor.document.getText(editor.selection)).to.equal('bold text');
  });

  it('wraps selected content in fenced blocks', async () => {
    const { editor, getText, setSelection } = createEditor('line1\nline2');
    setSelection(0, 11);

    const service = new FormattingService();
    await service.wrapBlock(editor, '```', 'snippet');

    expect(getText()).to.equal('```\nline1\nline2\n```');
  });

  it('inserts fenced block placeholder when current line is empty', async () => {
    const { editor, getText } = createEditor('');
    editor.selection = new vscode.Selection(new vscode.Position(0, 0), new vscode.Position(0, 0));

    const service = new FormattingService();
    await service.wrapBlock(editor, '```', 'snippet');

    expect(getText()).to.equal('```\nsnippet\n```');
  });

  it('does nothing when link input is cancelled', async () => {
    const { editor, getText } = createEditor('text');
    editor.selection = new vscode.Selection(new vscode.Position(0, 0), new vscode.Position(0, 0));

    sinon.stub(vscode.window, 'showInputBox').resolves();

    const service = new FormattingService();
    await service.insertLink(editor);

    expect(getText()).to.equal('text');
  });

  it('uses url placeholder when user keeps default https prefix', async () => {
    const { editor, getText, setSelection } = createEditor('link');
    setSelection(0, 4);

    sinon.stub(vscode.window, 'showInputBox').resolves('https://');

    const service = new FormattingService();
    await service.insertLink(editor);

    expect(getText()).to.equal('[link](url)');
  });

  it('inserts link with default text when no selection exists', async () => {
    const { editor, getText } = createEditor('');
    editor.selection = new vscode.Selection(new vscode.Position(0, 0), new vscode.Position(0, 0));

    sinon.stub(vscode.window, 'showInputBox').resolves('https://example.com');

    const service = new FormattingService();
    await service.insertLink(editor);

    expect(getText()).to.equal('[text](https://example.com)');
  });

  it('wraps selected text with inline markers', async () => {
    const { editor, getText, setSelection } = createEditor('hello');
    setSelection(0, 5);

    const service = new FormattingService();
    await service.wrapSelection(editor, '**', '**', 'bold text');

    expect(getText()).to.equal('**hello**');
    expect(editor.document.getText(editor.selection)).to.equal('hello');
  });

  it('wraps the word at the cursor when selection is empty', async () => {
    const { editor, getText } = createEditor('hello world');
    editor.selection = new vscode.Selection(new vscode.Position(0, 1), new vscode.Position(0, 1));

    const service = new FormattingService();
    await service.wrapSelection(editor, '_', '_', 'italic');

    expect(getText()).to.equal('_hello_ world');
  });

  it('toggles line prefixes across selections', async () => {
    const { editor, getText } = createEditor('alpha\n- beta');
    editor.selection = new vscode.Selection(new vscode.Position(0, 0), new vscode.Position(1, 6));

    const service = new FormattingService();
    await service.toggleLinePrefix(editor, '- ');

    expect(getText()).to.equal('- alpha\nbeta');
  });

  it('toggles line prefix on the current line when selection is empty', async () => {
    const { editor, getText } = createEditor('alpha');
    editor.selection = new vscode.Selection(new vscode.Position(0, 0), new vscode.Position(0, 0));

    const service = new FormattingService();
    await service.toggleLinePrefix(editor, '- ');

    expect(getText()).to.equal('- alpha');
  });

  it('wraps non-empty lines in fenced blocks', async () => {
    const { editor, getText } = createEditor('code');
    editor.selection = new vscode.Selection(new vscode.Position(0, 0), new vscode.Position(0, 0));

    const service = new FormattingService();
    await service.wrapBlock(editor, '```', 'snippet');

    expect(getText()).to.equal('```\ncode\n```');
  });

  it('inserts markdown links from input', async () => {
    const { editor, getText, setSelection } = createEditor('link');
    setSelection(0, 4);

    sinon.stub(vscode.window, 'showInputBox').resolves('https://example.com');

    const service = new FormattingService();
    await service.insertLink(editor);

    expect(getText()).to.equal('[link](https://example.com)');
    expect(editor.document.getText(editor.selection)).to.equal('https://example.com');
  });
});
