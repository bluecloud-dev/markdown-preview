# Data Model: Markdown Reader Extension

**Date**: 2025-12-24 | **Updated**: 2025-12-24
**Feature**: [spec.md](./spec.md)
**Plan**: [plan.md](./plan.md)

## Overview

This document defines the data structures and state management for the Markdown Reader extension. The extension maintains minimal in-memory state focused on tracking the view mode (preview/edit) for each open markdown file. No persistence is required—state resets on extension reload.

## Core Types

### ViewMode

Represents the current display mode for a markdown file.

```typescript
enum ViewMode {
    /** File is displayed in rendered preview (read-only) */
    Preview = 'preview',

    /** File is in split view with raw editor and live preview */
    Edit = 'edit'
}
```

### FileState

Tracks the state of a single markdown file.

```typescript
interface FileState {
    /** The file's URI as a string (used as map key) */
    uri: string;

    /** Current view mode */
    mode: ViewMode;

    /** Timestamp when mode was last changed */
    lastModeChange: number;
}
```

### ExtensionState

Global state managed by the extension.

```typescript
interface ExtensionState {
    /** Map of file URI to file state */
    files: Map<string, FileState>;

    /** Whether the extension is globally enabled */
    enabled: boolean;
}
```

## Configuration Schema

### ExtensionConfiguration

User-configurable settings.

```typescript
interface ExtensionConfiguration {
    /**
     * Enable/disable the extension globally
     * @default true
     */
    enabled: boolean;

    /**
     * Glob patterns for files to exclude from auto-preview
     * @default ["**/node_modules/**", "**/.git/**"]
     */
    excludePatterns: string[];

    /**
     * Maximum file size (in bytes) for auto-preview
     * Files larger than this open in raw editor with info message
     * @default 1048576 (1MB)
     */
    maxFileSize: number;
}
```

### Configuration Keys

| Key | Type | Default | Scope |
|-----|------|---------|-------|
| `markdownReader.enabled` | boolean | `true` | User, Workspace |
| `markdownReader.excludePatterns` | string[] | `["**/node_modules/**", "**/.git/**"]` | User, Workspace |
| `markdownReader.maxFileSize` | number | `1048576` | User, Workspace |

## Formatting Actions

### FormattingAction

Describes a text formatting operation.

```typescript
interface FormattingAction {
    /** Unique identifier for the action */
    id: string;

    /** Display label for UI */
    label: string;

    /** Icon identifier (VS Code codicon) */
    icon: string;

    /** Keyboard shortcut (cross-platform) */
    keybinding?: {
        key: string;      // Windows/Linux
        mac: string;      // macOS
    };

    /** How the formatting is applied */
    type: FormattingType;

    /** Markers or configuration for the formatting */
    config: FormattingConfig;
}

enum FormattingType {
    /** Wrap selection with prefix/suffix */
    Wrap = 'wrap',

    /** Toggle prefix at line start */
    LinePrefix = 'linePrefix',

    /** Wrap with block markers (multi-line) */
    Block = 'block',

    /** Special handling (e.g., link with prompt) */
    Custom = 'custom'
}

interface FormattingConfig {
    /** Prefix to add (for Wrap/LinePrefix/Block) */
    prefix?: string;

    /** Suffix to add (for Wrap/Block) */
    suffix?: string;

    /** Placeholder text when no selection */
    placeholder?: string;

    /** For LinePrefix: whether to cycle through values */
    cycle?: string[];
}
```

### Predefined Formatting Actions

| ID | Type | Prefix | Suffix | Keybinding |
|----|------|--------|--------|------------|
| `bold` | Wrap | `**` | `**` | Ctrl+B |
| `italic` | Wrap | `_` | `_` | Ctrl+I |
| `strikethrough` | Wrap | `~~` | `~~` | - |
| `inlineCode` | Wrap | `` ` `` | `` ` `` | - |
| `codeBlock` | Block | ` ``` ` | ` ``` ` | - |
| `bulletList` | LinePrefix | `- ` | - | - |
| `numberedList` | LinePrefix | `1. ` | - | - |
| `heading` | LinePrefix | - | - | - (cycles #, ##, ###) |
| `link` | Custom | `[` | `](url)` | - |

## State Management

### In-Memory Storage

Per-file state is stored in a Map (no persistence needed):

```typescript
class StateService {
    private readonly states = new Map<string, FileState>();

    getState(uri: vscode.Uri): FileState {
        const key = uri.toString();
        if (!this.states.has(key)) {
            this.states.set(key, {
                uri: key,
                mode: ViewMode.Preview,
                lastModeChange: Date.now()
            });
        }
        return this.states.get(key)!;
    }

    setMode(uri: vscode.Uri, mode: ViewMode): void {
        const state = this.getState(uri);
        state.mode = mode;
        state.lastModeChange = Date.now();
    }

    clear(uri: vscode.Uri): void {
        this.states.delete(uri.toString());
    }
}
```

### Rationale for No Persistence

- File state (preview/edit) is ephemeral—resets on VS Code restart is acceptable
- Simplifies implementation (no serialization/deserialization)
- Faster startup (no state loading)
- Aligns with user expectation: fresh start on reload

## State Transitions

### State Machine

```
┌─────────────┐                    ┌─────────────┐
│   Preview   │ ──── Edit ───────► │    Edit     │
│   (Read)    │ ◄─── Done ──────── │   (Split)   │
└─────────────┘                    └─────────────┘
      │                                   │
      │ Close                       Close │
      ▼                                   ▼
┌─────────────────────────────────────────────────┐
│                    Closed                        │
└─────────────────────────────────────────────────┘
```

### Transition Events

| Event | From State | To State | Trigger |
|-------|------------|----------|---------|
| `file.open` | Closed | Preview | User opens markdown file |
| `file.open.new` | Closed | Edit | User creates new markdown file |
| `file.open.large` | Closed | Edit | File >1MB opened |
| `edit.enter` | Preview | Edit | User clicks Edit button |
| `edit.exit` | Edit | Preview | User clicks Done button |
| `file.close` | Preview/Edit | Closed | User closes file |

## Context Keys

Custom context keys set by the extension for conditional UI:

| Context Key | Type | Description |
|-------------|------|-------------|
| `markdownReader.editMode` | boolean | True when active file is in edit mode |
| `markdownReader.enabled` | boolean | True when extension is enabled |
| `markdownReader.isMarkdown` | boolean | True when active file is markdown |

## Relationships

```
ExtensionState
    ├── enabled: boolean
    └── files: Map<string, FileState>
            └── FileState
                    ├── uri: string
                    ├── mode: ViewMode
                    └── lastModeChange: number

ExtensionConfiguration (persisted in settings.json)
    ├── enabled: boolean
    ├── excludePatterns: string[]
    └── maxFileSize: number

FormattingAction (static registry)
    ├── id: string
    ├── label: string
    ├── icon: string
    ├── keybinding: { key, mac }
    ├── type: FormattingType
    └── config: FormattingConfig
```

## Invariants

1. **One mode per file**: Each file has exactly one ViewMode at any time
2. **State cleanup**: FileState is removed when file is closed
3. **Default mode**: New files default to Preview mode (except untitled/large files)
4. **Configuration priority**: Workspace settings override user settings
5. **Pattern matching**: First matching exclude pattern wins (short-circuit)
