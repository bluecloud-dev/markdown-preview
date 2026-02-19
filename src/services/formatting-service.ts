/**
 * @fileoverview Text formatting service for markdown editing operations.
 *
 * This service provides the core text transformation logic for markdown formatting:
 * - Inline formatting (bold, italic, strikethrough, code)
 * - Line prefix toggling (lists, headings)
 * - Block formatting (code blocks)
 * - Link insertion with URL prompts
 *
 * All operations use VS Code's native TextEditorEdit API for reliable undo/redo
 * support. The service handles both selected text and empty selections by using
 * the word under cursor or inserting placeholder text.
 *
 * @module services/formatting-service
 */

import path from 'node:path';
import * as vscode from 'vscode';
import { t } from '../utils/l10n';

/**
 * Service for applying markdown formatting to text in the editor.
 *
 * This service implements the formatting logic required by the toolbar buttons,
 * context menu, and keyboard shortcuts. It ensures consistent behavior across
 * all formatting entry points.
 *
 * @example
 * ```typescript
 * const formattingService = new FormattingService();
 *
 * // Wrap selection with bold markers
 * await formattingService.wrapSelection(editor, '**', '**', 'bold text');
 *
 * // Toggle bullet list on current line
 * await formattingService.toggleLinePrefix(editor, '- ');
 *
 * // Insert a link with URL prompt
 * await formattingService.insertLink(editor);
 * ```
 */
export class FormattingService {
  /**
   * Wrap a selection (or word at cursor) with prefix and suffix markers.
   * @param editor Active text editor.
   * @param prefix Marker prefix.
   * @param suffix Marker suffix.
   * @param placeholder Placeholder text for empty selections.
   * @returns Promise resolved when the edit completes.
   * @throws Propagates VS Code edit errors.
   */
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

  /**
   * Toggle a line prefix across the selected lines.
   * @param editor Active text editor.
   * @param prefix Prefix to toggle.
   * @returns Promise resolved when the edit completes.
   * @throws Propagates VS Code edit errors.
   */
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

  /**
   * Wrap a selection or current line inside a fenced block.
   * @param editor Active text editor.
   * @param fence Fence marker (for example, ```).
   * @param placeholder Placeholder text when no selection exists.
   * @returns Promise resolved when the edit completes.
   * @throws Propagates VS Code edit errors.
   */
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

  /**
   * Insert a markdown link using a user-provided URL.
   * @param editor Active text editor.
   * @returns Promise resolved when the edit completes.
   * @throws Propagates VS Code UI or edit errors.
   */
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

  /**
   * Toggle task list checkboxes across the selected lines.
   * @param editor Active text editor.
   * @returns Promise resolved when the edit completes.
   * @throws Propagates VS Code edit errors.
   */
  async toggleTaskList(editor: vscode.TextEditor): Promise<void> {
    const document = editor.document;
    const selection = editor.selection;
    const startLine = selection.isEmpty ? selection.active.line : selection.start.line;
    const endLine = selection.isEmpty ? selection.active.line : selection.end.line;

    await editor.edit((editBuilder) => {
      for (let lineIndex = endLine; lineIndex >= startLine; lineIndex -= 1) {
        const line = document.lineAt(lineIndex);
        const taskMatch = line.text.match(/^(\s*)([-*+] )?\[( |x|X)\]\s?(.*)$/);
        if (taskMatch) {
          const indent = taskMatch[1] ?? '';
          const marker = taskMatch[2] ?? '- ';
          const isChecked = (taskMatch[3] ?? '').toLowerCase() === 'x';
          const rest = taskMatch[4] ?? '';
          const nextState = isChecked ? ' ' : 'x';
          editBuilder.replace(
            line.range,
            `${indent}${marker}[${nextState}] ${rest}`
          );
          continue;
        }

        const indentMatch = line.text.match(/^(\s*)/);
        const indent = indentMatch ? indentMatch[1] : '';
        const remaining = line.text.slice(indent.length);
        const listMatch = remaining.match(/^([-*+] )(.+)$/);
        if (listMatch) {
          const marker = listMatch[1];
          const rest = listMatch[2];
          editBuilder.replace(line.range, `${indent}${marker}[ ] ${rest}`);
          continue;
        }

        editBuilder.replace(line.range, `${indent}- [ ] ${remaining}`);
      }
    });
  }

  /**
   * Insert a horizontal rule on its own line.
   * @param editor Active text editor.
   * @returns Promise resolved when the edit completes.
   * @throws Propagates VS Code edit errors.
   */
  async insertHorizontalRule(editor: vscode.TextEditor): Promise<void> {
    const document = editor.document;
    const selection = editor.selection;
    const line = document.lineAt(selection.active.line);
    const insertAtEnd = line.range.end;

    if (selection.isEmpty && line.text.trim().length === 0) {
      const startOffset = document.offsetAt(line.range.start);
      await editor.edit((editBuilder) => {
        editBuilder.replace(line.range, '---');
      });
      const selectionStart = document.positionAt(startOffset);
      const selectionEnd = document.positionAt(startOffset + 3);
      editor.selection = new vscode.Selection(selectionStart, selectionEnd);
      return;
    }

    const prefix = line.text.trim().length > 0 ? '\n' : '';
    const insertion = `${prefix}---\n`;
    const startOffset = document.offsetAt(insertAtEnd) + prefix.length;
    await editor.edit((editBuilder) => {
      editBuilder.insert(insertAtEnd, insertion);
    });
    const selectionStart = document.positionAt(startOffset);
    const selectionEnd = document.positionAt(startOffset + 3);
    editor.selection = new vscode.Selection(selectionStart, selectionEnd);
  }

  /**
   * Insert a markdown image link from a file picker selection.
   * @param editor Active text editor.
   * @returns Promise resolved when the edit completes.
   * @throws Propagates VS Code UI or edit errors.
   */
  async insertImage(editor: vscode.TextEditor): Promise<void> {
    const document = editor.document;
    const selection = editor.selection;
    const selected = await vscode.window.showOpenDialog({
      canSelectMany: false,
      filters: {
        Images: ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'bmp'],
      },
    });
    if (!selected || selected.length === 0) {
      return;
    }

    const imageUri = selected[0];
    const altText = selection.isEmpty
      ? t('alt text')
      : document.getText(selection);
    const imagePath = this.getImagePath(document.uri, imageUri);
    const replaceRange = selection.isEmpty
      ? new vscode.Range(selection.active, selection.active)
      : selection;
    const startOffset = document.offsetAt(replaceRange.start);
    const replacement = `![${altText}](${imagePath})`;

    await editor.edit((editBuilder) => {
      editBuilder.replace(replaceRange, replacement);
    });

    const selectionStart = document.positionAt(startOffset + 2);
    const selectionEnd = document.positionAt(startOffset + 2 + altText.length);
    editor.selection = new vscode.Selection(selectionStart, selectionEnd);
  }

  private getImagePath(documentUri: vscode.Uri, imageUri: vscode.Uri): string {
    if (documentUri.scheme === 'file' && imageUri.scheme === 'file') {
      const documentDirectory = path.dirname(documentUri.fsPath);
      const relativePath = path.relative(documentDirectory, imageUri.fsPath);
      return relativePath.split(path.sep).join('/');
    }

    if (imageUri.scheme === 'file') {
      return imageUri.fsPath.split(path.sep).join('/');
    }

    return imageUri.toString();
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
