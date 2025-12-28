import sinon from 'sinon';
import * as vscode from 'vscode';
import { TitleBarController } from '../../src/ui/title-bar-controller';
import { ViewMode } from '../../src/types/state';
let expect: Chai.ExpectStatic;

before(async () => {
  ({ expect } = await import('chai'));
});



describe('TitleBarController', () => {
  afterEach(() => {
    sinon.restore();
  });

  it('registers and disposes listeners', () => {
    const onDidChangeActiveTextEditorDisposable = { dispose: sinon.stub() };
    sinon
      .stub(vscode.window, 'onDidChangeActiveTextEditor')
      .returns(onDidChangeActiveTextEditorDisposable);
    const onDidChangeTabsDisposable = { dispose: sinon.stub() };
    sinon
      .stub(vscode.window.tabGroups, 'onDidChangeTabs')
      .returns(onDidChangeTabsDisposable);
    const onDidChangeTabGroupsDisposable = { dispose: sinon.stub() };
    sinon
      .stub(vscode.window.tabGroups, 'onDidChangeTabGroups')
      .returns(onDidChangeTabGroupsDisposable);
    sinon.stub(vscode.commands, 'executeCommand').resolves();

    const stateServiceStubs = { getExistingState: sinon.stub().returns(void 0) };
    const stateService = stateServiceStubs as unknown as import('../../src/services/state-service').StateService;
    const controller = new TitleBarController(stateService);

    controller.register();
    controller.dispose();

    expect(onDidChangeActiveTextEditorDisposable.dispose.calledOnce).to.equal(true);
    expect(onDidChangeTabsDisposable.dispose.calledOnce).to.equal(true);
    expect(onDidChangeTabGroupsDisposable.dispose.calledOnce).to.equal(true);
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

  it('derives context from active markdown preview tabs', async () => {
    const executeStub = sinon.stub(vscode.commands, 'executeCommand').resolves();
    const stateServiceStubs = {
      getExistingState: sinon.stub().returns({ mode: ViewMode.Edit }),
    };
    const stateService = stateServiceStubs as unknown as import('../../src/services/state-service').StateService;
    const controller = new TitleBarController(stateService);

    const uri = vscode.Uri.file('/tmp/preview.md');
    const activeTabGroup = {
      isActive: true,
      viewColumn: 1,
      activeTab: { input: new vscode.TabInputCustom(uri, 'vscode.markdown.preview.editor') },
      tabs: [],
    } as unknown as vscode.TabGroup;

    Object.defineProperty(vscode.window.tabGroups, 'activeTabGroup', {
      value: activeTabGroup,
      configurable: true,
    });

    await (controller as unknown as { updateContext: () => Promise<void> }).updateContext();

    expect(executeStub.calledWith('setContext', 'markdownReader.isMarkdown', true)).to.equal(true);
    expect(executeStub.calledWith('setContext', 'markdownReader.editMode', true)).to.equal(true);
  });
});
