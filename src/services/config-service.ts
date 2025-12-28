/**
 * @fileoverview Configuration service for reading and caching extension settings.
 *
 * This service provides a typed interface to the extension's configuration,
 * supporting VS Code's hierarchical settings model (default → user → workspace → folder).
 * It includes:
 * - Caching for performance (cleared on configuration changes)
 * - Resource-scoped configuration resolution
 * - Glob pattern matching for file exclusions using minimatch
 *
 * Settings are defined in package.json under `contributes.configuration` with
 * the `markdownReader` prefix.
 *
 * @module services/config-service
 */

import * as vscode from 'vscode';
import { minimatch } from 'minimatch';
import { ExtensionConfiguration } from '../types/config';

/**
 * Represents the inspection result for a single configuration value.
 * Contains the value at each scope level where it may be defined.
 */
export type ConfigInspection<T> = {
  /** The default value from package.json */
  defaultValue?: T;
  /** User settings value (settings.json in user profile) */
  globalValue?: T;
  /** Workspace settings value (.code-workspace or .vscode/settings.json) */
  workspaceValue?: T;
  /** Workspace folder settings value (multi-root workspace folder) */
  workspaceFolderValue?: T;
};

/**
 * Default configuration values applied when no user settings are defined.
 * These are the sensible defaults that allow the extension to work
 * immediately after installation (zero-configuration principle).
 */
const DEFAULT_CONFIG: ExtensionConfiguration = {
  enabled: true,
  excludePatterns: ['**/node_modules/**', '**/.git/**'],
  maxFileSize: 1_048_576, // 1MB in bytes
  editorAssociations: true,
};

/**
 * Service for accessing and caching extension configuration.
 *
 * Provides typed access to extension settings with support for
 * resource-scoped configuration in multi-root workspaces.
 *
 * @example
 * ```typescript
 * const configService = new ConfigService();
 *
 * // Get configuration for a specific file
 * const config = configService.getConfig(document.uri);
 * if (!config.enabled) return;
 *
 * // Check if a file is excluded from auto-preview
 * if (configService.isExcluded(uri)) return;
 *
 * // Inspect settings across all scopes
 * const inspection = configService.inspect(uri);
 * console.log(inspection.enabled?.workspaceValue);
 * ```
 */
export class ConfigService {
  private readonly cachedConfigs = new Map<string, ExtensionConfiguration>();

  /**
   * Return the enabled flag for the provided resource.
   * @param resource Optional resource URI for scoped settings.
   * @returns True when the extension is enabled.
   * @throws No errors expected.
   */
  getEnabled(resource?: vscode.Uri): boolean {
    return this.getConfig(resource).enabled;
  }

  /**
   * Return exclude patterns for the provided resource.
   * @param resource Optional resource URI for scoped settings.
   * @returns The glob patterns for excluded files.
   * @throws No errors expected.
   */
  getExcludePatterns(resource?: vscode.Uri): string[] {
    return this.getConfig(resource).excludePatterns;
  }

  /**
   * Return the maximum file size for auto-preview.
   * @param resource Optional resource URI for scoped settings.
   * @returns The max file size in bytes.
   * @throws No errors expected.
   */
  getMaxFileSize(resource?: vscode.Uri): number {
    return this.getConfig(resource).maxFileSize;
  }

  /**
   * Return whether editor associations should be managed for the provided resource.
   * @param resource Optional resource URI for scoped settings.
   * @returns True when editor associations are enabled.
   * @throws No errors expected.
   */
  getEditorAssociations(resource?: vscode.Uri): boolean {
    return this.getConfig(resource).editorAssociations;
  }

  /**
   * Resolve the effective configuration for the provided resource.
   * @param resource Optional resource URI for scoped settings.
   * @returns The resolved configuration.
   * @throws No errors expected.
   */
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

  /**
   * Reload and cache configuration for the provided resource.
   * @param resource Optional resource URI for scoped settings.
   * @returns The refreshed configuration.
   * @throws No errors expected.
   */
  reload(resource?: vscode.Uri): ExtensionConfiguration {
    const config = this.loadConfig(resource);
    this.cachedConfigs.set(this.getCacheKey(resource), config);
    return config;
  }

  /**
   * Clear all cached configurations.
   * @returns void
   * @throws No errors expected.
   */
  clearCache(): void {
    this.cachedConfigs.clear();
  }

  /**
   * Inspect configuration values across scopes.
   * @param resource Optional resource URI for scoped settings.
   * @returns Configuration inspection data per scope.
   * @throws No errors expected.
   */
  inspect(resource?: vscode.Uri): {
    enabled?: ConfigInspection<boolean>;
    excludePatterns?: ConfigInspection<string[]>;
    maxFileSize?: ConfigInspection<number>;
    editorAssociations?: ConfigInspection<boolean>;
  } {
    const config = vscode.workspace.getConfiguration('markdownReader', resource);
    return {
      enabled: config.inspect<boolean>('enabled'),
      excludePatterns: config.inspect<string[]>('excludePatterns'),
      maxFileSize: config.inspect<number>('maxFileSize'),
      editorAssociations: config.inspect<boolean>('editorAssociations'),
    };
  }

  /**
   * Check whether a resource matches any exclusion pattern.
   * @param uri Resource URI to test.
   * @returns True when the resource is excluded.
   * @throws No errors expected.
   */
  isExcluded(uri: vscode.Uri): boolean {
    // Use workspace-relative paths so glob patterns align with user expectations.
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
      editorAssociations: config.get(
        'editorAssociations',
        DEFAULT_CONFIG.editorAssociations
      ),
    };
  }
}
