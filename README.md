# Muninn for VS Code

Muninn is a reading-first markdown workspace for specs, ADRs, RFCs, and long-form developer docs inside VS Code. It opens markdown in a desktop custom editor that keeps the reading surface clean while still supporting routine authoring without bouncing out to raw source for every change.

![Muninn for VS Code](https://raw.githubusercontent.com/bluecloud-dev/muninn-vscode/main/assets/hero.png)

> **Preview release.** Muninn is published with the Marketplace Preview flag while the reading and authoring surfaces settle. It is stable enough for daily use, but commands, settings, and defaults may still change before `1.0.0`. Feedback and bug reports are welcome in [issues](https://github.com/bluecloud-dev/muninn-vscode/issues).

Muninn registers itself as the **default editor for `.md` and `.markdown`** files. To open a file in the plain text editor instead, use `Reopen With…` and pick `Text Editor`, or use the `Open Raw Markdown` button in the editor title bar.

## Product Shape

- Desktop-first VS Code custom editor for `.md` and `.markdown`
- Single-pane reading surface with a built-in authoring toolbar
- Focus mode that hides authoring chrome and constrains line width for long reads
- Native Explorer outline for jumping through sections in specs and docs
- Keyboard-first authoring commands for headings, lists, links, code blocks, and tables
- Raw markdown escape hatch via `muninn.openRawMarkdown`
- Trust-aware Mermaid rendering
- Source-preserving table editing
- File-based note taking only: no backlinks, graph, daily notes, templates, vault system, or separate note database
- No telemetry

Muninn no longer rewrites `workbench.editorAssociations`. Markdown ownership comes from the custom editor contribution itself, which keeps activation lazy and avoids mutating workspace settings on startup.

## Commands

- `muninn.openRawMarkdown`
- `muninn.toggleFocusMode`
- `muninn.goToSection`
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

`muninn.toolbar.mode` controls editing density only: `basic` keeps the default reading-oriented toolbar, `advanced` adds expanded authoring controls, and focus mode ignores both while staying minimal.

## Development

```bash
npm ci
npm run lint
npm run typecheck
npm run bundle
npm test
```

Run `npm run coverage` when changing host-side services or document sync behavior, and run `npm run test:e2e` when changing webview/editor UX, toolbar behavior, table flows, or Mermaid behavior.
`npm run bundle` emits bundle metadata and enforces the initial webview payload budget.

## Docs

- [Getting Started](https://github.com/bluecloud-dev/muninn-vscode/blob/main/docs/GETTING_STARTED.md)
- [Architecture](https://github.com/bluecloud-dev/muninn-vscode/blob/main/docs/ARCHITECTURE.md)
- [Roadmap](https://github.com/bluecloud-dev/muninn-vscode/blob/main/docs/ROADMAP.md)
- [Testing](https://github.com/bluecloud-dev/muninn-vscode/blob/main/docs/TESTING.md)
- [Changelog](https://github.com/bluecloud-dev/muninn-vscode/blob/main/CHANGELOG.md)
- [Migrating from `blueclouddev.markdown-preview`](https://github.com/bluecloud-dev/muninn-vscode/blob/main/docs/MIGRATION_FROM_MARKDOWN_PREVIEW.md)
- [Contributing](https://github.com/bluecloud-dev/muninn-vscode/blob/main/CONTRIBUTING.md)

## License

MIT
