# Command Contracts: Markdown Preview Default

**Date**: 2025-12-23
**Feature**: [../spec.md](../spec.md)

## Overview

This document defines the VS Code commands contributed by the Markdown Preview Default extension. Each command includes its identifier, parameters, return value, and behavior contract.

## Mode Commands

### markdownPreviewDefault.toggleEditMode

Toggles between preview and edit mode for the active markdown file.

| Property | Value |
|----------|-------|
| **Command ID** | `markdownPreviewDefault.toggleEditMode` |
| **Title** | Toggle Edit Mode |
| **Category** | Markdown Preview |
| **Keybinding** | `Ctrl+Shift+V` (Windows/Linux), `Cmd+Shift+V` (macOS) |
| **When Clause** | `editorLangId == markdown` |
| **Icon** | `$(edit)` / `$(check)` |

**Parameters**: None

**Returns**: `Promise<void>`

**Behavior**:
1. If current mode is Preview → Enter Edit mode (split view)
2. If current mode is Edit → Exit to Preview mode
3. Updates context key `markdownPreviewDefault.editMode`

**Error Handling**:
- If no active markdown file: Show warning message
- If file is read-only: Show error message

---

### markdownPreviewDefault.enterEditMode

Explicitly enters edit mode for the active markdown file.

| Property | Value |
|----------|-------|
| **Command ID** | `markdownPreviewDefault.enterEditMode` |
| **Title** | Edit Markdown |
| **Category** | Markdown Preview |
| **When Clause** | `editorLangId == markdown && !markdownPreviewDefault.editMode` |
| **Icon** | `$(edit)` |

**Parameters**: None

**Returns**: `Promise<void>`

**Behavior**:
1. Opens raw editor in primary column
2. Opens live preview to the side
3. Sets context key `markdownPreviewDefault.editMode = true`

---

### markdownPreviewDefault.exitEditMode

Exits edit mode and returns to preview-only mode.

| Property | Value |
|----------|-------|
| **Command ID** | `markdownPreviewDefault.exitEditMode` |
| **Title** | Done Editing |
| **Category** | Markdown Preview |
| **When Clause** | `editorLangId == markdown && markdownPreviewDefault.editMode` |
| **Icon** | `$(check)` |

**Parameters**: None

**Returns**: `Promise<void>`

**Behavior**:
1. Saves the document if dirty
2. Closes the raw editor
3. Opens preview in the primary column
4. Sets context key `markdownPreviewDefault.editMode = false`

---

## Formatting Commands

### markdownPreviewDefault.bold

Applies bold formatting to selected text.

| Property | Value |
|----------|-------|
| **Command ID** | `markdownPreviewDefault.bold` |
| **Title** | Bold |
| **Category** | Markdown Format |
| **Keybinding** | `Ctrl+B` (Windows/Linux), `Cmd+B` (macOS) |
| **When Clause** | `editorLangId == markdown && markdownPreviewDefault.editMode` |
| **Icon** | `$(bold)` |

**Parameters**: None

**Returns**: `Promise<void>`

**Behavior**:
1. If text selected: Wrap with `**`
2. If no selection but cursor on word: Wrap word with `**`
3. If no selection and no word: Insert `**text**` placeholder

---

### markdownPreviewDefault.italic

Applies italic formatting to selected text.

| Property | Value |
|----------|-------|
| **Command ID** | `markdownPreviewDefault.italic` |
| **Title** | Italic |
| **Category** | Markdown Format |
| **Keybinding** | `Ctrl+I` (Windows/Linux), `Cmd+I` (macOS) |
| **When Clause** | `editorLangId == markdown && markdownPreviewDefault.editMode` |
| **Icon** | `$(italic)` |

**Parameters**: None

**Returns**: `Promise<void>`

**Behavior**:
1. If text selected: Wrap with `_`
2. If no selection but cursor on word: Wrap word with `_`
3. If no selection and no word: Insert `_text_` placeholder

---

### markdownPreviewDefault.strikethrough

Applies strikethrough formatting to selected text.

| Property | Value |
|----------|-------|
| **Command ID** | `markdownPreviewDefault.strikethrough` |
| **Title** | Strikethrough |
| **Category** | Markdown Format |
| **When Clause** | `editorLangId == markdown && markdownPreviewDefault.editMode` |
| **Icon** | `$(text-strikethrough)` |

**Parameters**: None

**Returns**: `Promise<void>`

**Behavior**: Wraps selection/word with `~~`

---

### markdownPreviewDefault.bulletList

Toggles bullet list prefix on current line.

| Property | Value |
|----------|-------|
| **Command ID** | `markdownPreviewDefault.bulletList` |
| **Title** | Bullet List |
| **Category** | Markdown Format |
| **When Clause** | `editorLangId == markdown && markdownPreviewDefault.editMode` |
| **Icon** | `$(list-unordered)` |

**Parameters**: None

**Returns**: `Promise<void>`

**Behavior**:
1. If line starts with `- `: Remove prefix
2. If line starts with `1. ` (numbered): Replace with `- `
3. Otherwise: Add `- ` at line start

---

### markdownPreviewDefault.numberedList

Toggles numbered list prefix on current line.

| Property | Value |
|----------|-------|
| **Command ID** | `markdownPreviewDefault.numberedList` |
| **Title** | Numbered List |
| **Category** | Markdown Format |
| **When Clause** | `editorLangId == markdown && markdownPreviewDefault.editMode` |
| **Icon** | `$(list-ordered)` |

**Parameters**: None

**Returns**: `Promise<void>`

**Behavior**:
1. If line starts with `N. ` (any number): Remove prefix
2. If line starts with `- ` (bullet): Replace with `1. `
3. Otherwise: Add `1. ` at line start

---

### markdownPreviewDefault.inlineCode

Wraps selection with inline code backticks.

| Property | Value |
|----------|-------|
| **Command ID** | `markdownPreviewDefault.inlineCode` |
| **Title** | Inline Code |
| **Category** | Markdown Format |
| **When Clause** | `editorLangId == markdown && markdownPreviewDefault.editMode` |
| **Icon** | `$(code)` |

**Parameters**: None

**Returns**: `Promise<void>`

**Behavior**: Wraps selection/word with single backticks (`` ` ``)

---

### markdownPreviewDefault.codeBlock

Wraps selection with code block markers.

| Property | Value |
|----------|-------|
| **Command ID** | `markdownPreviewDefault.codeBlock` |
| **Title** | Code Block |
| **Category** | Markdown Format |
| **When Clause** | `editorLangId == markdown && markdownPreviewDefault.editMode` |
| **Icon** | `$(file-code)` |

**Parameters**: None

**Returns**: `Promise<void>`

**Behavior**:
1. Wraps selection with triple backticks on separate lines
2. Cursor positioned after opening backticks (for language identifier)

---

### markdownPreviewDefault.link

Inserts a markdown link, prompting for URL.

| Property | Value |
|----------|-------|
| **Command ID** | `markdownPreviewDefault.link` |
| **Title** | Insert Link |
| **Category** | Markdown Format |
| **When Clause** | `editorLangId == markdown && markdownPreviewDefault.editMode` |
| **Icon** | `$(link)` |

**Parameters**: None

**Returns**: `Promise<void>`

**Behavior**:
1. Shows input box prompting for URL
2. If text selected: Uses selection as link text
3. If no selection: Uses "link" as placeholder text
4. Inserts `[text](url)` format

---

### markdownPreviewDefault.heading

Cycles through heading levels or shows submenu.

| Property | Value |
|----------|-------|
| **Command ID** | `markdownPreviewDefault.heading` |
| **Title** | Heading |
| **Category** | Markdown Format |
| **When Clause** | `editorLangId == markdown && markdownPreviewDefault.editMode` |
| **Icon** | `$(symbol-class)` |

**Parameters**:
- `level?: number` - Optional heading level (1-3)

**Returns**: `Promise<void>`

**Behavior**:
1. If level specified: Set heading to that level
2. If line has `#`: Cycle through `#` → `##` → `###` → (no heading)
3. Otherwise: Add `# ` at line start

---

### markdownPreviewDefault.heading1 / heading2 / heading3

Set specific heading levels.

| Command ID | Title | Behavior |
|------------|-------|----------|
| `markdownPreviewDefault.heading1` | Heading 1 | Sets line to `# ` |
| `markdownPreviewDefault.heading2` | Heading 2 | Sets line to `## ` |
| `markdownPreviewDefault.heading3` | Heading 3 | Sets line to `### ` |

---

## Menu Contributions

### Editor Title Bar

```json
{
    "menus": {
        "editor/title": [
            {
                "command": "markdownPreviewDefault.enterEditMode",
                "when": "editorLangId == markdown && !markdownPreviewDefault.editMode",
                "group": "navigation"
            },
            {
                "command": "markdownPreviewDefault.exitEditMode",
                "when": "editorLangId == markdown && markdownPreviewDefault.editMode",
                "group": "navigation"
            },
            {
                "command": "markdownPreviewDefault.bold",
                "when": "editorLangId == markdown && markdownPreviewDefault.editMode",
                "group": "1_format"
            },
            {
                "command": "markdownPreviewDefault.italic",
                "when": "editorLangId == markdown && markdownPreviewDefault.editMode",
                "group": "1_format"
            }
        ]
    }
}
```

### Editor Context Menu

```json
{
    "menus": {
        "editor/context": [
            {
                "submenu": "markdownPreviewDefault.formatMenu",
                "when": "editorLangId == markdown && markdownPreviewDefault.editMode",
                "group": "1_modification"
            }
        ]
    },
    "submenus": [
        {
            "id": "markdownPreviewDefault.formatMenu",
            "label": "Format"
        }
    ]
}
```

### Format Submenu

```json
{
    "menus": {
        "markdownPreviewDefault.formatMenu": [
            { "command": "markdownPreviewDefault.bold", "group": "1_inline" },
            { "command": "markdownPreviewDefault.italic", "group": "1_inline" },
            { "command": "markdownPreviewDefault.strikethrough", "group": "1_inline" },
            { "command": "markdownPreviewDefault.inlineCode", "group": "2_code" },
            { "command": "markdownPreviewDefault.codeBlock", "group": "2_code" },
            { "command": "markdownPreviewDefault.bulletList", "group": "3_list" },
            { "command": "markdownPreviewDefault.numberedList", "group": "3_list" },
            { "command": "markdownPreviewDefault.link", "group": "4_insert" },
            {
                "submenu": "markdownPreviewDefault.headingMenu",
                "group": "5_heading"
            }
        ],
        "markdownPreviewDefault.headingMenu": [
            { "command": "markdownPreviewDefault.heading1" },
            { "command": "markdownPreviewDefault.heading2" },
            { "command": "markdownPreviewDefault.heading3" }
        ]
    },
    "submenus": [
        {
            "id": "markdownPreviewDefault.headingMenu",
            "label": "Heading"
        }
    ]
}
```
