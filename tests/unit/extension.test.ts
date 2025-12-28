import { expect } from 'chai';
import sinon from 'sinon';
import * as vscode from 'vscode';
import { activate } from '../../src/extension';
import { ConfigService } from '../../src/services/config-service';

const createOutputChannel = (): vscode.LogOutputChannel => ({
  name: 'Markdown Reader',
  logLevel: 0 as unknown as vscode.LogLevel,
  onDidChangeLogLevel: sinon.stub() as unknown as vscode.Event<vscode.LogLevel>,
  trace: () => {},
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
  append: () => {},
  appendLine: () => {},
  replace: () => {},
  clear: () => {},
  show: ((...arguments_: unknown[]) => {
    void arguments_;
  }) as unknown as vscode.LogOutputChannel['show'],
  hide: () => {},
  dispose: () => {},
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

describe('extension activation', () => {
  afterEach(() => {
    sinon.restore();
    vscode.window.activeTextEditor = undefined as unknown as vscode.TextEditor;
  });

  it('registers commands and updates configuration inspection output', () => {
    const registerCommandStub = sinon.stub(vscode.commands, 'registerCommand');
    const registerTextEditorStub = sinon.stub(vscode.commands, 'registerTextEditorCommand');
    sinon.stub(vscode.commands, 'executeCommand').resolves();
    sinon.stub(vscode.workspace, 'onDidChangeConfiguration').returns({ dispose: () => {} });

    const outputChannel = createOutputChannel();
    const appendLine = sinon.stub(outputChannel, 'appendLine');
    sinon.stub(vscode.window, 'createOutputChannel').returns(outputChannel);

    sinon.stub(vscode.workspace, 'getConfiguration').returns({
      get: (_key: string, defaultValue: unknown) => defaultValue,
      has: () => true,
      inspect: () => ({ defaultValue: true, globalValue: true }),
      update: sinon.stub(),
    } as unknown as vscode.WorkspaceConfiguration);

    const context = {
      subscriptions: [],
      globalState: createMemento(),
      workspaceState: createMemento(),
    } as unknown as vscode.ExtensionContext;

    activate(context);

    const registeredCommands = registerCommandStub.getCalls().map((call) => call.args[0]);
    expect(registeredCommands).to.include('markdownReader.inspectConfiguration');
    expect(registerTextEditorStub.called).to.equal(true);

    const inspectCommand = registerCommandStub
      .getCalls()
      .find((call) => call.args[0] === 'markdownReader.inspectConfiguration');
    const inspectCallback = inspectCommand?.args[1] as () => void;

    inspectCallback();

    expect(appendLine.called).to.equal(true);
  });

  it('reloads configuration when markdownReader settings change', () => {
    sinon.stub(vscode.window, 'createOutputChannel').returns(createOutputChannel());
    sinon.stub(vscode.commands, 'registerCommand').returns({ dispose: () => {} });
    sinon.stub(vscode.commands, 'registerTextEditorCommand').returns({ dispose: () => {} });
    const executeCommandStub = sinon.stub(vscode.commands, 'executeCommand').resolves();

    const configClearCacheStub = sinon.stub(ConfigService.prototype, 'clearCache');
    const configReloadStub = sinon.stub(ConfigService.prototype, 'reload');
    sinon.stub(ConfigService.prototype, 'getEnabled').returns(true);

    let configChangeListener: ((event: vscode.ConfigurationChangeEvent) => void) | undefined;
    sinon.stub(vscode.workspace, 'onDidChangeConfiguration').callsFake((listener) => {
      configChangeListener = listener;
      return { dispose: () => {} };
    });

    const folderUri = vscode.Uri.file('/workspace');
    Object.defineProperty(vscode.workspace, 'workspaceFolders', {
      value: [{ uri: folderUri }] as unknown as vscode.WorkspaceFolder[],
      configurable: true,
    });
    const activeUri = vscode.Uri.file('/workspace/readme.md');
    vscode.window.activeTextEditor = { document: { uri: activeUri } } as unknown as vscode.TextEditor;

    const context = {
      subscriptions: [],
      globalState: createMemento(),
      workspaceState: createMemento(),
    } as unknown as vscode.ExtensionContext;

    activate(context);
    expect(configChangeListener).to.not.equal(undefined);

    configChangeListener?.({
      affectsConfiguration: (section: string, scope?: vscode.Uri) => {
        if (section !== 'markdownReader') {
          return false;
        }
        if (!scope) {
          return true;
        }
        return scope.toString() === activeUri.toString() || scope.toString() === folderUri.toString();
      },
    } as vscode.ConfigurationChangeEvent);

    expect(configClearCacheStub.calledOnce).to.equal(true);
    expect(configReloadStub.called).to.equal(true);
    expect(executeCommandStub.called).to.equal(true);
  });

  it('ignores configuration changes outside markdownReader scope', () => {
    sinon.stub(vscode.window, 'createOutputChannel').returns(createOutputChannel());
    sinon.stub(vscode.commands, 'registerCommand').returns({ dispose: () => {} });
    sinon.stub(vscode.commands, 'registerTextEditorCommand').returns({ dispose: () => {} });
    sinon.stub(vscode.commands, 'executeCommand').resolves();
    const configClearCacheStub = sinon.stub(ConfigService.prototype, 'clearCache');
    const configReloadStub = sinon.stub(ConfigService.prototype, 'reload');

    let configChangeListener: ((event: vscode.ConfigurationChangeEvent) => void) | undefined;
    sinon.stub(vscode.workspace, 'onDidChangeConfiguration').callsFake((listener) => {
      configChangeListener = listener;
      return { dispose: () => {} };
    });

    const context = {
      subscriptions: [],
      globalState: createMemento(),
      workspaceState: createMemento(),
    } as unknown as vscode.ExtensionContext;

    activate(context);

    configChangeListener?.({
      affectsConfiguration: (section: string) => section === 'otherSection',
    } as vscode.ConfigurationChangeEvent);

    expect(configClearCacheStub.called).to.equal(false);
    expect(configReloadStub.called).to.equal(false);
  });
});
