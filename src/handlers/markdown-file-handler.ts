import * as vscode from 'vscode';
import { ConfigService } from '../services/config-service';
import { PreviewService } from '../services/preview-service';
import { StateService } from '../services/state-service';
import { ValidationService } from '../services/validation-service';
import { ViewMode } from '../types/state';
import { t } from '../utils/l10n';

const WELCOME_KEY = 'markdownReader.welcomeShown';

export class MarkdownFileHandler implements vscode.Disposable {
  private readonly disposables: vscode.Disposable[] = [];

  constructor(
    private readonly previewService: PreviewService,
    private readonly stateService: StateService,
    private readonly configService: ConfigService,
    private readonly validationService: ValidationService,
    private readonly globalState: vscode.Memento
  ) {}

  register(): void {
    this.disposables.push(
      vscode.workspace.onDidOpenTextDocument(this.handleDocumentOpen.bind(this)),
      vscode.window.tabGroups.onDidChangeTabs(this.handleTabsChanged.bind(this))
    );
  }

  dispose(): void {
    for (const disposable of this.disposables) {
      disposable.dispose();
    }
  }

  private async handleDocumentOpen(document: vscode.TextDocument): Promise<void> {
    const isMarkdown = this.validationService.isMarkdownFile(document);
    await vscode.commands.executeCommand('setContext', 'markdownReader.isMarkdown', isMarkdown);
    await vscode.commands.executeCommand(
      'setContext',
      'markdownReader.enabled',
      this.configService.getEnabled()
    );

    if (!isMarkdown) {
      return;
    }

    if (!this.configService.getEnabled()) {
      return;
    }

    const existingState = this.stateService.getExistingState(document.uri);
    await vscode.commands.executeCommand(
      'setContext',
      'markdownReader.editMode',
      existingState?.mode === ViewMode.Edit
    );

    if (existingState?.mode === ViewMode.Edit) {
      return;
    }

    if (existingState?.mode === ViewMode.Preview) {
      const activeEditor = vscode.window.activeTextEditor;
      if (activeEditor && activeEditor.document.uri.toString() === document.uri.toString()) {
        this.stateService.setMode(document.uri, ViewMode.Edit);
        this.stateService.setEditorVisible(document.uri, true);
        return;
      }
    }

    if (document.isUntitled) {
      await this.previewService.enterEditMode(document.uri);
      await this.maybeShowWelcome();
      return;
    }

    const shouldPreview = await this.previewService.shouldShowPreview(document);
    if (!shouldPreview) {
      return;
    }

    await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
    await this.previewService.showPreview(document.uri);
    await this.maybeShowWelcome();
  }

  private handleTabsChanged(event: vscode.TabChangeEvent): void {
    void this.handleClosedTabs(event.closed);
  }

  private async handleClosedTabs(tabs: readonly vscode.Tab[]): Promise<void> {
    for (const tab of tabs) {
      const input = tab.input;
      if (input instanceof vscode.TabInputText) {
        const state = this.stateService.getExistingState(input.uri);
        if (state?.mode === ViewMode.Edit) {
          this.stateService.setEditorVisible(input.uri, false);
          await this.previewService.showPreview(input.uri);
        }
      }
    }
  }

  private async maybeShowWelcome(): Promise<void> {
    const alreadyShown = this.globalState.get<boolean>(WELCOME_KEY, false);
    if (alreadyShown) {
      return;
    }

    const tutorialAction = t('View Tutorial');
    const selection = await vscode.window.showInformationMessage(
      t('Welcome to Markdown Reader! Open any markdown file to preview by default.'),
      tutorialAction
    );

    if (selection === tutorialAction) {
      await vscode.env.openExternal(
        vscode.Uri.parse('https://github.com/ayhammouda/markdown-preview#quick-start')
      );
    }

    await this.globalState.update(WELCOME_KEY, true);
  }
}
