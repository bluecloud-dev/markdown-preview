# Getting Started

Welcome! This guide walks you through setting up the Markdown Preview extension for development, from cloning the repository to making your first contribution.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Quick Start (5 Minutes)](#quick-start-5-minutes)
- [Detailed Setup](#detailed-setup)
- [Verifying Your Setup](#verifying-your-setup)
- [Making Your First Change](#making-your-first-change)
- [Troubleshooting Setup Issues](#troubleshooting-setup-issues)
- [Next Steps](#next-steps)

## Prerequisites

Before you begin, ensure you have the following installed:

| Tool | Version | How to Check | Installation Link |
|------|---------|--------------|-------------------|
| Node.js | LTS (20.x+) | `node --version` | [nodejs.org](https://nodejs.org/) |
| VS Code | 1.107+ | `code --version` | [code.visualstudio.com](https://code.visualstudio.com/) |
| Git | Latest | `git --version` | [git-scm.com](https://git-scm.com/) |

## Quick Start (5 Minutes)

If you're familiar with VS Code extension development, here's the fast track:

```bash
# Clone and setup
git clone https://github.com/ayhammouda/markdown-preview.git
cd markdown-preview
npm ci
npm run compile

# Launch (in VS Code)
# Press F5
```

Then open any `.md` file in the Extension Development Host window to verify it opens in preview mode.

## Detailed Setup

### Step 1: Clone the Repository

```bash
git clone https://github.com/ayhammouda/markdown-preview.git
cd markdown-preview
```

### Step 2: Install Dependencies

```bash
npm ci
```

> **Why `npm ci` instead of `npm install`?**
> `npm ci` installs exact versions from `package-lock.json`, ensuring consistent builds across all machines. Use `npm install` only when updating dependencies.

### Step 3: Build the Extension

```bash
npm run compile
```

This compiles:
- Extension source code (`src/` → `out/`)
- Test files (`tests/` → `out/tests/`)

You should see no errors. If you do, check [Troubleshooting](#troubleshooting-setup-issues).

### Step 4: Launch the Extension Development Host

1. Open the `markdown-preview` folder in VS Code
2. Press `F5` (or **Run > Start Debugging**)
3. A new VS Code window opens with `[Extension Development Host]` in the title

> **What is the Extension Development Host?**
> It's a special VS Code instance that loads your extension from source, allowing you to test changes without packaging or installing.

## Verifying Your Setup

In the Extension Development Host window, perform these checks:

### Check 1: Preview Opens by Default

1. Open any `.md` file (e.g., `README.md`)
2. **Expected:** File opens in rendered preview mode, not raw markdown

### Check 2: Edit Mode Works

1. Open Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`)
2. Run **Markdown Preview: Enter Edit Mode**
3. **Expected:** Split view appears with editor (left) and preview (right)

### Check 3: Exit Edit Mode Works

1. Click the **Done (Exit Edit Mode)** button in the editor title bar
2. **Expected:** Returns to preview-only mode

### Check 4: Keyboard Shortcut Works

1. Open a markdown file in preview
2. Press `Ctrl+Shift+V` (or `Cmd+Shift+V` on Mac)
3. **Expected:** Toggles between preview and edit modes

If all checks pass, your setup is complete!

## Making Your First Change

Let's make a small change to verify the development cycle:

### Step 1: Edit the Code

Open `src/extension.ts` and find the `activate` function. Add a temporary log line:

```typescript
export function activate(context: vscode.ExtensionContext): void {
  // Add this line temporarily
  console.log('My first change!');

  const disposables: vscode.Disposable[] = [];
  // ... rest of the function
}
```

### Step 2: Rebuild and Reload

1. Run `npm run compile` in the terminal
2. In the Extension Development Host, press `Ctrl+Shift+F5` (Reload Window)

### Step 3: Verify Your Change

1. Open the Debug Console in your main VS Code window
2. You should see "My first change!" logged

### Step 4: Clean Up

Remove the temporary log line and rebuild.

## Common Commands

| Command | Purpose |
|---------|---------|
| `npm run compile` | Build source and tests |
| `npm test` | Run integration tests |
| `npm run coverage` | Run unit tests with coverage report |
| `npm run lint` | Check code style with ESLint |
| `npm run lint -- --fix` | Auto-fix linting issues |
| `npm run package` | Create `.vsix` package |

## Troubleshooting Setup Issues

### "Cannot find module" Errors

```bash
rm -rf node_modules
npm ci
npm run compile
```

### TypeScript Compilation Errors

1. Check that VS Code is using the workspace TypeScript version:
   - Open Command Palette
   - Run **TypeScript: Select TypeScript Version**
   - Select **Use Workspace Version**

### Extension Doesn't Load

1. Check the **Output** panel in the Extension Development Host
2. Select "Extension Host" from the dropdown
3. Look for error messages related to "markdown-preview"

### Tests Fail to Run

Close any other VS Code windows and try again. The test runner needs exclusive access.

## Project Structure at a Glance

```
markdown-preview/
├── src/                    # Source code (start here!)
│   ├── extension.ts        # Entry point - activation/deactivation
│   ├── commands/           # Command handlers
│   ├── services/           # Business logic
│   ├── handlers/           # Event handlers
│   ├── ui/                 # UI controllers
│   └── types/              # TypeScript types
├── tests/                  # Test files
├── docs/                   # Documentation (you are here)
├── package.json            # Extension manifest
└── tsconfig.json           # TypeScript config
```

## Next Steps

Now that your environment is set up:

1. **Understand the architecture:** Read [ARCHITECTURE.md](ARCHITECTURE.md)
2. **Learn the workflow:** Read [DEVELOPMENT.md](DEVELOPMENT.md)
3. **Run the tests:** Read [TESTING.md](TESTING.md)
4. **Find an issue:** Look for `good-first-issue` labels on GitHub

## Need Help?

- **Documentation questions:** Check the [docs/README.md](README.md) index
- **Bugs or issues:** [Open an issue](https://github.com/ayhammouda/markdown-preview/issues)
- **Troubleshooting:** See [TROUBLESHOOTING.md](TROUBLESHOOTING.md)
