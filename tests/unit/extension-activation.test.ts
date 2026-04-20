import sinon from 'sinon';
import * as vscode from 'vscode';
import { __testing, activate } from '../../src/extension';
let expect: Chai.ExpectStatic;

before(async () => {
  ({ expect } = await import('chai'));
});

const createOutputChannel = (): vscode.LogOutputChannel => ({
  name: 'Muninn for VS Code',
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
      if (value === undefined) {
        store.delete(key);
        return;
      }
      store.set(key, value);
    },
    keys: () => [...store.keys()],
  } as vscode.Memento;
};

const createMuninnConfiguration = (): vscode.WorkspaceConfiguration =>
  ({
    get: (key: string, defaultValue: unknown) => {
      void key;
      return defaultValue;
    },
    has: () => true,
    inspect: (key: string) => {
      void key;
      return { defaultValue: true, globalValue: true };
    },
    update: sinon.stub(),
  }) as unknown as vscode.WorkspaceConfiguration;

describe('extension activation behavior', () => {
  afterEach(() => {
    sinon.restore();
    vscode.window.activeTextEditor = undefined as unknown as vscode.TextEditor;
  });

  it('formats inspection values for undefined, unset, and defined scopes', () => {
    expect(__testing.formatInspectValue()).to.equal('unavailable');
    expect(__testing.formatInspectValue({})).to.equal('unset');
    expect(__testing.formatInspectValue({ defaultValue: true, globalValue: false })).to.equal(
      'default=true | user=false',
    );
  });

  it('does not mutate workbench editor associations during activation', async () => {
    const workbenchUpdate = sinon.stub().resolves();
    Object.defineProperty(vscode.workspace, 'workspaceFolders', {
      value: [{ uri: vscode.Uri.file('/workspace') }] as vscode.WorkspaceFolder[],
      configurable: true,
    });
    Object.defineProperty(vscode.workspace, 'workspaceFile', {
      value: void 0,
      configurable: true,
    });
    sinon.stub(vscode.window, 'createOutputChannel').returns(createOutputChannel());
    sinon.stub(vscode.window, 'registerCustomEditorProvider').returns({ dispose: () => {} });
    sinon.stub(vscode.commands, 'registerCommand').returns({ dispose: () => {} });
    sinon.stub(vscode.workspace, 'onDidChangeConfiguration').returns({ dispose: () => {} });
    sinon.stub(vscode.workspace, 'getConfiguration').callsFake((section?: string) => {
      if (section === 'workbench') {
        return {
          get: sinon.stub().returns(void 0),
          update: workbenchUpdate,
        } as unknown as vscode.WorkspaceConfiguration;
      }

      return createMuninnConfiguration();
    });

    const context = {
      subscriptions: [],
      globalState: createMemento(),
      workspaceState: createMemento(),
    } as unknown as vscode.ExtensionContext;

    activate(context);
    await new Promise((resolve) => setImmediate(resolve));

    expect(workbenchUpdate.called).to.equal(false);
  });
});
