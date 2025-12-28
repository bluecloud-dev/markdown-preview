# Markdown Preview

<p align="center">
  <img src="https://raw.githubusercontent.com/bluecloud-dev/markdown-preview/main/assets/hero.png" alt="Markdown Preview hero banner" width="840">
</p>

<p align="center">
  <a href="https://github.com/bluecloud-dev/markdown-preview/actions/workflows/ci.yml">
    <img src="https://github.com/bluecloud-dev/markdown-preview/actions/workflows/ci.yml/badge.svg" alt="CI status">
  </a>
  <a href="https://github.com/bluecloud-dev/markdown-preview/releases">
    <img src="https://img.shields.io/github/v/release/bluecloud-dev/markdown-preview?include_prereleases&label=release" alt="Latest release">
  </a>
  <a href="LICENSE">
    <img src="https://img.shields.io/github/license/bluecloud-dev/markdown-preview" alt="License">
  </a>
</p>

<p align="center">
  Open markdown files in preview mode by default with a focused, reading-first workflow.
</p>

<!-- Marketplace badges will go here once published -->

---

## Status

Preview-by-default, edit mode, formatting toolbar actions, context menu formatting, keyboard shortcuts, and configuration are available.

## Table of Contents

- [Feature Overview](#feature-overview)
- [Features](#features)
- [Installation](#installation)
- [Requirements](#requirements)
- [Quick Start](#quick-start)
- [Commands](#commands)
- [Keyboard Shortcuts](#keyboard-shortcuts)
- [Settings](#settings)
- [Accessibility & Keyboard Navigation](#accessibility--keyboard-navigation)
- [Known Limitations](#known-limitations)
- [How It Works](#how-it-works)
- [Privacy](#privacy)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [Changelog](#changelog)
- [License](#license)

## Feature Overview

Markdown Preview keeps markdown content readable by default and gives you a fast split view when you need to edit.

<p align="center">
  <img src="https://raw.githubusercontent.com/bluecloud-dev/markdown-preview/main/assets/hero.png" alt="Markdown Preview split view" width="840">
</p>

## Features

- Open markdown files in preview mode by default (Explorer, Quick Open, and file links).
- Show a one-time welcome message with an optional quick-start link.
- Skip auto-preview for large files (>1MB) with opt-in preview and per-file opt-out.
- Detect binary markdown files and fall back to the text editor with a warning.
- Detect git conflict markers and open in edit mode to resolve conflicts.
- Enter edit mode to get a split view (editor left, preview right) with a Done button.
- Format text in edit mode with toolbar actions for bold, italic, strikethrough, lists, code, links, and headings.
- Use a Format context menu (right-click) with heading and code submenus while editing.
- Use keyboard shortcuts for toggle, bold, and italic in markdown edit mode.
- Log preview failures and conflicts to the **Markdown Reader** Output channel.
- Announce mode changes via transient status bar messages.
- Configure preview behavior (enabled, exclude patterns, max file size) per workspace or file.

## Installation

- **Marketplace (when published):** Open the Extensions view in VS Code and search for **Markdown Preview**.
- **VSIX:** Download the `.vsix` asset from the GitHub Releases page and run:
  ```sh
  code --install-extension markdown-preview.vsix
  ```

## Requirements

- VS Code **1.85.0 or later**

## Quick Start

1. Open any `.md` file to see the preview immediately.
2. Run **Markdown Preview: Enter Edit Mode** (or `Ctrl+Shift+V`) to open a split editor.
3. Click **Done** or run **Markdown Preview: Done (Exit Edit Mode)** to return to preview-only mode.

## Commands

- **Markdown Preview: Enter Edit Mode** — open split editor (text left, preview right)
- **Markdown Preview: Done (Exit Edit Mode)** — return to preview-only mode
- **Markdown Preview: Toggle Edit Mode** — switch between modes (`Ctrl+Shift+V`)
- **Markdown Preview: Inspect Configuration** — show effective settings in the Output panel
- **Markdown Preview: Bold** — wrap selection with `**`
- **Markdown Preview: Italic** — wrap selection with `_`
- **Markdown Preview: Strikethrough** — wrap selection with `~~`
- **Markdown Preview: Bullet List** — toggle `- ` prefix
- **Markdown Preview: Numbered List** — toggle `1. ` prefix
- **Markdown Preview: Inline Code** — wrap selection with backticks
- **Markdown Preview: Code Block** — wrap selection with triple backticks
- **Markdown Preview: Link** — prompt for URL and wrap selection
- **Markdown Preview: Heading 1** — toggle `# ` prefix
- **Markdown Preview: Heading 2** — toggle `## ` prefix
- **Markdown Preview: Heading 3** — toggle `### ` prefix

## Keyboard Shortcuts

| Action | Windows/Linux | macOS | When |
| --- | --- | --- | --- |
| Toggle Edit Mode | `Ctrl+Shift+V` | `Cmd+Shift+V` | Markdown file |
| Bold | `Ctrl+B` | `Cmd+B` | Edit mode only |
| Italic | `Ctrl+I` | `Cmd+I` | Edit mode only |

> Tip: Add your own keybindings in VS Code for the other formatting commands.

## Settings

| Setting | Default | Description |
| --- | --- | --- |
| `markdownReader.enabled` | `true` | Enable preview-by-default behavior. |
| `markdownReader.excludePatterns` | `**/node_modules/**`, `**/.git/**` | Glob patterns that should open in the text editor instead. |
| `markdownReader.maxFileSize` | `1048576` | Maximum file size (bytes) before auto-preview is skipped. |
| `markdownReader.editorAssociations` | `true` | Add a workspace editor association so markdown files open directly in preview (reduces flicker). |

> **Note:** If you don't want the extension to modify your workspace settings (`.vscode/settings.json`), set `markdownReader.editorAssociations` to `false` in your **User** settings. This will prevent the extension from adding `workbench.editorAssociations` entries, though you may notice a brief flicker when opening markdown files.

## Accessibility & Keyboard Navigation

- Mode changes are announced through transient status bar messages.
- Use `Ctrl+Shift+V` / `Cmd+Shift+V` to move between preview and edit modes.
- Run **Toggle Tab Key Moves Focus** (Command Palette) to enable UI tabbing.
- Tab/Shift+Tab moves focus across toolbar buttons; Enter/Space activates; Escape returns focus to the editor.

## Known Limitations

- Formatting shortcuts beyond bold/italic require custom keybindings in VS Code.
- Split ratio and layout are controlled by VS Code; the extension cannot force a 50/50 ratio.

## How It Works

- Uses VS Code's native markdown preview for rendering and live updates.
- Auto-preview is skipped for untitled files, diff views, excluded paths, large files, and conflict markers.

## Privacy

- **No telemetry** — nothing is collected or sent externally.
- **No custom webviews** — uses VS Code's native markdown preview.

## Troubleshooting

- If a file opens in preview and you want to edit, run **Enter Edit Mode** or disable the extension.
- If preview fails to load, check the **Markdown Reader** Output channel for details.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for contribution guidelines.

```sh
git clone https://github.com/bluecloud-dev/markdown-preview.git
cd markdown-preview
npm ci
npm test
npm run lint
```

Open the project in VS Code and press `F5` to launch the Extension Development Host.

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for version history.

## License

[MIT](LICENSE)

---

<p align="center">
  <a href="https://github.com/bluecloud-dev/markdown-preview/issues">Report a Bug</a>
  ·
  <a href="https://github.com/bluecloud-dev/markdown-preview/issues">Request a Feature</a>
</p>
