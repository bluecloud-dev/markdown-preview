import sinon from 'sinon';
import * as vscode from 'vscode';
import { PreviewService } from '../../src/services/preview-service';
import { ViewMode } from '../../src/types/state';
let expect: Chai.ExpectStatic;

before(async () => {
  ({ expect } = await import('chai'));
});



const createStateService = () => ({
  setMode: sinon.stub(),
  setEditorVisible: sinon.stub(),
  getLastSelection: sinon.stub().returns(void 0),
  setLastSelection: sinon.stub(),
});

const createLogger = () => ({
  info: sinon.stub(),
  warn: sinon.stub(),
  error: sinon.stub(),
  show: sinon.stub(),
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

describe('PreviewService', () => {
  afterEach(() => {
    sinon.restore();
  });

  it('skips preview for non-markdown files', async () => {
    const stateService = createStateService();
    const configService = {
      getConfig: () => ({ enabled: true, excludePatterns: [], maxFileSize: 1_048_576 }),
      isExcluded: () => false,
    } as unknown as import('../../src/services/config-service').ConfigService;
    const validationService = {
      isMarkdownFile: () => false,
      isDiffView: () => false,
      isLargeFile: async () => false,
      isBinaryFile: async () => false,
    } as unknown as import('../../src/services/validation-service').ValidationService;

    const service = new PreviewService(
      stateService as unknown as import('../../src/services/state-service').StateService,
      configService,
      validationService,
      createMemento(),
      createLogger() as unknown as import('../../src/services/logger').Logger
    );

    const document = {
      languageId: 'plaintext',
      uri: vscode.Uri.file('/tmp/sample.txt'),
      isUntitled: false,
    } as vscode.TextDocument;

    const result = await service.shouldShowPreview(document);
    expect(result).to.equal(false);
  });

  it('skips preview for excluded paths', async () => {
    const stateService = createStateService();
    const configService = {
      getConfig: () => ({ enabled: true, excludePatterns: ['**/docs/**'], maxFileSize: 1_048_576 }),
      isExcluded: () => true,
    } as unknown as import('../../src/services/config-service').ConfigService;
    const validationService = {
      isMarkdownFile: () => true,
      isDiffView: () => false,
      isLargeFile: async () => false,
      isBinaryFile: async () => false,
    } as unknown as import('../../src/services/validation-service').ValidationService;

    const service = new PreviewService(
      stateService as unknown as import('../../src/services/state-service').StateService,
      configService,
      validationService,
      createMemento(),
      createLogger() as unknown as import('../../src/services/logger').Logger
    );

    const document = {
      languageId: 'markdown',
      uri: vscode.Uri.file('/workspace/docs/readme.md'),
      isUntitled: false,
    } as vscode.TextDocument;

    const result = await service.shouldShowPreview(document);
    expect(result).to.equal(false);
  });

  it('skips preview for untitled files', async () => {
    const stateService = createStateService();
    const configService = {
      getConfig: () => ({ enabled: true, excludePatterns: [], maxFileSize: 1_048_576 }),
      isExcluded: () => false,
    } as unknown as import('../../src/services/config-service').ConfigService;
    const validationService = {
      isMarkdownFile: () => true,
      isDiffView: () => false,
      isLargeFile: async () => false,
      isBinaryFile: async () => false,
    } as unknown as import('../../src/services/validation-service').ValidationService;

    const service = new PreviewService(
      stateService as unknown as import('../../src/services/state-service').StateService,
      configService,
      validationService,
      createMemento(),
      createLogger() as unknown as import('../../src/services/logger').Logger
    );

    const document = {
      languageId: 'markdown',
      uri: vscode.Uri.parse('untitled:Untitled-1'),
      isUntitled: true,
    } as vscode.TextDocument;

    const result = await service.shouldShowPreview(document);
    expect(result).to.equal(false);
  });

  it('skips preview for diff views', async () => {
    const stateService = createStateService();
    const configService = {
      getConfig: () => ({ enabled: true, excludePatterns: [], maxFileSize: 1_048_576 }),
      isExcluded: () => false,
    } as unknown as import('../../src/services/config-service').ConfigService;
    const validationService = {
      isMarkdownFile: () => true,
      isDiffView: () => true,
      isLargeFile: async () => false,
      isBinaryFile: async () => false,
    } as unknown as import('../../src/services/validation-service').ValidationService;

    const service = new PreviewService(
      stateService as unknown as import('../../src/services/state-service').StateService,
      configService,
      validationService,
      createMemento(),
      createLogger() as unknown as import('../../src/services/logger').Logger
    );

    const document = {
      languageId: 'markdown',
      uri: vscode.Uri.parse('git:/tmp/diff.md'),
      isUntitled: false,
    } as vscode.TextDocument;

    const result = await service.shouldShowPreview(document);
    expect(result).to.equal(false);
  });

  it('returns true for eligible markdown documents', async () => {
    const stateService = createStateService();
    const configService = {
      getConfig: () => ({ enabled: true, excludePatterns: [], maxFileSize: 1_048_576 }),
      isExcluded: () => false,
    } as unknown as import('../../src/services/config-service').ConfigService;
    const validationService = {
      isMarkdownFile: () => true,
      isDiffView: () => false,
      isLargeFile: async () => false,
      isBinaryFile: async () => false,
    } as unknown as import('../../src/services/validation-service').ValidationService;

    const service = new PreviewService(
      stateService as unknown as import('../../src/services/state-service').StateService,
      configService,
      validationService,
      createMemento(),
      createLogger() as unknown as import('../../src/services/logger').Logger
    );

    const document = {
      languageId: 'markdown',
      uri: vscode.Uri.file('/tmp/ok.md'),
      isUntitled: false,
    } as vscode.TextDocument;

    const result = await service.shouldShowPreview(document);
    expect(result).to.equal(true);
  });

  it('respects large file opt-out and does not prompt again', async () => {
    const stateService = createStateService();
    const configService = {
      getConfig: () => ({ enabled: true, excludePatterns: [], maxFileSize: 1 }),
      isExcluded: () => false,
    } as unknown as import('../../src/services/config-service').ConfigService;
    const validationService = {
      isMarkdownFile: () => true,
      isDiffView: () => false,
      isLargeFile: async () => true,
      isBinaryFile: async () => false,
    } as unknown as import('../../src/services/validation-service').ValidationService;

    const workspaceState = createMemento();
    const service = new PreviewService(
      stateService as unknown as import('../../src/services/state-service').StateService,
      configService,
      validationService,
      workspaceState,
      createLogger() as unknown as import('../../src/services/logger').Logger
    );

    const uri = vscode.Uri.file('/tmp/large.md');
    await workspaceState.update('markdownReader.largeFileOptOut', { [uri.toString()]: true });

    const promptStub = sinon.stub(vscode.window, 'showInformationMessage').resolves();

    const document = { languageId: 'markdown', uri, isUntitled: false } as vscode.TextDocument;
    const result = await service.shouldShowPreview(document);

    expect(result).to.equal(false);
    expect(promptStub.called).to.equal(false);
  });

  it('stores large file opt-out when selected', async () => {
    const stateService = createStateService();
    const configService = {
      getConfig: () => ({ enabled: true, excludePatterns: [], maxFileSize: 1 }),
      isExcluded: () => false,
    } as unknown as import('../../src/services/config-service').ConfigService;
    const validationService = {
      isMarkdownFile: () => true,
      isDiffView: () => false,
      isLargeFile: async () => true,
      isBinaryFile: async () => false,
    } as unknown as import('../../src/services/validation-service').ValidationService;

    const workspaceState = createMemento();
    const service = new PreviewService(
      stateService as unknown as import('../../src/services/state-service').StateService,
      configService,
      validationService,
      workspaceState,
      createLogger() as unknown as import('../../src/services/logger').Logger
    );

    sinon
      .stub(vscode.window, 'showInformationMessage')
      .resolves("Don't Show Again for This File" as unknown as vscode.MessageItem);

    const uri = vscode.Uri.file('/tmp/large.md');
    const document = { languageId: 'markdown', uri, isUntitled: false } as vscode.TextDocument;
    await service.shouldShowPreview(document);

    const optOut = workspaceState.get<Record<string, boolean>>('markdownReader.largeFileOptOut', {});
    expect(optOut[uri.toString()]).to.equal(true);
  });

  it('opens in editor on preview command failure when user selects action', async () => {
    const stateService = createStateService();
    const configService = {
      getConfig: () => ({ enabled: true, excludePatterns: [], maxFileSize: 1_048_576 }),
      isExcluded: () => false,
    } as unknown as import('../../src/services/config-service').ConfigService;
    const validationService = {
      isMarkdownFile: () => true,
      isDiffView: () => false,
      isLargeFile: async () => false,
      isBinaryFile: async () => false,
    } as unknown as import('../../src/services/validation-service').ValidationService;

    const service = new PreviewService(
      stateService as unknown as import('../../src/services/state-service').StateService,
      configService,
      validationService,
      createMemento(),
      createLogger() as unknown as import('../../src/services/logger').Logger
    );

    sinon.stub(vscode.commands, 'executeCommand').rejects(new Error('nope'));
    sinon
      .stub(vscode.window, 'showErrorMessage')
      .resolves('Open in Editor' as unknown as vscode.MessageItem);
    const openEditorStub = sinon.stub(vscode.window, 'showTextDocument').resolves();

    await service.showPreview(vscode.Uri.file('/tmp/fail.md'));
    expect(openEditorStub.calledOnce).to.equal(true);
  });

  it('restores cursor position when entering edit mode', async () => {
    const stateService = createStateService();
    const configService = {
      getConfig: () => ({ enabled: true, excludePatterns: [], maxFileSize: 1_048_576 }),
      isExcluded: () => false,
    } as unknown as import('../../src/services/config-service').ConfigService;
    const validationService = {
      isMarkdownFile: () => true,
      isDiffView: () => false,
      isLargeFile: async () => false,
      isBinaryFile: async () => false,
    } as unknown as import('../../src/services/validation-service').ValidationService;

    const cursor = new vscode.Position(3, 5);
    stateService.getLastSelection.returns(cursor);

    const editor = {
      selection: new vscode.Selection(new vscode.Position(0, 0), new vscode.Position(0, 0)),
      revealRange: sinon.stub(),
    } as unknown as vscode.TextEditor;

    sinon.stub(vscode.window, 'showTextDocument').resolves(editor);
    sinon.stub(vscode.commands, 'executeCommand').resolves();

    const service = new PreviewService(
      stateService as unknown as import('../../src/services/state-service').StateService,
      configService,
      validationService,
      createMemento(),
      createLogger() as unknown as import('../../src/services/logger').Logger
    );

    await service.enterEditMode(vscode.Uri.file('/tmp/edit.md'));
    expect(editor.selection.active.line).to.equal(3);
    expect(editor.selection.active.character).to.equal(5);
    expect((editor as unknown as { revealRange: sinon.SinonStub }).revealRange.calledOnce).to.equal(true);
  });

  it('cancels exit edit mode when user dismisses prompt', async () => {
    const stateService = createStateService();
    const configService = {
      getConfig: () => ({ enabled: true, excludePatterns: [], maxFileSize: 1_048_576 }),
      isExcluded: () => false,
    } as unknown as import('../../src/services/config-service').ConfigService;
    const validationService = {
      isMarkdownFile: () => true,
      isDiffView: () => false,
      isLargeFile: async () => false,
      isBinaryFile: async () => false,
    } as unknown as import('../../src/services/validation-service').ValidationService;

    sinon.stub(vscode.workspace, 'getConfiguration').returns({ get: () => 'off' } as unknown as vscode.WorkspaceConfiguration);
    sinon.stub(vscode.window, 'showWarningMessage').resolves('Cancel' as unknown as vscode.MessageItem);

    const uri = vscode.Uri.file('/tmp/edit.md');
    const document = { uri, isDirty: true, save: sinon.stub().resolves() } as unknown as vscode.TextDocument;
    vscode.window.activeTextEditor = { document, selection: { active: new vscode.Position(0, 0) } } as unknown as vscode.TextEditor;

    const closeStub = sinon.stub(vscode.commands, 'executeCommand').resolves();
    const service = new PreviewService(
      stateService as unknown as import('../../src/services/state-service').StateService,
      configService,
      validationService,
      createMemento(),
      createLogger() as unknown as import('../../src/services/logger').Logger
    );

    await service.exitEditMode(uri);
    expect(closeStub.calledWith('workbench.action.closeActiveEditor')).to.equal(false);
  });

  it('saves and exits edit mode when selected', async () => {
    const stateService = createStateService();
    const configService = {
      getConfig: () => ({ enabled: true, excludePatterns: [], maxFileSize: 1_048_576 }),
      isExcluded: () => false,
    } as unknown as import('../../src/services/config-service').ConfigService;
    const validationService = {
      isMarkdownFile: () => true,
      isDiffView: () => false,
      isLargeFile: async () => false,
      isBinaryFile: async () => false,
    } as unknown as import('../../src/services/validation-service').ValidationService;

    sinon.stub(vscode.workspace, 'getConfiguration').returns({ get: () => 'off' } as unknown as vscode.WorkspaceConfiguration);
    sinon.stub(vscode.window, 'showWarningMessage').resolves('Save & Exit' as unknown as vscode.MessageItem);

    const uri = vscode.Uri.file('/tmp/edit.md');
    const saveStub = sinon.stub().resolves();
    const document = { uri, isDirty: true, save: saveStub } as unknown as vscode.TextDocument;
    vscode.window.activeTextEditor = { document, selection: { active: new vscode.Position(0, 0) } } as unknown as vscode.TextEditor;

    sinon.stub(vscode.commands, 'executeCommand').resolves();
    const showPreviewStub = sinon.stub(PreviewService.prototype, 'showPreview').resolves();

    const service = new PreviewService(
      stateService as unknown as import('../../src/services/state-service').StateService,
      configService,
      validationService,
      createMemento(),
      createLogger() as unknown as import('../../src/services/logger').Logger
    );

    await service.exitEditMode(uri);
    expect(saveStub.calledOnce).to.equal(true);
    expect(showPreviewStub.called).to.equal(true);
  });

  it('discards changes and exits edit mode when selected', async () => {
    const stateService = createStateService();
    const configService = {
      getConfig: () => ({ enabled: true, excludePatterns: [], maxFileSize: 1_048_576 }),
      isExcluded: () => false,
    } as unknown as import('../../src/services/config-service').ConfigService;
    const validationService = {
      isMarkdownFile: () => true,
      isDiffView: () => false,
      isLargeFile: async () => false,
      isBinaryFile: async () => false,
    } as unknown as import('../../src/services/validation-service').ValidationService;

    sinon.stub(vscode.workspace, 'getConfiguration').returns({ get: () => 'off' } as unknown as vscode.WorkspaceConfiguration);
    sinon.stub(vscode.window, 'showWarningMessage').resolves('Exit Without Saving' as unknown as vscode.MessageItem);

    const uri = vscode.Uri.file('/tmp/edit.md');
    const document = { uri, isDirty: true, save: sinon.stub().resolves() } as unknown as vscode.TextDocument;
    vscode.window.activeTextEditor = { document, selection: { active: new vscode.Position(0, 0) } } as unknown as vscode.TextEditor;

    const executeStub = sinon.stub(vscode.commands, 'executeCommand').resolves();
    const showPreviewStub = sinon.stub(PreviewService.prototype, 'showPreview').resolves();

    const service = new PreviewService(
      stateService as unknown as import('../../src/services/state-service').StateService,
      configService,
      validationService,
      createMemento(),
      createLogger() as unknown as import('../../src/services/logger').Logger
    );

    await service.exitEditMode(uri);
    expect(executeStub.calledWith('workbench.action.revertAndCloseActiveEditor')).to.equal(true);
    expect(showPreviewStub.called).to.equal(true);
  });

  it('skips preview when disabled', async () => {
    const stateService = createStateService();
    const configService = {
      getConfig: () => ({ enabled: false, excludePatterns: [], maxFileSize: 1_048_576 }),
      isExcluded: () => false,
    } as unknown as import('../../src/services/config-service').ConfigService;
    const validationService = {
      isMarkdownFile: () => true,
      isDiffView: () => false,
      isLargeFile: async () => false,
      isBinaryFile: async () => false,
    } as unknown as import('../../src/services/validation-service').ValidationService;

    const service = new PreviewService(
      stateService as unknown as import('../../src/services/state-service').StateService,
      configService,
      validationService,
      createMemento(),
      createLogger() as unknown as import('../../src/services/logger').Logger
    );

    const document = {
      languageId: 'markdown',
      uri: vscode.Uri.file('/tmp/sample.md'),
      isUntitled: false,
    } as vscode.TextDocument;

    const result = await service.shouldShowPreview(document);
    expect(result).to.equal(false);
  });

  it('prompts for large files and can open preview', async () => {
    const stateService = createStateService();
    const configService = {
      getConfig: () => ({ enabled: true, excludePatterns: [], maxFileSize: 1 }),
      isExcluded: () => false,
    } as unknown as import('../../src/services/config-service').ConfigService;
    const validationService = {
      isMarkdownFile: () => true,
      isDiffView: () => false,
      isLargeFile: async () => true,
      isBinaryFile: async () => false,
    } as unknown as import('../../src/services/validation-service').ValidationService;

    const service = new PreviewService(
      stateService as unknown as import('../../src/services/state-service').StateService,
      configService,
      validationService,
      createMemento(),
      createLogger() as unknown as import('../../src/services/logger').Logger
    );

    sinon
      .stub(vscode.window, 'showInformationMessage')
      .resolves('Open Preview Anyway' as unknown as vscode.MessageItem);

    const document = {
      languageId: 'markdown',
      uri: vscode.Uri.file('/tmp/large.md'),
      isUntitled: false,
    } as vscode.TextDocument;

    const result = await service.shouldShowPreview(document);
    expect(result).to.equal(true);
  });

  it('shows an error for binary files', async () => {
    const stateService = createStateService();
    const configService = {
      getConfig: () => ({ enabled: true, excludePatterns: [], maxFileSize: 1_048_576 }),
      isExcluded: () => false,
    } as unknown as import('../../src/services/config-service').ConfigService;
    const validationService = {
      isMarkdownFile: () => true,
      isDiffView: () => false,
      isLargeFile: async () => false,
      isBinaryFile: async () => true,
    } as unknown as import('../../src/services/validation-service').ValidationService;

    const service = new PreviewService(
      stateService as unknown as import('../../src/services/state-service').StateService,
      configService,
      validationService,
      createMemento(),
      createLogger() as unknown as import('../../src/services/logger').Logger
    );

    const errorStub = sinon.stub(vscode.window, 'showErrorMessage').resolves();

    const document = {
      languageId: 'markdown',
      uri: vscode.Uri.file('/tmp/binary.md'),
      isUntitled: false,
    } as vscode.TextDocument;

    const result = await service.shouldShowPreview(document);
    expect(result).to.equal(false);
    expect(errorStub.calledOnce).to.equal(true);
  });

  it('updates state when showing preview', async () => {
    const stateService = createStateService();
    const configService = {
      getConfig: () => ({ enabled: true, excludePatterns: [], maxFileSize: 1_048_576 }),
      isExcluded: () => false,
    } as unknown as import('../../src/services/config-service').ConfigService;
    const validationService = {
      isMarkdownFile: () => true,
      isDiffView: () => false,
      isLargeFile: async () => false,
      isBinaryFile: async () => false,
    } as unknown as import('../../src/services/validation-service').ValidationService;

    const service = new PreviewService(
      stateService as unknown as import('../../src/services/state-service').StateService,
      configService,
      validationService,
      createMemento(),
      createLogger() as unknown as import('../../src/services/logger').Logger
    );

    sinon.stub(vscode.commands, 'executeCommand').resolves();

    const uri = vscode.Uri.file('/tmp/preview.md');
    await service.showPreview(uri);

    expect(stateService.setMode.calledWith(uri, ViewMode.Preview)).to.equal(true);
    expect(stateService.setEditorVisible.calledWith(uri, false)).to.equal(true);
  });
});
