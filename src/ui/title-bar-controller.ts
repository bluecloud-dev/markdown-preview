import * as vscode from 'vscode';
import { StateService } from '../services/state-service';
import { ViewMode } from '../types/state';

export class TitleBarController implements vscode.Disposable {
  private readonly disposables: vscode.Disposable[] = [];

  constructor(private readonly stateService: StateService) {}

  register(): void {
    this.disposables.push(
      vscode.window.onDidChangeActiveTextEditor(this.handleEditorChange.bind(this))
    );
    void this.updateContext(vscode.window.activeTextEditor);
  }

  dispose(): void {
    for (const disposable of this.disposables) {
      disposable.dispose();
    }
  }

  private handleEditorChange(editor: vscode.TextEditor | undefined): void {
    void this.updateContext(editor);
  }

  private async updateContext(editor: vscode.TextEditor | undefined): Promise<void> {
    const isMarkdown = editor?.document.languageId === 'markdown';
    await vscode.commands.executeCommand('setContext', 'markdownReader.isMarkdown', isMarkdown);

    if (!editor || !isMarkdown) {
      await vscode.commands.executeCommand('setContext', 'markdownReader.editMode', false);
      return;
    }

    const state = this.stateService.getExistingState(editor.document.uri);
    await vscode.commands.executeCommand(
      'setContext',
      'markdownReader.editMode',
      state?.mode === ViewMode.Edit
    );
  }
}
