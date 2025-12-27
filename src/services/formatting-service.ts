import * as vscode from 'vscode';
import { t } from '../utils/l10n';

export class FormattingService {
  async wrapSelection(
    editor: vscode.TextEditor,
    prefix: string,
    suffix: string,
    placeholder: string
  ): Promise<void> {
    const document = editor.document;
    const range = this.getSelectionOrWordRange(document, editor.selection);

    if (range) {
      const text = document.getText(range);
      const startOffset = document.offsetAt(range.start);
      await editor.edit((editBuilder) => {
        editBuilder.replace(range, `${prefix}${text}${suffix}`);
      });
      const selectionStart = document.positionAt(startOffset + prefix.length);
      const selectionEnd = document.positionAt(startOffset + prefix.length + text.length);
      editor.selection = new vscode.Selection(selectionStart, selectionEnd);
      return;
    }

    const cursor = editor.selection.active;
    const startOffset = document.offsetAt(cursor);
    await editor.edit((editBuilder) => {
      editBuilder.insert(cursor, `${prefix}${placeholder}${suffix}`);
    });
    const selectionStart = document.positionAt(startOffset + prefix.length);
    const selectionEnd = document.positionAt(startOffset + prefix.length + placeholder.length);
    editor.selection = new vscode.Selection(selectionStart, selectionEnd);
  }

  async toggleLinePrefix(editor: vscode.TextEditor, prefix: string): Promise<void> {
    const document = editor.document;
    const selection = editor.selection;
    const startLine = selection.isEmpty ? selection.active.line : selection.start.line;
    const endLine = selection.isEmpty ? selection.active.line : selection.end.line;

    await editor.edit((editBuilder) => {
      for (let lineIndex = endLine; lineIndex >= startLine; lineIndex -= 1) {
        const line = document.lineAt(lineIndex);
        if (line.text.startsWith(prefix)) {
          const removeRange = new vscode.Range(
            line.range.start,
            line.range.start.translate(0, prefix.length)
          );
          editBuilder.replace(removeRange, '');
        } else {
          editBuilder.insert(line.range.start, prefix);
        }
      }
    });
  }

  async wrapBlock(
    editor: vscode.TextEditor,
    fence: string,
    placeholder: string
  ): Promise<void> {
    const document = editor.document;
    const selection = editor.selection;
    const prefix = `${fence}\n`;
    const suffix = `\n${fence}`;
    let targetRange: vscode.Range | undefined;

    if (selection.isEmpty) {
      const line = document.lineAt(selection.active.line);
      if (line.text.trim().length > 0) {
        targetRange = line.range;
      }
    } else {
      targetRange = selection;
    }

    if (targetRange) {
      const text = document.getText(targetRange);
      const startOffset = document.offsetAt(targetRange.start);
      await editor.edit((editBuilder) => {
        editBuilder.replace(targetRange, `${prefix}${text}${suffix}`);
      });
      const selectionStart = document.positionAt(startOffset + prefix.length);
      const selectionEnd = document.positionAt(startOffset + prefix.length + text.length);
      editor.selection = new vscode.Selection(selectionStart, selectionEnd);
      return;
    }

    const cursor = selection.active;
    const startOffset = document.offsetAt(cursor);
    await editor.edit((editBuilder) => {
      editBuilder.insert(cursor, `${prefix}${placeholder}${suffix}`);
    });
    const selectionStart = document.positionAt(startOffset + prefix.length);
    const selectionEnd = document.positionAt(startOffset + prefix.length + placeholder.length);
    editor.selection = new vscode.Selection(selectionStart, selectionEnd);
  }

  async insertLink(editor: vscode.TextEditor): Promise<void> {
    const document = editor.document;
    const selection = editor.selection;
    const defaultUrl = 'https://';
    const urlInput = await vscode.window.showInputBox({
      prompt: t('Enter URL'),
      placeHolder: t('Example: https://example.com'),
      value: defaultUrl,
      valueSelection: [defaultUrl.length, defaultUrl.length],
    });
    if (urlInput === undefined) {
      return;
    }

    const trimmedUrl = urlInput.trim();
    const url =
      trimmedUrl.length > 0 && trimmedUrl !== defaultUrl ? trimmedUrl : 'url';
    const targetRange = this.getSelectionOrWordRange(document, selection);
    const text = targetRange ? document.getText(targetRange) : 'text';
    const replaceRange =
      targetRange ?? new vscode.Range(selection.active, selection.active);
    const startOffset = document.offsetAt(replaceRange.start);
    const replacement = `[${text}](${url})`;

    await editor.edit((editBuilder) => {
      editBuilder.replace(replaceRange, replacement);
    });

    const urlStartOffset = startOffset + text.length + 3;
    const selectionStart = document.positionAt(urlStartOffset);
    const selectionEnd = document.positionAt(urlStartOffset + url.length);
    editor.selection = new vscode.Selection(selectionStart, selectionEnd);
  }

  private getSelectionOrWordRange(
    document: vscode.TextDocument,
    selection: vscode.Selection
  ): vscode.Range | undefined {
    if (!selection.isEmpty) {
      return selection;
    }
    return document.getWordRangeAtPosition(selection.active);
  }
}
