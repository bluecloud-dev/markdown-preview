# Migration Guide: `markdown-preview` → `muninn-vscode`

## Scope

This guide covers migration from the deprecated extension listing:

- Old extension ID: `blueclouddev.markdown-preview`
- New extension ID: `blueclouddev.muninn-vscode`

This migration is a **hard break** in v2. There is no compatibility shim.

## What Changed

| Area | Old | New |
| --- | --- | --- |
| Marketplace extension ID | `blueclouddev.markdown-preview` | `blueclouddev.muninn-vscode` |
| Package name | `markdown-preview` | `muninn-vscode` |
| Settings namespace | `markdownReader.*` | `muninn.*` |
| Command namespace | `markdownReader.*` | `muninn.*` |
| Context key namespace | `markdownReader.*` | `muninn.*` |
| Display/category name | `Markdown Preview` / `Markdown Reader` | `Muninn for VS Code` |

## Required Migration Steps

1. Install `blueclouddev.muninn-vscode`.
2. Uninstall `blueclouddev.markdown-preview` after verification.
3. Update user/workspace settings (`settings.json`) from `markdownReader.*` to `muninn.*`.
4. Update custom keybindings and automation scripts from `markdownReader.*` to `muninn.*`.

## Settings Mapping

| Old Setting | New Setting |
| --- | --- |
| `markdownReader.enabled` | `muninn.enabled` |
| `markdownReader.excludePatterns` | `muninn.excludePatterns` |
| `markdownReader.maxFileSize` | `muninn.maxFileSize` |
| `markdownReader.editorAssociations` | `muninn.editorAssociations` |
| `markdownReader.focusMode.enabled` | `muninn.focusMode.enabled` |
| `markdownReader.integrations.mermaid.enabled` | `muninn.integrations.mermaid.enabled` |
| `markdownReader.integrations.math.enabled` | `muninn.integrations.math.enabled` |
| `markdownReader.integrations.plantuml.enabled` | `muninn.integrations.plantuml.enabled` |
| `markdownReader.integrations.plantuml.backend` | `muninn.integrations.plantuml.backend` |
| `markdownReader.frontMatter.formEnabled` | `muninn.frontMatter.formEnabled` |

## Command Mapping Pattern

All command IDs are migrated by prefix replacement:

- `markdownReader.<command>` → `muninn.<command>`

Common examples:

| Old Command | New Command |
| --- | --- |
| `markdownReader.enterEditMode` | `muninn.enterEditMode` |
| `markdownReader.exitEditMode` | `muninn.exitEditMode` |
| `markdownReader.toggleEditMode` | `muninn.toggleEditMode` |
| `markdownReader.inspectConfiguration` | `muninn.inspectConfiguration` |
| `markdownReader.toggleFocusMode` | `muninn.toggleFocusMode` |
| `markdownReader.smartPasteFromClipboard` | `muninn.smartPasteFromClipboard` |
| `markdownReader.formatBold` | `muninn.formatBold` |
| `markdownReader.formatItalic` | `muninn.formatItalic` |
| `markdownReader.formatTaskList` | `muninn.formatTaskList` |
| `markdownReader.formatCodeBlock` | `muninn.formatCodeBlock` |

## Keybinding Migration Example

Before:

```json
{
  "key": "ctrl+alt+t",
  "command": "markdownReader.formatTaskList",
  "when": "editorTextFocus"
}
```

After:

```json
{
  "key": "ctrl+alt+t",
  "command": "muninn.formatTaskList",
  "when": "editorTextFocus"
}
```

## Settings Migration Example

Before:

```json
{
  "markdownReader.enabled": true,
  "markdownReader.focusMode.enabled": false
}
```

After:

```json
{
  "muninn.enabled": true,
  "muninn.focusMode.enabled": false
}
```

## Known Breaking Points

- Existing `markdownReader.*` settings are ignored by `blueclouddev.muninn-vscode`.
- Existing keybindings that reference `markdownReader.*` commands no longer execute.
- Any workspace automation invoking old command IDs must be updated.

## Deprecation Policy

- `blueclouddev.markdown-preview` remains available as a deprecated migration listing for a limited window.
- New features ship only in `blueclouddev.muninn-vscode`.
