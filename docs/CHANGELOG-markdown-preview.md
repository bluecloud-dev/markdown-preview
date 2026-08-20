# Legacy Changelog — `blueclouddev.markdown-preview`

This file preserves the release history of the predecessor Marketplace listing
`blueclouddev.markdown-preview`, which was a preview-first markdown extension.

Muninn for VS Code (`blueclouddev.muninn-vscode`) is a separate Marketplace listing with its own
version history starting at `0.1.0`. See [`CHANGELOG.md`](../CHANGELOG.md) for the current product.

See [`MIGRATION_FROM_MARKDOWN_PREVIEW.md`](./MIGRATION_FROM_MARKDOWN_PREVIEW.md) for the migration
path between the two.

---

## [2.0.0] - 2026-02-21

### Changed

- First major rebrand release under the Muninn suite identity

### Breaking

- New extension identifier: `blueclouddev.muninn-vscode`
- Hard namespace break:
  - Settings: `markdownReader.*` → `muninn.*`
  - Commands: `markdownReader.*` → `muninn.*`
  - Context keys: `markdownReader.*` → `muninn.*`
- Existing user/workspace settings and custom keybindings using `markdownReader.*` must be migrated manually

## [1.0.1] - 2025-12-28

### Fixed

- Ensure exit edit mode closes the correct markdown editor tab(s)
- Clear pending open debounces when the file handler is disposed

## [1.0.0] - 2025-12-27

### Added

- Conflict marker detection that opens files directly in edit mode
- Preview failure fallback with an Open in Editor action and Output channel logging
- Status bar announcements for edit/preview mode transitions
- Performance validation tests for preview open and mode switching targets
- Marketplace metadata improvements (keywords, license)
- Expanded README with installation, accessibility notes, and troubleshooting details
- Developer docs (architecture, testing, release, troubleshooting, getting started)
- Manual acceptance checklist for quickstart scenarios and accessibility flows

### Changed

- Debounced markdown file open handling to reduce rapid event churn
- Binary preview warning text aligned with specification wording
- Localized command titles, submenu labels, and settings descriptions

## [0.4.0] - 2025-12-27

### Added

- Configuration settings for enablement, exclusion patterns, and max file size
- Inspect Configuration command for effective settings diagnostics
- Configuration integration tests for exclusions, disabled state, and workspace overrides

### Changed

- Configuration cache reloads and context updates when settings change

## [0.3.0] - 2025-12-27

### Added

- Format context menu with heading and code submenus in edit mode
- Keyboard shortcuts for toggle edit mode, bold, and italic (edit mode only)
- Context menu and shortcut coverage in integration tests

## [0.2.0] - 2025-12-27

### Added

- Formatting toolbar actions in edit mode for bold, italic, strikethrough, lists, code, links, and headings
- Formatting commands with selection-aware placeholder handling
- URL prompt placeholder for link insertion

### Changed

- Formatting commands now require an active markdown editor
- Settings resolve per resource/workspace scope

## [0.1.0] - 2025-12-27

### Added

- Preview markdown files by default using VS Code's native renderer
- Edit mode split view with Done button and toggle command
- Large file handling with opt-in preview and per-file opt-out
- Binary markdown detection fallback with warning
- One-time welcome message with quick-start link
- Localization scaffolding for user-facing strings
