import './styles.css';
import MarkdownIt from 'markdown-it';
import { baseKeymap, setBlockType, toggleMark } from 'prosemirror-commands';
import { history, redo, undo } from 'prosemirror-history';
import { keymap } from 'prosemirror-keymap';
import type { Node as ProseMirrorNode, MarkType, NodeType } from 'prosemirror-model';
import {
  MarkdownParser,
  MarkdownSerializer,
  ParseSpec,
  defaultMarkdownParser,
  defaultMarkdownSerializer,
} from 'prosemirror-markdown';
import { liftListItem, wrapInList } from 'prosemirror-schema-list';
import { type Command, EditorState, Plugin, TextSelection } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import type {
  ToolbarMode,
  ViewEditorCommand,
  ViewToHostMessage,
} from '../../custom-editor/protocol';
import { bootstrapEditorApp } from './bootstrap';
import { formatString, getString } from './localization';
import { wrapTablesForEditor, unwrapTablesForHost } from './markdown-transforms';
import { attachHostMessageListener } from './messages';
import { isMermaidCodeBlockNode } from './nodes/mermaid-node';
import { createCodeBlockNodeViewConstructor, isTableCodeBlockNode } from './nodes/table-node-view';
import { MermaidPreviewController } from './preview';
import { HostSyncController } from './sync';
import {
  DEFAULT_TABLE_SOURCE,
  parseMarkdownTable,
  serializeMarkdownTable,
  TABLE_FENCE_LANGUAGE,
} from './tables/markdown-table-utilities';

declare function acquireVsCodeApi(): {
  postMessage: (message: ViewToHostMessage) => void;
};

const vscode = acquireVsCodeApi();
const schema = defaultMarkdownParser.schema;

const ADVANCED_TOOLBAR_COMMANDS = new Set<string>([
  'setHeading3',
  'toggleBulletList',
  'toggleNumberedList',
  'insertMermaidBlock',
]);

const PRESSABLE_TOOLBAR_COMMANDS = new Set<string>([
  'toggleBold',
  'toggleItalic',
  'insertLink',
  'setHeading1',
  'setHeading2',
  'setHeading3',
  'setParagraph',
  'toggleBulletList',
  'toggleNumberedList',
  'insertTable',
  'insertCodeBlock',
  'openRawMarkdown',
]);

const TRANSIENT_ACTIVE_COMMANDS = new Set<string>([
  'insertLink',
  'insertTable',
  'insertCodeBlock',
  'openRawMarkdown',
]);

const COMMAND_LABELS = new Map<string, string>([
  ['toggleBold', getString('commandLabelBold')],
  ['toggleItalic', getString('commandLabelItalic')],
  ['setHeading1', getString('commandLabelHeading1')],
  ['setHeading2', getString('commandLabelHeading2')],
  ['setHeading3', getString('commandLabelHeading3')],
  ['setParagraph', getString('commandLabelParagraph')],
  ['toggleBulletList', getString('commandLabelBulletList')],
  ['toggleNumberedList', getString('commandLabelNumberedList')],
  ['insertLink', getString('commandLabelLink')],
  ['insertMermaidBlock', getString('commandLabelMermaidDiagram')],
  ['insertTable', getString('commandLabelTable')],
  ['insertCodeBlock', getString('commandLabelCodeBlock')],
  ['addTableRow', getString('commandLabelAddTableRow')],
  ['addTableColumn', getString('commandLabelAddTableColumn')],
  ['openRawMarkdown', getString('commandLabelSourceEditor')],
]);

const formatCommandFailure = (command: string): string => {
  if (command === 'addTableRow') {
    return getString('commandFailureAddRowNoTable');
  }
  if (command === 'addTableColumn') {
    return getString('commandFailureAddColumnNoTable');
  }
  const label = COMMAND_LABELS.get(command) ?? command;
  return formatString(getString('commandFailureGenericTemplate'), label);
};

const markdownItParser = MarkdownIt('commonmark', {
  html: false,
  linkify: true,
});

const parserTokens = (
  defaultMarkdownParser as unknown as {
    tokens: Record<string, ParseSpec>;
  }
).tokens;

const markdownParser = new MarkdownParser(schema, markdownItParser, parserTokens);
const markdownSerializer = new MarkdownSerializer(
  defaultMarkdownSerializer.nodes,
  defaultMarkdownSerializer.marks,
);

const { editorContainer, statusLine, mermaidPreviewPanel, mermaidPreviewBody, toolbarButtons } =
  bootstrapEditorApp();
const moreButton = document.querySelector<HTMLButtonElement>('[data-testid="muninn-toolbar-more"]');

let view: EditorView | undefined;
let toolbarMode: ToolbarMode = 'basic';
let advancedActionsVisible = false;
let lastMermaidInsertAt = 0;

const setStatus = (message: string): void => {
  statusLine.textContent = message;
};

const updateAdvancedToolbarVisibility = (): void => {
  const showAdvancedActions = toolbarMode === 'advanced' || advancedActionsVisible;
  for (const command of ADVANCED_TOOLBAR_COMMANDS) {
    const button = toolbarButtons.get(command);
    if (!button) {
      continue;
    }
    button.hidden = !showAdvancedActions;
  }

  if (moreButton) {
    moreButton.hidden = toolbarMode === 'advanced';
    moreButton.setAttribute('aria-expanded', advancedActionsVisible ? 'true' : 'false');
  }
};

const getFirstAdvancedToolbarButton = (): HTMLButtonElement | undefined => {
  for (const command of ADVANCED_TOOLBAR_COMMANDS) {
    const button = toolbarButtons.get(command);
    if (button) {
      return button;
    }
  }
  return undefined;
};

const isFocusedAdvancedToolbarAction = (): boolean => {
  const activeElement = document.activeElement;
  if (!(activeElement instanceof HTMLButtonElement)) {
    return false;
  }
  const command = activeElement.dataset.command;
  if (!command) {
    return false;
  }
  return ADVANCED_TOOLBAR_COMMANDS.has(command);
};

const setToolbarMode = (mode: ToolbarMode): void => {
  const needsFocusFallback = mode === 'basic' && isFocusedAdvancedToolbarAction();
  toolbarMode = mode;
  advancedActionsVisible = false;
  updateAdvancedToolbarVisibility();
  if (!needsFocusFallback) {
    return;
  }
  if (moreButton && !moreButton.hidden) {
    moreButton.focus();
    return;
  }
  view?.focus();
};

const serializeMarkdownForHost = (): string => {
  if (!view) {
    return '';
  }

  const rawMarkdown = markdownSerializer.serialize(view.state.doc);
  return unwrapTablesForHost(rawMarkdown);
};

const syncController = new HostSyncController({
  debounceMs: 80,
  postApply: (payload) => {
    vscode.postMessage({
      type: 'view.applyDocument',
      payload,
    });
  },
});

const selectCodeBlockSource = (matcher: (node: ProseMirrorNode) => boolean): string | undefined => {
  if (!view) {
    return undefined;
  }

  const { from, to } = view.state.selection;
  let selectedSource: string | undefined;
  view.state.doc.nodesBetween(from, to, (node) => {
    if (!selectedSource && matcher(node)) {
      selectedSource = node.textContent;
      return false;
    }
    return true;
  });
  if (selectedSource) {
    return selectedSource;
  }

  let firstSource: string | undefined;
  view.state.doc.descendants((node) => {
    if (!firstSource && matcher(node)) {
      firstSource = node.textContent;
      return false;
    }
    return true;
  });
  return firstSource;
};

const mermaidPreview = new MermaidPreviewController({
  panel: mermaidPreviewPanel,
  body: mermaidPreviewBody,
  getSelectedMermaidSource: () => selectCodeBlockSource(isMermaidCodeBlockNode),
  renderDelayMs: 120,
});

const schedulePreviewRender = (): void => {
  mermaidPreview.scheduleRender();
};

const parseMarkdown = (markdown: string): EditorState =>
  EditorState.create({
    doc: markdownParser.parse(markdown),
    plugins: [
      history(),
      keymap({
        'Mod-z': undo,
        'Shift-Mod-z': redo,
        'Mod-y': redo,
        'Mod-b': () => executeEditorCommand('toggleBold'),
        'Mod-i': () => executeEditorCommand('toggleItalic'),
      }),
      keymap(baseKeymap),
      new Plugin({
        view: () => ({
          update: () => {
            updateToolbarState();
            schedulePreviewRender();
          },
        }),
      }),
    ],
  });

const getWordSelection = (state: EditorState): TextSelection | undefined => {
  if (!state.selection.empty) {
    return undefined;
  }

  const { $from } = state.selection;
  const parent = $from.parent;
  if (!parent.isTextblock) {
    return undefined;
  }

  const text = parent.textContent;
  if (text.length === 0) {
    return undefined;
  }

  const matcher = /[A-Za-z0-9_]/;
  let candidateOffset = $from.parentOffset;
  if (candidateOffset >= text.length) {
    candidateOffset = text.length - 1;
  }

  if (!matcher.test(text[candidateOffset] ?? '')) {
    let right = candidateOffset;
    while (right < text.length && !matcher.test(text[right] ?? '')) {
      right += 1;
    }

    if (right < text.length) {
      candidateOffset = right;
    } else {
      let left = candidateOffset - 1;
      while (left >= 0 && !matcher.test(text[left] ?? '')) {
        left -= 1;
      }
      if (left < 0) {
        return undefined;
      }
      candidateOffset = left;
    }
  }

  let start = candidateOffset;
  let end = candidateOffset;
  while (start > 0 && matcher.test(text[start - 1] ?? '')) {
    start -= 1;
  }
  while (end < text.length && matcher.test(text[end] ?? '')) {
    end += 1;
  }

  return TextSelection.create(state.doc, $from.start() + start, $from.start() + end);
};

const withExpandedWordSelection = (): EditorState | undefined => {
  if (!view) {
    return undefined;
  }

  let state = view.state;
  if (!state.selection.empty) {
    return state;
  }

  const wordSelection = getWordSelection(state);
  if (!wordSelection) {
    return state;
  }

  const transaction = state.tr.setSelection(wordSelection);
  view.dispatch(transaction);
  state = view.state;
  return state;
};

const runInlineMarkCommand = (markCommand: Command): boolean => {
  if (!view) {
    return false;
  }

  const state = withExpandedWordSelection();
  if (!state) {
    return false;
  }

  return markCommand(state, view.dispatch, view);
};

const runViewCommand = (command: Command): boolean => {
  if (!view) {
    return false;
  }
  return command(view.state, view.dispatch, view);
};

const getActiveHeadingLevel = (): number | undefined => {
  if (!view) {
    return undefined;
  }

  const { $from } = view.state.selection;
  for (let depth = $from.depth; depth >= 0; depth -= 1) {
    const node = $from.node(depth);
    if (node.type === schema.nodes.heading) {
      const level = Number(node.attrs.level);
      return Number.isFinite(level) ? level : 1;
    }
    if (node.type === schema.nodes.paragraph) {
      return undefined;
    }
  }
  return undefined;
};

const isParagraphActive = (): boolean => {
  if (!view) {
    return false;
  }
  const { $from } = view.state.selection;
  for (let depth = $from.depth; depth >= 0; depth -= 1) {
    if ($from.node(depth).type === schema.nodes.paragraph) {
      return true;
    }
  }
  return false;
};

const toggleHeadingLevel = (level: 1 | 2 | 3): boolean => {
  const activeLevel = getActiveHeadingLevel();
  if (activeLevel === level) {
    return runViewCommand(setBlockType(schema.nodes.paragraph));
  }
  return runViewCommand(setBlockType(schema.nodes.heading, { level }));
};

const createToggleListCommand = (listType: NodeType): Command => {
  const liftCommand = liftListItem(schema.nodes.list_item);
  const wrapCommand = wrapInList(listType);
  return (state, dispatch, editorView) =>
    liftCommand(state, dispatch, editorView) || wrapCommand(state, dispatch, editorView);
};

const toggleBulletListCommand = createToggleListCommand(schema.nodes.bullet_list);
const toggleNumberedListCommand = createToggleListCommand(schema.nodes.ordered_list);

type SelectedCodeBlock = {
  node: ProseMirrorNode;
  position: number;
};

const findFirstCodeBlock = (
  matcher: (node: ProseMirrorNode) => boolean,
): SelectedCodeBlock | undefined => {
  if (!view) {
    return undefined;
  }

  let match: SelectedCodeBlock | undefined;
  view.state.doc.descendants((node, position) => {
    if (!matcher(node)) {
      return true;
    }
    match = { node, position };
    return false;
  });
  return match;
};

const findSelectedCodeBlock = (
  matcher: (node: ProseMirrorNode) => boolean,
): SelectedCodeBlock | undefined => {
  if (!view) {
    return undefined;
  }

  const { $from } = view.state.selection;
  for (let depth = $from.depth; depth >= 0; depth -= 1) {
    const node = $from.node(depth);
    if (!matcher(node)) {
      continue;
    }

    const position = depth === 0 ? 0 : $from.before(depth);
    return { node, position };
  }

  return undefined;
};

const replaceCodeBlock = (selectedBlock: SelectedCodeBlock, source: string): boolean => {
  if (!view) {
    return false;
  }

  const normalizedSource = source.trimEnd();
  const content = normalizedSource.length > 0 ? [schema.text(normalizedSource)] : undefined;
  const replacementNode = schema.nodes.code_block.create({ params: TABLE_FENCE_LANGUAGE }, content);

  const transaction = view.state.tr
    .replaceWith(
      selectedBlock.position,
      selectedBlock.position + selectedBlock.node.nodeSize,
      replacementNode,
    )
    .scrollIntoView();
  view.dispatch(transaction);
  return true;
};

const insertMermaidBlock = (): boolean => {
  if (!view) {
    return false;
  }

  const now = Date.now();
  if (now - lastMermaidInsertAt < 150) {
    return false;
  }
  lastMermaidInsertAt = now;

  const content = schema.text('graph TD\n  A[Start] --> B[Finish]');
  const node = schema.nodes.code_block.create({ params: 'mermaid' }, content);
  const transaction = view.state.tr.replaceSelectionWith(node, false).scrollIntoView();
  view.dispatch(transaction);
  setStatus(getString('statusInsertedMermaid'));
  return true;
};

const insertTableBlock = (): boolean => {
  if (!view) {
    return false;
  }

  const content = schema.text(DEFAULT_TABLE_SOURCE);
  const node = schema.nodes.code_block.create({ params: TABLE_FENCE_LANGUAGE }, content);
  const transaction = view.state.tr.replaceSelectionWith(node, false).scrollIntoView();
  view.dispatch(transaction);
  setStatus(getString('statusInsertedTable'));
  return true;
};

const insertCodeBlock = (): boolean => {
  if (!view) {
    return false;
  }

  const node = schema.nodes.code_block.create();
  const transaction = view.state.tr.replaceSelectionWith(node, false).scrollIntoView();
  view.dispatch(transaction);

  setStatus(getString('statusInsertedCodeBlock'));
  return true;
};

const addTableRow = (): boolean => {
  const selectedTable =
    findSelectedCodeBlock(isTableCodeBlockNode) ?? findFirstCodeBlock(isTableCodeBlockNode);
  if (!selectedTable) {
    setStatus(getString('commandFailureAddRowNoTable'));
    return false;
  }

  const table = parseMarkdownTable(selectedTable.node.textContent);
  const columnCount = Math.max(2, table.headers.length);
  table.rows.push(Array.from({ length: columnCount }, () => ''));
  return replaceCodeBlock(selectedTable, serializeMarkdownTable(table));
};

const addTableColumn = (): boolean => {
  const selectedTable =
    findSelectedCodeBlock(isTableCodeBlockNode) ?? findFirstCodeBlock(isTableCodeBlockNode);
  if (!selectedTable) {
    setStatus(getString('commandFailureAddColumnNoTable'));
    return false;
  }

  const table = parseMarkdownTable(selectedTable.node.textContent);
  const nextColumnIndex = table.headers.length + 1;
  table.headers.push(formatString(getString('tableNewColumnHeaderTemplate'), nextColumnIndex));
  for (const row of table.rows) {
    row.push('');
  }
  return replaceCodeBlock(selectedTable, serializeMarkdownTable(table));
};

const requestLinkInput = (): boolean => {
  if (!view) {
    return false;
  }

  const state = withExpandedWordSelection();
  if (!state) {
    return false;
  }

  const { from, to } = state.selection;
  const selectedText = from === to ? undefined : state.doc.textBetween(from, to, ' ');

  vscode.postMessage({
    type: 'view.requestLinkInput',
    payload: {
      selectedText: selectedText?.trim().length ? selectedText.trim() : undefined,
    },
  });
  setStatus(getString('statusAwaitingLinkInput'));
  return true;
};

const insertLinkFromHost = (href: string, text?: string): boolean => {
  if (!view) {
    return false;
  }

  const linkMark = schema.marks.link.create({ href });
  const state = view.state;
  let transaction = state.tr;
  const from = state.selection.from;
  let to = state.selection.to;

  if (state.selection.empty) {
    const label = text && text.trim().length > 0 ? text.trim() : href;
    transaction = transaction.insertText(label, from, to);
    to = from + label.length;
  }

  transaction = transaction.removeMark(from, to, schema.marks.link).addMark(from, to, linkMark);
  transaction = transaction
    .setSelection(TextSelection.create(transaction.doc, to, to))
    .scrollIntoView();
  view.dispatch(transaction);
  setStatus(getString('statusInsertedLink'));
  return true;
};

const executeEditorCommand = (command: ViewEditorCommand): boolean => {
  if (!view) {
    return false;
  }

  switch (command) {
    case 'toggleBold': {
      return runInlineMarkCommand(toggleMark(schema.marks.strong));
    }
    case 'toggleItalic': {
      return runInlineMarkCommand(toggleMark(schema.marks.em));
    }
    case 'setHeading1': {
      return toggleHeadingLevel(1);
    }
    case 'setHeading2': {
      return toggleHeadingLevel(2);
    }
    case 'setHeading3': {
      return toggleHeadingLevel(3);
    }
    case 'setParagraph': {
      return runViewCommand(setBlockType(schema.nodes.paragraph));
    }
    case 'toggleBulletList': {
      return runViewCommand(toggleBulletListCommand);
    }
    case 'toggleNumberedList': {
      return runViewCommand(toggleNumberedListCommand);
    }
    case 'insertLink': {
      if (isMarkActive(schema.marks.link)) {
        const removed = runInlineMarkCommand(toggleMark(schema.marks.link));
        if (removed) {
          setStatus(getString('statusRemovedLink'));
        }
        return removed;
      }
      return requestLinkInput();
    }
    case 'insertMermaidBlock': {
      return insertMermaidBlock();
    }
    case 'insertTable': {
      return insertTableBlock();
    }
    case 'insertCodeBlock': {
      return insertCodeBlock();
    }
    case 'addTableRow': {
      return addTableRow();
    }
    case 'addTableColumn': {
      return addTableColumn();
    }
    default: {
      return false;
    }
  }
};

for (const [command, button] of toolbarButtons.entries()) {
  button.addEventListener('click', () => {
    if (command === 'openRawMarkdown') {
      syncController.flushApply(serializeMarkdownForHost);
      button.classList.add('is-active');
      vscode.postMessage({
        type: 'view.executeCommand',
        payload: { command: 'openRawMarkdown' },
      });
      globalThis.setTimeout(() => {
        updateToolbarPressedState('openRawMarkdown', false);
      }, 600);
      return;
    }

    const executed = executeEditorCommand(command as ViewEditorCommand);
    if (!executed) {
      setStatus(formatCommandFailure(command));
    }
    if (executed && TRANSIENT_ACTIVE_COMMANDS.has(command)) {
      button.classList.add('is-active');
      globalThis.setTimeout(() => {
        updateToolbarState();
      }, 600);
    }
    view?.focus();
  });
}

moreButton?.addEventListener('click', () => {
  advancedActionsVisible = !advancedActionsVisible;
  updateAdvancedToolbarVisibility();
  if (toolbarMode === 'basic' && advancedActionsVisible) {
    getFirstAdvancedToolbarButton()?.focus();
    return;
  }
  moreButton.focus();
});

const updateToolbarPressedState = (command: string, pressed: boolean): void => {
  const button = toolbarButtons.get(command);
  if (!button || !PRESSABLE_TOOLBAR_COMMANDS.has(command)) {
    return;
  }

  button.classList.toggle('is-active', pressed);
  button.setAttribute('aria-pressed', pressed ? 'true' : 'false');
};

const isMarkActive = (markType: MarkType): boolean => {
  if (!view) {
    return false;
  }

  const { state } = view;
  const { from, to, empty, $from } = state.selection;

  if (empty) {
    return !!markType.isInSet(state.storedMarks ?? $from.marks());
  }
  return state.doc.rangeHasMark(from, to, markType);
};

const isListActive = (listNodeType: NodeType): boolean => {
  if (!view) {
    return false;
  }

  const { $from } = view.state.selection;
  for (let depth = $from.depth; depth >= 0; depth -= 1) {
    if ($from.node(depth).type === listNodeType) {
      return true;
    }
  }
  return false;
};

const isSelectionInCodeBlock = (matcher: (node: ProseMirrorNode) => boolean): boolean => {
  if (!view) {
    return false;
  }

  const { $from } = view.state.selection;
  for (let depth = $from.depth; depth >= 0; depth -= 1) {
    const node = $from.node(depth);
    if (matcher(node)) {
      return true;
    }
  }
  return false;
};

const updateToolbarState = (): void => {
  updateToolbarPressedState('toggleBold', isMarkActive(schema.marks.strong));
  updateToolbarPressedState('toggleItalic', isMarkActive(schema.marks.em));
  updateToolbarPressedState('insertLink', isMarkActive(schema.marks.link));

  const headingLevel = getActiveHeadingLevel();
  updateToolbarPressedState('setHeading1', headingLevel === 1);
  updateToolbarPressedState('setHeading2', headingLevel === 2);
  updateToolbarPressedState('setHeading3', headingLevel === 3);
  updateToolbarPressedState('setParagraph', isParagraphActive() && headingLevel === undefined);

  updateToolbarPressedState('toggleBulletList', isListActive(schema.nodes.bullet_list));
  updateToolbarPressedState('toggleNumberedList', isListActive(schema.nodes.ordered_list));
  updateToolbarPressedState('insertTable', isSelectionInCodeBlock(isTableCodeBlockNode));
  updateToolbarPressedState(
    'insertCodeBlock',
    isSelectionInCodeBlock(
      (node) => node.type === schema.nodes.code_block && !isTableCodeBlockNode(node),
    ),
  );
};

const applyHostMarkdown = (hostMarkdown: string): void => {
  const editorMarkdown = wrapTablesForEditor(hostMarkdown);

  if (!view) {
    view = new EditorView(editorContainer, {
      state: parseMarkdown(editorMarkdown),
      nodeViews: {
        code_block: createCodeBlockNodeViewConstructor({ setStatus }),
      },
      dispatchTransaction(transaction) {
        if (!view) {
          return;
        }
        const nextState = view.state.apply(transaction);
        view.updateState(nextState);
        if (transaction.docChanged) {
          syncController.queueApply(serializeMarkdownForHost);
        }
      },
    });
    updateToolbarState();
    schedulePreviewRender();
    return;
  }

  const currentHostMarkdown = serializeMarkdownForHost();
  if (currentHostMarkdown === hostMarkdown) {
    return;
  }

  syncController.withSuppressedSync(() => {
    view?.updateState(parseMarkdown(editorMarkdown));
  });
  updateToolbarState();
  schedulePreviewRender();
};

const detachHostMessageListener = attachHostMessageListener({
  onInit: (payload) => {
    syncController.setRevision(payload.revision);
    mermaidPreview.setEnabled(payload.mermaidEnabled);
    setToolbarMode(payload.toolbarMode);
    applyHostMarkdown(payload.markdown);
    setStatus(getString('statusConnected'));
    view?.focus();
  },
  onDocumentChanged: (payload) => {
    const shouldRetry = syncController.handleHostDocumentChanged(payload.revision);
    applyHostMarkdown(payload.markdown);
    if (shouldRetry) {
      syncController.queueApply(serializeMarkdownForHost);
    }
  },
  onExecuteCommand: (command) => {
    const executed = executeEditorCommand(command);
    if (!executed) {
      setStatus(formatCommandFailure(command));
    }
  },
  onSettingsChanged: (payload) => {
    mermaidPreview.setEnabled(payload.mermaidEnabled);
    setToolbarMode(payload.toolbarMode);
    schedulePreviewRender();
  },
  onInsertLink: (payload) => {
    const inserted = insertLinkFromHost(payload.href, payload.text);
    if (!inserted) {
      setStatus(getString('statusInsertLinkFailed'));
    }
  },
  onError: (payload) => {
    const shouldRetry = syncController.handleHostError();
    setStatus(payload.message);
    if (shouldRetry) {
      syncController.queueApply(serializeMarkdownForHost);
    }
  },
});

window.addEventListener('beforeunload', () => {
  detachHostMessageListener();
  syncController.dispose();
  mermaidPreview.dispose();
});

vscode.postMessage({ type: 'view.ready' });
