export enum ViewMode {
  Preview = 'preview',
  Edit = 'edit',
}

export interface FileState {
  uri: string;
  mode: ViewMode;
  lastModeChange: number;
  editorVisible?: boolean;
  lastSelection?: {
    line: number;
    character: number;
  };
}
