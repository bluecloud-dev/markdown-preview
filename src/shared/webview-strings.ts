export type WebviewStrings = {
  headerBrandName: string;
  headerBrandRole: string;
  headerHelp: string;
  toolbarAriaLabel: string;
  toolbarGroupTextLabel: string;
  toolbarGroupStructureLabel: string;
  toolbarGroupInsertLabel: string;
  toolbarButtonBoldTitle: string;
  toolbarButtonItalicTitle: string;
  toolbarButtonLinkTitle: string;
  toolbarButtonHeading1Title: string;
  toolbarButtonHeading2Title: string;
  toolbarButtonHeading3Title: string;
  toolbarButtonHeading1Label: string;
  toolbarButtonHeading2Label: string;
  toolbarButtonHeading3Label: string;
  toolbarButtonParagraphTitle: string;
  toolbarButtonBulletTitle: string;
  toolbarButtonNumberedTitle: string;
  toolbarButtonBulletLabel: string;
  toolbarButtonNumberedLabel: string;
  toolbarButtonTableTitle: string;
  toolbarButtonCodeTitle: string;
  toolbarButtonMermaidTitle: string;
  toolbarButtonSourceTitle: string;
  toolbarButtonMermaidLabel: string;
  toolbarButtonSourceLabel: string;
  toolbarMoreLabel: string;
  toolbarMoreTitle: string;
  mermaidPreviewTitle: string;
  mermaidPreviewAriaLabel: string;
  statusReady: string;
  commandLabelBold: string;
  commandLabelItalic: string;
  commandLabelHeading1: string;
  commandLabelHeading2: string;
  commandLabelHeading3: string;
  commandLabelParagraph: string;
  commandLabelBulletList: string;
  commandLabelNumberedList: string;
  commandLabelLink: string;
  commandLabelMermaidDiagram: string;
  commandLabelTable: string;
  commandLabelCodeBlock: string;
  commandLabelAddTableRow: string;
  commandLabelAddTableColumn: string;
  commandLabelSourceEditor: string;
  commandFailureAddRowNoTable: string;
  commandFailureAddColumnNoTable: string;
  commandFailureGenericTemplate: string;
  statusInsertedMermaid: string;
  statusInsertedTable: string;
  statusInsertedCodeBlock: string;
  statusAwaitingLinkInput: string;
  statusInsertedLink: string;
  statusRemovedLink: string;
  statusConnected: string;
  statusInsertLinkFailed: string;
  codeBlockTitle: string;
  codeBlockLanguageAriaLabel: string;
  codeBlockLanguageUnsupportedTemplate: string;
  statusCodeLanguageUpdateFailed: string;
  statusCodeLanguagePlainText: string;
  statusCodeLanguageSetTemplate: string;
  frontMatterLabel: string;
  frontMatterAriaLabel: string;
  tableTitle: string;
  tableAddRowButton: string;
  tableAddColumnButton: string;
  tableDeleteButton: string;
  tableDeleteAriaLabel: string;
  tableViewSourceButton: string;
  tableSourceAriaLabel: string;
  tableApplySourceButton: string;
  tableApplySourceTitle: string;
  tableSourceHint: string;
  tableGridAriaLabelTemplate: string;
  tableHeaderColumnLabelTemplate: string;
  tableNewColumnHeaderTemplate: string;
  tableRowColumnLabelTemplate: string;
  statusTableUpdated: string;
  statusTableRowAdded: string;
  statusTableColumnAdded: string;
  statusTableDeleteFailed: string;
  statusTableDeleted: string;
  tableBackToPreviewButton: string;
  statusTableSourceApplied: string;
  statusTableSourceApplyFailed: string;
  mermaidDisabledMessage: string;
  mermaidNoSvgOutput: string;
  mermaidDiagramAriaLabel: string;
  mermaidDiagramAriaLabelTemplate: string;
  statusMermaidPreviewShown: string;
  statusMermaidPreviewHidden: string;
};

export const DEFAULT_WEBVIEW_STRINGS: WebviewStrings = {
  headerBrandName: 'Muninn',
  headerBrandRole: 'Markdown editor',
  headerHelp: 'Use Source to open raw Markdown in VS Code.',
  toolbarAriaLabel: 'Muninn markdown toolbar',
  toolbarGroupTextLabel: 'Text',
  toolbarGroupStructureLabel: 'Structure',
  toolbarGroupInsertLabel: 'Insert',
  toolbarButtonBoldTitle: 'Bold (Ctrl/Cmd+B)',
  toolbarButtonItalicTitle: 'Italic (Ctrl/Cmd+I)',
  toolbarButtonLinkTitle: 'Insert or remove link',
  toolbarButtonHeading1Title: 'Heading 1',
  toolbarButtonHeading2Title: 'Heading 2',
  toolbarButtonHeading3Title: 'Heading 3',
  toolbarButtonHeading1Label: 'H1',
  toolbarButtonHeading2Label: 'H2',
  toolbarButtonHeading3Label: 'H3',
  toolbarButtonParagraphTitle: 'Paragraph',
  toolbarButtonBulletTitle: 'Toggle bullet list',
  toolbarButtonNumberedTitle: 'Toggle numbered list',
  toolbarButtonBulletLabel: 'Bullet',
  toolbarButtonNumberedLabel: 'Numbered',
  toolbarButtonTableTitle: 'Insert table (Ctrl/Cmd+Alt+T)',
  toolbarButtonCodeTitle: 'Insert code block',
  toolbarButtonMermaidTitle: 'Insert Mermaid diagram (Ctrl/Cmd+Alt+M)',
  toolbarButtonSourceTitle: 'Open raw Markdown source in VS Code',
  toolbarButtonMermaidLabel: 'Mermaid',
  toolbarButtonSourceLabel: 'Source',
  toolbarMoreLabel: 'More',
  toolbarMoreTitle: 'Show advanced toolbar actions',
  mermaidPreviewTitle: 'Mermaid Preview',
  mermaidPreviewAriaLabel: 'Mermaid diagram preview',
  statusReady: 'Ready',
  commandLabelBold: 'Bold',
  commandLabelItalic: 'Italic',
  commandLabelHeading1: 'Heading 1',
  commandLabelHeading2: 'Heading 2',
  commandLabelHeading3: 'Heading 3',
  commandLabelParagraph: 'Paragraph',
  commandLabelBulletList: 'Bullet list',
  commandLabelNumberedList: 'Numbered list',
  commandLabelLink: 'Link',
  commandLabelMermaidDiagram: 'Mermaid diagram',
  commandLabelTable: 'Table',
  commandLabelCodeBlock: 'Code block',
  commandLabelAddTableRow: 'Add table row',
  commandLabelAddTableColumn: 'Add table column',
  commandLabelSourceEditor: 'Source editor',
  commandFailureAddRowNoTable: 'Insert a table first before adding a row.',
  commandFailureAddColumnNoTable: 'Insert a table first before adding a column.',
  commandFailureGenericTemplate:
    'Could not run {0}. Place the cursor in editable text and try again.',
  statusInsertedMermaid: 'Inserted Mermaid block.',
  statusInsertedTable: 'Inserted table.',
  statusInsertedCodeBlock: 'Inserted code block. Set language from block header.',
  statusAwaitingLinkInput: 'Awaiting link input…',
  statusInsertedLink: 'Inserted link.',
  statusRemovedLink: 'Removed link.',
  statusConnected: 'Connected',
  statusInsertLinkFailed: 'Failed to insert link.',
  codeBlockTitle: 'Code',
  codeBlockLanguageAriaLabel: 'Code block language',
  codeBlockLanguageUnsupportedTemplate: 'Unsupported ({0})',
  statusCodeLanguageUpdateFailed: 'Could not update code block language. Please retry.',
  statusCodeLanguagePlainText: 'Code block language set to plain text.',
  statusCodeLanguageSetTemplate: 'Code block language set to {0}.',
  frontMatterLabel: 'Front matter',
  frontMatterAriaLabel: 'Front matter metadata block',
  tableTitle: 'Table',
  tableAddRowButton: 'Add Row',
  tableAddColumnButton: 'Add Column',
  tableDeleteButton: 'Delete',
  tableDeleteAriaLabel: 'Delete table',
  tableViewSourceButton: 'View Source',
  tableSourceAriaLabel: 'Markdown table source',
  tableApplySourceButton: 'Apply Source',
  tableApplySourceTitle: 'Apply source (Ctrl/Cmd+Enter)',
  tableSourceHint: 'Edit Markdown table source. Press Ctrl/Cmd+Enter to apply changes.',
  tableGridAriaLabelTemplate: 'Table {0}: {1} columns, {2} rows',
  tableHeaderColumnLabelTemplate: 'Header column {0}',
  tableNewColumnHeaderTemplate: 'Column {0}',
  tableRowColumnLabelTemplate: 'Row {0} column {1}',
  statusTableUpdated: 'Table updated.',
  statusTableRowAdded: 'Added table row.',
  statusTableColumnAdded: 'Added table column.',
  statusTableDeleteFailed: 'Could not delete table. Please retry.',
  statusTableDeleted: 'Deleted table.',
  tableBackToPreviewButton: 'Back to Preview',
  statusTableSourceApplied: 'Applied table source.',
  statusTableSourceApplyFailed: 'Could not apply table source. Please retry.',
  mermaidDisabledMessage:
    'Mermaid preview is disabled for this workspace. Enable muninn.integrations.mermaid.enabled and trust the workspace, or allow Mermaid in restricted workspaces.',
  mermaidNoSvgOutput: 'Mermaid rendered no SVG output.',
  mermaidDiagramAriaLabel: 'Mermaid diagram',
  mermaidDiagramAriaLabelTemplate: 'Mermaid diagram: {0}',
  statusMermaidPreviewShown: 'Diagram preview shown',
  statusMermaidPreviewHidden: 'Diagram preview hidden',
};
