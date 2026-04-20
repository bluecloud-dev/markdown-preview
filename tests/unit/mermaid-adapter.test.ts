import sinon from 'sinon';
import * as vscode from 'vscode';
import { isMermaidIntegrationActive } from '../../src/integrations/mermaid-adapter';
import { ConfigService } from '../../src/services/config-service';

let expect: Chai.ExpectStatic;

before(async () => {
  ({ expect } = await import('chai'));
});

describe('mermaid-adapter', () => {
  afterEach(() => {
    sinon.restore();
  });

  it('returns false when integration is disabled', () => {
    sinon.stub(ConfigService.prototype, 'getMermaidEnabled').returns(false);
    sinon.stub(ConfigService.prototype, 'getMermaidAllowInUntrustedWorkspaces').returns(false);

    const result = isMermaidIntegrationActive(new ConfigService());
    expect(result).to.equal(false);
  });

  it('allows integration in untrusted workspaces when explicitly configured', () => {
    sinon.stub(ConfigService.prototype, 'getMermaidEnabled').returns(true);
    sinon.stub(ConfigService.prototype, 'getMermaidAllowInUntrustedWorkspaces').returns(true);
    Object.defineProperty(vscode.workspace, 'isTrusted', {
      value: false,
      configurable: true,
    });

    const result = isMermaidIntegrationActive(new ConfigService());
    expect(result).to.equal(true);
  });

  it('disables integration in untrusted workspaces by default', () => {
    sinon.stub(ConfigService.prototype, 'getMermaidEnabled').returns(true);
    sinon.stub(ConfigService.prototype, 'getMermaidAllowInUntrustedWorkspaces').returns(false);
    Object.defineProperty(vscode.workspace, 'isTrusted', {
      value: false,
      configurable: true,
    });

    const result = isMermaidIntegrationActive(new ConfigService());
    expect(result).to.equal(false);
  });

  it('allows integration in trusted workspaces', () => {
    sinon.stub(ConfigService.prototype, 'getMermaidEnabled').returns(true);
    sinon.stub(ConfigService.prototype, 'getMermaidAllowInUntrustedWorkspaces').returns(false);
    Object.defineProperty(vscode.workspace, 'isTrusted', {
      value: true,
      configurable: true,
    });

    const result = isMermaidIntegrationActive(new ConfigService());
    expect(result).to.equal(true);
  });
});
