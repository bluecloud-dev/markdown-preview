import type { Node as ProseMirrorNode, Schema } from 'prosemirror-model';
import type { EditorView, NodeView, NodeViewConstructor } from 'prosemirror-view';
import { CODE_LANGUAGE_OPTIONS } from '../../../shared/code-languages';
import type { CodeLanguageOption } from '../../../shared/code-languages';
import { escapeHtml, formatString, getString } from '../localization';
import { sanitizeMermaidSvg } from '../preview';
import { renderMermaidDiagram } from '../renderers/mermaid-renderer';
import {
  normalizeTableSource,
  parseMarkdownTable,
  serializeMarkdownTable,
  TABLE_FENCE_LANGUAGE,
} from '../tables/markdown-table-utilities';
import type { MarkdownTable } from '../tables/markdown-table-utilities';

export {
  DEFAULT_TABLE_SOURCE,
  normalizeTableSource,
  parseMarkdownTable,
  serializeMarkdownTable,
  TABLE_FENCE_LANGUAGE,
} from '../tables/markdown-table-utilities';
export type { MarkdownTable } from '../tables/markdown-table-utilities';

export const isTableCodeBlockNode = (node: ProseMirrorNode): boolean => {
  if (node.type.name !== 'code_block') {
    return false;
  }
  const rawParameters = (node.attrs.params as string | undefined) ?? '';
  return rawParameters.trim().toLowerCase() === TABLE_FENCE_LANGUAGE;
};

const createDefaultCodeBlockNodeView = (node: ProseMirrorNode): NodeView => {
  const dom = document.createElement('pre');
  const code = document.createElement('code');
  dom.append(code);

  const parameters = (node.attrs.params as string | undefined)?.trim();
  if (parameters && parameters.length > 0) {
    dom.dataset.params = parameters;
  }

  return {
    dom,
    contentDOM: code,
  };
};

type TableNodeViewOptions = {
  setStatus: (message: string) => void;
};

const createSourceShortcutHintId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `muninn-table-source-hint-${crypto.randomUUID()}`;
  }
  return `muninn-table-source-hint-${Math.random().toString(36).slice(2)}`;
};

const getCodeBlockLanguage = (node: ProseMirrorNode): string =>
  ((node.attrs.params as string | undefined) ?? '').trim().toLowerCase();

const buildCodeLanguageOptions = (currentLanguage: string): ReadonlyArray<CodeLanguageOption> => {
  const options = [...CODE_LANGUAGE_OPTIONS];
  if (currentLanguage.length > 0 && !options.some((option) => option.value === currentLanguage)) {
    options.push({
      value: currentLanguage,
      label: formatString(getString('codeBlockLanguageUnsupportedTemplate'), currentLanguage),
    });
  }
  return options;
};

const buildReplacementNode = (
  schema: Schema,
  attributes: Record<string, unknown>,
  source: string,
): ProseMirrorNode =>
  schema.nodes.code_block.create(attributes, source.length > 0 ? [schema.text(source)] : undefined);

export const getTableGridAriaLabel = (tableIndex: number, table: MarkdownTable): string =>
  formatString(
    getString('tableGridAriaLabelTemplate'),
    tableIndex,
    table.headers.length,
    table.rows.length,
  );

export const getTableNodeDocumentIndex = (
  documentNode: ProseMirrorNode,
  tablePosition: number,
): number => {
  let tableIndex = 0;
  let matchedIndex: number | undefined;

  documentNode.descendants((node, position) => {
    if (!isTableCodeBlockNode(node)) {
      return true;
    }

    tableIndex += 1;
    if (position !== tablePosition) {
      return true;
    }

    matchedIndex = tableIndex;
    return false;
  });

  return matchedIndex ?? 1;
};

class GenericCodeBlockNodeView implements NodeView {
  readonly dom: HTMLDivElement;
  readonly contentDOM: HTMLElement;

  private readonly header = document.createElement('div');
  private readonly title = document.createElement('strong');
  private readonly languageSelect = document.createElement('select');
  private readonly body = document.createElement('pre');
  private readonly code = document.createElement('code');
  private readonly mermaidPreview = document.createElement('div');
  private renderSerial = 0;
  private renderTimer: ReturnType<typeof setTimeout> | undefined;

  constructor(
    private node: ProseMirrorNode,
    private readonly view: EditorView,
    private readonly getPos: () => number | undefined,
    private readonly options: TableNodeViewOptions,
  ) {
    this.dom = document.createElement('div');
    this.dom.className = 'muninn-code-node';
    this.dom.dataset.testid = 'muninn-code-node';

    this.header.className = 'muninn-code-node-header';
    this.title.textContent = getString('codeBlockTitle');
    this.languageSelect.className = 'muninn-code-node-language';
    this.languageSelect.setAttribute('aria-label', getString('codeBlockLanguageAriaLabel'));
    this.languageSelect.dataset.testid = 'muninn-code-language';
    this.header.append(this.title, this.languageSelect);

    this.body.className = 'muninn-code-node-body';
    this.body.append(this.code);
    this.contentDOM = this.code;
    this.mermaidPreview.className = 'muninn-code-node-mermaid-preview muninn-mermaid-preview-body';
    this.mermaidPreview.hidden = true;

    this.dom.append(this.header, this.body, this.mermaidPreview);
    this.languageSelect.addEventListener('input', () => {
      this.applySelectedLanguage();
    });
    this.languageSelect.addEventListener('change', () => {
      this.applySelectedLanguage();
    });
    this.syncLanguageSelect();
    this.scheduleMermaidPreviewRender();
  }

  update(node: ProseMirrorNode): boolean {
    if (node.type.name !== 'code_block' || isTableCodeBlockNode(node)) {
      return false;
    }
    this.node = node;
    this.syncLanguageSelect();
    this.scheduleMermaidPreviewRender();
    return true;
  }

  stopEvent(event: Event): boolean {
    const target = event.target;
    return target instanceof Node && this.header.contains(target);
  }

  ignoreMutation(): boolean {
    return false;
  }

  destroy(): void {
    if (!this.renderTimer) {
      return;
    }
    clearTimeout(this.renderTimer);
    this.renderTimer = undefined;
  }

  private syncLanguageSelect(): void {
    const currentLanguage = getCodeBlockLanguage(this.node);
    const options = buildCodeLanguageOptions(currentLanguage);

    const fragment = document.createDocumentFragment();
    for (const option of options) {
      const element = document.createElement('option');
      element.value = option.value;
      element.textContent = option.label;
      fragment.append(element);
    }

    this.languageSelect.replaceChildren(fragment);
    this.languageSelect.value = currentLanguage;
  }

  private applySelectedLanguage(): void {
    const selectedLanguage = this.languageSelect.value.trim().toLowerCase();
    const currentLanguage = getCodeBlockLanguage(this.node);
    if (selectedLanguage === currentLanguage) {
      return;
    }

    const position = this.resolveNodePosition();
    if (position === undefined) {
      this.options.setStatus(getString('statusCodeLanguageUpdateFailed'));
      this.syncLanguageSelect();
      return;
    }

    const nextAttributes = {
      ...(this.node.attrs as Record<string, unknown>),
    };
    if (selectedLanguage.length === 0) {
      delete nextAttributes.params;
    } else {
      nextAttributes.params = selectedLanguage;
    }

    const transaction = this.view.state.tr
      .setNodeMarkup(position, undefined, nextAttributes)
      .scrollIntoView();
    this.view.dispatch(transaction);

    if (selectedLanguage.length === 0) {
      this.options.setStatus(getString('statusCodeLanguagePlainText'));
      return;
    }

    const option = buildCodeLanguageOptions(selectedLanguage).find(
      (candidate) => candidate.value === selectedLanguage,
    );
    this.options.setStatus(
      formatString(getString('statusCodeLanguageSetTemplate'), option?.label ?? selectedLanguage),
    );
  }

  private scheduleMermaidPreviewRender(): void {
    if (this.renderTimer) {
      return;
    }

    this.renderTimer = setTimeout(() => {
      this.renderTimer = undefined;
      this.renderSerial += 1;
      void this.renderMermaidPreview(this.renderSerial);
    }, 120);
  }

  private async renderMermaidPreview(serialAtStart: number): Promise<void> {
    if (getCodeBlockLanguage(this.node) !== 'mermaid') {
      this.mermaidPreview.hidden = true;
      this.mermaidPreview.innerHTML = '';
      return;
    }

    const source = this.node.textContent.trim();
    if (source.length === 0) {
      this.mermaidPreview.hidden = true;
      this.mermaidPreview.innerHTML = '';
      return;
    }

    const renderId = `muninn-inline-mermaid-${Date.now()}`;
    const result = await renderMermaidDiagram(source, renderId);
    if (serialAtStart !== this.renderSerial) {
      return;
    }

    this.mermaidPreview.hidden = false;
    if (!result.ok) {
      this.mermaidPreview.innerHTML = `<div class="muninn-mermaid-error">${escapeHtml(result.error)}</div>`;
      return;
    }

    this.mermaidPreview.innerHTML = sanitizeMermaidSvg(result.svg);
  }

  private resolveNodePosition(): number | undefined {
    try {
      const position = this.getPos();
      if (typeof position === 'number') {
        return position;
      }
    } catch {
      // Fallback below handles transient node-view position races.
    }

    let matchedPosition: number | undefined;
    this.view.state.doc.descendants((node, position) => {
      if (node.type.name !== 'code_block' || isTableCodeBlockNode(node)) {
        return true;
      }
      if (!node.eq(this.node)) {
        return true;
      }
      matchedPosition = position;
      return false;
    });
    return matchedPosition;
  }
}

class TableCodeBlockNodeView implements NodeView {
  readonly dom: HTMLDivElement;

  private readonly header = document.createElement('div');
  private readonly actions = document.createElement('div');
  private readonly gridContainer = document.createElement('div');
  private readonly sourceContainer = document.createElement('div');
  private readonly sourceTextarea = document.createElement('textarea');
  private readonly applySourceButton = document.createElement('button');
  private readonly sourceShortcutHint = document.createElement('p');
  private readonly sourceFeedback = document.createElement('div');
  private readonly sourceToggleButton = document.createElement('button');
  private readonly addRowButton = document.createElement('button');
  private readonly addColumnButton = document.createElement('button');
  private readonly deleteTableButton = document.createElement('button');
  private readonly sourceShortcutHintId = createSourceShortcutHintId();

  private sourceVisible = false;
  private sourceDraft = '';
  private sourceDirty = false;
  private normalizedCurrentSource = '';

  constructor(
    private node: ProseMirrorNode,
    private readonly view: EditorView,
    private readonly getPos: () => number | undefined,
    private readonly options: TableNodeViewOptions,
  ) {
    this.dom = document.createElement('div');
    this.dom.className = 'muninn-table-node';
    this.dom.dataset.testid = 'muninn-table-node';

    this.header.className = 'muninn-table-node-header';
    const title = document.createElement('strong');
    title.textContent = getString('tableTitle');

    this.actions.className = 'muninn-table-node-actions';
    this.addRowButton.type = 'button';
    this.addRowButton.textContent = getString('tableAddRowButton');
    this.addColumnButton.type = 'button';
    this.addColumnButton.textContent = getString('tableAddColumnButton');
    this.deleteTableButton.type = 'button';
    this.deleteTableButton.textContent = getString('tableDeleteButton');
    this.deleteTableButton.dataset.testid = 'muninn-table-delete';
    this.deleteTableButton.setAttribute('aria-label', getString('tableDeleteAriaLabel'));
    this.deleteTableButton.classList.add('muninn-button-danger');
    this.sourceToggleButton.type = 'button';
    this.sourceToggleButton.textContent = getString('tableViewSourceButton');
    this.sourceToggleButton.dataset.testid = 'muninn-table-toggle-source';

    this.actions.append(
      this.addRowButton,
      this.addColumnButton,
      this.deleteTableButton,
      this.sourceToggleButton,
    );
    this.header.append(title, this.actions);

    this.gridContainer.className = 'muninn-table-node-grid';

    this.sourceContainer.className = 'muninn-table-node-source';
    this.sourceTextarea.className = 'muninn-table-node-source-text';
    this.sourceTextarea.setAttribute('aria-label', getString('tableSourceAriaLabel'));
    this.sourceTextarea.setAttribute('aria-describedby', this.sourceShortcutHintId);
    this.sourceTextarea.dataset.testid = 'muninn-table-source-text';
    this.applySourceButton.type = 'button';
    this.applySourceButton.textContent = getString('tableApplySourceButton');
    this.applySourceButton.title = getString('tableApplySourceTitle');
    this.applySourceButton.setAttribute('aria-keyshortcuts', 'Control+Enter Meta+Enter');
    this.applySourceButton.dataset.testid = 'muninn-table-apply-source';

    this.sourceShortcutHint.className = 'muninn-table-node-source-hint';
    this.sourceShortcutHint.id = this.sourceShortcutHintId;
    this.sourceShortcutHint.textContent = getString('tableSourceHint');

    this.sourceFeedback.className = 'muninn-table-node-source-feedback';
    this.sourceFeedback.dataset.testid = 'muninn-table-source-feedback';
    this.sourceFeedback.setAttribute('role', 'status');
    this.sourceFeedback.setAttribute('aria-live', 'polite');
    this.sourceFeedback.hidden = true;

    this.sourceContainer.append(
      this.sourceTextarea,
      this.applySourceButton,
      this.sourceShortcutHint,
      this.sourceFeedback,
    );
    this.sourceContainer.hidden = true;
    this.normalizedCurrentSource = normalizeTableSource(this.node.textContent);
    this.sourceDraft = this.normalizedCurrentSource;
    this.sourceTextarea.value = this.sourceDraft;

    this.dom.append(this.header, this.gridContainer, this.sourceContainer);

    this.addRowButton.addEventListener('click', () => {
      this.addRow();
    });
    this.addColumnButton.addEventListener('click', () => {
      this.addColumn();
    });
    this.deleteTableButton.addEventListener('click', () => {
      this.deleteTable();
    });
    this.sourceToggleButton.addEventListener('click', () => {
      this.toggleSourceVisibility();
    });
    this.applySourceButton.addEventListener('click', () => {
      this.applySourceFromTextarea();
    });
    this.sourceTextarea.addEventListener('input', () => {
      this.sourceDraft = this.sourceTextarea.value;
      this.sourceDirty = true;
      this.clearSourceFeedback();
      this.updateApplySourceButtonState();
    });
    this.sourceTextarea.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' || !(event.metaKey || event.ctrlKey)) {
        return;
      }
      event.preventDefault();
      if (this.applySourceButton.disabled) {
        return;
      }
      this.applySourceFromTextarea();
    });

    this.updateApplySourceButtonState();
    this.render();
  }

  update(node: ProseMirrorNode): boolean {
    if (!isTableCodeBlockNode(node)) {
      return false;
    }
    this.node = node;
    this.normalizedCurrentSource = normalizeTableSource(this.node.textContent);
    this.render();
    return true;
  }

  ignoreMutation(): boolean {
    return true;
  }

  stopEvent(event: Event): boolean {
    const target = event.target;
    return target instanceof Node && this.dom.contains(target);
  }

  selectNode(): void {
    this.dom.classList.add('is-selected');
  }

  deselectNode(): void {
    this.dom.classList.remove('is-selected');
  }

  private render(): void {
    const table = parseMarkdownTable(this.node.textContent);
    this.renderGrid(table);

    if (!this.sourceVisible || !this.sourceDirty) {
      this.sourceDraft = this.normalizedCurrentSource;
      this.sourceTextarea.value = this.sourceDraft;
      this.sourceDirty = false;
      this.updateApplySourceButtonState();
    }
  }

  private renderGrid(table: MarkdownTable): void {
    const tableElement = document.createElement('table');
    tableElement.className = 'muninn-table-node-grid-table';
    tableElement.setAttribute(
      'aria-label',
      getTableGridAriaLabel(this.getCurrentTableDocumentIndex(), table),
    );

    const head = document.createElement('thead');
    const headRow = document.createElement('tr');
    for (const [columnIndex, value] of table.headers.entries()) {
      const th = document.createElement('th');
      th.setAttribute('scope', 'col');
      th.append(this.createCellInput(value, -1, columnIndex));
      headRow.append(th);
    }
    head.append(headRow);
    tableElement.append(head);

    const body = document.createElement('tbody');
    for (const [rowIndex, row] of table.rows.entries()) {
      const tr = document.createElement('tr');
      for (const [columnIndex, value] of row.entries()) {
        const td = document.createElement('td');
        td.append(this.createCellInput(value, rowIndex, columnIndex));
        tr.append(td);
      }
      body.append(tr);
    }
    tableElement.append(body);

    this.gridContainer.replaceChildren(tableElement);
  }

  private createCellInput(value: string, rowIndex: number, columnIndex: number): HTMLInputElement {
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'muninn-table-node-cell';
    input.setAttribute(
      'aria-label',
      rowIndex < 0
        ? formatString(getString('tableHeaderColumnLabelTemplate'), columnIndex + 1)
        : formatString(getString('tableRowColumnLabelTemplate'), rowIndex + 1, columnIndex + 1),
    );
    input.value = value;
    input.addEventListener('change', () => {
      this.updateCell(rowIndex, columnIndex, input.value);
    });
    input.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter') {
        return;
      }
      event.preventDefault();
      input.blur();
    });
    return input;
  }

  private updateCell(rowIndex: number, columnIndex: number, value: string): void {
    const table = parseMarkdownTable(this.node.textContent);
    if (rowIndex < 0) {
      table.headers[columnIndex] = value;
    } else {
      if (!table.rows[rowIndex]) {
        return;
      }
      table.rows[rowIndex][columnIndex] = value;
    }
    this.applyTable(table, getString('statusTableUpdated'));
  }

  private addRow(): void {
    const table = parseMarkdownTable(this.node.textContent);
    const columnCount = Math.max(2, table.headers.length);
    table.rows.push(Array.from({ length: columnCount }, () => ''));
    this.applyTable(table, getString('statusTableRowAdded'));
  }

  private addColumn(): void {
    const table = parseMarkdownTable(this.node.textContent);
    const nextColumn = table.headers.length + 1;
    table.headers.push(formatString(getString('tableNewColumnHeaderTemplate'), nextColumn));
    for (const row of table.rows) {
      row.push('');
    }
    this.applyTable(table, getString('statusTableColumnAdded'));
  }

  private deleteTable(): void {
    const position = this.resolveNodePosition();
    if (position === undefined) {
      this.options.setStatus(getString('statusTableDeleteFailed'));
      return;
    }

    const transaction = this.view.state.tr.deleteRange(position, position + this.node.nodeSize);
    this.view.dispatch(transaction.scrollIntoView());
    this.options.setStatus(getString('statusTableDeleted'));
  }

  private toggleSourceVisibility(): void {
    this.setSourceVisibility(!this.sourceVisible);
  }

  private setSourceVisibility(visible: boolean): void {
    this.sourceVisible = visible;
    this.dom.classList.toggle('is-source-visible', visible);
    this.sourceContainer.hidden = !visible;
    this.gridContainer.hidden = visible;
    this.sourceToggleButton.textContent = visible
      ? getString('tableBackToPreviewButton')
      : getString('tableViewSourceButton');
    if (visible) {
      this.sourceDraft = this.normalizedCurrentSource;
      this.sourceTextarea.value = this.sourceDraft;
      this.sourceDirty = false;
      this.clearSourceFeedback();
      this.updateApplySourceButtonState();
      return;
    }

    this.clearSourceFeedback();
    this.updateApplySourceButtonState();
  }

  private applySourceFromTextarea(): void {
    const normalized = normalizeTableSource(this.sourceDraft);
    if (normalized !== this.normalizedCurrentSource) {
      const applied = this.applySource(normalized, getString('statusTableSourceApplied'));
      if (!applied) {
        this.setSourceFeedback('error', getString('statusTableSourceApplyFailed'));
        return;
      }

      this.setSourceFeedback('success', getString('statusTableSourceApplied'));
    }

    this.sourceDraft = normalized;
    this.sourceDirty = false;
    this.sourceTextarea.value = normalized;
    this.setSourceVisibility(false);
  }

  private applyTable(table: MarkdownTable, statusMessage: string): void {
    this.applySource(serializeMarkdownTable(table), statusMessage);
  }

  private applySource(source: string, statusMessage: string): boolean {
    const nextSource = normalizeTableSource(source);
    const position = this.resolveNodePosition();
    if (position === undefined) {
      this.options.setStatus(getString('statusTableSourceApplyFailed'));
      return false;
    }

    const attributes = {
      ...(this.node.attrs as Record<string, unknown>),
      params: TABLE_FENCE_LANGUAGE,
    };
    const replacement = buildReplacementNode(this.node.type.schema, attributes, nextSource);
    const transaction = this.view.state.tr
      .replaceWith(position, position + this.node.nodeSize, replacement)
      .scrollIntoView();
    this.view.dispatch(transaction);
    this.options.setStatus(statusMessage);
    return true;
  }

  private getCurrentTableDocumentIndex(): number {
    const position = this.resolveCurrentNodePosition();
    if (position === undefined) {
      return 1;
    }

    return getTableNodeDocumentIndex(this.view.state.doc, position);
  }

  private resolveCurrentNodePosition(): number | undefined {
    try {
      const position = this.getPos();
      if (typeof position === 'number') {
        return position;
      }
    } catch {
      // Fallback below handles transient node-view position races.
    }

    let matchedPosition: number | undefined;
    this.view.state.doc.descendants((node, position) => {
      if (!isTableCodeBlockNode(node) || !node.eq(this.node)) {
        return true;
      }

      matchedPosition = position;
      return false;
    });
    return matchedPosition;
  }

  private resolveNodePosition(): number | undefined {
    const currentPosition = this.resolveCurrentNodePosition();
    if (currentPosition !== undefined) {
      return currentPosition;
    }

    let matchedPosition: number | undefined;
    let firstTablePosition: number | undefined;
    this.view.state.doc.descendants((node, position) => {
      if (!isTableCodeBlockNode(node)) {
        return true;
      }
      if (firstTablePosition === undefined) {
        firstTablePosition = position;
      }
      if (!node.eq(this.node)) {
        return true;
      }

      matchedPosition = position;
      return false;
    });
    return matchedPosition ?? firstTablePosition;
  }

  private updateApplySourceButtonState(): void {
    const normalizedDraft = normalizeTableSource(this.sourceDraft);
    this.applySourceButton.disabled =
      !this.sourceVisible || normalizedDraft === this.normalizedCurrentSource;
  }

  private clearSourceFeedback(): void {
    this.sourceFeedback.hidden = true;
    this.sourceFeedback.textContent = '';
    this.sourceFeedback.classList.remove('is-success', 'is-error');
  }

  private setSourceFeedback(kind: 'success' | 'error', message: string): void {
    this.sourceFeedback.hidden = false;
    this.sourceFeedback.textContent = message;
    this.sourceFeedback.classList.toggle('is-success', kind === 'success');
    this.sourceFeedback.classList.toggle('is-error', kind === 'error');
  }
}

export const createCodeBlockNodeViewConstructor = (
  options: TableNodeViewOptions,
): NodeViewConstructor => {
  return (node, view, getPos) => {
    if (node.type.name !== 'code_block' || typeof getPos !== 'function') {
      return createDefaultCodeBlockNodeView(node);
    }

    if (isTableCodeBlockNode(node)) {
      return new TableCodeBlockNodeView(node, view, getPos, options);
    }

    return new GenericCodeBlockNodeView(node, view, getPos, options);
  };
};
