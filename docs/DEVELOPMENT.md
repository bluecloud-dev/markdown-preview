# Development Guide

## Prerequisites

- Node.js 20+
- VS Code 1.85+
- npm

## Setup

```bash
git clone https://github.com/bluecloud-dev/muninn-vscode.git
cd muninn-vscode
npm ci
```

## Core Commands

```bash
npm run format
npm run format:check
npm run lint
npm run typecheck
npm run compile
npm run bundle
npm test
npm run coverage
npm run test:e2e
```

## Runtime Shape

- Host entrypoint: `/Users/aymenhammouda/workspace/markdown-reader/src/extension.ts`
- Custom editor host: `/Users/aymenhammouda/workspace/markdown-reader/src/custom-editor/`
- Webview editor: `/Users/aymenhammouda/workspace/markdown-reader/src/webview/editor/`

## Run in VS Code

1. Open the repo in VS Code.
2. Press `F5` (`Run Extension`).
3. In the Extension Development Host, open an `.md` file.

Expected: file opens with `muninn.markdownEditor`.

## Debugging

- Logs use the `Logger` service and appear in **Output → Muninn for VS Code**.
- Use breakpoints in `src/` and run `F5`.

## Tests

- Integration config: `/Users/aymenhammouda/workspace/markdown-reader/.vscode-test.mjs`
- E2E config: `/Users/aymenhammouda/workspace/markdown-reader/wdio.conf.cjs`
- Unit runner: `/Users/aymenhammouda/workspace/markdown-reader/scripts/run-unit-tests.js`

## Packaging

```bash
npm run package
```

Generated VSIX appears in repo root.
