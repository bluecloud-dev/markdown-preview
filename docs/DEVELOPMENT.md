# Development Guide

This guide helps you set up your development environment and contribute to the Markdown Preview extension.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [Development Workflow](#development-workflow)
- [Running the Extension](#running-the-extension)
- [Debugging](#debugging)
- [Configuration](#configuration)
- [Code Style](#code-style)
- [Common Tasks](#common-tasks)
- [Troubleshooting Development Issues](#troubleshooting-development-issues)

## Prerequisites

Before you begin, ensure you have the following installed:

| Tool | Version | Purpose |
|------|---------|---------|
| [Node.js](https://nodejs.org/) | LTS (20.x+) | Runtime and npm |
| [VS Code](https://code.visualstudio.com/) | 1.107+ | Development IDE |
| [Git](https://git-scm.com/) | Latest | Version control |

### Recommended VS Code Extensions

Install these extensions for the best development experience:

- **ESLint** (`dbaeumer.vscode-eslint`) - Inline linting
- **Prettier** (`esbenp.prettier-vscode`) - Code formatting
- **TypeScript Importer** - Auto-import suggestions

## Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/ayhammouda/markdown-preview.git
cd markdown-preview
```

### 2. Install Dependencies

```bash
npm ci
```

> **Note:** Use `npm ci` instead of `npm install` to ensure consistent dependency versions from `package-lock.json`.

### 3. Build the Extension

```bash
npm run compile
```

This compiles both the main source code and test files.

### 4. Verify Setup

```bash
npm run lint   # Check for linting errors
npm test       # Run integration tests
```

If both commands pass, your environment is ready.

> **New to the repo?** Start with [GETTING_STARTED.md](GETTING_STARTED.md) for a
> shorter path to your first successful preview run.

## Project Structure

```
markdown-preview/
├── src/                        # Extension source code
│   ├── extension.ts            # Entry point - activation and wiring
│   ├── commands/               # Command handlers
│   │   ├── mode-commands.ts    # Edit/preview mode switching
│   │   └── format-commands.ts  # Text formatting actions
│   ├── services/               # Business logic
│   │   ├── preview-service.ts  # Preview/edit mode management
│   │   ├── state-service.ts    # Per-file state tracking
│   │   ├── config-service.ts   # Settings with caching
│   │   ├── validation-service.ts # File validation
│   │   ├── formatting-service.ts # Text transformations
│   │   └── logger.ts           # Output channel logging
│   ├── handlers/               # Event handlers
│   │   └── markdown-file-handler.ts # File open interception
│   ├── ui/                     # UI controllers
│   │   └── title-bar-controller.ts # Context key sync
│   ├── types/                  # TypeScript definitions
│   │   ├── state.ts            # ViewMode, FileState
│   │   ├── config.ts           # ExtensionConfiguration
│   │   └── formatting.ts       # FormattingAction types
│   └── utils/                  # Utilities
│       └── l10n.ts             # Localization helper
├── tests/                      # Test suites
│   ├── unit/                   # Unit tests (mocked APIs)
│   ├── integration/            # Integration tests (real VS Code)
│   ├── fixtures/               # Test data files
│   └── suite/                  # Test runner configuration
├── docs/                       # Documentation (you are here)
├── assets/                     # Images and icons
├── package.json                # Extension manifest
├── tsconfig.json               # TypeScript config (source)
└── tsconfig.tests.json         # TypeScript config (tests)
```

## Development Workflow

### Daily Workflow

1. **Pull latest changes:**
   ```bash
   git pull origin main
   npm ci  # If package-lock.json changed
   ```

2. **Create a feature branch:**
   ```bash
   git checkout -b feature/my-feature
   ```

3. **Make changes and test:**
   ```bash
   npm run compile  # Build
   # Press F5 in VS Code to test
   npm test         # Run tests
   npm run lint     # Check style
   ```

4. **Commit and push:**
   ```bash
   git add .
   git commit -m "feat: add my feature"
   git push origin feature/my-feature
   ```

### Build Commands

| Command | Description |
|---------|-------------|
| `npm run compile` | Build source and tests (one-time) |
| `npm run lint` | Check code style with ESLint |
| `npm run lint -- --fix` | Auto-fix linting issues |
| `npm test` | Run integration tests |
| `npm run coverage` | Run tests with coverage report |
| `npm run package` | Create VSIX package |

## Running the Extension

### Launch Extension Development Host

1. Open the project in VS Code
2. Press `F5` (or **Run > Start Debugging**)
3. A new VS Code window opens with your extension loaded
4. Open any `.md` file to test preview behavior

### Reload After Changes

After making code changes:

1. Run `npm run compile` to rebuild
2. In the Extension Development Host window:
   - Press `Ctrl+Shift+F5` (Reload Window), or
   - Run **Developer: Reload Window** from Command Palette

> If you want automatic rebuilds, run `npx tsc -w -p .` in a separate terminal.

## Debugging

### Setting Breakpoints

1. Set breakpoints in `.ts` files in the `src/` directory
2. Press `F5` to start debugging
3. Breakpoints will hit when the code executes

### Debug Console

Use `console.log()` for quick debugging (will appear in the Debug Console panel), but remember to remove before committing since `console.log` is banned in production.

### Output Channel

The extension logs to the "Markdown Reader" output channel. View it via:

1. **View > Output** (or `Ctrl+Shift+U`)
2. Select "Markdown Reader" from the dropdown

### Logging Guidelines

- Use the `Logger` service for diagnostics (`info`, `warn`, `error`).
- Avoid `console.log` (linted as an error).
- Log decision points that change user-visible behavior.

### Debug Configurations

The project includes debug configurations in `.vscode/launch.json`:

- **Run Extension** - Launch Extension Development Host
- **Extension Tests** - Run tests with debugger attached

## Configuration

### Extension Settings

The extension reads settings from the `markdownReader` namespace:

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `enabled` | boolean | `true` | Enable/disable the extension |
| `excludePatterns` | string[] | `["**/node_modules/**", "**/.git/**"]` | Glob patterns to exclude |
| `maxFileSize` | number | `1048576` | Max file size for auto-preview (bytes) |

### Inspecting Settings

Use the **Markdown Preview: Inspect Configuration** command to see effective settings per scope in the Output panel.

### Testing with Different Settings

1. Open VS Code Settings (`Ctrl+,`)
2. Search for "markdownReader"
3. Modify settings and observe behavior

## Code Style

### TypeScript

- **Strict mode enabled** - No implicit `any`
- **ES2022 target** - Modern JavaScript features
- **Node16 modules** - CommonJS for VS Code compatibility

### ESLint Rules

Key rules enforced:

- `no-console` - Use Logger service instead
- `@typescript-eslint/no-explicit-any` - Avoid `any` type
- `unicorn/filename-case` - Kebab-case file names

### Formatting

Code is formatted with Prettier:

- Single quotes
- 2-space indentation
- 100-character line width
- Trailing commas

Run `npm run lint -- --fix` to auto-format.

### JSDoc Comments

All public functions require JSDoc comments:

```typescript
/**
 * Show markdown preview for the given URI.
 *
 * Opens VS Code's native markdown preview and updates internal state.
 *
 * @param uri - The URI of the markdown file to preview
 * @returns Promise that resolves when preview is shown
 * @throws {Error} If the preview command fails
 *
 * @example
 * ```typescript
 * await previewService.showPreview(document.uri);
 * ```
 */
async showPreview(uri: vscode.Uri): Promise<void> {
  // ...
}
```

## Localization

User-facing strings should go through the `t()` helper in `src/utils/l10n.ts`.
This keeps messaging consistent and ready for localization. Avoid hard-coded UI
strings in services and commands.

Manifest strings (command titles, submenu labels, settings descriptions) are
localized through `package.nls.json` using `%key%` placeholders in
`package.json`.

## Common Tasks

### Adding a New Command

1. **Define in `package.json`:**
   ```json
   {
     "command": "markdownReader.myCommand",
     "title": "My Command",
     "category": "Markdown Preview"
   }
   ```

2. **Create handler:**
   ```typescript
   // src/commands/my-commands.ts
   export async function myCommand(): Promise<void> {
     // Implementation
   }
   ```

3. **Register in `extension.ts`:**
   ```typescript
   vscode.commands.registerCommand('markdownReader.myCommand', myCommand)
   ```

### Adding a New Setting

1. **Define in `package.json`:**
   ```json
   "markdownReader.mySetting": {
     "type": "boolean",
     "default": true,
     "description": "Description of my setting"
   }
   ```

2. **Add to type definition:**
   ```typescript
   // src/types/config.ts
   export interface ExtensionConfiguration {
     // ...existing
     mySetting: boolean;
   }
   ```

3. **Read in ConfigService:**
   ```typescript
   mySetting: config.get('mySetting', DEFAULT_CONFIG.mySetting),
   ```

### Adding a New Test

See [TESTING.md](TESTING.md) for detailed testing guidelines.

## First PR Checklist

- [ ] `npm run compile` completes without errors
- [ ] `npm test` passes (integration tests)
- [ ] `npm run lint` passes
- [ ] Update docs if behavior changes (README + `docs/`)
- [ ] Ensure logs use `Logger` and are user-relevant

## Troubleshooting Development Issues

### Extension Not Loading

- Check the **Extension Development Host** window's **Output** panel for errors
- Ensure `npm run compile` completed successfully
- Try **Developer: Reload Window**

### Breakpoints Not Hitting

- Ensure source maps are enabled (`"sourceMap": true` in tsconfig.json)
- Rebuild with `npm run compile`
- Check that you're debugging the correct file

### Tests Failing

- Run `npm run compile` first
- Check that VS Code is not already running (close all windows)
- See [TESTING.md](TESTING.md) for test-specific issues

### TypeScript Errors

- Run `npm run compile` to see all errors
- Check `tsconfig.json` for correct settings
- Ensure `@types/vscode` version matches `engines.vscode`

## Related Documentation

- [ARCHITECTURE.md](ARCHITECTURE.md) - System design overview
- [TESTING.md](TESTING.md) - Test structure and guidelines
- [RELEASE.md](RELEASE.md) - Release process
- [CONTRIBUTING.md](../CONTRIBUTING.md) - Contribution guidelines
