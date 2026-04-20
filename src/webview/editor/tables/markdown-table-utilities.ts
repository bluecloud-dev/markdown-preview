export const TABLE_FENCE_LANGUAGE = 'muninn-table';
export const DEFAULT_TABLE_SOURCE = [
  '| Column 1 | Column 2 |',
  '| --- | --- |',
  '| Value 1 | Value 2 |',
].join('\n');

export type MarkdownTable = {
  headers: string[];
  rows: string[][];
};

export const isTableDelimiterLine = (line: string): boolean => {
  const normalized = line.trim().replace(/^\|/, '').replace(/\|$/, '');
  const cells = normalized.split('|').map((cell) => cell.trim());
  if (cells.length < 2) {
    return false;
  }
  return cells.every((cell) => /^:?-{3,}:?$/.test(cell));
};

const splitTableCells = (line: string): string[] => {
  const normalized = line.trim().replace(/^\|/, '').replace(/\|$/, '');
  return normalized.split('|').map((cell) => cell.trim());
};

const serializeTableRow = (cells: string[]): string => `| ${cells.join(' | ')} |`;

const normalizeTableCellCount = (cells: string[], targetCount: number): string[] => {
  const next = [...cells];
  while (next.length < targetCount) {
    next.push('');
  }
  return next;
};

const normalizeTableDelimiterCell = (cell: string): string => {
  const candidate = cell.trim();
  if (/^:?-{3,}:?$/.test(candidate)) {
    return candidate;
  }
  return '---';
};

export const normalizeTableSource = (source: string): string => {
  const rawLines = source
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (rawLines.length === 0) {
    return DEFAULT_TABLE_SOURCE;
  }

  const hasDelimiter = rawLines.length > 1 && isTableDelimiterLine(rawLines[1]);
  const rawRows = rawLines.map((line) => splitTableCells(line)).filter((cells) => cells.length > 0);
  if (rawRows.length === 0) {
    return DEFAULT_TABLE_SOURCE;
  }

  const columnCount = Math.max(2, ...rawRows.map((cells) => cells.length));
  const headerCells = normalizeTableCellCount(rawRows[0], columnCount).map((cell, index) =>
    cell.length > 0 ? cell : `Column ${index + 1}`,
  );
  const delimiterCells = hasDelimiter
    ? normalizeTableCellCount(rawRows[1] ?? [], columnCount).map((cell) =>
        normalizeTableDelimiterCell(cell),
      )
    : Array.from({ length: columnCount }, () => '---');

  const bodyRows = rawRows
    .slice(hasDelimiter ? 2 : 1)
    .map((cells) => normalizeTableCellCount(cells, columnCount));

  return [
    serializeTableRow(headerCells),
    serializeTableRow(delimiterCells),
    ...bodyRows.map((cells) => serializeTableRow(cells)),
  ].join('\n');
};

export const parseMarkdownTable = (source: string): MarkdownTable => {
  const normalized = normalizeTableSource(source);
  const lines = normalized.split('\n');
  return {
    headers: splitTableCells(lines[0] ?? ''),
    rows: lines.slice(2).map((line) => splitTableCells(line)),
  };
};

export const serializeMarkdownTable = (table: MarkdownTable): string => {
  const columnCount = Math.max(2, table.headers.length, ...table.rows.map((row) => row.length));
  const headerCells = normalizeTableCellCount(table.headers, columnCount).map((cell, index) =>
    cell.length > 0 ? cell : `Column ${index + 1}`,
  );
  const delimiterCells = Array.from({ length: columnCount }, () => '---');
  const bodyRows = table.rows.map((row) => normalizeTableCellCount(row, columnCount));

  return [
    serializeTableRow(headerCells),
    serializeTableRow(delimiterCells),
    ...bodyRows.map((row) => serializeTableRow(row)),
  ].join('\n');
};
