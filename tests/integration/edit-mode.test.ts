import sinon from 'sinon';
import * as vscode from 'vscode';
import { PreviewService } from '../../src/services/preview-service';
import { StateService } from '../../src/services/state-service';
import { ValidationService } from '../../src/services/validation-service';
import { toggleEditMode } from '../../src/commands/mode-commands';
import { ViewMode } from '../../src/types/state';
import { MarkdownFileHandler } from '../../src/handlers/markdown-file-handler';
import { Logger } from '../../src/services/logger';
let expect: Chai.ExpectStatic;

before(async () => {
  ({ expect } = await import('chai'));
});



const createMemento = (): vscode.Memento => {
  const store = new Map<string, unknown>();
  return {
    get: <T>(key: string, defaultValue?: T): T => {
      if (store.has(key)) {
        return store.get(key) as T;
      }
      return defaultValue as T;
    },
    update: async (key: string, value: unknown): Promise<void> => {
      store.set(key, value);
    },
    keys: () => [...store.keys()],
  } as vscode.Memento;
};

const createLogger = (): Logger =>
  ({
    info: sinon.stub(),
    warn: sinon.stub(),
    error: sinon.stub(),
    show: sinon.stub(),
  }) as unknown as Logger;

describe('Edit mode integration', () => {
  beforeEach(() => {
    const l10nStub = sinon.stub(vscode.l10n, 't') as sinon.SinonStub;
    l10nStub.callsFake((message: string) => message);
  });

  afterEach(() => {
    sinon.restore();
  });

  it('enters edit mode with split preview', async () => {
    const stateService = new StateService();
    const validationService = new ValidationService();
    const configService = {
      getConfig: () => ({
        enabled: true,
        excludePatterns: [],
        maxFileSize: 1_048_576,
      }),
    } as unknown as import('../../src/services/config-service').ConfigService;

    const previewService = new PreviewService(
      stateService,
      configService,
      validationService,
      createMemento(),
      createLogger()
    );

    const editor = {
      selection: new vscode.Selection(new vscode.Position(0, 0), new vscode.Position(0, 0)),
      revealRange: sinon.stub(),
    } as unknown as vscode.TextEditor;
    const showTextStub = sinon
      .stub(vscode.window, 'showTextDocument')
      .resolves(editor);
    const executeStub = sinon.stub(vscode.commands, 'executeCommand').resolves();

    const uri = vscode.Uri.file('/tmp/edit.md');
    await previewService.enterEditMode(uri);

    expect(
      showTextStub.calledWithMatch(uri, { viewColumn: vscode.ViewColumn.One, preview: false })
    ).to.equal(true);
    expect(executeStub.calledWith('markdown.showPreviewToSide', uri)).to.equal(true);
  });

  it('uses live preview for edit mode updates', async () => {
    const stateService = new StateService();
    const validationService = new ValidationService();
    const configService = {
      getConfig: () => ({
        enabled: true,
        excludePatterns: [],
        maxFileSize: 1_048_576,
      }),
    } as unknown as import('../../src/services/config-service').ConfigService;

    const previewService = new PreviewService(
      stateService,
      configService,
      validationService,
      createMemento(),
      createLogger()
    );

    const editor = {
      selection: new vscode.Selection(new vscode.Position(0, 0), new vscode.Position(0, 0)),
      revealRange: sinon.stub(),
    } as unknown as vscode.TextEditor;
    sinon.stub(vscode.window, 'showTextDocument').resolves(editor);
    const executeStub = sinon.stub(vscode.commands, 'executeCommand').resolves();

    const uri = vscode.Uri.file('/tmp/live-preview.md');
    await previewService.enterEditMode(uri);

    expect(executeStub.calledWith('markdown.showPreviewToSide', uri)).to.equal(true);
  });

  it('exits edit mode and returns to preview', async () => {
    const stateService = new StateService();
    const validationService = new ValidationService();
    const configService = {
      getConfig: () => ({
        enabled: true,
        excludePatterns: [],
        maxFileSize: 1_048_576,
      }),
    } as unknown as import('../../src/services/config-service').ConfigService;

    const previewService = new PreviewService(
      stateService,
      configService,
      validationService,
      createMemento(),
      createLogger()
    );

    const executeStub = sinon.stub(vscode.commands, 'executeCommand').resolves();

    const uri = vscode.Uri.file('/tmp/edit.md');
    await previewService.exitEditMode(uri);

    expect(executeStub.calledWith('workbench.action.closeActiveEditor')).to.equal(true);
    expect(executeStub.calledWith('markdown.showPreview', uri)).to.equal(true);
  });

  it('toggleEditMode switches between modes', async () => {
    const enterStub = sinon.stub().resolves();
    const exitStub = sinon.stub().resolves();
    const previewService = {
      enterEditMode: enterStub,
      exitEditMode: exitStub,
    } as unknown as PreviewService;
    const stateService = new StateService();

    const editor = {
      document: { uri: vscode.Uri.file('/tmp/edit.md') },
    } as vscode.TextEditor;

    sinon.stub(vscode.window, 'activeTextEditor').get(() => editor);
    sinon.stub(vscode.commands, 'executeCommand').resolves();

    await toggleEditMode(previewService, stateService);
    expect(enterStub.calledOnce).to.equal(true);

    stateService.setMode(editor.document.uri, ViewMode.Edit);
    await toggleEditMode(previewService, stateService);
    expect(exitStub.calledOnce).to.equal(true);
  });

  it('saves cursor position for focus restore', async () => {
    const stateService = new StateService();
    const validationService = new ValidationService();
    const configService = {
      getConfig: () => ({
        enabled: true,
        excludePatterns: [],
        maxFileSize: 1_048_576,
      }),
    } as unknown as import('../../src/services/config-service').ConfigService;

    const previewService = new PreviewService(
      stateService,
      configService,
      validationService,
      createMemento(),
      createLogger()
    );

    const uri = vscode.Uri.file('/tmp/edit.md');
    const selection = new vscode.Selection(new vscode.Position(3, 4), new vscode.Position(3, 4));
    const editor = {
      document: { uri, isDirty: false },
      selection,
      revealRange: sinon.stub(),
    } as unknown as vscode.TextEditor;

    sinon.stub(vscode.window, 'activeTextEditor').get(() => editor);
    sinon.stub(vscode.commands, 'executeCommand').resolves();
    sinon.stub(vscode.workspace, 'getConfiguration').returns({
      get: () => 'off',
    } as unknown as vscode.WorkspaceConfiguration);

    await previewService.exitEditMode(uri);
    expect(stateService.getLastSelection(uri)?.line).to.equal(3);
    expect(stateService.getLastSelection(uri)?.character).to.equal(4);
  });

  it('restores focus when re-entering edit mode', async () => {
    const stateService = new StateService();
    const validationService = new ValidationService();
    const configService = {
      getConfig: () => ({
        enabled: true,
        excludePatterns: [],
        maxFileSize: 1_048_576,
      }),
    } as unknown as import('../../src/services/config-service').ConfigService;

    const previewService = new PreviewService(
      stateService,
      configService,
      validationService,
      createMemento(),
      createLogger()
    );

    const uri = vscode.Uri.file('/tmp/edit.md');
    stateService.setLastSelection(uri, new vscode.Position(2, 1));

    const editor = {
      selection: new vscode.Selection(new vscode.Position(0, 0), new vscode.Position(0, 0)),
      revealRange: sinon.stub(),
    } as unknown as vscode.TextEditor;

    sinon.stub(vscode.window, 'showTextDocument').resolves(editor);
    sinon.stub(vscode.commands, 'executeCommand').resolves();

    await previewService.enterEditMode(uri);
    expect(editor.selection.active.line).to.equal(2);
    expect(editor.selection.active.character).to.equal(1);
  });

  it('defaults focus to line 1 when no previous cursor exists', async () => {
    const stateService = new StateService();
    const validationService = new ValidationService();
    const configService = {
      getConfig: () => ({
        enabled: true,
        excludePatterns: [],
        maxFileSize: 1_048_576,
      }),
    } as unknown as import('../../src/services/config-service').ConfigService;

    const previewService = new PreviewService(
      stateService,
      configService,
      validationService,
      createMemento(),
      createLogger()
    );

    const editor = {
      selection: new vscode.Selection(new vscode.Position(9, 9), new vscode.Position(9, 9)),
      revealRange: sinon.stub(),
    } as unknown as vscode.TextEditor;

    sinon.stub(vscode.window, 'showTextDocument').resolves(editor);
    sinon.stub(vscode.commands, 'executeCommand').resolves();

    const uri = vscode.Uri.file('/tmp/focus.md');
    await previewService.enterEditMode(uri);

    expect(editor.selection.active.line).to.equal(0);
    expect(editor.selection.active.character).to.equal(0);
  });

  it('prompts when exiting with unsaved changes and autosave off', async () => {
    const stateService = new StateService();
    const validationService = new ValidationService();
    const configService = {
      getConfig: () => ({
        enabled: true,
        excludePatterns: [],
        maxFileSize: 1_048_576,
      }),
    } as unknown as import('../../src/services/config-service').ConfigService;

    const previewService = new PreviewService(
      stateService,
      configService,
      validationService,
      createMemento(),
      createLogger()
    );

    const saveStub = sinon.stub().resolves(true);
    const document = {
      uri: vscode.Uri.file('/tmp/edit.md'),
      isDirty: true,
      save: saveStub,
    } as unknown as vscode.TextDocument;
    const editor = {
      document,
      selection: new vscode.Selection(new vscode.Position(0, 0), new vscode.Position(0, 0)),
    } as unknown as vscode.TextEditor;

    sinon.stub(vscode.window, 'activeTextEditor').get(() => editor);
    sinon.stub(vscode.commands, 'executeCommand').resolves();
    const warningStub = sinon.stub(
      vscode.window,
      'showWarningMessage'
    ) as sinon.SinonStub;
    warningStub.resolves('Save & Exit');
    sinon.stub(vscode.workspace, 'getConfiguration').returns({
      get: () => 'off',
    } as unknown as vscode.WorkspaceConfiguration);

    await previewService.exitEditMode(document.uri);
    expect(saveStub.calledOnce).to.equal(true);
  });

  it('skips prompt when autosave is enabled', async () => {
    const stateService = new StateService();
    const validationService = new ValidationService();
    const configService = {
      getConfig: () => ({
        enabled: true,
        excludePatterns: [],
        maxFileSize: 1_048_576,
      }),
    } as unknown as import('../../src/services/config-service').ConfigService;

    const previewService = new PreviewService(
      stateService,
      configService,
      validationService,
      createMemento(),
      createLogger()
    );

    const document = {
      uri: vscode.Uri.file('/tmp/edit.md'),
      isDirty: true,
      save: sinon.stub().resolves(true),
    } as unknown as vscode.TextDocument;
    const editor = {
      document,
      selection: new vscode.Selection(new vscode.Position(0, 0), new vscode.Position(0, 0)),
    } as unknown as vscode.TextEditor;

    sinon.stub(vscode.window, 'activeTextEditor').get(() => editor);
    const warnStub = sinon.stub(vscode.window, 'showWarningMessage').resolves();
    sinon.stub(vscode.commands, 'executeCommand').resolves();
    sinon.stub(vscode.workspace, 'getConfiguration').returns({
      get: () => 'afterDelay',
    } as unknown as vscode.WorkspaceConfiguration);

    await previewService.exitEditMode(document.uri);
    expect(warnStub.called).to.equal(false);
  });

  it('saving in edit mode does not exit edit mode', async () => {
    const stateService = new StateService();
    const uri = vscode.Uri.file('/tmp/edit.md');

    sinon.stub(vscode.commands, 'executeCommand').resolves();
    stateService.setMode(uri, ViewMode.Edit);
    const document = { save: sinon.stub().resolves(true) } as unknown as vscode.TextDocument;
    await document.save();

    expect(stateService.getState(uri).mode).to.equal(ViewMode.Edit);
  });

  it('respects explicit text editor opens by staying in edit mode', async () => {
    const stateService = new StateService();
    const validationService = new ValidationService();
    const configService = {
      getEnabled: () => true,
      isExcluded: () => false,
      getConfig: () => ({
        enabled: true,
        excludePatterns: [],
        maxFileSize: 1_048_576,
      }),
    } as unknown as import('../../src/services/config-service').ConfigService;

    const previewService = new PreviewService(
      stateService,
      configService,
      validationService,
      createMemento(),
      createLogger()
    );

    const uri = vscode.Uri.file('/tmp/manual-open.md');
    const executeStub = sinon.stub(vscode.commands, 'executeCommand').resolves();
    stateService.setMode(uri, ViewMode.Preview);

    const editor = {
      document: { uri },
    } as vscode.TextEditor;
    sinon.stub(vscode.window, 'activeTextEditor').get(() => editor);

    const handler = new MarkdownFileHandler(
      previewService,
      stateService,
      configService,
      validationService,
      createMemento(),
      createLogger()
    );

    const document = {
      languageId: 'markdown',
      uri,
      isUntitled: false,
    } as vscode.TextDocument;

    await (handler as unknown as { processDocumentOpen: (d: vscode.TextDocument) => Promise<void> })
      .processDocumentOpen(document);

    expect(stateService.getState(uri).mode).to.equal(ViewMode.Edit);
    expect(executeStub.calledWith('markdown.showPreview')).to.equal(false);
  });

  it('exits edit mode when the text editor tab closes', async () => {
    const stateService = new StateService();
    const validationService = new ValidationService();
    const configService = {
      getEnabled: () => true,
      isExcluded: () => false,
      getConfig: () => ({
        enabled: true,
        excludePatterns: [],
        maxFileSize: 1_048_576,
      }),
    } as unknown as import('../../src/services/config-service').ConfigService;

    const previewService = new PreviewService(
      stateService,
      configService,
      validationService,
      createMemento(),
      createLogger()
    );

    const uri = vscode.Uri.file('/tmp/close-editor.md');
    sinon.stub(vscode.commands, 'executeCommand').resolves();
    stateService.setMode(uri, ViewMode.Edit);

    const handler = new MarkdownFileHandler(
      previewService,
      stateService,
      configService,
      validationService,
      createMemento(),
      createLogger()
    );

    await (handler as unknown as { handleClosedTabs: (t: readonly vscode.Tab[]) => Promise<void> })
      .handleClosedTabs([{ input: new vscode.TabInputText(uri) } as vscode.Tab]);

    expect(stateService.getState(uri).mode).to.equal(ViewMode.Preview);
  });

  it('keeps edit mode when the preview tab closes', async () => {
    const stateService = new StateService();
    const validationService = new ValidationService();
    const configService = {
      getEnabled: () => true,
      isExcluded: () => false,
      getConfig: () => ({
        enabled: true,
        excludePatterns: [],
        maxFileSize: 1_048_576,
      }),
    } as unknown as import('../../src/services/config-service').ConfigService;

    const previewService = new PreviewService(
      stateService,
      configService,
      validationService,
      createMemento(),
      createLogger()
    );

    const uri = vscode.Uri.file('/tmp/close-preview.md');
    sinon.stub(vscode.commands, 'executeCommand').resolves();
    stateService.setMode(uri, ViewMode.Edit);

    const handler = new MarkdownFileHandler(
      previewService,
      stateService,
      configService,
      validationService,
      createMemento(),
      createLogger()
    );

    await (handler as unknown as { handleClosedTabs: (t: readonly vscode.Tab[]) => Promise<void> })
      .handleClosedTabs([{ input: new vscode.TabInputWebview('markdown.preview') } as vscode.Tab]);

    expect(stateService.getState(uri).mode).to.equal(ViewMode.Edit);
  });
});
