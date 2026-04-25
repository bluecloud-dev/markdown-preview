import type { ToolbarMode } from '../../custom-editor/protocol';

export type ToolbarVisibilityOptions = {
  toolbarMode: ToolbarMode;
  focusModeEnabled: boolean;
};

export type ToolbarSelectionState = {
  bold: boolean;
  italic: boolean;
  link: boolean;
  headingLevel?: number;
  paragraph: boolean;
  bulletList: boolean;
  numberedList: boolean;
  table: boolean;
  code: boolean;
};

const BASIC_TOOLBAR_COMMANDS = new Set<string>([
  'toggleBold',
  'toggleItalic',
  'insertLink',
  'setHeading1',
  'setHeading2',
  'setParagraph',
  'insertTable',
  'insertCodeBlock',
  'openRawMarkdown',
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

export const isToolbarCommandVisible = (
  command: string,
  options: ToolbarVisibilityOptions,
): boolean => {
  if (options.focusModeEnabled) {
    return false;
  }

  return options.toolbarMode === 'advanced' || BASIC_TOOLBAR_COMMANDS.has(command);
};

export const getVisibleToolbarCommands = (
  commands: Iterable<string>,
  options: ToolbarVisibilityOptions,
): string[] => [...commands].filter((command) => isToolbarCommandVisible(command, options));

export const isPressableToolbarCommand = (command: string): boolean =>
  PRESSABLE_TOOLBAR_COMMANDS.has(command);

export const isTransientToolbarCommand = (command: string): boolean =>
  TRANSIENT_ACTIVE_COMMANDS.has(command);

export const createEmptySelectionState = (): ToolbarSelectionState => ({
  bold: false,
  italic: false,
  link: false,
  paragraph: false,
  bulletList: false,
  numberedList: false,
  table: false,
  code: false,
});

export const describeSelectionState = (state: ToolbarSelectionState): string => {
  const parts: string[] = [];

  if (state.table) {
    parts.push('Table');
  } else if (state.code) {
    parts.push('Code block');
  } else if (state.headingLevel !== undefined) {
    parts.push(`Heading ${state.headingLevel}`);
  } else if (state.bulletList) {
    parts.push('Bullet list');
  } else if (state.numberedList) {
    parts.push('Numbered list');
  } else if (state.paragraph) {
    parts.push('Paragraph');
  } else {
    parts.push('Document');
  }

  if (state.bold) {
    parts.push('bold');
  }
  if (state.italic) {
    parts.push('italic');
  }
  if (state.link) {
    parts.push('link');
  }

  return `Selection: ${parts.join(', ')}`;
};
