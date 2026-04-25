import sinon from 'sinon';
import * as vscode from 'vscode';
import { FocusModeState } from '../../src/custom-editor/focus-mode-state';
import {
  MUNINN_MARKDOWN_EDITOR_VIEW_TYPE,
  MuninnCustomEditorProvider,
} from '../../src/custom-editor/muninn-custom-editor-provider';
import type { HostToViewMessage } from '../../src/custom-editor/protocol';
import { ConfigService } from '../../src/services/config-service';
import type { Logger } from '../../src/services/logger';

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

const createDocument = (uri: vscode.Uri): vscode.TextDocument =>
  ({
    uri,
    getText: () => '# Queued',
    lineCount: 1,
    lineAt: () => ({
      range: { end: new vscode.Position(0, 8) },
    }),
  }) as unknown as vscode.TextDocument;

const createPanel = (): {
  panel: vscode.WebviewPanel;
  postedMessages: HostToViewMessage[];
  emitMessage: (message: unknown) => Promise<void>;
} => {
  const postedMessages: HostToViewMessage[] = [];
  let messageListener: ((message: unknown) => unknown) | undefined;

  const webview = {
    options: {},
    cspSource: 'vscode-webview-resource:',
    html: '',
    asWebviewUri: (value: vscode.Uri) => value,
    postMessage: sinon.stub().callsFake(async (message: HostToViewMessage) => {
      postedMessages.push(message);
      return true;
    }),
    onDidReceiveMessage: (listener: (message: unknown) => unknown) => {
      messageListener = listener;
      return { dispose: () => {} };
    },
  } as unknown as vscode.Webview;

  return {
    panel: {
      webview,
      onDidDispose: () => ({ dispose: () => {} }),
    } as unknown as vscode.WebviewPanel,
    postedMessages,
    emitMessage: async (message: unknown): Promise<void> => {
      await messageListener?.(message);
    },
  };
};

const createProvider = (
  options: {
    mermaidEnabled?: boolean;
    mermaidAllowInUntrustedWorkspaces?: boolean;
  } = {},
): MuninnCustomEditorProvider => {
  const configService = sinon.createStubInstance(ConfigService);
  configService.getMermaidEnabled.returns(options.mermaidEnabled ?? true);
  configService.getMermaidAllowInUntrustedWorkspaces.returns(
    options.mermaidAllowInUntrustedWorkspaces ?? true,
  );
  configService.getToolbarMode.returns('basic');

  return new MuninnCustomEditorProvider(
    vscode.Uri.file('/extension'),
    configService,
    new FocusModeState(createMemento()),
    {
      warn: sinon.stub(),
      info: sinon.stub(),
    } as unknown as Logger,
  );
};

const setActiveCustomTab = (uri: vscode.Uri): void => {
  (vscode.window.tabGroups.activeTabGroup as unknown as { activeTab?: vscode.Tab }).activeTab = {
    input: new vscode.TabInputCustom(uri, MUNINN_MARKDOWN_EDITOR_VIEW_TYPE),
  } as unknown as vscode.Tab;
};

describe('MuninnCustomEditorProvider', () => {
  afterEach(() => {
    sinon.restore();
    (vscode.window.tabGroups.activeTabGroup as unknown as { activeTab?: vscode.Tab }).activeTab =
      undefined;
  });

  it('queues editor commands until the webview is ready', async () => {
    const uri = vscode.Uri.file('/workspace/queued.md');
    const provider = createProvider();
    const firstPanel = createPanel();

    await provider.resolveCustomTextEditor(createDocument(uri), firstPanel.panel);
    setActiveCustomTab(uri);

    await provider.executeCommandInActiveEditor('insertCodeBlock');
    expect(firstPanel.postedMessages).to.deep.equal([]);

    await firstPanel.emitMessage({ type: 'view.ready' });

    expect(firstPanel.postedMessages.map((message) => message.type)).to.deep.equal([
      'host.init',
      'host.executeCommand',
    ]);
    expect(firstPanel.postedMessages[1]).to.deep.equal({
      type: 'host.executeCommand',
      payload: { command: 'insertCodeBlock' },
    });
  });

  it('targets the newest live session when a URI has multiple sessions', async () => {
    const uri = vscode.Uri.file('/workspace/reopened.md');
    const provider = createProvider();
    const oldPanel = createPanel();
    const newestPanel = createPanel();

    await provider.resolveCustomTextEditor(createDocument(uri), oldPanel.panel);
    await oldPanel.emitMessage({ type: 'view.ready' });

    await provider.resolveCustomTextEditor(createDocument(uri), newestPanel.panel);
    await newestPanel.emitMessage({ type: 'view.ready' });
    setActiveCustomTab(uri);

    await provider.executeCommandInActiveEditor('insertCodeBlock');

    expect(oldPanel.postedMessages.map((message) => message.type)).to.deep.equal(['host.init']);
    expect(newestPanel.postedMessages.map((message) => message.type)).to.deep.equal([
      'host.init',
      'host.executeCommand',
    ]);
  });

  it('sends disabled Mermaid state to the webview when the integration is off', async () => {
    const uri = vscode.Uri.file('/workspace/mermaid-disabled.md');
    const provider = createProvider({ mermaidEnabled: false });
    const panel = createPanel();

    await provider.resolveCustomTextEditor(createDocument(uri), panel.panel);
    await panel.emitMessage({ type: 'view.ready' });

    expect(panel.postedMessages[0]).to.deep.include({
      type: 'host.init',
    });
    expect(panel.postedMessages[0]?.payload).to.deep.include({
      mermaidEnabled: false,
    });
  });

  it('loads the webview entry as an ESM script and allows local chunk imports through CSP', async () => {
    const uri = vscode.Uri.file('/workspace/module.md');
    const provider = createProvider();
    const panel = createPanel();

    await provider.resolveCustomTextEditor(createDocument(uri), panel.panel);

    const html = panel.panel.webview.html;
    expect(html).to.include('<script type="module"');
    expect(html).to.include('editor-webview.js');
    expect(html).to.match(/script-src [^"]*vscode-webview-resource:/);
    expect(html).to.not.include('<script nonce="');
  });
});
