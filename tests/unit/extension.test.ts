import sinon from 'sinon';
import * as vscode from 'vscode';
import { MuninnCustomEditorProvider } from '../../src/custom-editor/muninn-custom-editor-provider';
import { SectionRevealTarget } from '../../src/custom-editor/protocol';
import { activate } from '../../src/extension';
import { ConfigService } from '../../src/services/config-service';
import { createMemento, createOutputChannel } from './helpers/activation-fixtures';
let expect: Chai.ExpectStatic;

before(async () => {
  ({ expect } = await import('chai'));
});

describe('extension activation', () => {
  afterEach(() => {
    sinon.restore();
    vscode.window.activeTextEditor = undefined as unknown as vscode.TextEditor;
  });

  it('registers commands and updates configuration inspection output', () => {
    const registerCommandStub = sinon.stub(vscode.commands, 'registerCommand');
    const registerCustomEditorProviderStub = sinon.stub(
      vscode.window,
      'registerCustomEditorProvider',
    );
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
    expect(registeredCommands).to.include('muninn.inspectConfiguration');
    expect(registeredCommands).to.include('muninn.tableActions');
    expect(registeredCommands).to.include('muninn.toggleFocusMode');
    expect(registeredCommands).to.include('muninn.goToSection');
    expect(registerCustomEditorProviderStub.calledOnce).to.equal(true);

    const inspectCommand = registerCommandStub
      .getCalls()
      .find((call) => call.args[0] === 'muninn.inspectConfiguration');
    const inspectCallback = inspectCommand?.args[1] as () => void;

    inspectCallback();

    expect(appendLine.called).to.equal(true);
  });

  it('reloads configuration when muninn settings change', () => {
    sinon.stub(vscode.window, 'createOutputChannel').returns(createOutputChannel());
    sinon.stub(vscode.window, 'registerCustomEditorProvider').returns({ dispose: () => {} });
    sinon.stub(vscode.commands, 'registerCommand').returns({ dispose: () => {} });
    const executeCommandStub = sinon.stub(vscode.commands, 'executeCommand').resolves();

    sinon.stub(ConfigService.prototype, 'clearCache');
    sinon.stub(ConfigService.prototype, 'getConfig').returns({
      mermaidEnabled: true,
      mermaidAllowInUntrustedWorkspaces: false,
      toolbarMode: 'basic',
    });

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
    vscode.window.activeTextEditor = {
      document: { uri: activeUri },
    } as unknown as vscode.TextEditor;

    const context = {
      subscriptions: [],
      globalState: createMemento(),
      workspaceState: createMemento(),
    } as unknown as vscode.ExtensionContext;

    activate(context);
    expect(configChangeListener).to.not.equal(undefined);

    configChangeListener?.({
      affectsConfiguration: (section: string, scope?: vscode.Uri) => {
        if (section !== 'muninn') {
          return false;
        }
        if (!scope) {
          return true;
        }
        return (
          scope.toString() === activeUri.toString() || scope.toString() === folderUri.toString()
        );
      },
    } as vscode.ConfigurationChangeEvent);

    expect(executeCommandStub.called).to.equal(false);
  });

  it('ignores configuration changes outside muninn scope', () => {
    sinon.stub(vscode.window, 'createOutputChannel').returns(createOutputChannel());
    sinon.stub(vscode.window, 'registerCustomEditorProvider').returns({ dispose: () => {} });
    sinon.stub(vscode.commands, 'registerCommand').returns({ dispose: () => {} });
    sinon.stub(vscode.commands, 'executeCommand').resolves();
    const configClearCacheStub = sinon.stub(ConfigService.prototype, 'clearCache');

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
  });

  it('routes focus mode and section navigation commands through host services', async () => {
    const registeredCommands = new Map<string, (...arguments_: unknown[]) => unknown>();
    sinon.stub(vscode.window, 'createOutputChannel').returns(createOutputChannel());
    sinon.stub(vscode.window, 'registerCustomEditorProvider').returns({ dispose: () => {} });
    sinon.stub(vscode.window, 'registerTreeDataProvider').returns({ dispose: () => {} });
    sinon.stub(vscode.workspace, 'onDidChangeConfiguration').returns({ dispose: () => {} });
    sinon.stub(vscode.commands, 'registerCommand').callsFake((command, callback) => {
      registeredCommands.set(command, callback as (...arguments_: unknown[]) => unknown);
      return { dispose: () => {} };
    });
    sinon.stub(vscode.workspace, 'getConfiguration').returns({
      get: (_key: string, defaultValue: unknown) => defaultValue,
      has: () => true,
      inspect: () => ({ defaultValue: true, globalValue: true }),
      update: sinon.stub(),
    } as unknown as vscode.WorkspaceConfiguration);
    const notifyFocusModeChangedStub = sinon
      .stub(MuninnCustomEditorProvider.prototype, 'notifyFocusModeChanged')
      .resolves();
    const revealSectionStub = sinon
      .stub(MuninnCustomEditorProvider.prototype, 'revealSectionInActiveEditor')
      .resolves(true);

    const context = {
      subscriptions: [],
      extensionUri: vscode.Uri.file('/extension'),
      globalState: createMemento(),
      workspaceState: createMemento(),
    } as unknown as vscode.ExtensionContext;

    activate(context);

    await registeredCommands.get('muninn.toggleFocusMode')?.();
    expect(context.workspaceState.get('muninn.focusMode.enabled')).to.equal(true);
    expect(notifyFocusModeChangedStub.calledOnce).to.equal(true);

    const section: SectionRevealTarget = {
      id: 'h2-l3-goals',
      title: 'Goals',
      normalizedTitle: 'goals',
      level: 2,
      line: 2,
      occurrence: 0,
    };
    await registeredCommands.get('muninn.goToSection')?.(section);

    expect(revealSectionStub.calledOnceWith(section)).to.equal(true);
  });
});
