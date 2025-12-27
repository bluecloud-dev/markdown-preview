import * as vscode from 'vscode';
import { minimatch } from 'minimatch';
import { ExtensionConfiguration } from '../types/config';

const DEFAULT_CONFIG: ExtensionConfiguration = {
  enabled: true,
  excludePatterns: ['**/node_modules/**', '**/.git/**'],
  maxFileSize: 1_048_576,
};

export class ConfigService {
  private readonly cachedConfigs = new Map<string, ExtensionConfiguration>();

  getEnabled(resource?: vscode.Uri): boolean {
    return this.getConfig(resource).enabled;
  }

  getExcludePatterns(resource?: vscode.Uri): string[] {
    return this.getConfig(resource).excludePatterns;
  }

  getMaxFileSize(resource?: vscode.Uri): number {
    return this.getConfig(resource).maxFileSize;
  }

  getConfig(resource?: vscode.Uri): ExtensionConfiguration {
    const cacheKey = this.getCacheKey(resource);
    const cached = this.cachedConfigs.get(cacheKey);
    if (cached) {
      return cached;
    }

    const config = this.loadConfig(resource);
    this.cachedConfigs.set(cacheKey, config);
    return config;
  }

  reload(resource?: vscode.Uri): ExtensionConfiguration {
    const config = this.loadConfig(resource);
    this.cachedConfigs.set(this.getCacheKey(resource), config);
    return config;
  }

  clearCache(): void {
    this.cachedConfigs.clear();
  }

  inspect(resource?: vscode.Uri): {
    enabled?: vscode.ConfigurationInspect<boolean>;
    excludePatterns?: vscode.ConfigurationInspect<string[]>;
    maxFileSize?: vscode.ConfigurationInspect<number>;
  } {
    const config = vscode.workspace.getConfiguration('markdownReader', resource);
    return {
      enabled: config.inspect<boolean>('enabled'),
      excludePatterns: config.inspect<string[]>('excludePatterns'),
      maxFileSize: config.inspect<number>('maxFileSize'),
    };
  }

  isExcluded(uri: vscode.Uri): boolean {
    const filePath = vscode.workspace.asRelativePath(uri, false);
    const config = this.getConfig(uri);
    return config.excludePatterns.some((pattern) =>
      minimatch(filePath, pattern, { dot: true, nocase: true })
    );
  }

  private getCacheKey(resource?: vscode.Uri): string {
    return resource?.toString() ?? '__global__';
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
