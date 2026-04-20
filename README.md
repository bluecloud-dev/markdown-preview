# Muninn for VS Code

Muninn provides a reading-first Markdown experience in VS Code with a custom editor as the default for `.md` and `.markdown` files.

## Highlights

- Custom markdown editor (`muninn.markdownEditor`) opens by default.
- Single-pane rich editing toolbar with grouped Text/Structure/Insert actions.
- Mermaid block insertion with inline preview panel and guarded rendering.
- In-editor table node view with editable grid, add-row/add-column, and source toggle.
- Raw markdown escape hatch command.
- Workspace trust-aware Mermaid gating.
- No telemetry.

## Commands

- `muninn.openRawMarkdown`
- `muninn.toggleBold`
- `muninn.toggleItalic`
- `muninn.setHeading1`
- `muninn.setHeading2`
- `muninn.setHeading3`
- `muninn.setParagraph`
- `muninn.toggleBulletList`
- `muninn.toggleNumberedList`
- `muninn.insertLink`
- `muninn.insertMermaidBlock`
- `muninn.insertTable`
- `muninn.insertCodeBlock`
- `muninn.addTableRow`
- `muninn.addTableColumn`
- `muninn.tableActions`
- `muninn.inspectConfiguration`

## Settings

- `muninn.editorAssociations`
- `muninn.integrations.mermaid.enabled`
- `muninn.integrations.mermaid.allowInUntrustedWorkspaces`
- `muninn.toolbar.mode` (`basic` or `advanced`)

## Development

```bash
npm ci
npm run compile
npm run bundle
npm run lint
npm run format:check
npm run typecheck
npm test
npm run test:e2e
```

## Packaging

```bash
npm run package
```

## License

MIT
