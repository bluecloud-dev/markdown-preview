# Getting Started

## Prerequisites

- Node.js 20+
- VS Code 1.85+

## Setup

```bash
git clone https://github.com/bluecloud-dev/muninn-vscode.git
cd muninn-vscode
npm ci
npm run compile
npm run bundle
```

## Run The Extension

1. Open the repo in VS Code.
2. Press `F5`.
3. In the Extension Development Host, open any `.md` or `.markdown` file.

Expected result:

- The file opens in `muninn.markdownEditor`.
- The Muninn toolbar is visible in the custom editor.
- `Muninn Outline` appears under Explorer while the Muninn editor is active.
- `Open Raw Markdown` is available as the fallback path to source editing.

## Useful Commands

- `Muninn for VS Code: Open Raw Markdown`
- `Muninn for VS Code: Toggle Focus Mode`
- `Muninn for VS Code: Go to Section`
- `Muninn for VS Code: Toggle Bold`
- `Muninn for VS Code: Toggle Italic`
- `Muninn for VS Code: Insert Link`
- `Muninn for VS Code: Set Heading 1`
- `Muninn for VS Code: Set Heading 2`
- `Muninn for VS Code: Set Heading 3`
- `Muninn for VS Code: Set Paragraph`
- `Muninn for VS Code: Toggle Bullet List`
- `Muninn for VS Code: Toggle Numbered List`
- `Muninn for VS Code: Insert Mermaid Block`
- `Muninn for VS Code: Insert Table`
- `Muninn for VS Code: Insert Code Block`
- `Muninn for VS Code: Table Actions`

The same actions are available through keyboard shortcuts while the Muninn editor is active, including `Ctrl/Cmd+B`, `Ctrl/Cmd+I`, `Ctrl/Cmd+K`, `Ctrl/Cmd+Alt+1/2/3/0`, `Ctrl/Cmd+Shift+8/7`, `Ctrl/Cmd+Alt+T`, and `Ctrl/Cmd+Alt+C`.

## If Markdown Opens Elsewhere

Muninn does not rewrite `workbench.editorAssociations`. If another extension or user preference owns markdown files in your environment, use `Reopen With...` and choose `Muninn Markdown Editor` while testing.
