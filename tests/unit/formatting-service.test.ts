import { expect } from 'chai';
import sinon from 'sinon';
import * as vscode from 'vscode';
import { FormattingService } from '../../src/services/formatting-service';

type EditOperation =
  | { type: 'insert'; position: vscode.Position; text: string }
  | { type: 'replace'; range: vscode.Range; text: string };

const createEditor = (content: string, selection: vscode.Selection): {
  editor: vscode.TextEditor;
  getText: () => string;
} => {
  let text = content;

  const getLines = (): string[] => text.split('\n');

  const offsetAt = (position: vscode.Position): number => {
    const lines = getLines();
    let offset = 0;
    for (const [lineIndex, lineText] of lines.entries()) {
      if (lineIndex >= position.line) {
        break;
      }
      offset += lineText.length + 1;
    }
    return offset + position.character;
  };

  const positionAt = (offset: number): vscode.Position => {
    const lines = getLines();
    let remaining = offset;
    for (const [lineIndex, lineText] of lines.entries()) {
      const lineLength = lineText.length;
      if (remaining <= lineLength) {
        return new vscode.Position(lineIndex, remaining);
      }
      remaining -= lineLength + 1;
    }
    const lastLine = Math.max(lines.length - 1, 0);
    return new vscode.Position(lastLine, lines[lastLine]?.length ?? 0);
  };

  const getWordRangeAtPosition = (
    position: vscode.Position
  ): vscode.Range | undefined => {
    const lines = getLines();
    const lineText = lines[position.line] ?? '';
    if (position.character > lineText.length) {
      return undefined;
    }
    const regex = /\w+/g;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(lineText))) {
      const start = match.index;
      const end = match.index + match[0].length;
      if (position.character >= start && position.character <= end) {
        return new vscode.Range(
          new vscode.Position(position.line, start),
          new vscode.Position(position.line, end)
        );
      }
    }
    return undefined;
  };

  const document = {
    getText: (range?: vscode.Range): string => {
      if (!range) {
        return text;
      }
      const start = offsetAt(range.start);
      const end = offsetAt(range.end);
      return text.slice(start, end);
    },
    lineAt: (line: number): { text: string; range: vscode.Range } => {
      const lines = getLines();
      const lineText = lines[line] ?? '';
      const startOffset = offsetAt(new vscode.Position(line, 0));
      const endOffset = startOffset + lineText.length;
      return {
        text: lineText,
        range: new vscode.Range(positionAt(startOffset), positionAt(endOffset)),
      };
    },
    positionAt,
    offsetAt,
    getWordRangeAtPosition,
    languageId: 'markdown',
  } as unknown as vscode.TextDocument;

  const editor = {
    document,
    selection,
    edit: async (callback: (editBuilder: vscode.TextEditorEdit) => void): Promise<boolean> => {
      const operations: EditOperation[] = [];
      const editBuilder = {
        insert: (position: vscode.Position, newText: string) => {
          operations.push({ type: 'insert', position, text: newText });
        },
        replace: (range: vscode.Range, newText: string) => {
          operations.push({ type: 'replace', range, text: newText });
        },
      } as vscode.TextEditorEdit;

      callback(editBuilder);
      operations.sort((a, b) => {
        const offsetA =
          a.type === 'insert' ? offsetAt(a.position) : offsetAt(a.range.start);
        const offsetB =
          b.type === 'insert' ? offsetAt(b.position) : offsetAt(b.range.start);
        return offsetB - offsetA;
      });

      for (const operation of operations) {
        if (operation.type === 'insert') {
          const start = offsetAt(operation.position);
          text = `${text.slice(0, start)}${operation.text}${text.slice(start)}`;
        } else {
          const start = offsetAt(operation.range.start);
          const end = offsetAt(operation.range.end);
          text = `${text.slice(0, start)}${operation.text}${text.slice(end)}`;
        }
      }

      return true;
    },
  } as unknown as vscode.TextEditor;

  return { editor, getText: () => text };
};

describe('FormattingService', () => {
  afterEach(() => {
    sinon.restore();
  });

  it('wraps selection with markers', async () => {
    const service = new FormattingService();
    const selection = new vscode.Selection(new vscode.Position(0, 0), new vscode.Position(0, 5));
    const { editor, getText } = createEditor('hello world', selection);

    await service.wrapSelection(editor, '**', '**', 'bold text');

    expect(getText()).to.equal('**hello** world');
    expect(editor.selection.start.character).to.equal(2);
    expect(editor.selection.end.character).to.equal(7);
  });

  it('wraps word under cursor when selection is empty', async () => {
    const service = new FormattingService();
    const selection = new vscode.Selection(new vscode.Position(0, 7), new vscode.Position(0, 7));
    const { editor, getText } = createEditor('hello world', selection);

    await service.wrapSelection(editor, '**', '**', 'bold text');

    expect(getText()).to.equal('hello **world**');
    expect(editor.selection.start.character).to.equal(8);
    expect(editor.selection.end.character).to.equal(13);
  });

  it('inserts placeholder when no word exists', async () => {
    const service = new FormattingService();
    const selection = new vscode.Selection(new vscode.Position(0, 6), new vscode.Position(0, 6));
    const { editor, getText } = createEditor('hello ', selection);

    await service.wrapSelection(editor, '**', '**', 'bold text');

    expect(getText()).to.equal('hello **bold text**');
    expect(editor.selection.start.character).to.equal(8);
    expect(editor.selection.end.character).to.equal(17);
  });

  it('toggles line prefixes', async () => {
    const service = new FormattingService();
    const selection = new vscode.Selection(new vscode.Position(0, 0), new vscode.Position(0, 0));
    const { editor, getText } = createEditor('item', selection);

    await service.toggleLinePrefix(editor, '- ');
    expect(getText()).to.equal('- item');

    await service.toggleLinePrefix(editor, '- ');
    expect(getText()).to.equal('item');
  });

  it('wraps selection in code blocks', async () => {
    const service = new FormattingService();
    const selection = new vscode.Selection(new vscode.Position(0, 0), new vscode.Position(0, 4));
    const { editor, getText } = createEditor('code', selection);

    await service.wrapBlock(editor, '```', 'code');

    expect(getText()).to.equal('```\ncode\n```');
  });

  it('inserts link and selects the url', async () => {
    const service = new FormattingService();
    const selection = new vscode.Selection(new vscode.Position(0, 0), new vscode.Position(0, 0));
    const { editor, getText } = createEditor('', selection);

    sinon.stub(vscode.window, 'showInputBox').resolves('https://example.com');
    await service.insertLink(editor);

    expect(getText()).to.equal('[text](https://example.com)');
    const selected = editor.document.getText(editor.selection);
    expect(selected).to.equal('https://example.com');
  });
});
