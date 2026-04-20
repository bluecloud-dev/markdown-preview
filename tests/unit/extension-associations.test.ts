import sinon from 'sinon';
import * as vscode from 'vscode';
import { __testing } from '../../src/extension';
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
      if (value === undefined) {
        store.delete(key);
        return;
      }
      store.set(key, value);
    },
    keys: () => [...store.keys()],
  } as vscode.Memento;
};

describe('extension association helpers', () => {
  afterEach(() => {
    sinon.restore();
  });

  it('formats inspection values for undefined, unset, and defined scopes', () => {
    expect(__testing.formatInspectValue()).to.equal('unavailable');
    expect(__testing.formatInspectValue({})).to.equal('unset');
    expect(__testing.formatInspectValue({ defaultValue: true, globalValue: false })).to.equal(
      'default=true | user=false',
    );
  });

  it('matches association patterns with workspace variants', () => {
    expect(__testing.matchesAssociationPattern('*.md', '*.md')).to.equal(true);
    expect(__testing.matchesAssociationPattern('*.md', '**/*.md')).to.equal(true);
    expect(__testing.matchesAssociationPattern('*.md', '*.markdown')).to.equal(false);
  });

  it('adds associations when missing and skips when already present', () => {
    const existing = __testing.MARKDOWN_ASSOCIATION_PATTERNS.map((pattern) => ({
      filenamePattern: pattern,
      viewType: __testing.MARKDOWN_ASSOCIATION_VIEW,
    }));

    const noUpdate = __testing.addMarkdownAssociation(existing);
    expect(noUpdate.updated).to.equal(false);

    const partialRecord = {
      '**/*.md': __testing.MARKDOWN_ASSOCIATION_VIEW,
    };
    const updated = __testing.addMarkdownAssociation(partialRecord);
    expect(updated.updated).to.equal(true);
    expect(updated.addedPatterns).to.include('*.markdown');
  });

  it('removes associations only when view types match', () => {
    const record = {
      '*.md': __testing.MARKDOWN_ASSOCIATION_VIEW,
      '*.markdown': 'custom.editor',
    };
    const removal = __testing.removeMarkdownAssociation(record, ['*.md', '*.markdown']);

    expect(removal.updated).to.equal(true);
    expect((removal.value as Record<string, string>)['*.markdown']).to.equal('custom.editor');
  });

  it('detects empty association containers', () => {
    expect(__testing.isAssociationsEmpty([])).to.equal(true);
    expect(__testing.isAssociationsEmpty({})).to.equal(true);
  });

  it('adds workspace editor associations when enabled', async () => {
    const workspaceState = createMemento();
    const context = { workspaceState } as vscode.ExtensionContext;

    Object.defineProperty(vscode.workspace, 'workspaceFolders', {
      value: [{ uri: vscode.Uri.file('/workspace') }] as vscode.WorkspaceFolder[],
      configurable: true,
    });
    Object.defineProperty(vscode.workspace, 'workspaceFile', {
      value: void 0,
      configurable: true,
    });

    const updateStub = sinon.stub().resolves();
    sinon.stub(vscode.workspace, 'getConfiguration').returns({
      get: sinon.stub().returns(void 0),
      update: updateStub,
    } as unknown as vscode.WorkspaceConfiguration);

    const configService = {
      getConfig: () => ({ editorAssociations: true }),
    } as unknown as import('../../src/services/config-service').ConfigService;
    const logger = {
      info: sinon.stub(),
      warn: sinon.stub(),
      error: sinon.stub(),
    } as unknown as import('../../src/services/logger').Logger;

    await __testing.syncMarkdownAssociations(context, configService, logger);

    expect(updateStub.calledOnce).to.equal(true);
    const state = workspaceState.get<{ patterns: string[] }>(
      __testing.MARKDOWN_ASSOCIATION_STATE_KEY,
      { patterns: [] },
    );
    expect(state.patterns.length).to.equal(2);
  });

  it('removes workspace editor associations when editor associations are disabled', async () => {
    const workspaceState = createMemento();
    await workspaceState.update(__testing.MARKDOWN_ASSOCIATION_STATE_KEY, {
      patterns: [...__testing.MARKDOWN_ASSOCIATION_PATTERNS],
    });
    const context = { workspaceState } as vscode.ExtensionContext;

    Object.defineProperty(vscode.workspace, 'workspaceFolders', {
      value: [{ uri: vscode.Uri.file('/workspace') }] as vscode.WorkspaceFolder[],
      configurable: true,
    });

    const updateStub = sinon.stub().resolves();
    sinon.stub(vscode.workspace, 'getConfiguration').returns({
      get: sinon.stub().returns({
        '*.md': __testing.MARKDOWN_ASSOCIATION_VIEW,
        '*.markdown': __testing.MARKDOWN_ASSOCIATION_VIEW,
      }),
      update: updateStub,
    } as unknown as vscode.WorkspaceConfiguration);

    const configService = {
      getConfig: () => ({ editorAssociations: false }),
    } as unknown as import('../../src/services/config-service').ConfigService;
    const logger = {
      info: sinon.stub(),
      warn: sinon.stub(),
      error: sinon.stub(),
    } as unknown as import('../../src/services/logger').Logger;

    await __testing.syncMarkdownAssociations(context, configService, logger);

    expect(updateStub.calledOnce).to.equal(true);
    const state = workspaceState.get(__testing.MARKDOWN_ASSOCIATION_STATE_KEY);
    expect(state).to.equal(undefined);
  });

  it('skips association sync when no workspace is open', async () => {
    const workspaceState = createMemento();
    const context = { workspaceState } as vscode.ExtensionContext;

    Object.defineProperty(vscode.workspace, 'workspaceFolders', {
      value: [],
      configurable: true,
    });
    Object.defineProperty(vscode.workspace, 'workspaceFile', {
      value: void 0,
      configurable: true,
    });

    const updateStub = sinon.stub().resolves();
    sinon.stub(vscode.workspace, 'getConfiguration').returns({
      get: sinon.stub().returns(void 0),
      update: updateStub,
    } as unknown as vscode.WorkspaceConfiguration);

    const configService = {
      getConfig: () => ({ editorAssociations: true }),
    } as unknown as import('../../src/services/config-service').ConfigService;
    const logger = {
      info: sinon.stub(),
      warn: sinon.stub(),
      error: sinon.stub(),
    } as unknown as import('../../src/services/logger').Logger;

    await __testing.syncMarkdownAssociations(context, configService, logger);

    expect(updateStub.called).to.equal(false);
  });
});
