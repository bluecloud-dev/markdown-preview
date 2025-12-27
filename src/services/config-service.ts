import * as vscode from 'vscode';
import { minimatch } from 'minimatch';
import { ExtensionConfiguration } from '../types/config';

const DEFAULT_CONFIG: ExtensionConfiguration = {
  enabled: true,
  excludePatterns: ['**/node_modules/**', '**/.git/**'],
  maxFileSize: 1_048_576,
};

export class ConfigService {
  private config: ExtensionConfiguration;

  constructor() {
    this.config = this.loadConfig();
  }

  reload(): void {
    this.config = this.loadConfig();
  }

  getEnabled(): boolean {
    return this.config.enabled;
  }

  getExcludePatterns(): string[] {
    return this.config.excludePatterns;
  }

  getMaxFileSize(): number {
    return this.config.maxFileSize;
  }

  getConfig(): ExtensionConfiguration {
    return { ...this.config };
  }

  isExcluded(uri: vscode.Uri): boolean {
    const filePath = vscode.workspace.asRelativePath(uri, false);
    return this.config.excludePatterns.some((pattern) =>
      minimatch(filePath, pattern, { dot: true, nocase: true })
    );
  }

  private loadConfig(): ExtensionConfiguration {
    const config = vscode.workspace.getConfiguration('markdownReader');
    return {
      enabled: config.get('enabled', DEFAULT_CONFIG.enabled),
      excludePatterns: config.get('excludePatterns', DEFAULT_CONFIG.excludePatterns),
      maxFileSize: config.get('maxFileSize', DEFAULT_CONFIG.maxFileSize),
    };
  }
}
