import * as vscode from 'vscode';
import { SerializedMarkdownPayload } from './protocol';

type ApplyResult =
  | { ok: true; applied: boolean }
  | { ok: false; code: 'revision_mismatch' | 'apply_failed'; message: string };

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

    // Reconcile BEFORE the no-op check: a serialization that differs from the
    // document only by the dropped final newline reconciles back to identical
    // text, and applying that edit would be a no-op whose change-event
    // behavior is up to VS Code. Callers rely on `applied` to know whether an
    // onDidChangeTextDocument echo will follow.
    const markdownToApply = reconcileTrailingNewlineForApply(this.document.getText(), markdown);
    if (markdownToApply === this.document.getText()) {
      return { ok: true, applied: false };
    }

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

    return { ok: true, applied: true };
  }

  private getFullRange(): vscode.Range {
    const start = new vscode.Position(0, 0);
    const lastLine = this.document.lineCount - 1;
    const end = this.document.lineAt(lastLine).range.end;
    return new vscode.Range(start, end);
  }
}
