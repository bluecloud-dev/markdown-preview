# Event Contracts: Markdown Preview Default

**Date**: 2025-12-23
**Feature**: [../spec.md](../spec.md)

## Overview

This document defines the VS Code events that the Markdown Preview Default extension listens to and responds to. It specifies the expected behavior for each event type.

## Document Events

### workspace.onDidOpenTextDocument

Triggered when any text document is opened.

**Event Type**: `vscode.TextDocument`

**Subscription**:
```typescript
vscode.workspace.onDidOpenTextDocument(document => {
    // Handle document open
});
```

**Handler Behavior**:

```
┌─────────────────────────────────────────────────────────────┐
│                  Document Opened                             │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
                 ┌──────────────────────┐
                 │ Is markdown file?    │───No───► IGNORE
                 └──────────────────────┘
                              │ Yes
                              ▼
                 ┌──────────────────────┐
                 │ Extension enabled?   │───No───► IGNORE
                 └──────────────────────┘
                              │ Yes
                              ▼
                 ┌──────────────────────┐
                 │ Is untitled file?    │───Yes──► EDIT MODE
                 └──────────────────────┘
                              │ No
                              ▼
                 ┌──────────────────────┐
                 │ Matches exclude      │
                 │ pattern?             │───Yes──► IGNORE
                 └──────────────────────┘
                              │ No
                              ▼
                 ┌──────────────────────┐
                 │ File size > max?     │───Yes──► SHOW INFO + IGNORE
                 └──────────────────────┘
                              │ No
                              ▼
                 ┌──────────────────────┐
                 │ Is diff view?        │───Yes──► IGNORE
                 └──────────────────────┘
                              │ No
                              ▼
                 ┌──────────────────────┐
                 │ Has git conflicts?   │───Yes──► EDIT MODE
                 └──────────────────────┘
                              │ No
                              ▼
              ┌─────────────────────────────┐
              │     OPEN PREVIEW MODE       │
              └─────────────────────────────┘
```

**Contract**:

| Condition | Action |
|-----------|--------|
| `document.languageId !== 'markdown'` | Ignore |
| `!config.enabled` | Ignore |
| `document.isUntitled` | Enter edit mode (new file) |
| `matchesExcludePattern(document.uri)` | Ignore |
| `document.getText().length > config.maxFileSize` | Show info message, ignore |
| `isDiffView()` | Ignore |
| `hasGitConflictMarkers(document)` | Enter edit mode |
| Otherwise | Open preview mode |

---

### workspace.onDidCloseTextDocument

Triggered when a text document is closed.

**Event Type**: `vscode.TextDocument`

**Handler Behavior**:
1. Check if document is markdown
2. Remove file state from state map
3. Clean up any associated resources

**Contract**:
```typescript
onDidCloseTextDocument(document => {
    if (document.languageId === 'markdown') {
        stateService.removeFileState(document.uri);
    }
});
```

---

### workspace.onDidSaveTextDocument

Triggered when a document is saved.

**Event Type**: `vscode.TextDocument`

**Handler Behavior**:
- **No automatic mode switch** (per FR-009)
- File remains in current mode (edit or preview)

**Contract**:
```typescript
onDidSaveTextDocument(document => {
    // No action - respects auto-save workflows
    // User must explicitly click "Done" to exit edit mode
});
```

---

## Editor Events

### window.onDidChangeActiveTextEditor

Triggered when the active text editor changes.

**Event Type**: `vscode.TextEditor | undefined`

**Handler Behavior**:
1. Update context keys based on new active editor
2. Update toolbar visibility

**Contract**:
```typescript
onDidChangeActiveTextEditor(editor => {
    if (!editor) {
        setContext('markdownPreviewDefault.isMarkdown', false);
        setContext('markdownPreviewDefault.editMode', false);
        return;
    }

    const isMarkdown = editor.document.languageId === 'markdown';
    setContext('markdownPreviewDefault.isMarkdown', isMarkdown);

    if (isMarkdown) {
        const state = stateService.getFileState(editor.document.uri);
        setContext('markdownPreviewDefault.editMode', state?.mode === ViewMode.Edit);
    } else {
        setContext('markdownPreviewDefault.editMode', false);
    }
});
```

---

### window.onDidChangeVisibleTextEditors

Triggered when the set of visible editors changes.

**Event Type**: `readonly vscode.TextEditor[]`

**Handler Behavior**:
1. Detect when markdown files become visible
2. Ensure preview is shown for newly visible markdown files (if appropriate)

**Contract**:
```typescript
onDidChangeVisibleTextEditors(editors => {
    for (const editor of editors) {
        if (editor.document.languageId === 'markdown') {
            const state = stateService.getFileState(editor.document.uri);
            if (!state) {
                // File was opened externally, apply preview-by-default
                handleNewMarkdownFile(editor.document);
            }
        }
    }
});
```

---

## Configuration Events

### workspace.onDidChangeConfiguration

Triggered when configuration settings change.

**Event Type**: `vscode.ConfigurationChangeEvent`

**Handler Behavior**:
1. Check if our configuration section was affected
2. Reload configuration values
3. Update context keys if needed

**Contract**:
```typescript
onDidChangeConfiguration(event => {
    if (event.affectsConfiguration('markdownPreviewDefault')) {
        configService.reload();

        // Update enabled context
        const config = configService.getConfig();
        setContext('markdownPreviewDefault.enabled', config.enabled);

        // Note: Does not retroactively change already-open files
    }
});
```

---

## Context Key Updates

### Context Keys Set by Extension

| Context Key | Type | Updated When |
|-------------|------|--------------|
| `markdownPreviewDefault.enabled` | boolean | Configuration changes |
| `markdownPreviewDefault.editMode` | boolean | Active editor changes, mode toggles |
| `markdownPreviewDefault.isMarkdown` | boolean | Active editor changes |

### setContext Usage

```typescript
// Helper function
async function setContext(key: string, value: any): Promise<void> {
    await vscode.commands.executeCommand('setContext', key, value);
}

// Usage examples
setContext('markdownPreviewDefault.editMode', true);
setContext('markdownPreviewDefault.enabled', false);
setContext('markdownPreviewDefault.isMarkdown', true);
```

---

## Event Registration

### Activation

All event listeners should be registered during extension activation:

```typescript
export function activate(context: vscode.ExtensionContext) {
    // Document events
    context.subscriptions.push(
        vscode.workspace.onDidOpenTextDocument(handleDocumentOpen),
        vscode.workspace.onDidCloseTextDocument(handleDocumentClose),
        vscode.workspace.onDidSaveTextDocument(handleDocumentSave)
    );

    // Editor events
    context.subscriptions.push(
        vscode.window.onDidChangeActiveTextEditor(handleActiveEditorChange),
        vscode.window.onDidChangeVisibleTextEditors(handleVisibleEditorsChange)
    );

    // Configuration events
    context.subscriptions.push(
        vscode.workspace.onDidChangeConfiguration(handleConfigChange)
    );
}
```

### Deactivation

Event listeners are automatically cleaned up via `context.subscriptions`:

```typescript
export function deactivate() {
    // Subscriptions are auto-disposed
    // Any additional cleanup here if needed
}
```

---

## Event Timing Considerations

### Debouncing

Some events may fire rapidly. Consider debouncing where appropriate:

| Event | Debounce? | Reason |
|-------|-----------|--------|
| `onDidOpenTextDocument` | No | Immediate response expected |
| `onDidCloseTextDocument` | No | Cleanup should be immediate |
| `onDidChangeActiveTextEditor` | Yes (50ms) | May fire multiple times during split view |
| `onDidChangeConfiguration` | Yes (100ms) | Batch rapid setting changes |

### Race Conditions

The `onDidOpenTextDocument` event may fire before the editor is visible. To ensure proper handling:

```typescript
async function handleDocumentOpen(document: vscode.TextDocument) {
    if (document.languageId !== 'markdown') return;

    // Wait for editor to become visible
    await new Promise(resolve => setTimeout(resolve, 50));

    // Check if document is now visible in an editor
    const editor = vscode.window.visibleTextEditors.find(
        e => e.document.uri.toString() === document.uri.toString()
    );

    if (editor) {
        // Proceed with preview-by-default logic
        await openPreview(document);
    }
}
```
