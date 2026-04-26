import type { Node as ProseMirrorNode } from 'prosemirror-model';
import type { EditorView } from 'prosemirror-view';
import { isTableCodeBlockNode } from './nodes/table-node-view';
import {
  DEFAULT_TABLE_SOURCE,
  parseMarkdownTable,
  serializeMarkdownTable,
  TABLE_FENCE_LANGUAGE,
} from './tables/markdown-table-utilities';

type SelectedCodeBlock = {
  node: ProseMirrorNode;
  position: number;
};

const findFirstCodeBlock = (
  view: EditorView,
  matcher: (node: ProseMirrorNode) => boolean,
): SelectedCodeBlock | undefined => {
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
  view: EditorView,
  matcher: (node: ProseMirrorNode) => boolean,
): SelectedCodeBlock | undefined => {
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

const replaceCodeBlock = (
  view: EditorView,
  selectedBlock: SelectedCodeBlock,
  source: string,
): boolean => {
  const normalizedSource = source.trimEnd();
  const schema = view.state.schema;
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

export const selectCodeBlockSource = (
  view: EditorView | undefined,
  matcher: (node: ProseMirrorNode) => boolean,
): string | undefined => {
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

export const insertTableBlock = (
  view: EditorView | undefined,
  setStatus: (message: string) => void,
): boolean => {
  if (!view) {
    return false;
  }

  const content = view.state.schema.text(DEFAULT_TABLE_SOURCE);
  const node = view.state.schema.nodes.code_block.create({ params: TABLE_FENCE_LANGUAGE }, content);
  const transaction = view.state.tr.replaceSelectionWith(node, false).scrollIntoView();
  view.dispatch(transaction);
  setStatus('Inserted table.');
  return true;
};

export const addTableRow = (
  view: EditorView | undefined,
  setStatus: (message: string) => void,
): boolean => {
  if (!view) {
    return false;
  }

  const selectedTable =
    findSelectedCodeBlock(view, isTableCodeBlockNode) ??
    findFirstCodeBlock(view, isTableCodeBlockNode);
  if (!selectedTable) {
    setStatus('Insert a table first before adding a row.');
    return false;
  }

  const table = parseMarkdownTable(selectedTable.node.textContent);
  const columnCount = Math.max(2, table.headers.length);
  table.rows.push(Array.from({ length: columnCount }, () => ''));
  const replaced = replaceCodeBlock(view, selectedTable, serializeMarkdownTable(table));
  if (replaced) {
    setStatus('Added table row.');
  }
  return replaced;
};

export const addTableColumn = (
  view: EditorView | undefined,
  setStatus: (message: string) => void,
): boolean => {
  if (!view) {
    return false;
  }

  const selectedTable =
    findSelectedCodeBlock(view, isTableCodeBlockNode) ??
    findFirstCodeBlock(view, isTableCodeBlockNode);
  if (!selectedTable) {
    setStatus('Insert a table first before adding a column.');
    return false;
  }

  const table = parseMarkdownTable(selectedTable.node.textContent);
  const nextColumnIndex = table.headers.length + 1;
  table.headers.push(`Column ${nextColumnIndex}`);
  for (const row of table.rows) {
    row.push('');
  }
  const replaced = replaceCodeBlock(view, selectedTable, serializeMarkdownTable(table));
  if (replaced) {
    setStatus('Added table column.');
  }
  return replaced;
};
