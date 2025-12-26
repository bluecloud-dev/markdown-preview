import * as vscode from 'vscode';

const BINARY_SAMPLE_SIZE = 8 * 1024;

export class ValidationService {
  isMarkdownFile(document: vscode.TextDocument): boolean {
    return document.languageId === 'markdown';
  }

  isDiffView(document: vscode.TextDocument): boolean {
    return document.uri.scheme === 'git' || document.uri.scheme === 'diff';
  }

  async isLargeFile(uri: vscode.Uri, maxFileSize: number): Promise<boolean> {
    try {
      const stat = await vscode.workspace.fs.stat(uri);
      return stat.size > maxFileSize;
    } catch {
      return false;
    }
  }

  async isBinaryFile(uri: vscode.Uri): Promise<boolean> {
    try {
      const data = await vscode.workspace.fs.readFile(uri);
      const sample = data.slice(0, BINARY_SAMPLE_SIZE);

      for (const byte of sample) {
        if (byte === 0) {
          return true;
        }
      }

      const decoder = new TextDecoder('utf8', { fatal: true });
      decoder.decode(sample);
      return false;
    } catch {
      return false;
    }
  }
}
