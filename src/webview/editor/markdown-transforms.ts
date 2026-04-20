import { isTableDelimiterLine, TABLE_FENCE_LANGUAGE } from './tables/markdown-table-utilities';

const isFenceDelimiterLine = (line: string): boolean => /^\s*(```|~~~)/.test(line);

const isPotentialTableRow = (line: string): boolean => {
  const trimmed = line.trim();
  return trimmed.length > 0 && trimmed.includes('|');
};

export const wrapTablesForEditor = (markdown: string): string => {
  const lines = markdown.split(/\r?\n/);
  const output: string[] = [];
  let lineIndex = 0;
  let insideFence = false;

  while (lineIndex < lines.length) {
    const line = lines[lineIndex];

    if (isFenceDelimiterLine(line)) {
      insideFence = !insideFence;
      output.push(line);
      lineIndex += 1;
      continue;
    }

    if (
      !insideFence &&
      lineIndex + 1 < lines.length &&
      isPotentialTableRow(line) &&
      isTableDelimiterLine(lines[lineIndex + 1])
    ) {
      let blockEnd = lineIndex + 2;
      while (
        blockEnd < lines.length &&
        lines[blockEnd].trim().length > 0 &&
        isPotentialTableRow(lines[blockEnd])
      ) {
        blockEnd += 1;
      }

      const blockSource = lines.slice(lineIndex, blockEnd).join('\n');
      output.push(`\`\`\`${TABLE_FENCE_LANGUAGE}`, blockSource, '```');
      lineIndex = blockEnd;
      continue;
    }

    output.push(line);
    lineIndex += 1;
  }

  return output.join('\n');
};

export const unwrapTablesForHost = (markdown: string): string =>
  markdown.replaceAll(
    /```muninn-table[\t ]*\n([\s\S]*?)\n```/g,
    (_match, tableSource: string) => tableSource,
  );
