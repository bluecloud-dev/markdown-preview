# Migration From `markdown-preview`

Muninn is the successor to the deprecated `blueclouddev.markdown-preview` listing.

## Renamed Identifiers

| Area | Old | New |
| --- | --- | --- |
| Marketplace extension ID | `blueclouddev.markdown-preview` | `blueclouddev.muninn-vscode` |
| Package name | `markdown-preview` | `muninn-vscode` |
| Settings namespace | `markdownReader.*` | `muninn.*` |
| Command namespace | `markdownReader.*` | `muninn.*` |

## Current Supported Settings

- `muninn.integrations.mermaid.enabled`
- `muninn.integrations.mermaid.allowInUntrustedWorkspaces`
- `muninn.toolbar.mode`

`markdownReader.editorAssociations` does not have a direct replacement. Muninn now relies on its custom editor contribution instead of rewriting `workbench.editorAssociations`.

## Command Migration

If a command still exists, the namespace changed from `markdownReader.` to `muninn.`.

Examples:

- `markdownReader.inspectConfiguration` -> `muninn.inspectConfiguration`
- `markdownReader.toggleBold` -> `muninn.toggleBold`
- `markdownReader.insertTable` -> `muninn.insertTable`
- `markdownReader.openRawMarkdown` -> `muninn.openRawMarkdown`

## Removed Preview-First Workflow

Older preview-first commands and settings from the legacy extension are not the current Muninn product surface. Muninn is built around a markdown custom editor with a raw-source escape hatch, not a preview-toggle workflow.
