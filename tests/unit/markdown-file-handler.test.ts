import { expect } from 'chai';
import sinon from 'sinon';
import * as vscode from 'vscode';
import { MarkdownFileHandler } from '../../src/handlers/markdown-file-handler';
import { ViewMode } from '../../src/types/state';

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

describe('MarkdownFileHandler', () => {
  afterEach(() => {
    sinon.restore();
  });

  it('skips auto-preview when already in edit mode', async () => {
    const previewServiceStubs = {
      shouldShowPreview: sinon.stub().resolves(true),
      showPreview: sinon.stub().resolves(),
    };
    const previewService =
      previewServiceStubs as unknown as import('../../src/services/preview-service').PreviewService;

    const stateServiceStubs = {
      getExistingState: sinon.stub().returns({ mode: ViewMode.Edit }),
      setMode: sinon.stub(),
      setEditorVisible: sinon.stub(),
      clear: sinon.stub(),
    };
    const stateService =
      stateServiceStubs as unknown as import('../../src/services/state-service').StateService;

    const configService = {
      getEnabled: () => true,
    } as unknown as import('../../src/services/config-service').ConfigService;
    const validationService = {
      isMarkdownFile: () => true,
    } as unknown as import('../../src/services/validation-service').ValidationService;

    const loggerStubs = { info: sinon.stub(), warn: sinon.stub() };
    const logger = loggerStubs as unknown as import('../../src/services/logger').Logger;

    const handler = new MarkdownFileHandler(
      previewService,
      stateService,
      configService,
      validationService,
      createMemento(),
      logger
    );

    sinon.stub(vscode.commands, 'executeCommand').resolves();

    const document = { uri: vscode.Uri.file('/tmp/edit.md'), isUntitled: false } as vscode.TextDocument;
    await (handler as unknown as { processDocumentOpen: (d: vscode.TextDocument) => Promise<void> })
      .processDocumentOpen(document);

    expect(previewServiceStubs.shouldShowPreview.called).to.equal(false);
    expect(previewServiceStubs.showPreview.called).to.equal(false);
    expect(loggerStubs.info.called).to.equal(true);
  });

  it('enters edit mode when a markdown editor is manually opened', async () => {
    const previewServiceStubs = { shouldShowPreview: sinon.stub().resolves(true), showPreview: sinon.stub().resolves() };
    const previewService =
      previewServiceStubs as unknown as import('../../src/services/preview-service').PreviewService;

    const uri = vscode.Uri.file('/tmp/manual.md');
    const stateServiceStubs = {
      getExistingState: sinon.stub().returns({ mode: ViewMode.Preview }),
      setMode: sinon.stub(),
      setEditorVisible: sinon.stub(),
      clear: sinon.stub(),
    };
    const stateService =
      stateServiceStubs as unknown as import('../../src/services/state-service').StateService;

    const configService = { getEnabled: () => true } as unknown as import('../../src/services/config-service').ConfigService;
    const validationService = { isMarkdownFile: () => true } as unknown as import('../../src/services/validation-service').ValidationService;

    const loggerStubs = { info: sinon.stub(), warn: sinon.stub() };
    const logger = loggerStubs as unknown as import('../../src/services/logger').Logger;

    const handler = new MarkdownFileHandler(
      previewService,
      stateService,
      configService,
      validationService,
      createMemento(),
      logger
    );

    sinon.stub(vscode.commands, 'executeCommand').resolves();
    vscode.window.activeTextEditor = { document: { uri } } as unknown as vscode.TextEditor;

    const document = { uri, isUntitled: false } as vscode.TextDocument;
    await (handler as unknown as { processDocumentOpen: (d: vscode.TextDocument) => Promise<void> })
      .processDocumentOpen(document);

    expect(stateServiceStubs.setMode.calledWith(uri, ViewMode.Edit)).to.equal(true);
    expect(stateServiceStubs.setEditorVisible.calledWith(uri, true)).to.equal(true);
    expect(previewServiceStubs.showPreview.called).to.equal(false);
  });

  it('does not show welcome prompt more than once', async () => {
    const previewServiceStubs = {
      shouldShowPreview: sinon.stub().resolves(true),
      showPreview: sinon.stub().resolves(),
    };
    const previewService =
      previewServiceStubs as unknown as import('../../src/services/preview-service').PreviewService;

    const stateServiceStubs = {
      getExistingState: sinon.stub().returns(void 0),
      setMode: sinon.stub(),
      setEditorVisible: sinon.stub(),
      clear: sinon.stub(),
    };
    const stateService =
      stateServiceStubs as unknown as import('../../src/services/state-service').StateService;

    const configService = { getEnabled: () => true } as unknown as import('../../src/services/config-service').ConfigService;
    const validationService = {
      isMarkdownFile: () => true,
      isDiffView: () => false,
      hasConflictMarkers: () => false,
    } as unknown as import('../../src/services/validation-service').ValidationService;

    const loggerStubs = { info: sinon.stub(), warn: sinon.stub() };
    const logger = loggerStubs as unknown as import('../../src/services/logger').Logger;

    const globalState = createMemento();
    const handler = new MarkdownFileHandler(
      previewService,
      stateService,
      configService,
      validationService,
      globalState,
      logger
    );

    sinon.stub(vscode.commands, 'executeCommand').resolves();
    const welcomeStub = sinon.stub(vscode.window, 'showInformationMessage').resolves();

    const document = { uri: vscode.Uri.file('/tmp/skip.md'), isUntitled: false } as vscode.TextDocument;
    await (handler as unknown as { processDocumentOpen: (d: vscode.TextDocument) => Promise<void> })
      .processDocumentOpen(document);
    await (handler as unknown as { processDocumentOpen: (d: vscode.TextDocument) => Promise<void> })
      .processDocumentOpen(document);

    expect(welcomeStub.calledOnce).to.equal(true);
  });

  it('restores preview when edit tab closes but file remains open', async () => {
    const previewServiceStubs = { showPreview: sinon.stub().resolves() };
    const previewService =
      previewServiceStubs as unknown as import('../../src/services/preview-service').PreviewService;

    const uri = vscode.Uri.file('/tmp/open.md');
    const stateServiceStubs = {
      getExistingState: sinon.stub().returns({ mode: ViewMode.Edit }),
      setEditorVisible: sinon.stub(),
      clear: sinon.stub(),
    };
    const stateService =
      stateServiceStubs as unknown as import('../../src/services/state-service').StateService;

    const configService = { getEnabled: () => true } as unknown as import('../../src/services/config-service').ConfigService;
    const validationService = { isMarkdownFile: () => true } as unknown as import('../../src/services/validation-service').ValidationService;
    const logger = { info: sinon.stub(), warn: sinon.stub() } as unknown as import('../../src/services/logger').Logger;

    const handler = new MarkdownFileHandler(
      previewService,
      stateService,
      configService,
      validationService,
      createMemento(),
      logger
    );

    const tabInputCustomCtor = (
      vscode as unknown as { TabInputCustom: new (uri: vscode.Uri) => unknown }
    ).TabInputCustom;

    Object.defineProperty(vscode.window.tabGroups, 'all', {
      value: [{ tabs: [{ input: new tabInputCustomCtor(uri) }] }] as unknown as typeof vscode.window.tabGroups.all,
      configurable: true,
    });

    await (handler as unknown as { handleClosedTabs: (tabs: readonly vscode.Tab[]) => Promise<void> })
      .handleClosedTabs([{ input: new vscode.TabInputText(uri) }] as unknown as readonly vscode.Tab[]);

    expect(stateServiceStubs.setEditorVisible.calledWith(uri, false)).to.equal(true);
    expect(previewServiceStubs.showPreview.calledWith(uri)).to.equal(true);
  });

  it('detects open diff tabs when determining open state', async () => {
    const previewServiceStubs = { showPreview: sinon.stub().resolves() };
    const previewService =
      previewServiceStubs as unknown as import('../../src/services/preview-service').PreviewService;

    const uri = vscode.Uri.file('/tmp/open.md');
    const stateServiceStubs = {
      getExistingState: sinon.stub().returns({ mode: ViewMode.Edit }),
      setEditorVisible: sinon.stub(),
      clear: sinon.stub(),
    };
    const stateService =
      stateServiceStubs as unknown as import('../../src/services/state-service').StateService;

    const configService = { getEnabled: () => true } as unknown as import('../../src/services/config-service').ConfigService;
    const validationService = { isMarkdownFile: () => true } as unknown as import('../../src/services/validation-service').ValidationService;
    const logger = { info: sinon.stub(), warn: sinon.stub() } as unknown as import('../../src/services/logger').Logger;

    const handler = new MarkdownFileHandler(
      previewService,
      stateService,
      configService,
      validationService,
      createMemento(),
      logger
    );

    const tabInputTextDiffCtor = (
      vscode as unknown as { TabInputTextDiff: new (original: vscode.Uri, modified: vscode.Uri) => unknown }
    ).TabInputTextDiff;

    Object.defineProperty(vscode.window.tabGroups, 'all', {
      value: [
        {
          tabs: [
            {
              input: new tabInputTextDiffCtor(vscode.Uri.file('/tmp/original.md'), uri),
            },
          ],
        },
      ] as unknown as typeof vscode.window.tabGroups.all,
      configurable: true,
    });

    await (handler as unknown as { handleClosedTabs: (tabs: readonly vscode.Tab[]) => Promise<void> })
      .handleClosedTabs([{ input: new vscode.TabInputText(uri) }] as unknown as readonly vscode.Tab[]);

    expect(stateServiceStubs.setEditorVisible.calledWith(uri, false)).to.equal(true);
    expect(previewServiceStubs.showPreview.calledWith(uri)).to.equal(true);
  });

  it('skips auto-preview when extension is disabled for a resource', async () => {
    const previewServiceStubs = {
      shouldShowPreview: sinon.stub().resolves(true),
      showPreview: sinon.stub().resolves(),
      enterEditMode: sinon.stub().resolves(),
    };
    const previewService =
      previewServiceStubs as unknown as import('../../src/services/preview-service').PreviewService;

    const stateServiceStubs = {
      getExistingState: sinon.stub().returns(void 0),
      setMode: sinon.stub(),
      setEditorVisible: sinon.stub(),
      clear: sinon.stub(),
    };
    const stateService =
      stateServiceStubs as unknown as import('../../src/services/state-service').StateService;

    const configService = { getEnabled: () => false } as unknown as import('../../src/services/config-service').ConfigService;
    const validationService = { isMarkdownFile: () => true } as unknown as import('../../src/services/validation-service').ValidationService;
    const loggerStubs = { info: sinon.stub(), warn: sinon.stub() };
    const logger = loggerStubs as unknown as import('../../src/services/logger').Logger;

    const handler = new MarkdownFileHandler(
      previewService,
      stateService,
      configService,
      validationService,
      createMemento(),
      logger
    );

    sinon.stub(vscode.commands, 'executeCommand').resolves();
    const document = { uri: vscode.Uri.file('/tmp/disabled.md'), isUntitled: false } as vscode.TextDocument;
    await (handler as unknown as { processDocumentOpen: (d: vscode.TextDocument) => Promise<void> })
      .processDocumentOpen(document);

    expect(previewServiceStubs.shouldShowPreview.called).to.equal(false);
    expect(previewServiceStubs.showPreview.called).to.equal(false);
    expect(loggerStubs.info.called).to.equal(true);
  });

  it('skips auto-preview for diff views', async () => {
    const previewServiceStubs = { shouldShowPreview: sinon.stub().resolves(true), showPreview: sinon.stub().resolves() };
    const previewService =
      previewServiceStubs as unknown as import('../../src/services/preview-service').PreviewService;
    const stateServiceStubs = {
      getExistingState: sinon.stub().returns(void 0),
      setMode: sinon.stub(),
      setEditorVisible: sinon.stub(),
      clear: sinon.stub(),
    };
    const stateService =
      stateServiceStubs as unknown as import('../../src/services/state-service').StateService;
    const configService = { getEnabled: () => true } as unknown as import('../../src/services/config-service').ConfigService;
    const validationService = { isMarkdownFile: () => true, isDiffView: () => true } as unknown as import('../../src/services/validation-service').ValidationService;
    const loggerStubs = { info: sinon.stub(), warn: sinon.stub() };
    const logger = loggerStubs as unknown as import('../../src/services/logger').Logger;

    const handler = new MarkdownFileHandler(
      previewService,
      stateService,
      configService,
      validationService,
      createMemento(),
      logger
    );

    sinon.stub(vscode.commands, 'executeCommand').resolves();
    const document = { uri: vscode.Uri.parse('git:/tmp/diff.md'), isUntitled: false } as vscode.TextDocument;
    await (handler as unknown as { processDocumentOpen: (d: vscode.TextDocument) => Promise<void> })
      .processDocumentOpen(document);

    expect(previewServiceStubs.shouldShowPreview.called).to.equal(false);
    expect(previewServiceStubs.showPreview.called).to.equal(false);
    expect(loggerStubs.info.called).to.equal(true);
  });

  it('does nothing when preview service indicates preview should not be shown', async () => {
    const previewServiceStubs = { shouldShowPreview: sinon.stub().resolves(false), showPreview: sinon.stub().resolves() };
    const previewService =
      previewServiceStubs as unknown as import('../../src/services/preview-service').PreviewService;
    const stateServiceStubs = {
      getExistingState: sinon.stub().returns(void 0),
      setMode: sinon.stub(),
      setEditorVisible: sinon.stub(),
      clear: sinon.stub(),
    };
    const stateService =
      stateServiceStubs as unknown as import('../../src/services/state-service').StateService;
    const configService = { getEnabled: () => true } as unknown as import('../../src/services/config-service').ConfigService;
    const validationService = { isMarkdownFile: () => true, isDiffView: () => false, hasConflictMarkers: () => false } as unknown as import('../../src/services/validation-service').ValidationService;
    const logger = { info: sinon.stub(), warn: sinon.stub() } as unknown as import('../../src/services/logger').Logger;

    const handler = new MarkdownFileHandler(
      previewService,
      stateService,
      configService,
      validationService,
      createMemento(),
      logger
    );

    const commandStub = sinon.stub(vscode.commands, 'executeCommand').resolves();
    const document = { uri: vscode.Uri.file('/tmp/nope.md'), isUntitled: false } as vscode.TextDocument;
    await (handler as unknown as { processDocumentOpen: (d: vscode.TextDocument) => Promise<void> })
      .processDocumentOpen(document);

    expect(previewServiceStubs.showPreview.called).to.equal(false);
    expect(commandStub.calledWith('workbench.action.closeActiveEditor')).to.equal(false);
  });

  it('clears state when a tab closes and file is not open elsewhere', async () => {
    const previewServiceStubs = { showPreview: sinon.stub().resolves() };
    const previewService =
      previewServiceStubs as unknown as import('../../src/services/preview-service').PreviewService;

    const uri = vscode.Uri.file('/tmp/closed.md');
    const stateServiceStubs = {
      getExistingState: sinon.stub().returns({ mode: ViewMode.Preview }),
      setEditorVisible: sinon.stub(),
      clear: sinon.stub(),
    };
    const stateService =
      stateServiceStubs as unknown as import('../../src/services/state-service').StateService;
    const configService = { getEnabled: () => true } as unknown as import('../../src/services/config-service').ConfigService;
    const validationService = { isMarkdownFile: () => true } as unknown as import('../../src/services/validation-service').ValidationService;
    const logger = { info: sinon.stub(), warn: sinon.stub() } as unknown as import('../../src/services/logger').Logger;

    const handler = new MarkdownFileHandler(
      previewService,
      stateService,
      configService,
      validationService,
      createMemento(),
      logger
    );

    Object.defineProperty(vscode.window.tabGroups, 'all', { value: [], configurable: true });

    await (handler as unknown as { handleClosedTabs: (tabs: readonly vscode.Tab[]) => Promise<void> })
      .handleClosedTabs([{ input: new vscode.TabInputText(uri) }] as unknown as readonly vscode.Tab[]);

    expect(stateServiceStubs.clear.calledWith(uri)).to.equal(true);
    expect(previewServiceStubs.showPreview.called).to.equal(false);
  });

  it('opens the tutorial link when selected in the welcome prompt', async () => {
    const previewServiceStubs = { shouldShowPreview: sinon.stub().resolves(true), showPreview: sinon.stub().resolves() };
    const previewService =
      previewServiceStubs as unknown as import('../../src/services/preview-service').PreviewService;

    const stateServiceStubs = {
      getExistingState: sinon.stub().returns(void 0),
      setMode: sinon.stub(),
      setEditorVisible: sinon.stub(),
      clear: sinon.stub(),
    };
    const stateService =
      stateServiceStubs as unknown as import('../../src/services/state-service').StateService;
    const configService = { getEnabled: () => true } as unknown as import('../../src/services/config-service').ConfigService;
    const validationService = { isMarkdownFile: () => true, isDiffView: () => false, hasConflictMarkers: () => false } as unknown as import('../../src/services/validation-service').ValidationService;
    const logger = { info: sinon.stub(), warn: sinon.stub() } as unknown as import('../../src/services/logger').Logger;

    const globalState = createMemento();
    const handler = new MarkdownFileHandler(
      previewService,
      stateService,
      configService,
      validationService,
      globalState,
      logger
    );

    sinon.stub(vscode.commands, 'executeCommand').resolves();
    sinon.stub(vscode.window, 'showInformationMessage').resolves('View Tutorial' as unknown as vscode.MessageItem);
    const openExternalStub = sinon.stub(vscode.env, 'openExternal').resolves();

    const document = { uri: vscode.Uri.file('/tmp/welcome.md'), isUntitled: false } as vscode.TextDocument;
    await (handler as unknown as { processDocumentOpen: (d: vscode.TextDocument) => Promise<void> })
      .processDocumentOpen(document);

    expect(openExternalStub.calledOnce).to.equal(true);
  });

  it('routes tab change events through the closed tabs handler', async () => {
    const previewServiceStubs = { showPreview: sinon.stub().resolves() };
    const previewService =
      previewServiceStubs as unknown as import('../../src/services/preview-service').PreviewService;
    const stateServiceStubs = { getExistingState: sinon.stub().returns({ mode: ViewMode.Edit }), setEditorVisible: sinon.stub(), clear: sinon.stub() };
    const stateService =
      stateServiceStubs as unknown as import('../../src/services/state-service').StateService;
    const configService = { getEnabled: () => true } as unknown as import('../../src/services/config-service').ConfigService;
    const validationService = { isMarkdownFile: () => true } as unknown as import('../../src/services/validation-service').ValidationService;
    const logger = { info: sinon.stub(), warn: sinon.stub() } as unknown as import('../../src/services/logger').Logger;

    const handler = new MarkdownFileHandler(
      previewService,
      stateService,
      configService,
      validationService,
      createMemento(),
      logger
    );

    const uri = vscode.Uri.file('/tmp/open.md');
    Object.defineProperty(vscode.window.tabGroups, 'all', {
      value: [{ tabs: [{ input: new vscode.TabInputText(uri) }] }] as unknown as typeof vscode.window.tabGroups.all,
      configurable: true,
    });

    await (handler as unknown as { handleTabsChanged: (event: vscode.TabChangeEvent) => void }).handleTabsChanged({
      closed: [{ input: new vscode.TabInputText(uri) }],
    } as unknown as vscode.TabChangeEvent);

    expect(previewServiceStubs.showPreview.called).to.equal(true);
  });

  it('clears state and pending timeouts on document close', () => {
    const previewService = {} as unknown as import('../../src/services/preview-service').PreviewService;
    const stateServiceStubs = { clear: sinon.stub() };
    const stateService = stateServiceStubs as unknown as import('../../src/services/state-service').StateService;
    const configService = { getEnabled: () => true } as unknown as import('../../src/services/config-service').ConfigService;
    const validationService = { isMarkdownFile: () => true } as unknown as import('../../src/services/validation-service').ValidationService;
    const logger = { info: sinon.stub(), warn: sinon.stub() } as unknown as import('../../src/services/logger').Logger;

    const handler = new MarkdownFileHandler(
      previewService,
      stateService,
      configService,
      validationService,
      createMemento(),
      logger
    );

    const uri = vscode.Uri.file('/tmp/close.md');
    const key = uri.toString();
    const timeout = setTimeout(() => {}, 1000);
    (handler as unknown as { pendingOpens: Map<string, ReturnType<typeof setTimeout>> }).pendingOpens.set(
      key,
      timeout
    );

    (handler as unknown as { handleDocumentClose: (d: vscode.TextDocument) => void }).handleDocumentClose(
      { uri } as vscode.TextDocument
    );

    expect(stateServiceStubs.clear.calledWith(uri)).to.equal(true);
    const pending = (handler as unknown as { pendingOpens: Map<string, ReturnType<typeof setTimeout>> }).pendingOpens;
    expect(pending.has(key)).to.equal(false);
  });

  it('clears state for externally deleted files', () => {
    const previewService = {} as unknown as import('../../src/services/preview-service').PreviewService;
    const stateServiceStubs = { clear: sinon.stub() };
    const stateService = stateServiceStubs as unknown as import('../../src/services/state-service').StateService;
    const configService = { getEnabled: () => true } as unknown as import('../../src/services/config-service').ConfigService;
    const validationService = { isMarkdownFile: () => true } as unknown as import('../../src/services/validation-service').ValidationService;
    const logger = { info: sinon.stub(), warn: sinon.stub() } as unknown as import('../../src/services/logger').Logger;

    const handler = new MarkdownFileHandler(
      previewService,
      stateService,
      configService,
      validationService,
      createMemento(),
      logger
    );

    const uri = vscode.Uri.file('/tmp/deleted.md');
    (handler as unknown as { handleFilesDeleted: (event: vscode.FileDeleteEvent) => void }).handleFilesDeleted({
      files: [uri],
    } as unknown as vscode.FileDeleteEvent);

    expect(stateServiceStubs.clear.calledWith(uri)).to.equal(true);
  });

  it('skips non-markdown documents', async () => {
    const previewServiceStubs = {
      shouldShowPreview: sinon.stub().resolves(true),
      showPreview: sinon.stub().resolves(),
    };
    const previewService = previewServiceStubs as unknown as import('../../src/services/preview-service').PreviewService;

    const stateService = {
      getExistingState: sinon.stub().returns(void 0),
      setMode: sinon.stub(),
      setEditorVisible: sinon.stub(),
      clear: sinon.stub(),
    } as unknown as import('../../src/services/state-service').StateService;

    const configService = { getEnabled: () => true } as unknown as import('../../src/services/config-service').ConfigService;
    const validationService = {
      isMarkdownFile: () => false,
    } as unknown as import('../../src/services/validation-service').ValidationService;

    const logger = { info: sinon.stub(), warn: sinon.stub() } as unknown as import('../../src/services/logger').Logger;

    const handler = new MarkdownFileHandler(
      previewService,
      stateService,
      configService,
      validationService,
      createMemento(),
      logger
    );

    const document = { uri: vscode.Uri.file('/tmp/test.txt') } as vscode.TextDocument;
    await (handler as unknown as { processDocumentOpen: (d: vscode.TextDocument) => Promise<void> })
      .processDocumentOpen(document);

    expect(previewServiceStubs.showPreview.called).to.equal(false);
  });

  it('opens untitled markdown in edit mode', async () => {
    const previewServiceStubs = {
      enterEditMode: sinon.stub().resolves(),
      shouldShowPreview: sinon.stub().resolves(false),
    };
    const previewService = previewServiceStubs as unknown as import('../../src/services/preview-service').PreviewService;

    const stateService = {
      getExistingState: sinon.stub().returns(void 0),
      setMode: sinon.stub(),
      setEditorVisible: sinon.stub(),
      clear: sinon.stub(),
    } as unknown as import('../../src/services/state-service').StateService;

    const configService = { getEnabled: () => true } as unknown as import('../../src/services/config-service').ConfigService;
    const validationService = {
      isMarkdownFile: () => true,
      isDiffView: () => false,
      hasConflictMarkers: () => false,
    } as unknown as import('../../src/services/validation-service').ValidationService;

    const logger = { info: sinon.stub(), warn: sinon.stub() } as unknown as import('../../src/services/logger').Logger;

    const handler = new MarkdownFileHandler(
      previewService,
      stateService,
      configService,
      validationService,
      createMemento(),
      logger
    );

    const document = {
      uri: vscode.Uri.parse('untitled:Untitled-1'),
      isUntitled: true,
    } as vscode.TextDocument;

    await (handler as unknown as { processDocumentOpen: (d: vscode.TextDocument) => Promise<void> })
      .processDocumentOpen(document);

    expect(previewServiceStubs.enterEditMode.calledOnce).to.equal(true);
  });

  it('opens preview when eligible', async () => {
    const previewServiceStubs = {
      shouldShowPreview: sinon.stub().resolves(true),
      showPreview: sinon.stub().resolves(),
    };
    const previewService = previewServiceStubs as unknown as import('../../src/services/preview-service').PreviewService;

    const stateService = {
      getExistingState: sinon.stub().returns(void 0),
      setMode: sinon.stub(),
      setEditorVisible: sinon.stub(),
      clear: sinon.stub(),
    } as unknown as import('../../src/services/state-service').StateService;

    const configService = { getEnabled: () => true } as unknown as import('../../src/services/config-service').ConfigService;
    const validationService = {
      isMarkdownFile: () => true,
      isDiffView: () => false,
      hasConflictMarkers: () => false,
    } as unknown as import('../../src/services/validation-service').ValidationService;

    const logger = { info: sinon.stub(), warn: sinon.stub() } as unknown as import('../../src/services/logger').Logger;

    const handler = new MarkdownFileHandler(
      previewService,
      stateService,
      configService,
      validationService,
      createMemento(),
      logger
    );

    sinon.stub(vscode.commands, 'executeCommand').resolves();

    const document = {
      uri: vscode.Uri.file('/tmp/preview.md'),
      isUntitled: false,
    } as vscode.TextDocument;

    await (handler as unknown as { processDocumentOpen: (d: vscode.TextDocument) => Promise<void> })
      .processDocumentOpen(document);

    expect(previewServiceStubs.showPreview.calledOnce).to.equal(true);
  });

  it('enters edit mode for conflict markers', async () => {
    const previewServiceStubs = {
      enterEditMode: sinon.stub().resolves(),
      shouldShowPreview: sinon.stub().resolves(false),
    };
    const previewService = previewServiceStubs as unknown as import('../../src/services/preview-service').PreviewService;

    const stateService = {
      getExistingState: sinon.stub().returns({ mode: ViewMode.Preview }),
      setMode: sinon.stub(),
      setEditorVisible: sinon.stub(),
      clear: sinon.stub(),
    } as unknown as import('../../src/services/state-service').StateService;

    const configService = { getEnabled: () => true } as unknown as import('../../src/services/config-service').ConfigService;
    const validationService = {
      isMarkdownFile: () => true,
      isDiffView: () => false,
      hasConflictMarkers: () => true,
    } as unknown as import('../../src/services/validation-service').ValidationService;

    const loggerStubs = { info: sinon.stub(), warn: sinon.stub(), show: sinon.stub() };
    const logger = loggerStubs as unknown as import('../../src/services/logger').Logger;

    const handler = new MarkdownFileHandler(
      previewService,
      stateService,
      configService,
      validationService,
      createMemento(),
      logger
    );

    const document = {
      uri: vscode.Uri.file('/tmp/conflict.md'),
      isUntitled: false,
    } as vscode.TextDocument;

    await (handler as unknown as { processDocumentOpen: (d: vscode.TextDocument) => Promise<void> })
      .processDocumentOpen(document);

    expect(previewServiceStubs.enterEditMode.calledOnce).to.equal(true);
    expect(loggerStubs.warn.calledOnce).to.equal(true);
  });
});
