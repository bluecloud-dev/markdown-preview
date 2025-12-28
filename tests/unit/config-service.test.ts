import { expect } from 'chai';
import sinon from 'sinon';
import * as vscode from 'vscode';
import { ConfigService } from '../../src/services/config-service';

type ConfigurationOverrides = {
  enabled?: boolean;
  excludePatterns?: string[];
  maxFileSize?: number;
};

const createConfiguration = (overrides?: ConfigurationOverrides): vscode.WorkspaceConfiguration => {
  const values = {
    enabled: overrides?.enabled,
    excludePatterns: overrides?.excludePatterns,
    maxFileSize: overrides?.maxFileSize,
  };

  return {
    get: (key: string, defaultValue: unknown) => {
      if (key in values && values[key as keyof typeof values] !== undefined) {
        return values[key as keyof typeof values];
      }
      return defaultValue;
    },
    inspect: (key: string) => ({
      defaultValue: values[key as keyof typeof values],
      globalValue: values[key as keyof typeof values],
    }),
  } as vscode.WorkspaceConfiguration;
};

describe('ConfigService', () => {
  afterEach(() => {
    sinon.restore();
  });

  it('returns defaults when configuration is empty', () => {
    sinon
      .stub(vscode.workspace, 'getConfiguration')
      .returns(createConfiguration());

    const service = new ConfigService();
    const config = service.getConfig();

    expect(config.enabled).to.equal(true);
    expect(config.excludePatterns).to.include('**/node_modules/**');
    expect(config.maxFileSize).to.equal(1_048_576);
  });

  it('caches configuration per resource and reloads on demand', () => {
    const getConfigurationStub = sinon
      .stub(vscode.workspace, 'getConfiguration')
      .returns(createConfiguration({ enabled: false }));

    const service = new ConfigService();
    const uri = vscode.Uri.file('/tmp/sample.md');

    const first = service.getConfig(uri);
    const second = service.getConfig(uri);

    expect(first.enabled).to.equal(false);
    expect(second.enabled).to.equal(false);
    expect(getConfigurationStub.calledOnce).to.equal(true);

    service.reload(uri);
    expect(getConfigurationStub.calledTwice).to.equal(true);
  });

  it('returns inspection details for settings', () => {
    sinon
      .stub(vscode.workspace, 'getConfiguration')
      .returns(createConfiguration({ enabled: true, maxFileSize: 512 }));

    const service = new ConfigService();
    const inspection = service.inspect();

    expect(inspection.enabled?.globalValue).to.equal(true);
    expect(inspection.maxFileSize?.globalValue).to.equal(512);
  });

  it('respects exclude patterns for workspace-relative paths', () => {
    sinon
      .stub(vscode.workspace, 'getConfiguration')
      .returns(createConfiguration({ excludePatterns: ['**/docs/**'] }));
    sinon
      .stub(vscode.workspace, 'asRelativePath')
      .callsFake((pathOrUri: string | vscode.Uri) =>
        (typeof pathOrUri === 'string' ? pathOrUri : pathOrUri.fsPath).replace('/workspace/', '')
      );

    const service = new ConfigService();
    const uri = vscode.Uri.file('/workspace/docs/readme.md');

    expect(service.isExcluded(uri)).to.equal(true);
  });
});
