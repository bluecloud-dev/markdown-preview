import * as vscode from 'vscode';
import { FormattingService } from '../services/formatting-service';

const runFormatting = async (
  editor: vscode.TextEditor | undefined,
  action: (editor: vscode.TextEditor) => Promise<void>
): Promise<void> => {
  if (!editor || editor.document.languageId !== 'markdown') {
    return;
  }

  await action(editor);
};

export const formatBold = async (
  editor: vscode.TextEditor,
  formattingService: FormattingService
): Promise<void> =>
  runFormatting(editor, (activeEditor) =>
    formattingService.wrapSelection(activeEditor, '**', '**', 'bold text')
  );

export const formatItalic = async (
  editor: vscode.TextEditor,
  formattingService: FormattingService
): Promise<void> =>
  runFormatting(editor, (activeEditor) =>
    formattingService.wrapSelection(activeEditor, '_', '_', 'italic text')
  );

export const formatStrikethrough = async (
  editor: vscode.TextEditor,
  formattingService: FormattingService
): Promise<void> =>
  runFormatting(editor, (activeEditor) =>
    formattingService.wrapSelection(activeEditor, '~~', '~~', 'strikethrough')
  );

export const formatInlineCode = async (
  editor: vscode.TextEditor,
  formattingService: FormattingService
): Promise<void> =>
  runFormatting(editor, (activeEditor) =>
    formattingService.wrapSelection(activeEditor, '`', '`', 'code')
  );

export const formatCodeBlock = async (
  editor: vscode.TextEditor,
  formattingService: FormattingService
): Promise<void> =>
  runFormatting(editor, (activeEditor) =>
    formattingService.wrapBlock(activeEditor, '```', 'code')
  );

export const formatBulletList = async (
  editor: vscode.TextEditor,
  formattingService: FormattingService
): Promise<void> =>
  runFormatting(editor, (activeEditor) =>
    formattingService.toggleLinePrefix(activeEditor, '- ')
  );

export const formatNumberedList = async (
  editor: vscode.TextEditor,
  formattingService: FormattingService
): Promise<void> =>
  runFormatting(editor, (activeEditor) =>
    formattingService.toggleLinePrefix(activeEditor, '1. ')
  );

export const formatLink = async (
  editor: vscode.TextEditor,
  formattingService: FormattingService
): Promise<void> =>
  runFormatting(editor, (activeEditor) =>
    formattingService.insertLink(activeEditor)
  );

export const formatHeading1 = async (
  editor: vscode.TextEditor,
  formattingService: FormattingService
): Promise<void> =>
  runFormatting(editor, (activeEditor) =>
    formattingService.toggleLinePrefix(activeEditor, '# ')
  );

export const formatHeading2 = async (
  editor: vscode.TextEditor,
  formattingService: FormattingService
): Promise<void> =>
  runFormatting(editor, (activeEditor) =>
    formattingService.toggleLinePrefix(activeEditor, '## ')
  );

export const formatHeading3 = async (
  editor: vscode.TextEditor,
  formattingService: FormattingService
): Promise<void> =>
  runFormatting(editor, (activeEditor) =>
    formattingService.toggleLinePrefix(activeEditor, '### ')
  );
