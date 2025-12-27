import { expect } from 'chai';
import sinon from 'sinon';
import * as vscode from 'vscode';
import { MarkdownFileHandler } from '../../src/handlers/markdown-file-handler';
import { PreviewService } from '../../src/services/preview-service';
import { StateService } from '../../src/services/state-service';
import { ValidationService } from '../../src/services/validation-service';
import { ConfigService } from '../../src/services/config-service';

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

  it('excludes configured files from auto-preview', async () => {
    const stateService = new StateService();
    const validationService = {
      isMarkdownFile: () => true,
      isDiffView: () => false,
      isLargeFile: async () => false,
      isBinaryFile: async () => false,
    } as ValidationService;

    const getStub = sinon.stub();
    getStub.withArgs('enabled', true).returns(true);
    getStub.withArgs('excludePatterns', ['**/node_modules/**', '**/.git/**']).returns([
      'docs/**',
    ]);
    getStub.withArgs('maxFileSize', 1_048_576).returns(1_048_576);
    const config = { get: getStub } as unknown as vscode.WorkspaceConfiguration;
    sinon.stub(vscode.workspace, 'getConfiguration').returns(config);

    const configService = new ConfigService();
    const previewService = new PreviewService(
      stateService,
      configService,
      validationService,
      createMemento()
    );

    const executeStub = sinon.stub(vscode.commands, 'executeCommand').resolves();

    const handler = new MarkdownFileHandler(
      previewService,
      stateService,
      configService,
      validationService,
      createMemento()
    );

    const document = {
      languageId: 'markdown',
      uri: vscode.Uri.file('/workspace/docs/skip.md'),
      isUntitled: false,
    } as vscode.TextDocument;

    await (handler as unknown as { handleDocumentOpen: (d: vscode.TextDocument) => Promise<void> })
      .handleDocumentOpen(document);

    expect(executeStub.calledWith('markdown.showPreview')).to.equal(false);
  });

  it('excludes node_modules by default', async () => {
    const stateService = new StateService();
    const validationService = {
      isMarkdownFile: () => true,
      isDiffView: () => false,
      isLargeFile: async () => false,
      isBinaryFile: async () => false,
    } as ValidationService;

    const getStub = sinon.stub();
    getStub.withArgs('enabled', true).returns(true);
    getStub.withArgs('excludePatterns', ['**/node_modules/**', '**/.git/**']).returns([
      '**/node_modules/**',
      '**/.git/**',
    ]);
    getStub.withArgs('maxFileSize', 1_048_576).returns(1_048_576);
    const config = { get: getStub } as unknown as vscode.WorkspaceConfiguration;
    sinon.stub(vscode.workspace, 'getConfiguration').returns(config);

    const configService = new ConfigService();
    const previewService = new PreviewService(
      stateService,
      configService,
      validationService,
      createMemento()
    );

    const executeStub = sinon.stub(vscode.commands, 'executeCommand').resolves();

    const handler = new MarkdownFileHandler(
      previewService,
      stateService,
      configService,
      validationService,
      createMemento()
    );

    const document = {
      languageId: 'markdown',
      uri: vscode.Uri.file('/workspace/node_modules/package/readme.md'),
      isUntitled: false,
    } as vscode.TextDocument;

    await (handler as unknown as { handleDocumentOpen: (d: vscode.TextDocument) => Promise<void> })
      .handleDocumentOpen(document);

    expect(executeStub.calledWith('markdown.showPreview')).to.equal(false);
  });

  it('excludes .git by default', async () => {
    const stateService = new StateService();
    const validationService = {
      isMarkdownFile: () => true,
      isDiffView: () => false,
      isLargeFile: async () => false,
      isBinaryFile: async () => false,
    } as ValidationService;

    const getStub = sinon.stub();
    getStub.withArgs('enabled', true).returns(true);
    getStub.withArgs('excludePatterns', ['**/node_modules/**', '**/.git/**']).returns([
      '**/node_modules/**',
      '**/.git/**',
    ]);
    getStub.withArgs('maxFileSize', 1_048_576).returns(1_048_576);
    const config = { get: getStub } as unknown as vscode.WorkspaceConfiguration;
    sinon.stub(vscode.workspace, 'getConfiguration').returns(config);

    const configService = new ConfigService();
    const previewService = new PreviewService(
      stateService,
      configService,
      validationService,
      createMemento()
    );

    const executeStub = sinon.stub(vscode.commands, 'executeCommand').resolves();

    const handler = new MarkdownFileHandler(
      previewService,
      stateService,
      configService,
      validationService,
      createMemento()
    );

    const document = {
      languageId: 'markdown',
      uri: vscode.Uri.file('/workspace/.git/config.md'),
      isUntitled: false,
    } as vscode.TextDocument;

    await (handler as unknown as { handleDocumentOpen: (d: vscode.TextDocument) => Promise<void> })
      .handleDocumentOpen(document);

    expect(executeStub.calledWith('markdown.showPreview')).to.equal(false);
  });

  it('skips preview when the extension is disabled', async () => {
    const stateService = new StateService();
    const validationService = {
      isMarkdownFile: () => true,
      isDiffView: () => false,
      isLargeFile: async () => false,
      isBinaryFile: async () => false,
    } as ValidationService;

    const getStub = sinon.stub();
    getStub.withArgs('enabled', true).returns(false);
    getStub.withArgs('excludePatterns', ['**/node_modules/**', '**/.git/**']).returns([
      '**/node_modules/**',
      '**/.git/**',
    ]);
    getStub.withArgs('maxFileSize', 1_048_576).returns(1_048_576);
    const config = { get: getStub } as unknown as vscode.WorkspaceConfiguration;
    sinon.stub(vscode.workspace, 'getConfiguration').returns(config);

    const configService = new ConfigService();
    const previewService = new PreviewService(
      stateService,
      configService,
      validationService,
      createMemento()
    );

    const executeStub = sinon.stub(vscode.commands, 'executeCommand').resolves();

    const handler = new MarkdownFileHandler(
      previewService,
      stateService,
      configService,
      validationService,
      createMemento()
    );

    const document = {
      languageId: 'markdown',
      uri: vscode.Uri.file('/workspace/disabled.md'),
      isUntitled: false,
    } as vscode.TextDocument;

    await (handler as unknown as { handleDocumentOpen: (d: vscode.TextDocument) => Promise<void> })
      .handleDocumentOpen(document);

    expect(executeStub.calledWith('markdown.showPreview')).to.equal(false);
  });

  it('uses workspace settings over user settings', () => {
    const userConfig = {
      get: (key: string, fallback: unknown) => {
        if (key === 'enabled') {
          return true;
        }
        if (key === 'excludePatterns') {
          return ['**/node_modules/**', '**/.git/**'];
        }
        if (key === 'maxFileSize') {
          return 1_048_576;
        }
        return fallback;
      },
    } as vscode.WorkspaceConfiguration;

    const workspaceConfig = {
      get: (key: string, fallback: unknown) => {
        if (key === 'enabled') {
          return false;
        }
        if (key === 'excludePatterns') {
          return ['docs/**'];
        }
        if (key === 'maxFileSize') {
          return 1_048_576;
        }
        return fallback;
      },
    } as vscode.WorkspaceConfiguration;

    sinon.stub(vscode.workspace, 'getConfiguration').callsFake((_section, resource) => {
      const uri = resource instanceof vscode.Uri ? resource : undefined;
      if (uri?.fsPath.includes('/workspace')) {
        return workspaceConfig;
      }
      return userConfig;
    });

    const service = new ConfigService();
    expect(service.getEnabled()).to.equal(true);
    expect(service.getEnabled(vscode.Uri.file('/workspace/project/readme.md'))).to.equal(
      false
    );
  });
});
