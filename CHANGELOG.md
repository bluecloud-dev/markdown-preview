# Changelog

All notable changes to this project will be documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

Muninn for VS Code (`blueclouddev.muninn-vscode`) is a new Marketplace listing and starts its
version history at `0.1.0`. The release history of its predecessor listing
`blueclouddev.markdown-preview` is preserved in
[`docs/CHANGELOG-markdown-preview.md`](./docs/CHANGELOG-markdown-preview.md).

## [Unreleased]

## [0.1.0] - 2026-08-20

First public preview release of Muninn for VS Code: a reading-first markdown workspace for specs,
ADRs, RFCs, and long-form developer documentation.

This release is published with the Marketplace **Preview** flag while the reading and authoring
surfaces settle. Commands, settings, and the webview protocol may still change before `1.0.0`.

### Added

- Desktop custom editor (`muninn.markdownEditor`) for `.md` and `.markdown`, registered as the
  default editor for those files
- Single-pane reading surface with a built-in authoring toolbar
- Focus mode as workspace-persisted UI state through `muninn.toggleFocusMode`
- Native Explorer `Muninn Outline` view and `muninn.goToSection` navigation, driven by host-owned
  markdown heading parsing and typed webview section reveal messages
- Keyboard-first authoring commands and shortcuts for bold, italic, headings, paragraph, lists,
  links, code blocks, tables, and Mermaid blocks
- Toolbar selection feedback for the active block, list, table, code, and inline mark state
- `muninn.toolbar.mode` to choose authoring density: `basic` for the reading-oriented toolbar,
  `advanced` for expanded editing controls
- Source-preserving table editing that round-trips back to markdown
- Trust-aware Mermaid rendering, disabled by default in restricted workspaces and gated by
  `muninn.integrations.mermaid.enabled` and
  `muninn.integrations.mermaid.allowInUntrustedWorkspaces`
- Raw markdown escape hatch via `muninn.openRawMarkdown`
- `muninn.inspectConfiguration` for effective-settings diagnostics in the output channel
- esbuild bundling pipeline with code-split webview chunks, generated bundle metadata, and a budget
  gate on the initial webview payload
- Localization scaffolding via `package.nls.json` and `l10n/bundle.l10n.json`
- Migration guide from `blueclouddev.markdown-preview`

### Security

- Strict webview CSP with a per-render nonce and `localResourceRoots` limited to `media/`
- No telemetry of any kind, enforced in CI by `npm run check:no-telemetry`

### Notes for users of `blueclouddev.markdown-preview`

- Muninn is a **separate** Marketplace listing. Installing it does not upgrade or remove the
  predecessor extension; uninstall `blueclouddev.markdown-preview` to avoid two extensions
  competing for markdown.
- Settings, commands, and context keys use the `muninn.*` namespace. `markdownReader.*` settings and
  custom keybindings must be migrated manually.
- Muninn does not write to `workbench.editorAssociations`. It claims `.md` and `.markdown` through
  its custom editor contribution instead, which keeps activation lazy and leaves your workspace
  settings untouched. To opt out, use `Reopen With…` and pick `Text Editor`, or set
  `workbench.editorAssociations` yourself.
- `blueclouddev.markdown-preview` is migration-only and no longer receives feature updates.
