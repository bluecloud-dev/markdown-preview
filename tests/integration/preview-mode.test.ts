import { expect } from 'chai';
import sinon from 'sinon';
import * as vscode from 'vscode';
import { MarkdownFileHandler } from '../../src/handlers/markdown-file-handler';
import { PreviewService } from '../../src/services/preview-service';
import { StateService } from '../../src/services/state-service';
import { ValidationService } from '../../src/services/validation-service';

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

describe('Preview mode integration', () => {
  beforeEach(() => {
    const l10nStub = sinon.stub(vscode.l10n, 't') as sinon.SinonStub;
    l10nStub.callsFake((message: string) => message);
  });

  afterEach(() => {
    sinon.restore();
  });

  it('opens markdown files in preview mode by default and shows welcome once', async () => {
    const stateService = new StateService();
    const validationService = {
      isMarkdownFile: () => true,
      isDiffView: () => false,
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

    const workspaceState = createMemento();
    const globalState = createMemento();
    const previewService = new PreviewService(
      stateService,
      configService,
      validationService,
      workspaceState
    );

    const executeStub = sinon.stub(vscode.commands, 'executeCommand').resolves();
    const infoStub = sinon.stub(vscode.window, 'showInformationMessage').resolves();
    sinon.stub(vscode.env, 'openExternal').resolves(true);

    const handler = new MarkdownFileHandler(
      previewService,
      stateService,
      configService,
      validationService,
      globalState
    );

    const document = {
      languageId: 'markdown',
      uri: vscode.Uri.file('/tmp/sample.md'),
      isUntitled: false,
    } as vscode.TextDocument;

    await (handler as unknown as { handleDocumentOpen: (d: vscode.TextDocument) => Promise<void> })
      .handleDocumentOpen(document);

    expect(executeStub.calledWith('markdown.showPreview')).to.equal(true);
    expect(infoStub.calledOnce).to.equal(true);

    await (handler as unknown as { handleDocumentOpen: (d: vscode.TextDocument) => Promise<void> })
      .handleDocumentOpen(document);

    expect(infoStub.calledOnce).to.equal(true);
  });

  it('skips auto-preview for large files and persists opt-out', async () => {
    const stateService = new StateService();
    const validationService = {
      isMarkdownFile: () => true,
      isDiffView: () => false,
      isLargeFile: async () => true,
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

    const workspaceState = createMemento();
    const globalState = createMemento();
    const previewService = new PreviewService(
      stateService,
      configService,
      validationService,
      workspaceState
    );

    sinon.stub(vscode.commands, 'executeCommand').resolves();
    const infoStub = sinon.stub(
      vscode.window,
      'showInformationMessage'
    ) as sinon.SinonStub;
    infoStub.resolves("Don't Show Again for This File");

    const handler = new MarkdownFileHandler(
      previewService,
      stateService,
      configService,
      validationService,
      globalState
    );

    const document = {
      languageId: 'markdown',
      uri: vscode.Uri.file('/tmp/large.md'),
      isUntitled: false,
    } as vscode.TextDocument;

    await (handler as unknown as { handleDocumentOpen: (d: vscode.TextDocument) => Promise<void> })
      .handleDocumentOpen(document);

    expect(infoStub.calledOnce).to.equal(true);

    await (handler as unknown as { handleDocumentOpen: (d: vscode.TextDocument) => Promise<void> })
      .handleDocumentOpen(document);

    expect(infoStub.calledOnce).to.equal(true);
  });

  it('uses native preview command and avoids edit-mode preview', async () => {
    const stateService = new StateService();
    const validationService = {
      isMarkdownFile: () => true,
      isDiffView: () => false,
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

    const workspaceState = createMemento();
    const globalState = createMemento();
    const previewService = new PreviewService(
      stateService,
      configService,
      validationService,
      workspaceState
    );

    const executeStub = sinon.stub(vscode.commands, 'executeCommand').resolves();
    sinon.stub(vscode.window, 'showInformationMessage').resolves();
    sinon.stub(vscode.env, 'openExternal').resolves(true);

    const handler = new MarkdownFileHandler(
      previewService,
      stateService,
      configService,
      validationService,
      globalState
    );

    const document = {
      languageId: 'markdown',
      uri: vscode.Uri.file('/tmp/quick-open.md'),
      isUntitled: false,
    } as vscode.TextDocument;

    await (handler as unknown as { handleDocumentOpen: (d: vscode.TextDocument) => Promise<void> })
      .handleDocumentOpen(document);

    expect(executeStub.calledWith('markdown.showPreview')).to.equal(true);
    expect(executeStub.calledWith('markdown.showPreviewToSide')).to.equal(false);
  });

  it('opens markdown files from Quick Open in preview mode', async () => {
    const stateService = new StateService();
    const validationService = {
      isMarkdownFile: () => true,
      isDiffView: () => false,
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
      createMemento()
    );

    const executeStub = sinon.stub(vscode.commands, 'executeCommand').resolves();
    sinon.stub(vscode.window, 'showInformationMessage').resolves();
    sinon.stub(vscode.env, 'openExternal').resolves(true);

    const handler = new MarkdownFileHandler(
      previewService,
      stateService,
      configService,
      validationService,
      createMemento()
    );

    const document = {
      languageId: 'markdown',
      uri: vscode.Uri.file('/tmp/quick-open.md'),
      isUntitled: false,
    } as vscode.TextDocument;

    await (handler as unknown as { handleDocumentOpen: (d: vscode.TextDocument) => Promise<void> })
      .handleDocumentOpen(document);

    expect(executeStub.calledWith('markdown.showPreview')).to.equal(true);
  });

  it('does not introduce extra UI elements in preview mode', async () => {
    const stateService = new StateService();
    const validationService = {
      isMarkdownFile: () => true,
      isDiffView: () => false,
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
      createMemento()
    );

    const executeStub = sinon.stub(vscode.commands, 'executeCommand').resolves();
    sinon.stub(vscode.window, 'showInformationMessage').resolves();
    sinon.stub(vscode.env, 'openExternal').resolves(true);

    const handler = new MarkdownFileHandler(
      previewService,
      stateService,
      configService,
      validationService,
      createMemento()
    );

    const document = {
      languageId: 'markdown',
      uri: vscode.Uri.file('/tmp/no-ui.md'),
      isUntitled: false,
    } as vscode.TextDocument;

    await (handler as unknown as { handleDocumentOpen: (d: vscode.TextDocument) => Promise<void> })
      .handleDocumentOpen(document);

    expect(executeStub.calledWith('markdown.showPreviewToSide')).to.equal(false);
    expect(executeStub.calledWith('workbench.action.splitEditor')).to.equal(false);
  });
});
