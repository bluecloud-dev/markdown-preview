/**
 * @fileoverview Type definitions for extension configuration.
 *
 * Defines the structure of the extension's user-configurable settings.
 * These settings are defined in package.json under `contributes.configuration`
 * and accessed via VS Code's workspace configuration API.
 *
 * @module types/config
 */

/**
 * Extension configuration settings.
 *
 * All settings use the `markdownReader.` prefix in VS Code settings.
 * Settings support VS Code's hierarchical scope: default, user, workspace, folder.
 */
export interface ExtensionConfiguration {
  /**
   * Whether the extension is enabled.
   * When false, markdown files open in VS Code's default text editor.
   */
  enabled: boolean;

  /**
   * Glob patterns for files/folders excluded from auto-preview.
   * Files matching these patterns open in text editor instead of preview.
   * Patterns are matched using minimatch with dot and nocase options enabled.
   */
  excludePatterns: string[];

  /**
   * Maximum file size in bytes for auto-preview.
   * Files larger than this trigger a confirmation prompt before previewing.
   * This prevents UI slowdowns when opening very large markdown files.
   * Default is 1MB (1048576 bytes).
   */
  maxFileSize: number;

  /**
   * Whether to add a workspace editor association to open markdown files
   * directly in the preview editor. This reduces the initial text-editor flicker.
   */
  editorAssociations: boolean;
}
