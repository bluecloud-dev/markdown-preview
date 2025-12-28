import { expect } from 'chai';
import sinon from 'sinon';
import * as vscode from 'vscode';
import { TitleBarController } from '../../src/ui/title-bar-controller';
import { ViewMode } from '../../src/types/state';

describe('TitleBarController', () => {
  afterEach(() => {
    sinon.restore();
  });

  it('registers and disposes listeners', () => {
    const onDidChangeActiveTextEditorDisposable = { dispose: sinon.stub() };
    sinon
      .stub(vscode.window, 'onDidChangeActiveTextEditor')
      .returns(onDidChangeActiveTextEditorDisposable);
    sinon.stub(vscode.commands, 'executeCommand').resolves();

    const stateServiceStubs = { getExistingState: sinon.stub().returns(void 0) };
    const stateService = stateServiceStubs as unknown as import('../../src/services/state-service').StateService;
    const controller = new TitleBarController(stateService);

    controller.register();
    controller.dispose();

    expect(onDidChangeActiveTextEditorDisposable.dispose.calledOnce).to.equal(true);
  });

  it('sets context keys when no editor is active', async () => {
    const executeStub = sinon.stub(vscode.commands, 'executeCommand').resolves();
    const stateServiceStubs = { getExistingState: sinon.stub().returns(void 0) };
    const stateService = stateServiceStubs as unknown as import('../../src/services/state-service').StateService;
    const controller = new TitleBarController(stateService);

    await (controller as unknown as { updateContext: (editor?: vscode.TextEditor) => Promise<void> })
      .updateContext();

    expect(executeStub.calledWith('setContext', 'markdownReader.isMarkdown', false)).to.equal(true);
    expect(executeStub.calledWith('setContext', 'markdownReader.editMode', false)).to.equal(true);
  });

  it('reflects edit mode state for markdown editors', async () => {
    const executeStub = sinon.stub(vscode.commands, 'executeCommand').resolves();
    const stateServiceStubs = {
      getExistingState: sinon.stub().returns({ mode: ViewMode.Edit }),
    };
    const stateService = stateServiceStubs as unknown as import('../../src/services/state-service').StateService;
    const controller = new TitleBarController(stateService);

    const editor = {
      document: { languageId: 'markdown', uri: vscode.Uri.file('/tmp/test.md') },
    } as vscode.TextEditor;

    await (controller as unknown as { updateContext: (editor?: vscode.TextEditor) => Promise<void> })
      .updateContext(editor);

    expect(executeStub.calledWith('setContext', 'markdownReader.isMarkdown', true)).to.equal(true);
    expect(executeStub.calledWith('setContext', 'markdownReader.editMode', true)).to.equal(true);
  });

  it('resets edit mode context for non-markdown editors', async () => {
    const executeStub = sinon.stub(vscode.commands, 'executeCommand').resolves();
    const stateServiceStubs = { getExistingState: sinon.stub().returns({ mode: ViewMode.Edit }) };
    const stateService = stateServiceStubs as unknown as import('../../src/services/state-service').StateService;
    const controller = new TitleBarController(stateService);

    const editor = { document: { languageId: 'plaintext', uri: vscode.Uri.file('/tmp/test.txt') } } as unknown as vscode.TextEditor;
    await (controller as unknown as { updateContext: (editor?: vscode.TextEditor) => Promise<void> })
      .updateContext(editor);

    expect(executeStub.calledWith('setContext', 'markdownReader.isMarkdown', false)).to.equal(true);
    expect(executeStub.calledWith('setContext', 'markdownReader.editMode', false)).to.equal(true);
  });
});
