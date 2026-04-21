import sinon from 'sinon';
import * as vscode from 'vscode';
import { __testing, activate } from '../../src/extension';
import { createMemento, createOutputChannel } from './helpers/activation-fixtures';
let expect: Chai.ExpectStatic;

before(async () => {
  ({ expect } = await import('chai'));
});

const createMuninnConfiguration = (): vscode.WorkspaceConfiguration =>
  ({
    get: (_key: string, defaultValue: unknown) => defaultValue,
    has: () => true,
    inspect: () => ({ defaultValue: true, globalValue: true }),
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
      value: undefined,
      configurable: true,
    });
    sinon.stub(vscode.window, 'createOutputChannel').returns(createOutputChannel());
    sinon.stub(vscode.window, 'registerCustomEditorProvider').returns({ dispose: () => {} });
    sinon.stub(vscode.commands, 'registerCommand').returns({ dispose: () => {} });
    sinon.stub(vscode.workspace, 'onDidChangeConfiguration').returns({ dispose: () => {} });
    sinon.stub(vscode.workspace, 'getConfiguration').callsFake((section?: string) => {
      if (section === 'workbench') {
        return {
          get: sinon.stub(),
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
