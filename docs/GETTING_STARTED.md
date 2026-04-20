# Getting Started

## Prerequisites

- Node.js 20+
- VS Code 1.85+

## Quick Setup

```bash
git clone https://github.com/bluecloud-dev/muninn-vscode.git
cd muninn-vscode
npm ci
npm run compile
npm run bundle
```

## Run Extension Host

1. Open the repo in VS Code.
2. Press `F5`.
3. In the Extension Development Host, open `README.md` or any `.md` file.

Expected behavior:

- Markdown opens with `muninn.markdownEditor` by default.
- Toolbar is visible in the custom editor.

## Sanity Commands

```bash
npm run format:check
npm run lint
npm run typecheck
npm test
```

## Useful Commands in VS Code

- `Muninn for VS Code: Toggle Bold`
- `Muninn for VS Code: Toggle Italic`
- `Muninn for VS Code: Insert Mermaid Block`
- `Muninn for VS Code: Table Actions`
- `Muninn for VS Code: Open Raw Markdown`

## Common Issue

If Markdown still opens in the native editor, set:

```json
{
  "workbench.editorAssociations": {
    "*.md": "muninn.markdownEditor",
    "*.markdown": "muninn.markdownEditor"
  }
}
```

Muninn also tries to set this automatically when `muninn.editorAssociations` is enabled.
