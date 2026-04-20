import * as vscode from 'vscode';
import { ConfigInspection, ConfigService } from './services/config-service';
import { Logger } from './services/logger';
import { t } from './utils/l10n';
import {
  MUNINN_MARKDOWN_EDITOR_VIEW_TYPE,
  MuninnCustomEditorProvider,
} from './custom-editor/muninn-custom-editor-provider';
import { ViewEditorCommand } from './custom-editor/protocol';

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

  return parts.map(([label, value]) => `${label}=${JSON.stringify(value)}`).join(' | ');
};

type EditorAssociationEntry = Readonly<{
  filenamePattern: string;
  viewType: string;
}>;

type EditorAssociationRecord = Readonly<Record<string, string>>;
type EditorAssociations = ReadonlyArray<EditorAssociationEntry> | EditorAssociationRecord;

const MARKDOWN_ASSOCIATION_PATTERNS = ['*.md', '*.markdown'];
const MARKDOWN_ASSOCIATION_VIEW = MUNINN_MARKDOWN_EDITOR_VIEW_TYPE;
const MARKDOWN_ASSOCIATION_STATE_KEY = 'muninn.editorAssociationsAdded';

type AssociationState = {
  patterns: string[];
};

const matchesAssociationPattern = (pattern: string, candidate: string): boolean =>
  candidate === pattern || candidate === `**/${pattern}`;

const addMarkdownAssociation = (
  current: unknown,
): { updated: boolean; value: EditorAssociations; addedPatterns: string[] } => {
  if (Array.isArray(current)) {
    const entries = current as ReadonlyArray<EditorAssociationEntry>;
    const changedPatterns: string[] = [];
    const nextEntries = [...entries];

    for (const pattern of MARKDOWN_ASSOCIATION_PATTERNS) {
      const existingIndex = nextEntries.findIndex((entry) =>
        matchesAssociationPattern(pattern, entry.filenamePattern),
      );
      if (existingIndex === -1) {
        nextEntries.push({
          filenamePattern: pattern,
          viewType: MARKDOWN_ASSOCIATION_VIEW,
        });
        changedPatterns.push(pattern);
        continue;
      }

      const existingEntry = nextEntries[existingIndex];
      if (existingEntry.viewType !== MARKDOWN_ASSOCIATION_VIEW) {
        nextEntries[existingIndex] = {
          ...existingEntry,
          viewType: MARKDOWN_ASSOCIATION_VIEW,
        };
        changedPatterns.push(pattern);
      }
    }

    return {
      updated: changedPatterns.length > 0,
      value: nextEntries,
      addedPatterns: changedPatterns,
    };
  }

  if (current && typeof current === 'object') {
    const record = current as EditorAssociationRecord;
    const changedPatterns: string[] = [];
    const nextRecord: Record<string, string> = { ...record };

    for (const pattern of MARKDOWN_ASSOCIATION_PATTERNS) {
      const directPattern = pattern;
      const nestedPattern = `**/${pattern}`;
      if (record[directPattern] === MARKDOWN_ASSOCIATION_VIEW) {
        continue;
      }
      if (record[nestedPattern] === MARKDOWN_ASSOCIATION_VIEW) {
        continue;
      }

      if (record[nestedPattern] !== undefined) {
        delete nextRecord[nestedPattern];
      }

      nextRecord[directPattern] = MARKDOWN_ASSOCIATION_VIEW;
      changedPatterns.push(pattern);
    }

    return {
      updated: changedPatterns.length > 0,
      value: nextRecord,
      addedPatterns: changedPatterns,
    };
  }

  return {
    updated: true,
    value: Object.fromEntries(
      MARKDOWN_ASSOCIATION_PATTERNS.map((pattern) => [pattern, MARKDOWN_ASSOCIATION_VIEW]),
    ),
    addedPatterns: [...MARKDOWN_ASSOCIATION_PATTERNS],
  };
};

const removeMarkdownAssociation = (
  current: unknown,
  patterns: string[],
): { updated: boolean; value: EditorAssociations; removedPatterns: string[] } => {
  if (Array.isArray(current)) {
    const entries = current as ReadonlyArray<EditorAssociationEntry>;
    const removedPatterns = new Set<string>();
    const nextEntries = entries.filter((entry) => {
      const match = patterns.find((pattern) =>
        matchesAssociationPattern(pattern, entry.filenamePattern),
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
    const record = current as EditorAssociationRecord;
    const removedPatterns: string[] = [];
    const nextRecord: Record<string, string> = { ...record };
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
  logger: Logger,
): Promise<void> => {
  const hasWorkspace =
    (vscode.workspace.workspaceFolders?.length ?? 0) > 0 ||
    vscode.workspace.workspaceFile !== undefined;
  if (!hasWorkspace) {
    return;
  }

  const config = configService.getConfig();
  const shouldSet = config.editorAssociations;
  const state = context.workspaceState.get<AssociationState | undefined>(
    MARKDOWN_ASSOCIATION_STATE_KEY,
  );

  try {
    const workbenchConfig = vscode.workspace.getConfiguration('workbench');
    const current = workbenchConfig.get<unknown>('editorAssociations');

    if (!shouldSet) {
      if (!state?.patterns?.length) {
        return;
      }
      const { updated, value } = removeMarkdownAssociation(current, state.patterns);
      if (!updated) {
        return;
      }
      await workbenchConfig.update(
        'editorAssociations',
        isAssociationsEmpty(value) ? undefined : value,
        vscode.ConfigurationTarget.Workspace,
      );
      await context.workspaceState.update(MARKDOWN_ASSOCIATION_STATE_KEY, void 0);
      logger.info(t('Removed workspace editor association for Muninn markdown editor.'));
      return;
    }

    const { updated, value, addedPatterns } = addMarkdownAssociation(current);
    if (!updated) {
      return;
    }
    await workbenchConfig.update('editorAssociations', value, vscode.ConfigurationTarget.Workspace);
    if (addedPatterns.length > 0) {
      await context.workspaceState.update(MARKDOWN_ASSOCIATION_STATE_KEY, {
        patterns: addedPatterns,
      });
    }
    logger.info(t('Set workspace editor association for Muninn markdown editor.'));
  } catch (error) {
    logger.warn(t('Failed to update workspace editor association for Muninn markdown editor.'));
    logger.error(t('Editor association update error.'), error);
  }
};

const getActiveMarkdownResource = (): vscode.Uri | undefined => {
  const activeTab = vscode.window.tabGroups.activeTabGroup?.activeTab;
  if (
    activeTab?.input instanceof vscode.TabInputCustom &&
    activeTab.input.viewType === MUNINN_MARKDOWN_EDITOR_VIEW_TYPE
  ) {
    return activeTab.input.uri;
  }

  return vscode.window.activeTextEditor?.document.uri;
};

const dispatchEditorCommand = async (
  provider: MuninnCustomEditorProvider,
  command: ViewEditorCommand,
): Promise<void> => {
  await provider.executeCommandInActiveEditor(command);
};

const registerCommands = (
  entries: ReadonlyArray<Readonly<{ id: string; run: () => unknown }>>,
): vscode.Disposable[] =>
  entries.map((entry) => vscode.commands.registerCommand(entry.id, entry.run));

export function activate(context: vscode.ExtensionContext): void {
  const outputChannel = vscode.window.createOutputChannel(t('Muninn for VS Code'));
  const logger = new Logger(outputChannel);
  const configService = new ConfigService();
  const customEditorProvider = new MuninnCustomEditorProvider(
    context.extensionUri,
    configService,
    logger,
  );

  const logConfigInspection = (resource?: vscode.Uri): void => {
    const inspection = configService.inspect(resource);
    outputChannel.clear();
    outputChannel.appendLine(t('Muninn for VS Code configuration'));
    outputChannel.appendLine(t('Resource: {0}', resource?.toString() ?? 'global'));
    outputChannel.appendLine(
      t('integrations.mermaid.enabled: {0}', formatInspectValue(inspection.mermaidEnabled)),
    );
    outputChannel.appendLine(
      t(
        'integrations.mermaid.allowInUntrustedWorkspaces: {0}',
        formatInspectValue(inspection.mermaidAllowInUntrustedWorkspaces),
      ),
    );
    outputChannel.appendLine(t('toolbar.mode: {0}', formatInspectValue(inspection.toolbarMode)));
    outputChannel.show(true);
  };

  const showTableActions = async (provider: MuninnCustomEditorProvider): Promise<void> => {
    const selected = await vscode.window.showQuickPick(
      [
        {
          label: t('Insert New Table'),
          command: 'insertTable' as ViewEditorCommand,
        },
        {
          label: t('Add Table Row'),
          command: 'addTableRow' as ViewEditorCommand,
        },
        {
          label: t('Add Table Column'),
          command: 'addTableColumn' as ViewEditorCommand,
        },
      ],
      {
        title: t('Muninn Table Actions'),
        placeHolder: t('Select a table operation'),
      },
    );

    if (!selected) {
      return;
    }

    await dispatchEditorCommand(provider, selected.command);
  };

  const editorCommandEntries: ReadonlyArray<Readonly<{ id: string; command: ViewEditorCommand }>> =
    [
      { id: 'muninn.toggleBold', command: 'toggleBold' },
      { id: 'muninn.toggleItalic', command: 'toggleItalic' },
      { id: 'muninn.setHeading1', command: 'setHeading1' },
      { id: 'muninn.setHeading2', command: 'setHeading2' },
      { id: 'muninn.setHeading3', command: 'setHeading3' },
      { id: 'muninn.setParagraph', command: 'setParagraph' },
      { id: 'muninn.toggleBulletList', command: 'toggleBulletList' },
      { id: 'muninn.toggleNumberedList', command: 'toggleNumberedList' },
      { id: 'muninn.insertLink', command: 'insertLink' },
      { id: 'muninn.insertMermaidBlock', command: 'insertMermaidBlock' },
      { id: 'muninn.insertTable', command: 'insertTable' },
      { id: 'muninn.addTableRow', command: 'addTableRow' },
      { id: 'muninn.addTableColumn', command: 'addTableColumn' },
    ];

  const commandDisposables = registerCommands([
    {
      id: 'muninn.inspectConfiguration',
      run: () => {
        logConfigInspection(getActiveMarkdownResource());
      },
    },
    {
      id: 'muninn.openRawMarkdown',
      run: async () => {
        await customEditorProvider.openRawMarkdownForActiveEditor();
      },
    },
    {
      id: 'muninn.insertCodeBlock',
      run: async () => {
        await dispatchEditorCommand(customEditorProvider, 'insertCodeBlock');
      },
    },
    {
      id: 'muninn.tableActions',
      run: async () => {
        await showTableActions(customEditorProvider);
      },
    },
    ...editorCommandEntries.map((entry) => ({
      id: entry.id,
      run: async () => {
        await dispatchEditorCommand(customEditorProvider, entry.command);
      },
    })),
  ]);

  const disposables: vscode.Disposable[] = [
    outputChannel,
    customEditorProvider,
    vscode.window.registerCustomEditorProvider(
      MUNINN_MARKDOWN_EDITOR_VIEW_TYPE,
      customEditorProvider,
      {
        webviewOptions: {
          retainContextWhenHidden: true,
        },
        supportsMultipleEditorsPerDocument: false,
      },
    ),
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (!event.affectsConfiguration('muninn')) {
        return;
      }
      configService.clearCache();
      logger.info(t('Muninn configuration cache cleared after settings change.'));
      void syncMarkdownAssociations(context, configService, logger);
      void customEditorProvider.notifyConfigurationChanged();
    }),
    ...commandDisposables,
  ];

  context.subscriptions.push(...disposables);
  void syncMarkdownAssociations(context, configService, logger);
  logger.info(t('Muninn custom markdown editor activated.'));
}

export function deactivate(): void {
  // No-op.
}

export const __testing = {
  formatInspectValue,
  matchesAssociationPattern,
  addMarkdownAssociation,
  removeMarkdownAssociation,
  isAssociationsEmpty,
  syncMarkdownAssociations,
  MARKDOWN_ASSOCIATION_PATTERNS,
  MARKDOWN_ASSOCIATION_VIEW,
  MARKDOWN_ASSOCIATION_STATE_KEY,
};
