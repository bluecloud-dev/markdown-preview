import * as vscode from 'vscode';
import { MuninnCustomEditorProvider } from '../../src/custom-editor/muninn-custom-editor-provider';
import type { HostToViewMessage } from '../../src/custom-editor/protocol';
import type { ConfigService } from '../../src/services/config-service';
import type { Logger } from '../../src/services/logger';

let expect: Chai.ExpectStatic;

before(async () => {
  ({ expect } = await import('chai'));
});

type FakePanel = {
  panel: vscode.WebviewPanel;
  posted: HostToViewMessage[];
  sendViewMessage: (message: unknown) => Promise<void>;
};

const createFakePanel = (): FakePanel => {
  const posted: HostToViewMessage[] = [];
  let messageListener: ((message: unknown) => Promise<void> | void) | undefined;

  const panel = {
    webview: {
      options: {},
      html: '',
      cspSource: 'vscode-webview-resource:',
      asWebviewUri: (uri: vscode.Uri) => uri,
      onDidReceiveMessage: (listener: (message: unknown) => Promise<void> | void) => {
        messageListener = listener;
        return { dispose: () => {} };
      },
      postMessage: async (message: HostToViewMessage) => {
        posted.push(message);
        return true;
      },
    },
    onDidDispose: () => ({ dispose: () => {} }),
  } as unknown as vscode.WebviewPanel;

  return {
    panel,
    posted,
    sendViewMessage: async (message: unknown) => {
      await messageListener?.(message);
    },
  };
};

const createMarkdownDocument = (text: string): vscode.TextDocument =>
  ({
    uri: vscode.Uri.file('/workspace/noop.md'),
    getText: () => text,
    lineCount: 1,
    lineAt: () => ({
      range: { end: new vscode.Position(0, text.length) },
    }),
  }) as unknown as vscode.TextDocument;

describe('MuninnCustomEditorProvider view.applyDocument handling', () => {
  const workspaceWithApplyEdit = vscode.workspace as unknown as {
    applyEdit?: (edit: vscode.WorkspaceEdit) => Promise<boolean>;
  };
  const originalApplyEdit = workspaceWithApplyEdit.applyEdit;
  let provider: MuninnCustomEditorProvider;

  beforeEach(() => {
    provider = new MuninnCustomEditorProvider(
      vscode.Uri.file('/extension'),
      {} as unknown as ConfigService,
      { warn: () => {}, info: () => {}, error: () => {} } as unknown as Logger,
    );
  });

  afterEach(() => {
    provider.dispose();
    workspaceWithApplyEdit.applyEdit = originalApplyEdit;
  });

  it('acknowledges a no-op apply with a documentChanged snapshot', async () => {
    const { panel, posted, sendViewMessage } = createFakePanel();
    await provider.resolveCustomTextEditor(createMarkdownDocument('# unchanged'), panel);

    await sendViewMessage({
      type: 'view.applyDocument',
      payload: { markdown: '# unchanged', revision: 0 },
    });

    // Without this reply the webview's inFlightApply latch never releases and
    // every subsequent edit is dropped (the autosave/data-loss deadlock).
    expect(posted).to.deep.equal([
      {
        type: 'host.documentChanged',
        payload: { markdown: '# unchanged', revision: 0 },
      },
    ]);
  });

  it('posts nothing extra when an edit is applied (the document event echoes instead)', async () => {
    workspaceWithApplyEdit.applyEdit = async () => true;
    const { panel, posted, sendViewMessage } = createFakePanel();
    await provider.resolveCustomTextEditor(createMarkdownDocument('# before'), panel);

    await sendViewMessage({
      type: 'view.applyDocument',
      payload: { markdown: '# after', revision: 0 },
    });

    expect(posted).to.deep.equal([]);
  });

  it('replies with host.error and a snapshot when the apply fails', async () => {
    workspaceWithApplyEdit.applyEdit = async () => false;
    const { panel, posted, sendViewMessage } = createFakePanel();
    await provider.resolveCustomTextEditor(createMarkdownDocument('# before'), panel);

    await sendViewMessage({
      type: 'view.applyDocument',
      payload: { markdown: '# after', revision: 0 },
    });

    expect(posted).to.deep.equal([
      {
        type: 'host.error',
        payload: {
          code: 'apply_failed',
          message: 'VS Code failed to apply the markdown update.',
        },
      },
      {
        type: 'host.documentChanged',
        payload: { markdown: '# before', revision: 0 },
      },
    ]);
  });
});
