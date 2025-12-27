# Configuration Contract: Markdown Preview Default

**Date**: 2025-12-23
**Feature**: [../spec.md](../spec.md)

## Overview

This document defines the configuration schema for the Markdown Preview Default extension. All settings are optional and have sensible defaults that satisfy most use cases.

## Configuration Properties

### markdownPreviewDefault.enabled

Controls whether the extension's preview-by-default behavior is active.

| Property | Value |
|----------|-------|
| **Key** | `markdownPreviewDefault.enabled` |
| **Type** | `boolean` |
| **Default** | `true` |
| **Scope** | `window` (User or Workspace) |

**Description**: When enabled, markdown files open in preview mode by default. When disabled, VS Code's standard behavior applies (raw editor).

**JSON Schema**:
```json
{
    "markdownPreviewDefault.enabled": {
        "type": "boolean",
        "default": true,
        "description": "Enable preview-by-default behavior for markdown files",
        "scope": "window"
    }
}
```

**Use Cases**:
- Disable globally for users who prefer raw editor
- Disable per-workspace for projects where editing is primary

---

### markdownPreviewDefault.excludePatterns

Glob patterns for files that should skip auto-preview and open in raw editor.

| Property | Value |
|----------|-------|
| **Key** | `markdownPreviewDefault.excludePatterns` |
| **Type** | `array` of `string` |
| **Default** | `["**/node_modules/**", "**/.git/**"]` |
| **Scope** | `resource` (User, Workspace, or Folder) |

**Description**: Files matching any of these glob patterns will open in the standard raw editor instead of preview mode.

**JSON Schema**:
```json
{
    "markdownPreviewDefault.excludePatterns": {
        "type": "array",
        "items": {
            "type": "string",
            "description": "Glob pattern (e.g., '**/docs/**', '*.draft.md')"
        },
        "default": [
            "**/node_modules/**",
            "**/.git/**"
        ],
        "description": "Glob patterns for files to exclude from auto-preview",
        "scope": "resource"
    }
}
```

**Pattern Examples**:
| Pattern | Matches |
|---------|---------|
| `**/node_modules/**` | Any file inside node_modules |
| `**/.git/**` | Any file inside .git |
| `**/drafts/**` | Files in any "drafts" folder |
| `*.draft.md` | Files ending in `.draft.md` |
| `README.md` | Only files named exactly README.md |

---

### markdownPreviewDefault.maxFileSize

Maximum file size (in bytes) for auto-preview. Larger files open in raw editor.

| Property | Value |
|----------|-------|
| **Key** | `markdownPreviewDefault.maxFileSize` |
| **Type** | `number` |
| **Default** | `1048576` (1MB) |
| **Minimum** | `0` |
| **Scope** | `resource` |

**Description**: Files larger than this threshold will skip auto-preview and open in the raw editor. An info message is shown with an option to manually open preview.

**JSON Schema**:
```json
{
    "markdownPreviewDefault.maxFileSize": {
        "type": "number",
        "default": 1048576,
        "minimum": 0,
        "description": "Maximum file size in bytes for auto-preview (0 = no limit)",
        "scope": "resource"
    }
}
```

**Common Values**:
| Value | Size |
|-------|------|
| `524288` | 512 KB |
| `1048576` | 1 MB |
| `5242880` | 5 MB |
| `0` | No limit (always preview) |

---

## Full Configuration Schema

For `package.json` contribution:

```json
{
    "contributes": {
        "configuration": {
            "title": "Markdown Preview Default",
            "properties": {
                "markdownPreviewDefault.enabled": {
                    "type": "boolean",
                    "default": true,
                    "description": "Enable preview-by-default behavior for markdown files",
                    "scope": "window"
                },
                "markdownPreviewDefault.excludePatterns": {
                    "type": "array",
                    "items": {
                        "type": "string"
                    },
                    "default": [
                        "**/node_modules/**",
                        "**/.git/**"
                    ],
                    "description": "Glob patterns for files to exclude from auto-preview",
                    "scope": "resource"
                },
                "markdownPreviewDefault.maxFileSize": {
                    "type": "number",
                    "default": 1048576,
                    "minimum": 0,
                    "description": "Maximum file size in bytes for auto-preview (0 = no limit)",
                    "scope": "resource"
                }
            }
        }
    }
}
```

## Configuration Scopes

| Scope | Description | Settings Location |
|-------|-------------|-------------------|
| `window` | Applies to entire VS Code window | User or Workspace settings |
| `resource` | Can vary per workspace folder | User, Workspace, or Folder settings |

**Priority** (highest to lowest):
1. Workspace Folder settings (`.vscode/settings.json` in folder)
2. Workspace settings (`.vscode/settings.json` or `.code-workspace`)
3. User settings (global `settings.json`)
4. Default values

## Configuration API Usage

### Reading Configuration

```typescript
import * as vscode from 'vscode';

interface ExtensionConfig {
    enabled: boolean;
    excludePatterns: string[];
    maxFileSize: number;
}

function getConfig(resource?: vscode.Uri): ExtensionConfig {
    const config = vscode.workspace.getConfiguration('markdownPreviewDefault', resource);

    return {
        enabled: config.get<boolean>('enabled', true),
        excludePatterns: config.get<string[]>('excludePatterns', []),
        maxFileSize: config.get<number>('maxFileSize', 1048576)
    };
}
```

### Watching for Changes

```typescript
vscode.workspace.onDidChangeConfiguration(event => {
    if (event.affectsConfiguration('markdownPreviewDefault')) {
        // Reload configuration
        const newConfig = getConfig();
        // Apply changes...
    }
});
```

### Checking File Against Patterns

```typescript
import * as minimatch from 'minimatch';

function shouldSkipPreview(uri: vscode.Uri, config: ExtensionConfig): boolean {
    if (!config.enabled) {
        return true;
    }

    const relativePath = vscode.workspace.asRelativePath(uri);

    for (const pattern of config.excludePatterns) {
        if (minimatch(relativePath, pattern)) {
            return true;
        }
    }

    return false;
}
```

## Settings UI Labels

For the Settings UI, the following labels and descriptions are used:

| Setting | Label | Description |
|---------|-------|-------------|
| `enabled` | "Enable Extension" | "Enable preview-by-default behavior for markdown files" |
| `excludePatterns` | "Exclude Patterns" | "Glob patterns for files to exclude from auto-preview" |
| `maxFileSize` | "Max File Size" | "Maximum file size in bytes for auto-preview (0 = no limit)" |
