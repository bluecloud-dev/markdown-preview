# Research: Markdown Reader Extension

**Date**: 2025-12-24 | **Updated**: 2025-12-24
**Feature**: [spec.md](./spec.md)
**Plan**: [plan.md](./plan.md)

## Executive Summary

This document captures research findings for implementing the "Markdown Reader" VS Code extension that opens markdown files in preview mode by default. The research confirms that VS Code provides all necessary APIs to implement the required functionality using native markdown preview commands, editor management, and text manipulation APIs. All NEEDS CLARIFICATION items from the plan have been resolved.

## 1. Extension Activation and File Interception

### Activation Events

VS Code supports language-specific activation via `onLanguage` event:

```json
"activationEvents": [
    "onLanguage:markdown"
]
```

This triggers extension activation when any markdown file is opened, providing the hook point for intercepting file opens.

### Document Open Detection

Use `workspace.onDidOpenTextDocument` to detect when files are opened:

```typescript
vscode.workspace.onDidOpenTextDocument((document) => {
    if (document.languageId === 'markdown') {
        // Intercept and show preview
    }
});
```

**Important**: This event fires for all document opens, including background operations. Need to filter for user-initiated opens by checking if the document is visible in an editor.

### Alternative: Custom Editor (Not Recommended)

VS Code supports custom editors via `customEditors` contribution point. However, this would replace VS Code's native markdown handling entirely, violating Constitution Principle II (Native Integration). **Decision**: Use document open detection instead.

## 2. Native Markdown Preview Commands

VS Code's built-in markdown extension exposes commands that can be executed programmatically:

| Command | Description |
|---------|-------------|
| `markdown.showPreview` | Opens preview in current column |
| `markdown.showPreviewToSide` | Opens preview to the side |
| `markdown.showLockedPreviewToSide` | Opens locked preview to the side |

### Executing Preview Commands

```typescript
import * as vscode from 'vscode';

async function showMarkdownPreview(uri: vscode.Uri) {
    await vscode.commands.executeCommand('markdown.showPreview', uri);
}

async function showPreviewToSide(uri: vscode.Uri) {
    await vscode.commands.executeCommand('markdown.showPreviewToSide', uri);
}
```

### Closing the Raw Editor

After opening preview, close the raw markdown editor to achieve "preview by default":

```typescript
await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
```

**Sequence for Preview-by-Default**:
1. Detect markdown file open via `onDidOpenTextDocument`
2. Execute `markdown.showPreview` to open preview
3. Close the raw editor that triggered the open

## 3. Editor Groups and Split View

### ViewColumn Enumeration

VS Code organizes editors into columns (groups):

| ViewColumn | Description |
|------------|-------------|
| `Active` (-1) | Currently active column |
| `Beside` (-2) | Column beside the active one |
| `One` (1) | First column |
| `Two` (2) | Second column |
| ... | Up to Nine (9) |

### Opening Documents in Specific Columns

```typescript
async function showTextDocumentInColumn(
    document: vscode.TextDocument,
    column: vscode.ViewColumn
) {
    await vscode.window.showTextDocument(document, {
        viewColumn: column,
        preserveFocus: false
    });
}
```

### Split View for Edit Mode

For edit mode (raw editor on top, preview on bottom), use:

```typescript
async function enterEditMode(uri: vscode.Uri) {
    // Open raw editor in first column
    const document = await vscode.workspace.openTextDocument(uri);
    await vscode.window.showTextDocument(document, {
        viewColumn: vscode.ViewColumn.One,
        preserveFocus: false
    });

    // Open preview to the side (will create second column)
    await vscode.commands.executeCommand('markdown.showPreviewToSide');
}
```

**Note**: VS Code's built-in preview updates automatically when the source document changes (live preview).

## 4. Text Editing and Formatting

### TextEditor Edit API

The primary API for text manipulation:

```typescript
await editor.edit(editBuilder => {
    // Insert text
    editBuilder.insert(position, 'text');

    // Replace range
    editBuilder.replace(selection, 'new text');

    // Delete range
    editBuilder.delete(range);
});
```

### Formatting Implementation Patterns

**Bold** (`**text**`):
```typescript
function applyBold(editor: vscode.TextEditor) {
    const selection = editor.selection;
    const text = editor.document.getText(selection);
    editor.edit(editBuilder => {
        editBuilder.replace(selection, `**${text}**`);
    });
}
```

**Wrap with Markers** (generic):
```typescript
function wrapWithMarkers(
    editor: vscode.TextEditor,
    prefix: string,
    suffix: string
) {
    const selection = editor.selection;
    if (selection.isEmpty) {
        // No selection - wrap word at cursor or insert placeholder
        const wordRange = editor.document.getWordRangeAtPosition(selection.active);
        if (wordRange) {
            const word = editor.document.getText(wordRange);
            editor.edit(e => e.replace(wordRange, `${prefix}${word}${suffix}`));
        } else {
            editor.edit(e => e.insert(selection.active, `${prefix}text${suffix}`));
        }
    } else {
        const text = editor.document.getText(selection);
        editor.edit(e => e.replace(selection, `${prefix}${text}${suffix}`));
    }
}
```

**Toggle Line Prefix** (lists, headings):
```typescript
function toggleLinePrefix(editor: vscode.TextEditor, prefix: string) {
    const line = editor.document.lineAt(editor.selection.active.line);
    const lineText = line.text;

    editor.edit(editBuilder => {
        if (lineText.startsWith(prefix)) {
            // Remove prefix
            editBuilder.replace(
                new vscode.Range(line.range.start, line.range.start.translate(0, prefix.length)),
                ''
            );
        } else {
            // Add prefix
            editBuilder.insert(line.range.start, prefix);
        }
    });
}
```

## 5. Configuration APIs

### Defining Extension Settings

In `package.json`:

```json
{
    "contributes": {
        "configuration": {
            "title": "Markdown Preview Default",
            "properties": {
                "markdownReader.enabled": {
                    "type": "boolean",
                    "default": true,
                    "description": "Enable preview-by-default behavior"
                },
                "markdownReader.excludePatterns": {
                    "type": "array",
                    "items": { "type": "string" },
                    "default": ["**/node_modules/**", "**/.git/**"],
                    "description": "Glob patterns for files to exclude from auto-preview"
                }
            }
        }
    }
}
```

### Reading Configuration

```typescript
function getConfig() {
    const config = vscode.workspace.getConfiguration('markdownReader');
    return {
        enabled: config.get<boolean>('enabled', true),
        excludePatterns: config.get<string[]>('excludePatterns', [])
    };
}
```

### Workspace vs Global Settings

Configuration supports multiple scopes:
- **Global**: User settings (applies everywhere)
- **Workspace**: `.vscode/settings.json` (project-specific)
- **Workspace Folder**: Multi-root workspace folder settings

```typescript
// Check if setting is workspace-scoped
const inspection = config.inspect('enabled');
const isWorkspaceOverridden = inspection?.workspaceValue !== undefined;
```

## 6. "When" Clause Contexts

### Built-in Context Keys

Relevant contexts for conditional UI:

| Context Key | Description |
|-------------|-------------|
| `editorLangId` | Language ID of active editor (e.g., `markdown`) |
| `resourceLangId` | Language ID of active resource |
| `resourceFilename` | Filename of active resource |
| `activeEditor` | Identifier of active editor |
| `editorIsOpen` | True if any editor is open |

### Custom Context Keys

Extensions can set custom context values:

```typescript
// Set custom context
vscode.commands.executeCommand('setContext', 'markdownReader.editMode', true);

// Clear context
vscode.commands.executeCommand('setContext', 'markdownReader.editMode', false);
```

### Using in package.json

```json
{
    "contributes": {
        "menus": {
            "editor/title": [
                {
                    "command": "markdownReader.edit",
                    "when": "editorLangId == markdown && !markdownReader.editMode",
                    "group": "navigation"
                },
                {
                    "command": "markdownReader.done",
                    "when": "editorLangId == markdown && markdownReader.editMode",
                    "group": "navigation"
                }
            ],
            "commandPalette": [
                {
                    "command": "markdownReader.bold",
                    "when": "editorLangId == markdown && markdownReader.editMode"
                }
            ]
        }
    }
}
```

## 7. Contribution Points

### Commands

```json
{
    "contributes": {
        "commands": [
            {
                "command": "markdownReader.toggleEditMode",
                "title": "Toggle Edit Mode",
                "category": "Markdown Preview",
                "icon": "$(edit)"
            }
        ]
    }
}
```

### Keybindings

```json
{
    "contributes": {
        "keybindings": [
            {
                "command": "markdownReader.toggleEditMode",
                "key": "ctrl+shift+v",
                "mac": "cmd+shift+v",
                "when": "editorLangId == markdown"
            },
            {
                "command": "markdownReader.bold",
                "key": "ctrl+b",
                "mac": "cmd+b",
                "when": "editorLangId == markdown && markdownReader.editMode"
            }
        ]
    }
}
```

### Context Menus

```json
{
    "contributes": {
        "menus": {
            "editor/context": [
                {
                    "submenu": "markdownReader.format",
                    "group": "1_modification",
                    "when": "editorLangId == markdown && markdownReader.editMode"
                }
            ]
        },
        "submenus": [
            {
                "id": "markdownReader.format",
                "label": "Format"
            }
        ]
    }
}
```

## 8. Edge Cases and Solutions

### Large Files (>1MB)

Check file size before auto-preview:

```typescript
const stats = await vscode.workspace.fs.stat(uri);
const fileSizeInMB = stats.size / (1024 * 1024);

if (fileSizeInMB > 1) {
    // Show info message with option to preview manually
    const action = await vscode.window.showInformationMessage(
        'Large markdown file detected. Preview may be slow.',
        'Open Preview Anyway',
        'Open as Text'
    );
    if (action === 'Open Preview Anyway') {
        await vscode.commands.executeCommand('markdown.showPreview', uri);
    }
    // Otherwise, let the raw editor stay open
}
```

### Diff Views

Check if document is in diff mode:

```typescript
// Skip if in diff editor
if (vscode.window.activeTextEditor?.viewColumn === undefined) {
    // Likely a diff view, skip
    return;
}
```

### Untitled Documents

New untitled markdown files should open in edit mode:

```typescript
if (document.isUntitled) {
    // Skip preview-by-default for new files
    return;
}
```

### Git Conflict Markers

Detect conflict markers and stay in edit mode:

```typescript
const content = document.getText();
const hasConflicts = content.includes('<<<<<<<') &&
                     content.includes('=======') &&
                     content.includes('>>>>>>>');

if (hasConflicts) {
    // Stay in edit mode for conflict resolution
    return;
}
```

## 9. Testing Strategy

### Unit Tests (Mocked vscode API)

Use `jest` or `mocha` with mocked VS Code modules for:
- Formatting service functions
- Configuration parsing
- State management

### Integration Tests (@vscode/test-electron)

```typescript
import * as vscode from 'vscode';
import * as assert from 'assert';

suite('Extension Test Suite', () => {
    test('Opens markdown in preview by default', async () => {
        const uri = vscode.Uri.file('/path/to/test.md');
        const document = await vscode.workspace.openTextDocument(uri);

        // Allow extension to process
        await new Promise(resolve => setTimeout(resolve, 500));

        // Verify preview is open (check active editor type)
        // Note: This is simplified; actual implementation needs more robust checks
    });
});
```

### Test Fixtures

Create test markdown files of various sizes and content types:
- `simple.md` - Basic markdown
- `large.md` - >1MB file
- `with-frontmatter.md` - YAML frontmatter
- `conflict.md` - Git conflict markers

## 10. Performance Considerations

### Startup Impact

- Use lazy activation (`onLanguage:markdown`) instead of `*`
- Defer non-critical initialization
- Target: <50ms added to VS Code startup

### Preview Switch Performance

- Native `markdown.showPreview` is fast (<500ms)
- State management should be O(1) lookup
- Target: <500ms for mode switch

### Formatting Performance

- Direct `TextEditorEdit` operations are fast (<100ms)
- No need for debouncing for single operations
- Target: <100ms per formatting action

## References

- [VS Code Extension API](https://code.visualstudio.com/api)
- [Activation Events](https://code.visualstudio.com/api/references/activation-events)
- [When Clause Contexts](https://code.visualstudio.com/api/references/when-clause-contexts)
- [Contribution Points](https://code.visualstudio.com/api/references/contribution-points)
- [Commands API](https://code.visualstudio.com/api/extension-guides/command)
