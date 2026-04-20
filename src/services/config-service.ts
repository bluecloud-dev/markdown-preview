import * as vscode from 'vscode';
import { ExtensionConfiguration } from '../types/config';

export type ConfigInspection<T> = {
  defaultValue?: T;
  globalValue?: T;
  workspaceValue?: T;
  workspaceFolderValue?: T;
};

const DEFAULT_CONFIG: ExtensionConfiguration = {
  editorAssociations: true,
  mermaidEnabled: true,
  mermaidAllowInUntrustedWorkspaces: false,
  toolbarMode: 'basic',
};

export class ConfigService {
  private readonly cachedConfigs = new Map<string, ExtensionConfiguration>();

  getEditorAssociations(resource?: vscode.Uri): boolean {
    return this.getConfig(resource).editorAssociations;
  }

  getMermaidEnabled(resource?: vscode.Uri): boolean {
    return this.getConfig(resource).mermaidEnabled;
  }

  getMermaidAllowInUntrustedWorkspaces(resource?: vscode.Uri): boolean {
    return this.getConfig(resource).mermaidAllowInUntrustedWorkspaces;
  }

  getToolbarMode(resource?: vscode.Uri): 'basic' | 'advanced' {
    return this.getConfig(resource).toolbarMode;
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
    editorAssociations?: ConfigInspection<boolean>;
    mermaidEnabled?: ConfigInspection<boolean>;
    mermaidAllowInUntrustedWorkspaces?: ConfigInspection<boolean>;
    toolbarMode?: ConfigInspection<'basic' | 'advanced'>;
  } {
    const config = vscode.workspace.getConfiguration('muninn', resource);
    return {
      editorAssociations: config.inspect<boolean>('editorAssociations'),
      mermaidEnabled: config.inspect<boolean>('integrations.mermaid.enabled'),
      mermaidAllowInUntrustedWorkspaces: config.inspect<boolean>(
        'integrations.mermaid.allowInUntrustedWorkspaces',
      ),
      toolbarMode: config.inspect<'basic' | 'advanced'>('toolbar.mode'),
    };
  }

  private getCacheKey(resource?: vscode.Uri): string {
    return resource?.toString() ?? '__global__';
  }

  private loadConfig(resource?: vscode.Uri): ExtensionConfiguration {
    const config = vscode.workspace.getConfiguration('muninn', resource);
    return {
      editorAssociations: config.get('editorAssociations', DEFAULT_CONFIG.editorAssociations),
      mermaidEnabled: config.get('integrations.mermaid.enabled', DEFAULT_CONFIG.mermaidEnabled),
      mermaidAllowInUntrustedWorkspaces: config.get(
        'integrations.mermaid.allowInUntrustedWorkspaces',
        DEFAULT_CONFIG.mermaidAllowInUntrustedWorkspaces,
      ),
      toolbarMode: config.get('toolbar.mode', DEFAULT_CONFIG.toolbarMode),
    };
  }
}
