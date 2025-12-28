/**
 * @fileoverview Command handlers for markdown formatting operations.
 *
 * This module exports command handler functions for all formatting operations
 * supported by the extension. Each handler is a thin wrapper that:
 * - Validates the active editor is a markdown document
 * - Delegates to the FormattingService for the actual text transformation
 *
 * These handlers are registered with VS Code in extension.ts and can be invoked
 * via keyboard shortcuts, toolbar buttons, or the Command Palette.
 *
 * @module commands/format-commands
 */

import * as vscode from 'vscode';
import { FormattingService } from '../services/formatting-service';
import { t } from '../utils/l10n';

/**
 * Helper function to validate editor and execute a formatting action.
 * Ensures the editor exists and contains a markdown document before
 * running the formatting operation.
 *
 * @param editor - The text editor to validate
 * @param action - The formatting action to execute if validation passes
 * @internal
 */
const runFormatting = async (
  editor: vscode.TextEditor | undefined,
  action: (editor: vscode.TextEditor) => Promise<void>
): Promise<void> => {
  if (!editor || editor.document.languageId !== 'markdown') {
    return;
  }

  await action(editor);
};

/**
 * Apply bold formatting to the current selection.
 * @param editor Active text editor.
 * @param formattingService Formatting service.
 * @returns Promise resolved when formatting completes.
 * @throws Propagates VS Code edit errors.
 */
export const formatBold = async (
  editor: vscode.TextEditor,
  formattingService: FormattingService
): Promise<void> =>
  runFormatting(editor, (activeEditor) =>
    formattingService.wrapSelection(activeEditor, '**', '**', t('bold text'))
  );

/**
 * Apply italic formatting to the current selection.
 * @param editor Active text editor.
 * @param formattingService Formatting service.
 * @returns Promise resolved when formatting completes.
 * @throws Propagates VS Code edit errors.
 */
export const formatItalic = async (
  editor: vscode.TextEditor,
  formattingService: FormattingService
): Promise<void> =>
  runFormatting(editor, (activeEditor) =>
    formattingService.wrapSelection(activeEditor, '_', '_', t('italic text'))
  );

/**
 * Apply strikethrough formatting to the current selection.
 * @param editor Active text editor.
 * @param formattingService Formatting service.
 * @returns Promise resolved when formatting completes.
 * @throws Propagates VS Code edit errors.
 */
export const formatStrikethrough = async (
  editor: vscode.TextEditor,
  formattingService: FormattingService
): Promise<void> =>
  runFormatting(editor, (activeEditor) =>
    formattingService.wrapSelection(activeEditor, '~~', '~~', t('strikethrough'))
  );

/**
 * Apply inline code formatting to the current selection.
 * @param editor Active text editor.
 * @param formattingService Formatting service.
 * @returns Promise resolved when formatting completes.
 * @throws Propagates VS Code edit errors.
 */
export const formatInlineCode = async (
  editor: vscode.TextEditor,
  formattingService: FormattingService
): Promise<void> =>
  runFormatting(editor, (activeEditor) =>
    formattingService.wrapSelection(activeEditor, '`', '`', t('code'))
  );

/**
 * Apply code block formatting to the current selection.
 * @param editor Active text editor.
 * @param formattingService Formatting service.
 * @returns Promise resolved when formatting completes.
 * @throws Propagates VS Code edit errors.
 */
export const formatCodeBlock = async (
  editor: vscode.TextEditor,
  formattingService: FormattingService
): Promise<void> =>
  runFormatting(editor, (activeEditor) =>
    formattingService.wrapBlock(activeEditor, '```', t('code'))
  );

/**
 * Toggle bullet list formatting on the current line(s).
 * @param editor Active text editor.
 * @param formattingService Formatting service.
 * @returns Promise resolved when formatting completes.
 * @throws Propagates VS Code edit errors.
 */
export const formatBulletList = async (
  editor: vscode.TextEditor,
  formattingService: FormattingService
): Promise<void> =>
  runFormatting(editor, (activeEditor) =>
    formattingService.toggleLinePrefix(activeEditor, '- ')
  );

/**
 * Toggle numbered list formatting on the current line(s).
 * @param editor Active text editor.
 * @param formattingService Formatting service.
 * @returns Promise resolved when formatting completes.
 * @throws Propagates VS Code edit errors.
 */
export const formatNumberedList = async (
  editor: vscode.TextEditor,
  formattingService: FormattingService
): Promise<void> =>
  runFormatting(editor, (activeEditor) =>
    formattingService.toggleLinePrefix(activeEditor, '1. ')
  );

/**
 * Insert a markdown link.
 * @param editor Active text editor.
 * @param formattingService Formatting service.
 * @returns Promise resolved when formatting completes.
 * @throws Propagates VS Code edit errors.
 */
export const formatLink = async (
  editor: vscode.TextEditor,
  formattingService: FormattingService
): Promise<void> =>
  runFormatting(editor, (activeEditor) =>
    formattingService.insertLink(activeEditor)
  );

/**
 * Toggle H1 heading formatting on the current line(s).
 * @param editor Active text editor.
 * @param formattingService Formatting service.
 * @returns Promise resolved when formatting completes.
 * @throws Propagates VS Code edit errors.
 */
export const formatHeading1 = async (
  editor: vscode.TextEditor,
  formattingService: FormattingService
): Promise<void> =>
  runFormatting(editor, (activeEditor) =>
    formattingService.toggleLinePrefix(activeEditor, '# ')
  );

/**
 * Toggle H2 heading formatting on the current line(s).
 * @param editor Active text editor.
 * @param formattingService Formatting service.
 * @returns Promise resolved when formatting completes.
 * @throws Propagates VS Code edit errors.
 */
export const formatHeading2 = async (
  editor: vscode.TextEditor,
  formattingService: FormattingService
): Promise<void> =>
  runFormatting(editor, (activeEditor) =>
    formattingService.toggleLinePrefix(activeEditor, '## ')
  );

/**
 * Toggle H3 heading formatting on the current line(s).
 * @param editor Active text editor.
 * @param formattingService Formatting service.
 * @returns Promise resolved when formatting completes.
 * @throws Propagates VS Code edit errors.
 */
export const formatHeading3 = async (
  editor: vscode.TextEditor,
  formattingService: FormattingService
): Promise<void> =>
  runFormatting(editor, (activeEditor) =>
    formattingService.toggleLinePrefix(activeEditor, '### ')
  );
