import { setBlockType, toggleMark } from 'prosemirror-commands';
import type { MarkType, Node as ProseMirrorNode, NodeType } from 'prosemirror-model';
import { liftListItem, wrapInList } from 'prosemirror-schema-list';
import { type Command, EditorState, TextSelection } from 'prosemirror-state';
import type { EditorView } from 'prosemirror-view';
import type {
  SectionRevealTarget,
  ViewEditorCommand,
  ViewToHostMessage,
} from '../../custom-editor/protocol';
import { isTableCodeBlockNode } from './nodes/table-node-view';
import {
  addTableColumn,
  addTableRow,
  insertTableBlock,
  selectCodeBlockSource,
} from './table-commands';
import { createEmptySelectionState } from './toolbar-state';
import type { ToolbarSelectionState } from './toolbar-state';

type FormattingCommandControllerOptions = {
  getView: () => EditorView | undefined;
  postMessage: (message: ViewToHostMessage) => void;
  setStatus: (message: string) => void;
  now?: () => number;
};

export type FormattingCommandController = {
  executeEditorCommand: (command: ViewEditorCommand) => boolean;
  getSelectionState: () => ToolbarSelectionState;
  insertLinkFromHost: (href: string, text?: string) => boolean;
  revealSection: (section: SectionRevealTarget) => boolean;
  selectCodeBlockSource: (matcher: (node: ProseMirrorNode) => boolean) => string | undefined;
};

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

const createToggleListCommand = (listType: NodeType, listItemType: NodeType): Command => {
  const liftCommand = liftListItem(listItemType);
  const wrapCommand = wrapInList(listType);
  return (state, dispatch, editorView) =>
    liftCommand(state, dispatch, editorView) || wrapCommand(state, dispatch, editorView);
};

type SelectedAncestorNode = {
  node: ProseMirrorNode;
  position: number;
};

export const createFormattingCommandController = (
  options: FormattingCommandControllerOptions,
): FormattingCommandController => {
  const recentBlockInsertTimes = new Map<ViewEditorCommand, number>();

  const getView = (): EditorView | undefined => options.getView();

  const withExpandedWordSelection = (): EditorState | undefined => {
    const view = getView();
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
    const view = getView();
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
    const view = getView();
    if (!view) {
      return false;
    }
    return command(view.state, view.dispatch, view);
  };

  const findSelectedAncestorNode = (
    matcher: (node: ProseMirrorNode) => boolean,
  ): SelectedAncestorNode | undefined => {
    const view = getView();
    if (!view) {
      return undefined;
    }

    const { $from } = view.state.selection;
    for (let depth = $from.depth; depth >= 0; depth -= 1) {
      const node = $from.node(depth);
      if (!matcher(node)) {
        continue;
      }

      return {
        node,
        position: depth === 0 ? 0 : $from.before(depth),
      };
    }

    return undefined;
  };

  const findSelectedCodeBlock = (): SelectedAncestorNode | undefined => {
    const view = getView();
    if (!view) {
      return undefined;
    }

    return findSelectedAncestorNode((node) => node.type === view.state.schema.nodes.code_block);
  };

  const getActiveHeadingLevel = (): number | undefined => {
    const view = getView();
    if (!view) {
      return undefined;
    }

    const { $from } = view.state.selection;
    for (let depth = $from.depth; depth >= 0; depth -= 1) {
      const node = $from.node(depth);
      if (node.type === view.state.schema.nodes.heading) {
        const level = Number(node.attrs.level);
        return Number.isFinite(level) ? level : 1;
      }
      if (node.type === view.state.schema.nodes.paragraph) {
        return undefined;
      }
    }
    return undefined;
  };

  const isParagraphActive = (): boolean => {
    const view = getView();
    if (!view) {
      return false;
    }
    const { $from } = view.state.selection;
    for (let depth = $from.depth; depth >= 0; depth -= 1) {
      if ($from.node(depth).type === view.state.schema.nodes.paragraph) {
        return true;
      }
    }
    return false;
  };

  const toggleHeadingLevel = (level: 1 | 2 | 3): boolean => {
    const view = getView();
    if (!view) {
      return false;
    }

    const activeLevel = getActiveHeadingLevel();
    if (activeLevel === level) {
      return runViewCommand(setBlockType(view.state.schema.nodes.paragraph));
    }
    return runViewCommand(setBlockType(view.state.schema.nodes.heading, { level }));
  };

  const toggleList = (listType: NodeType): boolean => {
    const view = getView();
    if (!view) {
      return false;
    }
    return runViewCommand(createToggleListCommand(listType, view.state.schema.nodes.list_item));
  };

  const skipRapidBlockInsertRepeat = (command: ViewEditorCommand): boolean => {
    const now = options.now?.() ?? Date.now();
    const lastInsertAt = recentBlockInsertTimes.get(command) ?? 0;
    if (now - lastInsertAt < 500) {
      return true;
    }
    recentBlockInsertTimes.set(command, now);
    return false;
  };

  const insertMermaidBlock = (): boolean => {
    const view = getView();
    if (!view) {
      return false;
    }

    if (skipRapidBlockInsertRepeat('insertMermaidBlock')) {
      return true;
    }

    const content = view.state.schema.text('graph TD\n  A[Start] --> B[Finish]');
    const node = view.state.schema.nodes.code_block.create({ params: 'mermaid' }, content);
    const transaction = view.state.tr.replaceSelectionWith(node, false).scrollIntoView();
    view.dispatch(transaction);
    options.setStatus('Inserted Mermaid block.');
    return true;
  };

  const insertCodeBlock = (): boolean => {
    const view = getView();
    if (!view) {
      return false;
    }

    const node = view.state.schema.nodes.code_block.create();
    const transaction = view.state.tr.replaceSelectionWith(node, false).scrollIntoView();
    view.dispatch(transaction);

    options.setStatus('Inserted code block. Set language from block header.');
    return true;
  };

  const requestLinkInput = (): boolean => {
    const view = getView();
    if (!view) {
      return false;
    }

    const selectedCodeBlock = findSelectedCodeBlock();
    const state = selectedCodeBlock ? view.state : withExpandedWordSelection();
    if (!state) {
      return false;
    }

    const { from, to } = state.selection;
    const selectedText =
      selectedCodeBlock || from === to ? undefined : state.doc.textBetween(from, to, ' ');

    options.postMessage({
      type: 'view.requestLinkInput',
      payload: {
        selectedText: selectedText?.trim().length ? selectedText.trim() : undefined,
      },
    });
    options.setStatus('Awaiting link input...');
    return true;
  };

  const isMarkActive = (markType: MarkType): boolean => {
    const view = getView();
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
    const view = getView();
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
    const view = getView();
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

  const executeEditorCommand = (command: ViewEditorCommand): boolean => {
    const view = getView();
    if (!view) {
      return false;
    }

    const schema = view.state.schema;
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
        if (isParagraphActive()) {
          options.setStatus('Paragraph active.');
          return true;
        }
        return runViewCommand(setBlockType(schema.nodes.paragraph));
      }
      case 'toggleBulletList': {
        return toggleList(schema.nodes.bullet_list);
      }
      case 'toggleNumberedList': {
        return toggleList(schema.nodes.ordered_list);
      }
      case 'insertLink': {
        if (isMarkActive(schema.marks.link)) {
          const removed = runInlineMarkCommand(toggleMark(schema.marks.link));
          if (removed) {
            options.setStatus('Removed link.');
          }
          return removed;
        }
        return requestLinkInput();
      }
      case 'insertMermaidBlock': {
        return insertMermaidBlock();
      }
      case 'insertTable': {
        if (skipRapidBlockInsertRepeat('insertTable')) {
          return true;
        }
        return insertTableBlock(view, options.setStatus);
      }
      case 'insertCodeBlock': {
        if (skipRapidBlockInsertRepeat('insertCodeBlock')) {
          return true;
        }
        return insertCodeBlock();
      }
      case 'addTableRow': {
        return addTableRow(view, options.setStatus);
      }
      case 'addTableColumn': {
        return addTableColumn(view, options.setStatus);
      }
      default: {
        return false;
      }
    }
  };

  const insertLinkFromHost = (href: string, text?: string): boolean => {
    const view = getView();
    if (!view) {
      return false;
    }

    const linkMark = view.state.schema.marks.link.create({ href });
    const state = view.state;
    const selectedCodeBlock = findSelectedCodeBlock();
    if (selectedCodeBlock) {
      const label = text && text.trim().length > 0 ? text.trim() : href;
      const paragraph = state.schema.nodes.paragraph.create(undefined, [
        state.schema.text(label, [linkMark]),
      ]);
      const insertPosition = selectedCodeBlock.position + selectedCodeBlock.node.nodeSize;
      let transaction = state.tr.insert(insertPosition, paragraph);
      transaction = transaction
        .setSelection(TextSelection.create(transaction.doc, insertPosition + 1 + label.length))
        .scrollIntoView();
      view.dispatch(transaction);
      options.setStatus('Inserted link.');
      return true;
    }

    let transaction = state.tr;
    const from = state.selection.from;
    let to = state.selection.to;

    if (state.selection.empty) {
      const label = text && text.trim().length > 0 ? text.trim() : href;
      transaction = transaction.insertText(label, from, to);
      to = from + label.length;
    }

    transaction = transaction
      .removeMark(from, to, view.state.schema.marks.link)
      .addMark(from, to, linkMark);
    transaction = transaction
      .setSelection(TextSelection.create(transaction.doc, to, to))
      .scrollIntoView();
    view.dispatch(transaction);
    options.setStatus('Inserted link.');
    return true;
  };

  const revealSection = (section: SectionRevealTarget): boolean => {
    const view = getView();
    if (!view) {
      return false;
    }

    let matchPosition: number | undefined;
    let occurrence = 0;
    view.state.doc.descendants((node, position) => {
      if (node.type !== view.state.schema.nodes.heading) {
        return true;
      }

      const level = Number(node.attrs.level);
      const title = node.textContent.trim().replaceAll(/\s+/g, ' ') || 'Section';
      const normalizedTitle =
        title
          .toLowerCase()
          .replaceAll(/[^a-z0-9]+/g, '-')
          .replaceAll(/^-+|-+$/g, '') || 'section';

      if (level !== section.level || normalizedTitle !== section.normalizedTitle) {
        return true;
      }

      if (occurrence === section.occurrence) {
        matchPosition = position;
        return false;
      }

      occurrence += 1;
      return true;
    });

    if (matchPosition === undefined) {
      return false;
    }

    const resolvedPosition = view.state.doc.resolve(matchPosition + 1);
    const transaction = view.state.tr
      .setSelection(TextSelection.near(resolvedPosition))
      .scrollIntoView();
    view.dispatch(transaction);
    view.focus();
    options.setStatus(`Revealed ${section.title}.`);
    return true;
  };

  const getSelectionState = (): ToolbarSelectionState => {
    const view = getView();
    if (!view) {
      return createEmptySelectionState();
    }

    const schema = view.state.schema;
    const headingLevel = getActiveHeadingLevel();
    return {
      bold: isMarkActive(schema.marks.strong),
      italic: isMarkActive(schema.marks.em),
      link: isMarkActive(schema.marks.link),
      headingLevel,
      paragraph: isParagraphActive() && headingLevel === undefined,
      bulletList: isListActive(schema.nodes.bullet_list),
      numberedList: isListActive(schema.nodes.ordered_list),
      table: isSelectionInCodeBlock(isTableCodeBlockNode),
      code: isSelectionInCodeBlock(
        (node) => node.type === schema.nodes.code_block && !isTableCodeBlockNode(node),
      ),
    };
  };

  return {
    executeEditorCommand,
    getSelectionState,
    insertLinkFromHost,
    revealSection,
    selectCodeBlockSource: (matcher) => selectCodeBlockSource(getView(), matcher),
  };
};
