# Quickstart Guide: Markdown Reader Extension

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Data Model**: [data-model.md](./data-model.md)
**Created**: 2025-12-24 | **Updated**: 2025-12-24 | **Phase**: 1 (Design)

## Overview

This guide helps developers get started implementing the Markdown Reader extension. It covers project setup, core implementation patterns, and common development workflows.

**Audience**: Developers implementing the feature (including those new to VS Code extension development)

---

## Prerequisites

### Required Tools

- **Node.js**: v18.x or later
- **npm**: v9.x or later
- **VS Code**: v1.85.0 or later
- **TypeScript**: v5.x (installed via npm)

### Required Knowledge

- TypeScript basics (interfaces, async/await, modules)
- VS Code user experience (command palette, settings, status bar)
- Basic markdown syntax

### Recommended Reading

- [VS Code Extension API](https://code.visualstudio.com/api/references/vscode-api)
- [Your First Extension](https://code.visualstudio.com/api/get-started/your-first-extension)
- [Extension Anatomy](https://code.visualstudio.com/api/get-started/extension-anatomy)

---

## Manual Acceptance Checklist (US1–US6 + Edge Cases)

Run these checks in the Extension Development Host to validate user stories, edge cases, error paths, and accessibility behavior.

### US1: Preview by Default
- [ ] Open a `.md` file from Explorer → preview opens automatically
- [ ] Quick Open (`Ctrl+P`) a `.md` file → preview opens automatically
- [ ] Go to Definition into a `.md` file → preview opens automatically
- [ ] Disable `markdownReader.enabled` → file opens in editor
- [ ] Open a large file (>1MB) → prompt appears with opt-in preview

### US2: Edit Mode
- [ ] Run **Enter Edit Mode** → split view (editor left, preview right)
- [ ] Click **Done (Exit Edit Mode)** → preview-only
- [ ] Toggle with `Ctrl+Shift+V` / `Cmd+Shift+V` → mode switches
- [ ] Cursor restores to last position when re-entering edit mode

### US3: Toolbar Formatting
- [ ] Bold/Italic/Strikethrough wrap selection
- [ ] Bullet/Numbered list toggles current line prefix
- [ ] Inline code / code block insert correctly
- [ ] Link prompt inserts `[text](url)`
- [ ] Heading 1/2/3 toggle prefixes

### US4: Context Menu Formatting
- [ ] Right-click in edit mode → **Format** menu appears
- [ ] Heading + Code submenus appear and execute commands

### US5: Keyboard Shortcuts
- [ ] Bold (`Ctrl+B` / `Cmd+B`) in edit mode
- [ ] Italic (`Ctrl+I` / `Cmd+I`) in edit mode
- [ ] Toggle edit mode (`Ctrl+Shift+V` / `Cmd+Shift+V`)

### US6: Configuration
- [ ] `excludePatterns` prevents auto-preview in matching paths
- [ ] `maxFileSize` blocks auto-preview and prompts

### Edge Cases
- [ ] Untitled markdown opens in edit mode
- [ ] Diff view (`git:` or `diff:`) is ignored
- [ ] Binary file shows error and stays in editor
- [ ] Conflict markers open in edit mode

### Error Handling + Observability
- [ ] Preview failure shows **Open in Editor** action
- [ ] Output channel logs warnings/errors
- [ ] State changes show transient status bar messages

### Accessibility & Keyboard Navigation
- [ ] Use **Toggle Tab Key Moves Focus** (Command Palette) to enable UI tabbing
- [ ] Tab moves focus to the first toolbar button
- [ ] Shift+Tab moves focus backward
- [ ] Enter/Space activates toolbar buttons
- [ ] Escape returns focus to the text editor

---

## Project Setup

### 1. Initialize Extension

```bash
# Use Yeoman generator for VS Code extensions
npm install -g yo generator-code

# Generate extension scaffold
yo code

# Choose:
# - New Extension (TypeScript)
# - Name: markdown-reader
# - Identifier: markdown-reader
# - Description: Opens markdown files in preview mode by default
# - Initialize git: Yes
# - Package manager: npm
```

### 2. Configure TypeScript Strict Mode

Edit `tsconfig.json` (Constitution Principle V: Code Quality):

```json
{
  "compilerOptions": {
    "module": "Node16",
    "target": "ES2022",
    "outDir": "out",
    "lib": ["ES2022"],
    "sourceMap": true,
    "rootDir": "src",
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "alwaysStrict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "esModuleInterop": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", ".vscode-test"]
}
```

### 3. Install Dependencies

```bash
# Core dependencies (VS Code API types)
npm install --save-dev @types/vscode @types/node

# Development tools
npm install --save-dev \
  typescript \
  eslint @typescript-eslint/eslint-plugin @typescript-eslint/parser \
  prettier eslint-config-prettier \
  mocha @vscode/test-electron \
  minimatch @types/minimatch

# Build tools
npm install --save-dev esbuild
```

**Note**: Minimal runtime dependencies needed (Constitution Principle II: Native Integration). All required APIs are built into VS Code.

### 4. Configure ESLint + Prettier

Create `.eslintrc.json`:

```json
{
  "parser": "@typescript-eslint/parser",
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "prettier"
  ],
  "parserOptions": {
    "ecmaVersion": 2022,
    "sourceType": "module"
  },
  "rules": {
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/explicit-function-return-type": "warn",
    "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_" }],
    "no-console": "error"
  }
}
```

Create `.prettierrc`:

```json
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "printWidth": 100,
  "trailingComma": "es5"
}
```

### 5. Create Project Structure

```bash
mkdir -p src/{commands,services,providers,utils,types}
mkdir -p tests/{unit,integration,fixtures}
```

Final structure:

```
markdown-reader/
├── src/
│   ├── extension.ts              # Entry point
│   ├── commands/
│   │   ├── mode-commands.ts      # Mode toggle commands
│   │   └── format-commands.ts    # Formatting commands
│   ├── services/
│   │   ├── preview-service.ts    # Preview lifecycle
│   │   ├── formatting-service.ts # Text formatting
│   │   ├── state-service.ts      # Per-file state
│   │   └── config-service.ts     # Configuration
│   ├── handlers/
│   │   └── markdown-file-handler.ts  # File open handler
│   ├── utils/
│   │   ├── markdown.ts           # Markdown helpers
│   │   └── editor.ts             # Editor utilities
│   └── types/
│       ├── state.ts              # ViewMode, FileState
│       └── config.ts             # Configuration types
├── tests/
│   ├── unit/                     # Unit tests
│   ├── integration/              # VS Code integration tests
│   └── fixtures/                 # Test markdown files
├── package.json                  # Extension manifest
├── tsconfig.json                 # TypeScript config
├── .eslintrc.json                # Linting rules
├── .prettierrc                   # Formatting rules
└── README.md
```

---

## Core Implementation Flow

### Step 1: Define Types

Create `src/types/state.ts`:

```typescript
/**
 * Possible view modes for a markdown file.
 *
 * @see specs/markdown-preview/data-model.md
 */
export enum ViewMode {
  Preview = 'preview',
  Edit = 'edit',
}

/**
 * State for a single open markdown file.
 *
 * Tracks the current mode and last mode change timestamp.
 * Each file maintains independent state.
 */
export interface FileState {
  /** Unique identifier (file URI as string) */
  uri: string;

  /** Current view mode */
  mode: ViewMode;

  /** Timestamp of last mode change (ISO 8601) */
  lastModeChange: number;
}
```

Create `src/types/config.ts`:

```typescript
/**
 * Extension configuration interface.
 *
 * Maps to settings in package.json contributes.configuration.
 */
export interface ExtensionConfiguration {
  /** Whether the extension is enabled */
  enabled: boolean;

  /** Glob patterns for files to exclude from auto-preview */
  excludePatterns: string[];

  /** Maximum file size (bytes) for auto-preview */
  maxFileSize: number;
}

/** Default configuration values */
export const DEFAULT_CONFIG: ExtensionConfiguration = {
  enabled: true,
  excludePatterns: ['**/node_modules/**', '**/.git/**'],
  maxFileSize: 1_048_576, // 1MB
};
```

---

### Step 2: Implement Services

#### StateService

Create `src/services/state-service.ts`:

```typescript
import * as vscode from 'vscode';
import { FileState, ViewMode } from '../types/state';

/**
 * Manages per-file edit/preview state.
 *
 * Uses in-memory storage - state resets on extension reload.
 * This is intentional: mode state is ephemeral and users expect
 * a fresh start when VS Code restarts.
 *
 * @see specs/markdown-preview/data-model.md
 */
export class StateService {
  private readonly states = new Map<string, FileState>();

  /**
   * Gets the current state for a file.
   *
   * @param uri - The file URI
   * @returns The file state, or a default preview state if not found
   */
  getFileState(uri: vscode.Uri): FileState {
    const key = uri.toString();
    if (!this.states.has(key)) {
      this.states.set(key, {
        uri: key,
        mode: ViewMode.Preview,
        lastModeChange: Date.now(),
      });
    }
    return this.states.get(key)!;
  }

  /**
   * Sets the mode for a file and updates context key.
   *
   * @param uri - The file URI
   * @param mode - The new view mode
   */
  async setMode(uri: vscode.Uri, mode: ViewMode): Promise<void> {
    const state = this.getFileState(uri);
    state.mode = mode;
    state.lastModeChange = Date.now();

    // Update context key for UI visibility
    await vscode.commands.executeCommand(
      'setContext',
      'markdownReader.editMode',
      mode === ViewMode.Edit
    );
  }

  /**
   * Clears state for a file (when closed).
   *
   * @param uri - The file URI
   */
  clear(uri: vscode.Uri): void {
    this.states.delete(uri.toString());
  }
}
```

---

#### ConfigService

Create `src/services/config-service.ts`:

```typescript
import * as vscode from 'vscode';
import { minimatch } from 'minimatch';
import { ExtensionConfiguration, DEFAULT_CONFIG } from '../types/config';

/**
 * Provides access to extension configuration.
 *
 * Wraps VS Code's configuration API with type-safe accessors.
 *
 * @see specs/markdown-preview/contracts/configuration.json
 */
export class ConfigService {
  private config: ExtensionConfiguration = DEFAULT_CONFIG;

  constructor() {
    this.reload();
  }

  /**
   * Reloads configuration from VS Code settings.
   */
  reload(): void {
    const vsConfig = vscode.workspace.getConfiguration('markdownReader');

    this.config = {
      enabled: vsConfig.get<boolean>('enabled', DEFAULT_CONFIG.enabled),
      excludePatterns: vsConfig.get<string[]>('excludePatterns', DEFAULT_CONFIG.excludePatterns),
      maxFileSize: vsConfig.get<number>('maxFileSize', DEFAULT_CONFIG.maxFileSize),
    };
  }

  /**
   * Checks if a file should be excluded from auto-preview.
   *
   * @param uri - The file URI to check
   * @returns true if the file matches an exclude pattern
   */
  isExcluded(uri: vscode.Uri): boolean {
    const relativePath = vscode.workspace.asRelativePath(uri, false);

    return this.config.excludePatterns.some((pattern) =>
      minimatch(relativePath, pattern, { dot: true })
    );
  }

  /**
   * Gets the current configuration.
   */
  getConfig(): ExtensionConfiguration {
    return { ...this.config };
  }
}
```

---

#### PreviewService

Create `src/services/preview-service.ts`:

```typescript
import * as vscode from 'vscode';
import { StateService } from './state-service';
import { ConfigService } from './config-service';
import { ViewMode } from '../types/state';

/**
 * Manages markdown preview lifecycle.
 *
 * Uses VS Code's native markdown preview commands.
 * Constitution Principle II: Native Integration - no custom webviews.
 *
 * @see specs/markdown-preview/contracts/commands.json
 */
export class PreviewService {
  constructor(
    private readonly stateService: StateService,
    private readonly configService: ConfigService
  ) {}

  /**
   * Determines if a document should show preview.
   *
   * Checks: enabled, exclude patterns, file size, diff view, untitled.
   *
   * @param document - The text document to check
   * @returns true if preview should be shown
   */
  async shouldShowPreview(document: vscode.TextDocument): Promise<boolean> {
    const config = this.configService.getConfig();

    // Extension disabled?
    if (!config.enabled) {
      return false;
    }

    // Not markdown?
    if (document.languageId !== 'markdown') {
      return false;
    }

    // Untitled file? (no content to preview)
    if (document.isUntitled) {
      return false;
    }

    // Diff view? (don't intercept)
    if (document.uri.scheme === 'git' || document.uri.scheme === 'diff') {
      return false;
    }

    // Excluded path?
    if (this.configService.isExcluded(document.uri)) {
      return false;
    }

    // File too large?
    try {
      const stat = await vscode.workspace.fs.stat(document.uri);
      if (stat.size > config.maxFileSize) {
        vscode.window.showInformationMessage(
          'Large file detected. Click to open preview.',
          'Open Preview'
        ).then((selection) => {
          if (selection === 'Open Preview') {
            this.showPreview(document.uri);
          }
        });
        return false;
      }
    } catch {
      // File stat failed, proceed with preview
    }

    return true;
  }

  /**
   * Shows the markdown preview for a document.
   *
   * Uses VS Code's native markdown.showPreview command.
   *
   * @param uri - The URI of the markdown document
   */
  async showPreview(uri: vscode.Uri): Promise<void> {
    await vscode.commands.executeCommand('markdown.showPreview', uri);
    await this.stateService.setMode(uri, ViewMode.Preview);
  }

  /**
   * Enters edit mode with split view.
   *
   * Opens raw editor in one column, preview in another.
   *
   * @param uri - The URI of the markdown document
   */
  async enterEditMode(uri: vscode.Uri): Promise<void> {
    // Open raw editor
    await vscode.window.showTextDocument(uri, {
      viewColumn: vscode.ViewColumn.One,
      preview: false,
    });

    // Open preview to the side
    await vscode.commands.executeCommand('markdown.showPreviewToSide', uri);

    await this.stateService.setMode(uri, ViewMode.Edit);
  }

  /**
   * Exits edit mode, returning to preview-only.
   *
   * Closes the raw editor, keeps preview.
   *
   * @param uri - The URI of the markdown document
   */
  async exitEditMode(uri: vscode.Uri): Promise<void> {
    // Close the active editor (raw markdown)
    await vscode.commands.executeCommand('workbench.action.closeActiveEditor');

    await this.stateService.setMode(uri, ViewMode.Preview);
  }
}
```

---

#### FormattingService

Create `src/services/formatting-service.ts`:

```typescript
import * as vscode from 'vscode';

/**
 * Provides markdown text formatting operations.
 *
 * All methods are pure text transformations that work with TextEditorEdit.
 *
 * @see specs/markdown-preview/contracts/commands.json
 */
export class FormattingService {
  /**
   * Wraps selected text with markers (bold, italic, etc.).
   *
   * If no selection, wraps the word under cursor.
   * If no word, inserts placeholder.
   *
   * @param editor - The active text editor
   * @param startMarker - Opening marker (e.g., "**")
   * @param endMarker - Closing marker (e.g., "**")
   * @param placeholder - Placeholder text if no selection
   */
  async wrapWithMarkers(
    editor: vscode.TextEditor,
    startMarker: string,
    endMarker: string,
    placeholder: string = 'text'
  ): Promise<void> {
    const selection = editor.selection;

    await editor.edit((editBuilder) => {
      if (selection.isEmpty) {
        // No selection - wrap word under cursor or insert placeholder
        const wordRange = editor.document.getWordRangeAtPosition(selection.active);

        if (wordRange) {
          const word = editor.document.getText(wordRange);
          editBuilder.replace(wordRange, `${startMarker}${word}${endMarker}`);
        } else {
          editBuilder.insert(selection.active, `${startMarker}${placeholder}${endMarker}`);
        }
      } else {
        // Has selection - wrap it
        const selectedText = editor.document.getText(selection);
        editBuilder.replace(selection, `${startMarker}${selectedText}${endMarker}`);
      }
    });
  }

  /**
   * Toggles a line prefix (bullets, numbers, headings).
   *
   * If line has prefix, removes it. Otherwise adds it.
   *
   * @param editor - The active text editor
   * @param prefix - The prefix to toggle (e.g., "- ", "1. ", "# ")
   */
  async toggleLinePrefix(editor: vscode.TextEditor, prefix: string): Promise<void> {
    const selection = editor.selection;
    const line = editor.document.lineAt(selection.active.line);
    const lineText = line.text;

    await editor.edit((editBuilder) => {
      if (lineText.startsWith(prefix)) {
        // Remove prefix
        const newText = lineText.substring(prefix.length);
        editBuilder.replace(line.range, newText);
      } else {
        // Add prefix (remove existing list markers first)
        const cleanedText = lineText.replace(/^(\s*)([*\-+]|\d+\.)\s+/, '$1');
        editBuilder.replace(line.range, `${prefix}${cleanedText.trimStart()}`);
      }
    });
  }

  /**
   * Inserts a code block around selection.
   *
   * @param editor - The active text editor
   * @param inline - If true, uses single backticks; otherwise triple
   */
  async insertCodeBlock(editor: vscode.TextEditor, inline: boolean): Promise<void> {
    if (inline) {
      await this.wrapWithMarkers(editor, '`', '`', 'code');
    } else {
      const selection = editor.selection;
      const selectedText = editor.document.getText(selection);

      await editor.edit((editBuilder) => {
        if (selection.isEmpty) {
          editBuilder.insert(selection.active, '```\ncode\n```');
        } else {
          editBuilder.replace(selection, `\`\`\`\n${selectedText}\n\`\`\``);
        }
      });
    }
  }

  /**
   * Inserts a markdown link.
   *
   * Prompts for URL, wraps selection as link text.
   *
   * @param editor - The active text editor
   */
  async insertLink(editor: vscode.TextEditor): Promise<void> {
    const selection = editor.selection;
    const selectedText = selection.isEmpty ? 'link text' : editor.document.getText(selection);

    const url = await vscode.window.showInputBox({
      prompt: 'Enter URL',
      placeHolder: 'https://example.com',
      validateInput: (value) => {
        if (!value) {
          return 'URL is required';
        }
        try {
          new URL(value);
          return undefined;
        } catch {
          return 'Invalid URL format';
        }
      },
    });

    if (url) {
      await editor.edit((editBuilder) => {
        if (selection.isEmpty) {
          editBuilder.insert(selection.active, `[${selectedText}](${url})`);
        } else {
          editBuilder.replace(selection, `[${selectedText}](${url})`);
        }
      });
    }
  }
}
```

---

### Step 3: Implement File Handler

Create `src/handlers/markdown-file-handler.ts`:

```typescript
import * as vscode from 'vscode';
import { PreviewService } from '../services/preview-service';

/**
 * Handles markdown file open events.
 *
 * Intercepts file opens and redirects to preview mode.
 * Constitution Principle I: Reading-First Experience.
 *
 * @see specs/markdown-reader/contracts/events.md
 */
export class MarkdownFileHandler implements vscode.Disposable {
  private readonly disposables: vscode.Disposable[] = [];

  constructor(private readonly previewService: PreviewService) {}

  /**
   * Registers the file open handler.
   */
  register(): void {
    this.disposables.push(
      vscode.workspace.onDidOpenTextDocument(this.handleDocumentOpen.bind(this))
    );
  }

  /**
   * Handles a document open event.
   *
   * If the document should show preview, closes the raw editor
   * and opens preview instead.
   */
  private async handleDocumentOpen(document: vscode.TextDocument): Promise<void> {
    // Only handle markdown files
    if (document.languageId !== 'markdown') {
      return;
    }

    // Check if we should show preview
    const shouldPreview = await this.previewService.shouldShowPreview(document);

    if (shouldPreview) {
      // Small delay to let the editor finish opening
      setTimeout(async () => {
        // Close the raw editor that just opened
        await vscode.commands.executeCommand('workbench.action.closeActiveEditor');

        // Show preview instead
        await this.previewService.showPreview(document.uri);
      }, 50);
    }
  }

  dispose(): void {
    this.disposables.forEach((d) => d.dispose());
  }
}
```

---

### Step 4: Wire Everything Together

Edit `src/extension.ts`:

```typescript
import * as vscode from 'vscode';
import { StateService } from './services/state-service';
import { ConfigService } from './services/config-service';
import { PreviewService } from './services/preview-service';
import { FormattingService } from './services/formatting-service';
import { MarkdownFileHandler } from './handlers/markdown-file-handler';

/**
 * Extension activation entry point.
 *
 * Called when user opens a markdown file (onLanguage:markdown).
 *
 * @see https://code.visualstudio.com/api/references/activation-events
 */
export function activate(context: vscode.ExtensionContext): void {
  // Initialize services
  const stateService = new StateService();
  const configService = new ConfigService();
  const previewService = new PreviewService(stateService, configService);
  const formattingService = new FormattingService();

  // Register file handler
  const fileHandler = new MarkdownFileHandler(previewService);
  fileHandler.register();
  context.subscriptions.push(fileHandler);

  // Register mode commands
  context.subscriptions.push(
    vscode.commands.registerCommand('markdownReader.enterEditMode', async () => {
      const editor = vscode.window.activeTextEditor;
      if (editor && editor.document.languageId === 'markdown') {
        await previewService.enterEditMode(editor.document.uri);
      }
    }),

    vscode.commands.registerCommand('markdownReader.exitEditMode', async () => {
      const editor = vscode.window.activeTextEditor;
      if (editor && editor.document.languageId === 'markdown') {
        await previewService.exitEditMode(editor.document.uri);
      }
    }),

    vscode.commands.registerCommand('markdownReader.toggleEditMode', async () => {
      const editor = vscode.window.activeTextEditor;
      if (editor && editor.document.languageId === 'markdown') {
        const state = stateService.getFileState(editor.document.uri);
        if (state.mode === 'preview') {
          await previewService.enterEditMode(editor.document.uri);
        } else {
          await previewService.exitEditMode(editor.document.uri);
        }
      }
    })
  );

  // Register formatting commands
  context.subscriptions.push(
    vscode.commands.registerCommand('markdownReader.bold', async () => {
      const editor = vscode.window.activeTextEditor;
      if (editor) {
        await formattingService.wrapWithMarkers(editor, '**', '**', 'bold text');
      }
    }),

    vscode.commands.registerCommand('markdownReader.italic', async () => {
      const editor = vscode.window.activeTextEditor;
      if (editor) {
        await formattingService.wrapWithMarkers(editor, '_', '_', 'italic text');
      }
    }),

    vscode.commands.registerCommand('markdownReader.link', async () => {
      const editor = vscode.window.activeTextEditor;
      if (editor) {
        await formattingService.insertLink(editor);
      }
    })
  );

  // Listen for configuration changes
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration('markdownReader')) {
        configService.reload();
      }
    })
  );

  // Set initial context keys
  vscode.commands.executeCommand('setContext', 'markdownReader.editMode', false);
}

/**
 * Extension deactivation cleanup.
 */
export function deactivate(): void {
  // Cleanup handled by context.subscriptions.dispose()
}
```

---

### Step 5: Configure Extension Manifest

Edit `package.json`:

```json
{
  "name": "markdown-reader",
  "displayName": "Markdown Reader",
  "description": "Opens markdown files in preview mode by default",
  "version": "0.1.0",
  "engines": {
    "vscode": "^1.85.0"
  },
  "categories": ["Other"],
  "activationEvents": ["onLanguage:markdown"],
  "main": "./out/extension.js",
  "contributes": {
    "commands": [
      {
        "command": "markdownReader.enterEditMode",
        "title": "Markdown Reader: Enter Edit Mode",
        "icon": "$(edit)"
      },
      {
        "command": "markdownReader.exitEditMode",
        "title": "Markdown Reader: Exit Edit Mode",
        "icon": "$(check)"
      },
      {
        "command": "markdownReader.toggleEditMode",
        "title": "Markdown Reader: Toggle Edit Mode"
      },
      {
        "command": "markdownReader.bold",
        "title": "Markdown Reader: Bold",
        "icon": "$(bold)"
      },
      {
        "command": "markdownReader.italic",
        "title": "Markdown Reader: Italic",
        "icon": "$(italic)"
      },
      {
        "command": "markdownReader.link",
        "title": "Markdown Reader: Insert Link",
        "icon": "$(link)"
      }
    ],
    "menus": {
      "editor/title": [
        {
          "command": "markdownReader.exitEditMode",
          "when": "resourceLangId == markdown && markdownReader.editMode",
          "group": "navigation"
        }
      ]
    },
    "keybindings": [
      {
        "command": "markdownReader.toggleEditMode",
        "key": "ctrl+shift+v",
        "mac": "cmd+shift+v",
        "when": "resourceLangId == markdown"
      },
      {
        "command": "markdownReader.bold",
        "key": "ctrl+b",
        "mac": "cmd+b",
        "when": "resourceLangId == markdown && markdownReader.editMode"
      },
      {
        "command": "markdownReader.italic",
        "key": "ctrl+i",
        "mac": "cmd+i",
        "when": "resourceLangId == markdown && markdownReader.editMode"
      }
    ],
    "configuration": {
      "title": "Markdown Reader",
      "properties": {
        "markdownReader.enabled": {
          "type": "boolean",
          "default": true,
          "description": "Enable/disable the extension"
        },
        "markdownReader.excludePatterns": {
          "type": "array",
          "items": { "type": "string" },
          "default": ["**/node_modules/**", "**/.git/**"],
          "description": "Glob patterns for files to exclude from auto-preview"
        },
        "markdownReader.maxFileSize": {
          "type": "number",
          "default": 1048576,
          "description": "Maximum file size (bytes) for auto-preview"
        }
      }
    }
  }
}
```

---

## Development Workflow

### Run and Debug

1. **Open Extension Development Host**:
   - Press `F5` in VS Code
   - New window opens with extension loaded

2. **Test Commands**:
   - Press `Cmd+Shift+P` (macOS) or `Ctrl+Shift+P` (Windows/Linux)
   - Type "Markdown Reader"
   - Run commands

3. **View Logs**:
   - In Extension Development Host: Help → Toggle Developer Tools → Console

### Build and Package

```bash
# Compile TypeScript
npm run compile

# Run linter
npm run lint

# Run tests
npm test

# Package extension (.vsix file)
npx @vscode/vsce package
```

---

## Testing Strategy

### Manual Testing Checklist

From [spec.md](spec.md) acceptance scenarios:

**User Story 1: Preview by Default**
- [ ] Click .md file in explorer → opens in preview mode
- [ ] Ctrl+P → select .md → opens in preview mode
- [ ] Go to Definition → .md → opens in preview mode
- [ ] Disable extension → .md opens in raw editor
- [ ] Large file (>1MB) → opens in raw editor with info message

**User Story 2: Edit Mode**
- [ ] Preview mode → Ctrl+Shift+V → split view appears
- [ ] Type in editor → preview updates in real-time
- [ ] Edit mode → click Done → returns to preview-only
- [ ] Edit mode → Ctrl+Shift+V → returns to preview-only

**User Story 3: Formatting**
- [ ] Edit mode → select text → click Bold → text wrapped with **
- [ ] Edit mode → no selection → click Bold → placeholder inserted
- [ ] Preview mode → formatting toolbar not visible

### Performance Benchmarks

| Operation | Target | Measurement Method |
|-----------|--------|-------------------|
| File open → Preview | < 1 second | Manual stopwatch |
| Mode switch | < 500ms | Manual stopwatch |
| Formatting operation | < 100ms | Imperceptible delay |
| Startup impact | < 50ms | VS Code Developer: Startup Performance |

---

## Common Pitfalls

### 1. Forgetting Context Keys

```typescript
// Bad: Toolbar visible when it shouldn't be
"when": "resourceLangId == markdown"

// Good: Only show in edit mode
"when": "resourceLangId == markdown && markdownReader.editMode"
```

### 2. Not Using Native Preview

```typescript
// Bad: Custom webview (Constitution violation!)
const panel = vscode.window.createWebviewPanel(
  'markdownPreview',
  'Preview',
  vscode.ViewColumn.One,
  { enableScripts: true }
);

// Good: Native preview command
await vscode.commands.executeCommand('markdown.showPreview', uri);
```

### 3. Registering Disposables

```typescript
// Bad: Memory leak
vscode.workspace.onDidOpenTextDocument(handler);

// Good: Register for disposal
context.subscriptions.push(
  vscode.workspace.onDidOpenTextDocument(handler)
);
```

### 4. Hardcoding File Paths

```typescript
// Bad: Breaks on different OSes
if (path.includes('/node_modules/')) { ... }

// Good: Use minimatch for glob patterns
if (minimatch(relativePath, '**/node_modules/**')) { ... }
```

---

## Troubleshooting

### Extension not activating

1. Ensure file has `.md` extension
2. Check if extension is enabled in Settings
3. Verify VS Code version is 1.85.0+
4. Check Developer Console for errors

### Preview not showing

1. Check if file matches an exclude pattern
2. For large files (>1MB), click the info message to open preview manually
3. Verify extension is enabled in settings

### Formatting not working

1. Ensure you're in edit mode (split view)
2. Check if the file is markdown (`editorLangId == markdown`)
3. Check context key: `markdownReader.editMode`

### Keyboard shortcuts not working

1. Check for conflicts: Keyboard Shortcuts → search for your command
2. Verify `when` clause matches current context
3. Restart VS Code after changing keybindings

---

## Resources

### VS Code API Documentation

- [Extension API](https://code.visualstudio.com/api/references/vscode-api)
- [Markdown Preview Extension Guide](https://code.visualstudio.com/api/extension-guides/markdown-preview)
- [Commands API](https://code.visualstudio.com/api/references/vscode-api#commands)
- [Configuration API](https://code.visualstudio.com/api/references/vscode-api#WorkspaceConfiguration)

### Design Documents

- [Data Model](data-model.md) - TypeScript interfaces and storage schema
- [Contracts](contracts/) - Service and command specifications
- [Research](research.md) - API usage examples and best practices

### Project Governance

- [Constitution](../../.specify/memory/constitution.md) - Core principles and standards
- [Feature Spec](spec.md) - Requirements and acceptance criteria

---

## Summary

**What you've built**:
- TypeScript extension with strict mode enabled
- Preview-by-default behavior using native VS Code APIs
- Edit mode with split view (raw editor + live preview)
- Formatting commands with toolbar integration
- Configuration for exclude patterns and file size limits

**Constitution Compliance**:
- ✅ Principle I: Reading-first experience (preview by default)
- ✅ Principle II: Native integration (no custom webviews)
- ✅ Principle III: Zero-configuration default (works immediately)
- ✅ Principle IV: Non-intrusive design (no UI in preview mode)
- ✅ Principle V: Production-quality code (strict TypeScript)
- ✅ Principle VI: Test-first development (tests before implementation)
- ✅ Principle VII: Documentation excellence (JSDoc, guides)

**Ready for**: Implementation via `/speckit.implement`
