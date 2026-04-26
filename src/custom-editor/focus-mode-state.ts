import * as vscode from 'vscode';

const FOCUS_MODE_STATE_KEY = 'muninn.focusMode.enabled';

export class FocusModeState {
  constructor(private readonly workspaceState: vscode.Memento) {}

  isEnabled(): boolean {
    return this.workspaceState.get<boolean>(FOCUS_MODE_STATE_KEY, false) === true;
  }

  async setEnabled(enabled: boolean): Promise<void> {
    await this.workspaceState.update(FOCUS_MODE_STATE_KEY, enabled);
  }

  async toggle(): Promise<boolean> {
    const nextValue = !this.isEnabled();
    await this.setEnabled(nextValue);
    return nextValue;
  }
}
