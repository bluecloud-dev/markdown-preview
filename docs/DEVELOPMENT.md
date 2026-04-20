# Development

## Prerequisites

- Node.js 20+
- VS Code 1.85+
- npm

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

- Host entrypoint: `src/extension.ts`
- Custom editor host: `src/custom-editor/`
- Webview editor: `src/webview/editor/`
- Integration policy: `src/integrations/`

## Activation Notes

- Muninn activates lazily through the custom editor contribution and contributed commands.
- It does not perform startup-time workspace editor-association rewrites.

## Local Workflow

1. Open the repo in VS Code.
2. Press `F5` to launch the Extension Development Host.
3. Open a markdown file and verify it opens in `muninn.markdownEditor`.
4. Use `Open Raw Markdown` when you need to inspect source-side behavior directly.

## Debugging

- Logs are written to `Output -> Muninn for VS Code`.
- Put breakpoints in `src/extension.ts` for host logic and `src/webview/editor/` for webview logic.
- When investigating sync issues, verify both the backing `TextDocument` and the active webview state.

## Documentation Expectations

When you change architecture, commands, settings, or UX behavior, update the affected docs in the same change. The implementation and the docs should tell the same story.
