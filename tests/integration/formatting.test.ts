import fs from 'node:fs';
import path from 'node:path';
import sinon from 'sinon';
import * as vscode from 'vscode';
import {
  formatBold,
  formatItalic,
  formatStrikethrough,
} from '../../src/commands/format-commands';
import { FormattingService } from '../../src/services/formatting-service';
let expect: Chai.ExpectStatic;

before(async () => {
  ({ expect } = await import('chai'));
});



type EditOperation =
  | { type: 'insert'; position: vscode.Position; text: string }
  | { type: 'replace'; range: vscode.Range; text: string };

type PackageJsonMenus = Record<
  string,
  Array<{ command?: string; submenu?: string; when?: string }>
>;

const loadPackageJsonMenus = (): PackageJsonMenus => {
  const packageJsonPath = path.resolve(__dirname, '..', '..', '..', 'package.json');
  const raw = fs.readFileSync(packageJsonPath, 'utf8');
  const packageJson = JSON.parse(raw) as {
    contributes?: { menus?: PackageJsonMenus };
  };
  return packageJson.contributes?.menus ?? {};
};

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

describe('Formatting toolbar integration', () => {
  afterEach(() => {
    sinon.restore();
  });

  it('shows toolbar icons only in edit mode', () => {
    const menus = loadPackageJsonMenus();
    const titleMenus = menus['editor/title'] ?? [];
    const toolbarCommands = [
      'markdownReader.formatBold',
      'markdownReader.formatItalic',
      'markdownReader.formatStrikethrough',
      'markdownReader.formatBulletList',
      'markdownReader.formatNumberedList',
      'markdownReader.formatInlineCode',
      'markdownReader.formatCodeBlock',
      'markdownReader.formatLink',
    ];

    for (const command of toolbarCommands) {
      const entry = titleMenus.find((item) => item.command === command);
      expect(entry, `missing toolbar command ${command}`).to.not.equal(undefined);
      expect(entry?.when).to.include('markdownReader.editMode');
      expect(entry?.when).to.include('markdownReader.isMarkdown');
    }
  });

  it('shows Format submenu in context menu only in edit mode', () => {
    const menus = loadPackageJsonMenus();
    const contextMenus = menus['editor/context'] ?? [];
    const formatEntry = contextMenus.find(
      (item) => item.submenu === 'markdownReader.formatSubmenu'
    );

    expect(formatEntry, 'missing Format submenu entry').to.not.equal(undefined);
    expect(formatEntry?.when).to.include('markdownReader.editMode');
    expect(formatEntry?.when).to.include('markdownReader.isMarkdown');
  });

  it('includes heading and code submenu items', () => {
    const menus = loadPackageJsonMenus();

    const headingMenus = menus['markdownReader.headingSubmenu'] ?? [];
    const headingCommands = headingMenus.map((item) => item.command);
    expect(headingCommands).to.include('markdownReader.formatHeading1');
    expect(headingCommands).to.include('markdownReader.formatHeading2');
    expect(headingCommands).to.include('markdownReader.formatHeading3');

    const codeMenus = menus['markdownReader.codeSubmenu'] ?? [];
    const codeCommands = codeMenus.map((item) => item.command);
    expect(codeCommands).to.include('markdownReader.formatInlineCode');
    expect(codeCommands).to.include('markdownReader.formatCodeBlock');
  });

  it('formats selections for bold, italic, and strikethrough', async () => {
    const service = new FormattingService();

    const boldSelection = new vscode.Selection(new vscode.Position(0, 0), new vscode.Position(0, 5));
    const boldEditor = createEditor('hello world', boldSelection);
    await formatBold(boldEditor.editor, service);
    expect(boldEditor.getText()).to.equal('**hello** world');

    const italicSelection = new vscode.Selection(new vscode.Position(0, 0), new vscode.Position(0, 4));
    const italicEditor = createEditor('text', italicSelection);
    await formatItalic(italicEditor.editor, service);
    expect(italicEditor.getText()).to.equal('_text_');

    const strikeSelection = new vscode.Selection(new vscode.Position(0, 0), new vscode.Position(0, 4));
    const strikeEditor = createEditor('gone', strikeSelection);
    await formatStrikethrough(strikeEditor.editor, service);
    expect(strikeEditor.getText()).to.equal('~~gone~~');
  });

  it('applies no-selection behavior for word under cursor or placeholder', async () => {
    const service = new FormattingService();

    const wordSelection = new vscode.Selection(new vscode.Position(0, 7), new vscode.Position(0, 7));
    const wordEditor = createEditor('hello world', wordSelection);
    await formatBold(wordEditor.editor, service);
    expect(wordEditor.getText()).to.equal('hello **world**');

    const emptySelection = new vscode.Selection(new vscode.Position(0, 6), new vscode.Position(0, 6));
    const placeholderEditor = createEditor('hello ', emptySelection);
    await formatBold(placeholderEditor.editor, service);
    expect(placeholderEditor.getText()).to.equal('hello **bold text**');
  });
});
