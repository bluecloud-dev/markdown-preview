import sinon from 'sinon';
import * as vscode from 'vscode';
import { StateService } from '../../src/services/state-service';
import { ViewMode } from '../../src/types/state';
let expect: Chai.ExpectStatic;

before(async () => {
  ({ expect } = await import('chai'));
});



describe('StateService', () => {
  afterEach(() => {
    sinon.restore();
  });

  it('creates default state for new URIs', () => {
    const service = new StateService();
    const uri = vscode.Uri.file('/tmp/sample.md');

    const state = service.getState(uri);

    expect(state.mode).to.equal(ViewMode.Preview);
    expect(state.editorVisible).to.equal(false);
    expect(state.uri).to.equal(uri.toString());
  });

  it('updates mode and announces transitions', () => {
    const service = new StateService();
    const uri = vscode.Uri.file('/tmp/sample.md');

    const executeStub = sinon.stub(vscode.commands, 'executeCommand').resolves();
    const statusStub = sinon.stub(vscode.window, 'setStatusBarMessage');

    service.setMode(uri, ViewMode.Edit);

    expect(executeStub.calledWith('setContext', 'markdownReader.editMode', true)).to.equal(true);
    expect(statusStub.calledOnce).to.equal(true);
  });

  it('does not announce when mode does not change', () => {
    const service = new StateService();
    const uri = vscode.Uri.file('/tmp/sample.md');

    sinon.stub(vscode.commands, 'executeCommand').resolves();
    const statusStub = sinon.stub(vscode.window, 'setStatusBarMessage');

    service.setMode(uri, ViewMode.Preview);
    statusStub.resetHistory();

    service.setMode(uri, ViewMode.Preview);
    expect(statusStub.called).to.equal(false);
  });

  it('stores and retrieves last selection', () => {
    const service = new StateService();
    const uri = vscode.Uri.file('/tmp/sample.md');
    const position = new vscode.Position(2, 5);

    service.setLastSelection(uri, position);
    const restored = service.getLastSelection(uri);

    expect(restored?.line).to.equal(2);
    expect(restored?.character).to.equal(5);
  });

  it('returns undefined when no last selection exists', () => {
    const service = new StateService();
    const uri = vscode.Uri.file('/tmp/new.md');
    expect(service.getLastSelection(uri)).to.equal(undefined);
  });
});
