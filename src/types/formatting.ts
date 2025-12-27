export interface FormattingAction {
  id: string;
  label: string;
  icon: string;
  keybinding?: {
    key: string;
    mac: string;
  };
  type: FormattingType;
  config: FormattingConfig;
}

export enum FormattingType {
  Wrap = 'wrap',
  LinePrefix = 'linePrefix',
  Block = 'block',
  Custom = 'custom',
}

export interface FormattingConfig {
  prefix?: string;
  suffix?: string;
  placeholder?: string;
  cycle?: string[];
}
