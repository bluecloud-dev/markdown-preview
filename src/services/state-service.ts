import * as vscode from 'vscode';
import { FileState, ViewMode } from '../types/state';

export class StateService {
  private readonly states = new Map<string, FileState>();

  getExistingState(uri: vscode.Uri): FileState | undefined {
    return this.states.get(uri.toString());
  }

  getState(uri: vscode.Uri): FileState {
    const key = uri.toString();
    const existing = this.states.get(key);
    if (existing) {
      return existing;
    }

    const state: FileState = {
      uri: key,
      mode: ViewMode.Preview,
      lastModeChange: Date.now(),
      editorVisible: false,
    };
    this.states.set(key, state);
    return state;
  }

  setMode(uri: vscode.Uri, mode: ViewMode): void {
    const state = this.getState(uri);
    state.mode = mode;
    state.lastModeChange = Date.now();
    void vscode.commands.executeCommand(
      'setContext',
      'markdownReader.editMode',
      mode === ViewMode.Edit
    );
  }

  setEditorVisible(uri: vscode.Uri, visible: boolean): void {
    const state = this.getState(uri);
    state.editorVisible = visible;
  }

  setLastSelection(uri: vscode.Uri, position: vscode.Position): void {
    const state = this.getState(uri);
    state.lastSelection = { line: position.line, character: position.character };
  }

  getLastSelection(uri: vscode.Uri): vscode.Position | undefined {
    const state = this.getExistingState(uri);
    if (!state?.lastSelection) {
      return undefined;
    }
    return new vscode.Position(state.lastSelection.line, state.lastSelection.character);
  }

  clear(uri: vscode.Uri): void {
    this.states.delete(uri.toString());
  }
}
