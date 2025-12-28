import { expect } from 'chai';
import sinon from 'sinon';
import * as vscode from 'vscode';
import { enterEditMode, exitEditMode, toggleEditMode } from '../../src/commands/mode-commands';
import { ViewMode } from '../../src/types/state';

describe('mode commands', () => {
  afterEach(() => {
    sinon.restore();
    vscode.window.activeTextEditor = undefined as unknown as vscode.TextEditor;
    vscode.window.visibleTextEditors = [] as unknown as vscode.TextEditor[];
  });

  it('enters edit mode for the active markdown editor', async () => {
    const previewServiceStubs = { enterEditMode: sinon.stub().resolves() };
    const previewService = previewServiceStubs as unknown as import('../../src/services/preview-service').PreviewService;
    vscode.window.activeTextEditor = {
      document: { languageId: 'markdown', uri: vscode.Uri.file('/tmp/test.md') },
    } as unknown as vscode.TextEditor;

    await enterEditMode(previewService);

    expect(previewServiceStubs.enterEditMode.calledOnce).to.equal(true);
  });

  it('exits edit mode using the active markdown editor', async () => {
    const previewServiceStubs = { exitEditMode: sinon.stub().resolves() };
    const previewService = previewServiceStubs as unknown as import('../../src/services/preview-service').PreviewService;
    vscode.window.activeTextEditor = {
      document: { languageId: 'markdown', uri: vscode.Uri.file('/tmp/test.md') },
    } as unknown as vscode.TextEditor;

    await exitEditMode(previewService);

    expect(previewServiceStubs.exitEditMode.calledOnce).to.equal(true);
  });

  it('falls back to visible markdown editors when none is active', async () => {
    const previewServiceStubs = { enterEditMode: sinon.stub().resolves() };
    const previewService = previewServiceStubs as unknown as import('../../src/services/preview-service').PreviewService;
    vscode.window.visibleTextEditors = [
      { document: { languageId: 'markdown', uri: vscode.Uri.file('/tmp/visible.md') } },
    ] as unknown as vscode.TextEditor[];

    await enterEditMode(previewService);

    expect(previewServiceStubs.enterEditMode.calledOnce).to.equal(true);
  });

  it('does nothing when no markdown editor is available', async () => {
    const previewServiceStubs = { enterEditMode: sinon.stub().resolves(), exitEditMode: sinon.stub().resolves() };
    const previewService = previewServiceStubs as unknown as import('../../src/services/preview-service').PreviewService;

    vscode.window.activeTextEditor = undefined as unknown as vscode.TextEditor;
    vscode.window.visibleTextEditors = [] as unknown as vscode.TextEditor[];

    await enterEditMode(previewService);
    await exitEditMode(previewService);

    expect(previewServiceStubs.enterEditMode.called).to.equal(false);
    expect(previewServiceStubs.exitEditMode.called).to.equal(false);
  });

  it('toggles edit mode based on state', async () => {
    const previewServiceStubs = {
      enterEditMode: sinon.stub().resolves(),
      exitEditMode: sinon.stub().resolves(),
    };
    const previewService = previewServiceStubs as unknown as import('../../src/services/preview-service').PreviewService;
    const stateServiceStubs = {
      getState: sinon.stub().returns({ mode: ViewMode.Edit }),
    };
    const stateService = stateServiceStubs as unknown as import('../../src/services/state-service').StateService;
    vscode.window.activeTextEditor = {
      document: { languageId: 'markdown', uri: vscode.Uri.file('/tmp/test.md') },
    } as unknown as vscode.TextEditor;

    await toggleEditMode(previewService, stateService);

    expect(previewServiceStubs.exitEditMode.calledOnce).to.equal(true);

    stateServiceStubs.getState.returns({ mode: ViewMode.Preview });
    await toggleEditMode(previewService, stateService);

    expect(previewServiceStubs.enterEditMode.calledOnce).to.equal(true);
  });
});
