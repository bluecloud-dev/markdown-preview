export type ContentWidthSetting = 'comfortable' | 'full' | number;

export interface ExtensionConfiguration {
  editorAssociations: boolean;
  mermaidEnabled: boolean;
  mermaidAllowInUntrustedWorkspaces: boolean;
  toolbarMode: 'basic' | 'advanced';
  contentWidth: ContentWidthSetting;
  imageDestination: string;
}
