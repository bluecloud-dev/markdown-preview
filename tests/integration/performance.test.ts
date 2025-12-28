import { expect } from 'chai';
import sinon from 'sinon';
import * as vscode from 'vscode';
import { MarkdownFileHandler } from '../../src/handlers/markdown-file-handler';
import { Logger } from '../../src/services/logger';
import { PreviewService } from '../../src/services/preview-service';
import { StateService } from '../../src/services/state-service';
import { ValidationService } from '../../src/services/validation-service';
import { activate } from '../../src/extension';

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

describe('Performance checks', () => {
  beforeEach(() => {
    const l10nStub = sinon.stub(vscode.l10n, 't') as sinon.SinonStub;
    l10nStub.callsFake((message: string) => message);
  });

  afterEach(() => {
    sinon.restore();
  });

  it('opens markdown preview within the 1s target', async () => {
    const stateService = new StateService();
    const validationService = {
      isMarkdownFile: () => true,
      isDiffView: () => false,
      hasConflictMarkers: () => false,
      isLargeFile: async () => false,
      isBinaryFile: async () => false,
    } as ValidationService;

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

    sinon.stub(vscode.commands, 'executeCommand').resolves();
    sinon.stub(vscode.window, 'showInformationMessage').resolves();

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
      uri: vscode.Uri.file('/tmp/perf.md'),
      isUntitled: false,
    } as vscode.TextDocument;

    const start = Date.now();
    await (handler as unknown as { processDocumentOpen: (d: vscode.TextDocument) => Promise<void> })
      .processDocumentOpen(document);
    const duration = Date.now() - start;

    expect(duration).to.be.lessThan(1000);
  });

  it('switches modes within the 500ms target', async () => {
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
      document: { uri: vscode.Uri.file('/tmp/mode.md') },
    } as unknown as vscode.TextEditor;

    sinon.stub(vscode.window, 'showTextDocument').resolves(editor);
    sinon.stub(vscode.commands, 'executeCommand').resolves();
    sinon.stub(vscode.workspace, 'getConfiguration').returns({
      get: () => 'off',
      has: () => true,
      inspect: () => {
        return;
      },
      update: async () => {},
    } as unknown as vscode.WorkspaceConfiguration);

    const enterStart = Date.now();
    await previewService.enterEditMode(editor.document.uri);
    const enterDuration = Date.now() - enterStart;
    expect(enterDuration).to.be.lessThan(500);

    const exitStart = Date.now();
    await previewService.exitEditMode(editor.document.uri);
    const exitDuration = Date.now() - exitStart;
    expect(exitDuration).to.be.lessThan(500);
  });

  it('activates within the 50ms startup target', () => {
    const context = {
      subscriptions: [],
      workspaceState: createMemento(),
      globalState: createMemento(),
    } as unknown as vscode.ExtensionContext;

    sinon.stub(vscode.commands, 'executeCommand').resolves();
    sinon.stub(vscode.commands, 'registerCommand').returns({ dispose: () => {} });
    sinon.stub(vscode.commands, 'registerTextEditorCommand').returns({ dispose: () => {} });
    sinon.stub(vscode.workspace, 'onDidChangeConfiguration').returns({ dispose: () => {} });
    sinon.stub(vscode.workspace, 'onDidOpenTextDocument').returns({ dispose: () => {} });
    sinon.stub(vscode.window.tabGroups, 'onDidChangeTabs').returns({ dispose: () => {} });
    sinon
      .stub(vscode.window, 'onDidChangeActiveTextEditor')
      .returns({ dispose: () => {} });
    sinon.stub(vscode.window, 'createOutputChannel').returns({
      name: 'Markdown Reader',
      append: () => {},
      appendLine: () => {},
      replace: () => {},
      clear: () => {},
      show: () => {},
      hide: () => {},
      dispose: () => {},
    } as unknown as vscode.LogOutputChannel);
    sinon.stub(vscode.window, 'activeTextEditor').get(() => {});
    sinon.stub(vscode.workspace, 'workspaceFolders').get(() => []);

    const start = Date.now();
    activate(context);
    const duration = Date.now() - start;

    expect(duration).to.be.lessThan(50);
  });
});
