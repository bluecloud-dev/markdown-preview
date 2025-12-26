import { expect } from 'chai';
import sinon from 'sinon';
import * as vscode from 'vscode';
import { ConfigService } from '../../src/services/config-service';

describe('ConfigService', () => {
  afterEach(() => {
    sinon.restore();
  });

  it('returns defaults from workspace configuration', () => {
    const getStub = sinon.stub();
    getStub.withArgs('enabled', true).returns(true);
    getStub.withArgs('excludePatterns', ['**/node_modules/**', '**/.git/**']).returns([
      '**/node_modules/**',
      '**/.git/**',
    ]);
    getStub.withArgs('maxFileSize', 1_048_576).returns(1_048_576);

    const config = { get: getStub } as unknown as vscode.WorkspaceConfiguration;
    sinon.stub(vscode.workspace, 'getConfiguration').returns(config);

    const service = new ConfigService();

    expect(service.getEnabled()).to.equal(true);
    expect(service.getExcludePatterns()).to.deep.equal(['**/node_modules/**', '**/.git/**']);
    expect(service.getMaxFileSize()).to.equal(1_048_576);
    expect(getStub.calledWith('enabled', true)).to.equal(true);
  });

  it('matches exclude patterns using minimatch', () => {
    const getStub = sinon.stub();
    getStub.withArgs('enabled', true).returns(true);
    getStub
      .withArgs('excludePatterns', ['**/node_modules/**', '**/.git/**'])
      .returns(['**/node_modules/**']);
    getStub.withArgs('maxFileSize', 1_048_576).returns(1_048_576);

    const config = { get: getStub } as unknown as vscode.WorkspaceConfiguration;
    sinon.stub(vscode.workspace, 'getConfiguration').returns(config);

    const service = new ConfigService();
    const excluded = vscode.Uri.file('/workspace/node_modules/foo.md');

    expect(service.isExcluded(excluded)).to.equal(true);
  });
});
