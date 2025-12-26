import * as vscode from 'vscode';

export const t = (
  message: string,
  ...values: Array<string | number | boolean>
): string => vscode.l10n.t(message, ...values);
