import * as vscode from 'vscode';
import { minimatch } from 'minimatch';
import { ExtensionConfiguration } from '../types/config';

const DEFAULT_CONFIG: ExtensionConfiguration = {
  enabled: true,
  excludePatterns: ['**/node_modules/**', '**/.git/**'],
  maxFileSize: 1_048_576,
};

export class ConfigService {
  getEnabled(resource?: vscode.Uri): boolean {
    return this.loadConfig(resource).enabled;
  }

  getExcludePatterns(resource?: vscode.Uri): string[] {
    return this.loadConfig(resource).excludePatterns;
  }

  getMaxFileSize(resource?: vscode.Uri): number {
    return this.loadConfig(resource).maxFileSize;
  }

  getConfig(resource?: vscode.Uri): ExtensionConfiguration {
    return this.loadConfig(resource);
  }

  isExcluded(uri: vscode.Uri): boolean {
    const filePath = vscode.workspace.asRelativePath(uri, false);
    const config = this.loadConfig(uri);
    return config.excludePatterns.some((pattern) =>
      minimatch(filePath, pattern, { dot: true, nocase: true })
    );
  }

  private loadConfig(resource?: vscode.Uri): ExtensionConfiguration {
    const config = vscode.workspace.getConfiguration('markdownReader', resource);
    return {
      enabled: config.get('enabled', DEFAULT_CONFIG.enabled),
      excludePatterns: config.get('excludePatterns', DEFAULT_CONFIG.excludePatterns),
      maxFileSize: config.get('maxFileSize', DEFAULT_CONFIG.maxFileSize),
    };
  }
}
