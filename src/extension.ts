import * as vscode from 'vscode';
import { ConfigInspection, ConfigService } from './services/config-service';
import { Logger } from './services/logger';
import { t } from './utils/l10n';
import { FocusModeState } from './custom-editor/focus-mode-state';
import {
  MUNINN_MARKDOWN_EDITOR_VIEW_TYPE,
  MuninnCustomEditorProvider,
} from './custom-editor/muninn-custom-editor-provider';
import { SectionRevealTarget, ViewEditorCommand } from './custom-editor/protocol';
import { MarkdownOutlineSection, toSectionRevealTarget } from './outline/markdown-outline';
import { MUNINN_OUTLINE_VIEW_ID, MuninnOutlineProvider } from './outline/muninn-outline-provider';

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

const getActiveCustomEditorResource = (): vscode.Uri | undefined => {
  const activeTab = vscode.window.tabGroups.activeTabGroup?.activeTab;
  if (
    activeTab?.input instanceof vscode.TabInputCustom &&
    activeTab.input.viewType === MUNINN_MARKDOWN_EDITOR_VIEW_TYPE
  ) {
    return activeTab.input.uri;
  }

  return undefined;
};

const getActiveMarkdownResource = (): vscode.Uri | undefined => {
  const customEditorResource = getActiveCustomEditorResource();
  if (customEditorResource) {
    return customEditorResource;
  }

  return vscode.window.activeTextEditor?.document.uri;
};

const findOpenTextDocument = (resource: vscode.Uri): vscode.TextDocument | undefined =>
  vscode.workspace.textDocuments.find(
    (document) => document.uri.toString() === resource.toString(),
  );

const isSectionRevealTarget = (value: unknown): value is SectionRevealTarget => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Partial<SectionRevealTarget>;
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.title === 'string' &&
    typeof candidate.normalizedTitle === 'string' &&
    typeof candidate.level === 'number' &&
    typeof candidate.line === 'number' &&
    typeof candidate.occurrence === 'number'
  );
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
  const focusModeState = new FocusModeState(context.workspaceState);
  const customEditorProvider = new MuninnCustomEditorProvider(
    context.extensionUri,
    configService,
    focusModeState,
    logger,
  );
  const outlineProvider = new MuninnOutlineProvider();

  const refreshOutlineForActiveEditor = (): void => {
    const resource = getActiveCustomEditorResource();
    outlineProvider.setDocument(resource ? findOpenTextDocument(resource) : undefined);
  };

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

  const pickSection = async (): Promise<MarkdownOutlineSection | undefined> => {
    const sections = outlineProvider.getFlatSections();
    if (sections.length === 0) {
      void vscode.window.showInformationMessage(
        t('No headings found in the active Muninn editor.'),
      );
      return;
    }

    const selected = await vscode.window.showQuickPick(
      sections.map((section) => ({
        label: `${'  '.repeat(Math.max(0, section.level - 1))}${section.title}`,
        description: t('Line {0}', String(section.line + 1)),
        section,
      })),
      {
        title: t('Go to Section'),
        placeHolder: t('Select a document heading'),
        matchOnDescription: true,
      },
    );

    return selected?.section;
  };

  const resolveSectionTarget = async (
    section?: MarkdownOutlineSection | SectionRevealTarget | string,
  ): Promise<SectionRevealTarget | undefined> => {
    if (typeof section === 'string') {
      const found = outlineProvider.findSectionById(section);
      return found ? toSectionRevealTarget(found) : undefined;
    }

    if (isSectionRevealTarget(section)) {
      return section;
    }

    const selected = await pickSection();
    return selected ? toSectionRevealTarget(selected) : undefined;
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
      id: 'muninn.toggleFocusMode',
      run: async () => {
        await focusModeState.toggle();
        await customEditorProvider.notifyFocusModeChanged();
      },
    },
    {
      id: 'muninn.goToSection',
      run: async (section?: MarkdownOutlineSection | SectionRevealTarget | string) => {
        const target = await resolveSectionTarget(section);
        if (!target) {
          return;
        }
        await customEditorProvider.revealSectionInActiveEditor(target);
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
    vscode.window.registerTreeDataProvider(MUNINN_OUTLINE_VIEW_ID, outlineProvider),
    vscode.window.tabGroups.onDidChangeTabs(refreshOutlineForActiveEditor),
    vscode.window.tabGroups.onDidChangeTabGroups(refreshOutlineForActiveEditor),
    vscode.window.onDidChangeActiveTextEditor(refreshOutlineForActiveEditor),
    vscode.workspace.onDidChangeTextDocument((event) => {
      outlineProvider.refreshDocument(event.document);
    }),
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

  const LEGACY_EDITOR_ASSOCIATIONS_STATE_KEY = 'muninn.editorAssociationsAdded';
  if (context.workspaceState.get(LEGACY_EDITOR_ASSOCIATIONS_STATE_KEY) !== undefined) {
    // Memento.update(key, undefined) is the documented way to delete a key.
    // eslint-disable-next-line unicorn/no-useless-undefined
    void context.workspaceState.update(LEGACY_EDITOR_ASSOCIATIONS_STATE_KEY, undefined);
  }

  refreshOutlineForActiveEditor();

  logger.info(t('Muninn custom markdown editor activated.'));
}

export function deactivate(): void {
  // No-op.
}

export const __testing = {
  formatInspectValue,
};
