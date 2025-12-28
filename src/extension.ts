/**
 * @fileoverview Extension entry point for Markdown Preview.
 *
 * This module handles the activation and deactivation lifecycle of the extension.
 * It is responsible for:
 * - Creating and wiring all service instances (dependency injection)
 * - Registering all commands with VS Code
 * - Setting up event listeners for configuration changes
 * - Managing the extension's disposables for proper cleanup
 *
 * The extension uses lazy activation via `onLanguage:markdown` to minimize
 * startup impact on VS Code.
 *
 * @module extension
 * @see {@link https://code.visualstudio.com/api/references/activation-events}
 */

import * as vscode from 'vscode';
import {
  formatBold,
  formatBulletList,
  formatCodeBlock,
  formatHeading1,
  formatHeading2,
  formatHeading3,
  formatInlineCode,
  formatItalic,
  formatLink,
  formatNumberedList,
  formatStrikethrough,
} from './commands/format-commands';
import { MarkdownFileHandler } from './handlers/markdown-file-handler';
import { enterEditMode, exitEditMode, toggleEditMode } from './commands/mode-commands';
import { ConfigInspection, ConfigService } from './services/config-service';
import { FormattingService } from './services/formatting-service';
import { Logger } from './services/logger';
import { PreviewService } from './services/preview-service';
import { StateService } from './services/state-service';
import { ValidationService } from './services/validation-service';
import { TitleBarController } from './ui/title-bar-controller';
import { t } from './utils/l10n';

/**
 * Format a configuration inspection result for display in the output channel.
 *
 * Transforms the VS Code configuration inspection object into a human-readable
 * string showing values at each scope level (default, user, workspace, folder).
 *
 * @param inspect - The configuration inspection result from VS Code
 * @returns A formatted string showing the value at each defined scope
 *
 * @example
 * // Returns: "default=true | user=false"
 * formatInspectValue({ defaultValue: true, globalValue: false });
 *
 * @internal
 */
const formatInspectValue = <T>(inspect?: ConfigInspection<T>): string => {
  if (!inspect) {
    return 'unavailable';
  }

  const parts = [
    ['default', inspect.defaultValue],
    ['user', inspect.globalValue],
    ['workspace', inspect.workspaceValue],
    ['folder', inspect.workspaceFolderValue],
  ].filter(([, value]) => value !== undefined);

  if (parts.length === 0) {
    return 'unset';
  }

  return parts
    .map(([label, value]) => `${label}=${JSON.stringify(value)}`)
    .join(' | ');
};

/**
 * Activate the Markdown Preview extension.
 *
 * This is the main entry point called by VS Code when the extension is activated.
 * Activation occurs when a markdown file is opened (via `onLanguage:markdown`).
 *
 * The function performs the following setup:
 * 1. Creates all service instances with proper dependency injection
 * 2. Registers command handlers for mode switching and formatting
 * 3. Sets up configuration change listeners
 * 4. Initializes the file handler and UI controllers
 *
 * All disposables are registered with the extension context to ensure proper
 * cleanup when the extension is deactivated.
 *
 * @param context - Extension activation context provided by VS Code, used for
 *                  state persistence and disposable management
 *
 * @example
 * // Called automatically by VS Code, not intended for direct invocation
 * // Activation event in package.json: "onLanguage:markdown"
 */
export function activate(context: vscode.ExtensionContext): void {
  const disposables: vscode.Disposable[] = [];

  // Core services are shared across commands for consistent state management.
  // The service layer follows a dependency injection pattern where each service
  // receives its dependencies through the constructor.
  const stateService = new StateService();
  const configService = new ConfigService();
  const outputChannel = vscode.window.createOutputChannel(t('Markdown Reader'));
  const logger = new Logger(outputChannel);
  const validationService = new ValidationService();
  const formattingService = new FormattingService();
  const previewService = new PreviewService(
    stateService,
    configService,
    validationService,
    context.workspaceState,
    logger
  );

  const fileHandler = new MarkdownFileHandler(
    previewService,
    stateService,
    configService,
    validationService,
    context.globalState,
    logger
  );
  const titleBarController = new TitleBarController(stateService);

  logger.info(t('Markdown Preview activated.'));

  const logConfigInspection = (resource?: vscode.Uri): void => {
    const inspection = configService.inspect(resource);
    outputChannel.clear();
    outputChannel.appendLine(t('Markdown Reader configuration'));
    outputChannel.appendLine(
      t('Resource: {0}', resource?.toString() ?? 'global')
    );
    outputChannel.appendLine(
      t('enabled: {0}', formatInspectValue(inspection.enabled))
    );
    outputChannel.appendLine(
      t('excludePatterns: {0}', formatInspectValue(inspection.excludePatterns))
    );
    outputChannel.appendLine(
      t('maxFileSize: {0}', formatInspectValue(inspection.maxFileSize))
    );
    outputChannel.show(true);
  };

  fileHandler.register();
  titleBarController.register();
  disposables.push(
    fileHandler,
    titleBarController,
    outputChannel,
    vscode.workspace.onDidChangeConfiguration((event) => {
      const resource = vscode.window.activeTextEditor?.document.uri;
      const workspaceFolders = vscode.workspace.workspaceFolders ?? [];
      const affectedFolders = workspaceFolders.filter((folder) =>
        event.affectsConfiguration('markdownReader', folder.uri)
      );
      const affectsResource =
        resource !== undefined &&
        event.affectsConfiguration('markdownReader', resource);
      const affectsGlobal = event.affectsConfiguration('markdownReader');

      if (!affectsGlobal && !affectsResource && affectedFolders.length === 0) {
        return;
      }

      logger.info(
        t(
          'Configuration changed; reloading settings for {0}.',
          resource?.toString() ?? 'global'
        )
      );
      configService.clearCache();

      if (affectsGlobal) {
        configService.reload();
      }

      for (const folder of affectedFolders) {
        configService.reload(folder.uri);
      }

      if (affectsResource) {
        configService.reload(resource);
      }
    }),
    vscode.commands.registerCommand('markdownReader.inspectConfiguration', () =>
      logConfigInspection(vscode.window.activeTextEditor?.document.uri)
    ),
    vscode.commands.registerCommand('markdownReader.enterEditMode', () =>
      enterEditMode(previewService)
    ),
    vscode.commands.registerCommand('markdownReader.exitEditMode', () =>
      exitEditMode(previewService)
    ),
    vscode.commands.registerCommand('markdownReader.toggleEditMode', () =>
      toggleEditMode(previewService, stateService)
    ),
    vscode.commands.registerTextEditorCommand('markdownReader.formatBold', (editor) =>
      formatBold(editor, formattingService)
    ),
    vscode.commands.registerTextEditorCommand('markdownReader.formatItalic', (editor) =>
      formatItalic(editor, formattingService)
    ),
    vscode.commands.registerTextEditorCommand(
      'markdownReader.formatStrikethrough',
      (editor) => formatStrikethrough(editor, formattingService)
    ),
    vscode.commands.registerTextEditorCommand('markdownReader.formatBulletList', (editor) =>
      formatBulletList(editor, formattingService)
    ),
    vscode.commands.registerTextEditorCommand(
      'markdownReader.formatNumberedList',
      (editor) => formatNumberedList(editor, formattingService)
    ),
    vscode.commands.registerTextEditorCommand('markdownReader.formatInlineCode', (editor) =>
      formatInlineCode(editor, formattingService)
    ),
    vscode.commands.registerTextEditorCommand('markdownReader.formatCodeBlock', (editor) =>
      formatCodeBlock(editor, formattingService)
    ),
    vscode.commands.registerTextEditorCommand('markdownReader.formatLink', (editor) =>
      formatLink(editor, formattingService)
    ),
    vscode.commands.registerTextEditorCommand('markdownReader.formatHeading1', (editor) =>
      formatHeading1(editor, formattingService)
    ),
    vscode.commands.registerTextEditorCommand('markdownReader.formatHeading2', (editor) =>
      formatHeading2(editor, formattingService)
    ),
    vscode.commands.registerTextEditorCommand('markdownReader.formatHeading3', (editor) =>
      formatHeading3(editor, formattingService)
    )
  );

  context.subscriptions.push(...disposables);
}

/**
 * Deactivate the extension.
 * @returns void
 * @throws No errors expected.
 */
export function deactivate(): void {
  // No-op.
}
