export type MarkdownSectionRevealTarget = {
  id: string;
  title: string;
  normalizedTitle: string;
  level: number;
  line: number;
  occurrence: number;
};

export type MarkdownOutlineSection = MarkdownSectionRevealTarget & {
  children: MarkdownOutlineSection[];
};

const normalizeTitle = (title: string): string => {
  const normalized = title.trim().replaceAll(/\s+/g, ' ');
  return normalized.length > 0 ? normalized : 'Section';
};

const slugifyTitle = (title: string): string => {
  const slug = title
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, '-')
    .replaceAll(/^-+|-+$/g, '');
  return slug.length > 0 ? slug : 'section';
};

const stripClosingSequence = (text: string): string => {
  const trimmed = text.trim();
  if (/^#+$/.test(trimmed)) {
    return '';
  }
  return text.replace(/\s+#+\s*$/, '');
};

const parseFenceMarker = (line: string): { character: '`' | '~'; length: number } | undefined => {
  const match = /^\s{0,3}(`{3,}|~{3,})/.exec(line);
  if (!match) {
    return undefined;
  }

  const marker = match[1] ?? '';
  return {
    character: marker[0] as '`' | '~',
    length: marker.length,
  };
};

const closesFence = (line: string, fence: { character: '`' | '~'; length: number }): boolean => {
  const escapedCharacter = fence.character === '`' ? '`' : '~';
  const match = new RegExp(String.raw`^\s{0,3}${escapedCharacter}{${fence.length},}\s*$`).exec(
    line,
  );
  return Boolean(match);
};

const parseAtxHeading = (
  line: string,
): { level: number; title: string; normalizedTitle: string } | undefined => {
  const match = /^\s{0,3}(#{1,6})(?:\s+|$)(.*)$/.exec(line);
  if (!match) {
    return undefined;
  }

  const level = match[1]?.length ?? 1;
  const title = normalizeTitle(stripClosingSequence(match[2] ?? ''));
  return {
    level,
    title,
    normalizedTitle: slugifyTitle(title),
  };
};

export const toSectionRevealTarget = (
  section: MarkdownOutlineSection,
): MarkdownSectionRevealTarget => ({
  id: section.id,
  title: section.title,
  normalizedTitle: section.normalizedTitle,
  level: section.level,
  line: section.line,
  occurrence: section.occurrence,
});

export const flattenMarkdownOutline = (
  sections: readonly MarkdownOutlineSection[],
): MarkdownOutlineSection[] => {
  const flat: MarkdownOutlineSection[] = [];
  const visit = (section: MarkdownOutlineSection): void => {
    flat.push(section);
    for (const child of section.children) {
      visit(child);
    }
  };
  for (const section of sections) {
    visit(section);
  }
  return flat;
};

export const parseMarkdownOutline = (markdown: string): MarkdownOutlineSection[] => {
  const roots: MarkdownOutlineSection[] = [];
  const stack: MarkdownOutlineSection[] = [];
  const occurrenceCounts = new Map<string, number>();
  let fence: { character: '`' | '~'; length: number } | undefined;

  const lines = markdown.split(/\r\n|\r|\n/);
  for (const [lineIndex, line] of lines.entries()) {
    if (fence) {
      if (closesFence(line, fence)) {
        fence = undefined;
      }
      continue;
    }

    const openingFence = parseFenceMarker(line);
    if (openingFence) {
      fence = openingFence;
      continue;
    }

    const heading = parseAtxHeading(line);
    if (!heading) {
      continue;
    }

    const occurrenceKey = `${heading.level}:${heading.normalizedTitle}`;
    const occurrence = occurrenceCounts.get(occurrenceKey) ?? 0;
    occurrenceCounts.set(occurrenceKey, occurrence + 1);

    const section: MarkdownOutlineSection = {
      id: `h${heading.level}-l${lineIndex + 1}-${heading.normalizedTitle}`,
      title: heading.title,
      normalizedTitle: heading.normalizedTitle,
      level: heading.level,
      line: lineIndex,
      occurrence,
      children: [],
    };

    while (stack.length > 0 && (stack.at(-1)?.level ?? 0) >= section.level) {
      stack.pop();
    }

    const parent = stack.at(-1);
    if (parent) {
      parent.children.push(section);
    } else {
      roots.push(section);
    }
    stack.push(section);
  }

  return roots;
};
