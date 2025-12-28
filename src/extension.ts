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
 * The extension activates on `onStartupFinished` to prime editor associations,
 * and on `onLanguage:markdown` to handle preview behavior when markdown is opened.
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

type EditorAssociationEntry = {
  filenamePattern: string;
  viewType: string;
};

type EditorAssociations = Record<string, string> | EditorAssociationEntry[];

const MARKDOWN_ASSOCIATION_PATTERNS = ['*.md', '*.markdown'];
const MARKDOWN_ASSOCIATION_VIEW = 'vscode.markdown.preview.editor';
const MARKDOWN_ASSOCIATION_STATE_KEY = 'markdownReader.editorAssociationsAdded';

type AssociationState = {
  patterns: string[];
};

const matchesAssociationPattern = (pattern: string, candidate: string): boolean =>
  candidate === pattern || candidate === `**/${pattern}`;

const addMarkdownAssociation = (
  current: unknown
): { updated: boolean; value: EditorAssociations; addedPatterns: string[] } => {
  if (Array.isArray(current)) {
    const entries = current as EditorAssociationEntry[];
    const addedPatterns: string[] = [];
    const nextEntries = [...entries];
    for (const pattern of MARKDOWN_ASSOCIATION_PATTERNS) {
      const hasAssociation = entries.some((entry) =>
        matchesAssociationPattern(pattern, entry.filenamePattern)
      );
      if (!hasAssociation) {
        nextEntries.push({
          filenamePattern: pattern,
          viewType: MARKDOWN_ASSOCIATION_VIEW,
        });
        addedPatterns.push(pattern);
      }
    }
    return {
      updated: addedPatterns.length > 0,
      value: nextEntries,
      addedPatterns,
    };
  }

  if (current && typeof current === 'object') {
    const record = current as Record<string, string>;
    const addedPatterns: string[] = [];
    const nextRecord = { ...record };
    for (const pattern of MARKDOWN_ASSOCIATION_PATTERNS) {
      if (record[pattern] || record[`**/${pattern}`]) {
        continue;
      }
      nextRecord[pattern] = MARKDOWN_ASSOCIATION_VIEW;
      addedPatterns.push(pattern);
    }
    return {
      updated: addedPatterns.length > 0,
      value: nextRecord,
      addedPatterns,
    };
  }

  return {
    updated: true,
    value: Object.fromEntries(
      MARKDOWN_ASSOCIATION_PATTERNS.map((pattern) => [
        pattern,
        MARKDOWN_ASSOCIATION_VIEW,
      ])
    ),
    addedPatterns: [...MARKDOWN_ASSOCIATION_PATTERNS],
  };
};

const removeMarkdownAssociation = (
  current: unknown,
  patterns: string[]
): { updated: boolean; value: EditorAssociations; removedPatterns: string[] } => {
  if (Array.isArray(current)) {
    const entries = current as EditorAssociationEntry[];
    const removedPatterns = new Set<string>();
    const nextEntries = entries.filter((entry) => {
      const match = patterns.find((pattern) =>
        matchesAssociationPattern(pattern, entry.filenamePattern)
      );
      if (!match) {
        return true;
      }
      if (entry.viewType !== MARKDOWN_ASSOCIATION_VIEW) {
        return true;
      }
      removedPatterns.add(match);
      return false;
    });
    return {
      updated: removedPatterns.size > 0,
      value: nextEntries,
      removedPatterns: [...removedPatterns],
    };
  }

  if (current && typeof current === 'object') {
    const record = current as Record<string, string>;
    const removedPatterns: string[] = [];
    const nextRecord = { ...record };
    for (const pattern of patterns) {
      if (nextRecord[pattern] === MARKDOWN_ASSOCIATION_VIEW) {
        delete nextRecord[pattern];
        removedPatterns.push(pattern);
      }
      const nestedPattern = `**/${pattern}`;
      if (nextRecord[nestedPattern] === MARKDOWN_ASSOCIATION_VIEW) {
        delete nextRecord[nestedPattern];
        removedPatterns.push(pattern);
      }
    }
    return {
      updated: removedPatterns.length > 0,
      value: nextRecord,
      removedPatterns,
    };
  }

  return {
    updated: false,
    value: {},
    removedPatterns: [],
  };
};

const isAssociationsEmpty = (value: EditorAssociations): boolean => {
  if (Array.isArray(value)) {
    return value.length === 0;
  }
  return Object.keys(value).length === 0;
};

const syncMarkdownAssociations = async (
  context: vscode.ExtensionContext,
  configService: ConfigService,
  logger: Logger
): Promise<void> => {
  const hasWorkspace =
    (vscode.workspace.workspaceFolders?.length ?? 0) > 0 ||
    vscode.workspace.workspaceFile !== undefined;
  if (!hasWorkspace) {
    return;
  }

  const config = configService.getConfig();
  const shouldSet = config.enabled && config.editorAssociations;
  const state = context.workspaceState.get<AssociationState | undefined>(
    MARKDOWN_ASSOCIATION_STATE_KEY
  );

  try {
    const workbenchConfig = vscode.workspace.getConfiguration('workbench');
    const current = workbenchConfig.get<unknown>('editorAssociations');

    if (!shouldSet) {
      if (!state?.patterns?.length) {
        return;
      }
      const { updated, value } = removeMarkdownAssociation(
        current,
        state.patterns
      );
      if (!updated) {
        return;
      }
      await workbenchConfig.update(
        'editorAssociations',
        isAssociationsEmpty(value) ? undefined : value,
        vscode.ConfigurationTarget.Workspace
      );
      await context.workspaceState.update(MARKDOWN_ASSOCIATION_STATE_KEY, void 0);
      logger.info(t('Removed workspace editor association for markdown preview.'));
      return;
    }

    const { updated, value, addedPatterns } = addMarkdownAssociation(current);
    if (!updated) {
      return;
    }
    await workbenchConfig.update(
      'editorAssociations',
      value,
      vscode.ConfigurationTarget.Workspace
    );
    if (addedPatterns.length > 0) {
      await context.workspaceState.update(MARKDOWN_ASSOCIATION_STATE_KEY, {
        patterns: addedPatterns,
      });
    }
    logger.info(t('Set workspace editor association for markdown preview.'));
  } catch (error) {
    logger.warn(t('Failed to update workspace editor association for markdown preview.'));
    logger.error(t('Editor association update error.'), error);
  }
};

/**
 * Activate the Markdown Preview extension.
 *
 * This is the main entry point called by VS Code when the extension is activated.
 * Activation occurs after startup and when a markdown file is opened
 * (via `onStartupFinished` and `onLanguage:markdown`).
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
 * // Activation events in package.json: "onStartupFinished", "onLanguage:markdown"
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
  void syncMarkdownAssociations(context, configService, logger);

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
    outputChannel.appendLine(
      t(
        'editorAssociations: {0}',
        formatInspectValue(inspection.editorAssociations)
      )
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

      void syncMarkdownAssociations(context, configService, logger);
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
