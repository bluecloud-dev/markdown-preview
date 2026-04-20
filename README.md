# Muninn for VS Code

Muninn is a reading-first markdown workspace for specs, ADRs, RFCs, and long-form developer docs inside VS Code. It opens markdown in a desktop custom editor that keeps the reading surface clean while still supporting routine authoring without bouncing out to raw source for every change.

## Product Shape

- Desktop-first VS Code custom editor for `.md` and `.markdown`
- Single-pane reading surface with a built-in authoring toolbar
- Raw markdown escape hatch via `muninn.openRawMarkdown`
- Trust-aware Mermaid rendering
- Source-preserving table editing
- No telemetry

Muninn no longer rewrites `workbench.editorAssociations`. Markdown ownership comes from the custom editor contribution itself, which keeps activation lazy and avoids mutating workspace settings on startup.

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

- `muninn.integrations.mermaid.enabled`
- `muninn.integrations.mermaid.allowInUntrustedWorkspaces`
- `muninn.toolbar.mode`

## Development

```bash
npm ci
npm run lint
npm run typecheck
npm test
```

Run `npm run coverage` when changing host-side services or document sync behavior, and run `npm run test:e2e` when changing webview/editor UX, toolbar behavior, table flows, or Mermaid behavior.

## Docs

- [Getting Started](./docs/GETTING_STARTED.md)
- [Architecture](./docs/ARCHITECTURE.md)
- [Roadmap](./docs/ROADMAP.md)
- [Testing](./docs/TESTING.md)
- [Contributing](./CONTRIBUTING.md)

## License

MIT
