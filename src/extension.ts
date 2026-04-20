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
      void customEditorProvider.notifyConfigurationChanged();
    }),
    ...commandDisposables,
  ];

  context.subscriptions.push(...disposables);

  void context.workspaceState.update('muninn.editorAssociationsAdded', undefined);

  logger.info(t('Muninn custom markdown editor activated.'));
}

export function deactivate(): void {
  // No-op.
}

export const __testing = {
  formatInspectValue,
};
