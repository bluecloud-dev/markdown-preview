import * as vscode from 'vscode';
import { SerializedMarkdownPayload } from './protocol';

type ApplyResult =
  { ok: true } | { ok: false; code: 'revision_mismatch' | 'apply_failed'; message: string };

export const reconcileTrailingNewlineForApply = (
  currentMarkdown: string,
  serializedMarkdown: string,
): string =>
  currentMarkdown.endsWith('\n') && !serializedMarkdown.endsWith('\n')
    ? `${serializedMarkdown}\n`
    : serializedMarkdown;

export class DocumentSync {
  private revision = 0;

  constructor(private readonly document: vscode.TextDocument) {}

  getSnapshot(): SerializedMarkdownPayload {
    return {
      markdown: this.document.getText(),
      revision: this.revision,
    };
  }

  handleDocumentChanged(
    event: vscode.TextDocumentChangeEvent,
  ): SerializedMarkdownPayload | undefined {
    if (event.document.uri.toString() !== this.document.uri.toString()) {
      return undefined;
    }
    this.revision += 1;
    return this.getSnapshot();
  }

  async applyDocument(markdown: string, expectedRevision: number): Promise<ApplyResult> {
    if (expectedRevision !== this.revision) {
      return {
        ok: false,
        code: 'revision_mismatch',
        message: `Revision mismatch. expected=${expectedRevision} current=${this.revision}`,
      };
    }

    if (markdown === this.document.getText()) {
      return { ok: true };
    }

    const markdownToApply = reconcileTrailingNewlineForApply(this.document.getText(), markdown);
    const workspaceEdit = new vscode.WorkspaceEdit();
    workspaceEdit.replace(this.document.uri, this.getFullRange(), markdownToApply);
    const applied = await vscode.workspace.applyEdit(workspaceEdit);
    if (!applied) {
      return {
        ok: false,
        code: 'apply_failed',
        message: 'VS Code failed to apply the markdown update.',
      };
    }

    return { ok: true };
  }

  private getFullRange(): vscode.Range {
    const start = new vscode.Position(0, 0);
    const lastLine = this.document.lineCount - 1;
    const end = this.document.lineAt(lastLine).range.end;
    return new vscode.Range(start, end);
  }
}
