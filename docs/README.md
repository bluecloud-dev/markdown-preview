# Documentation

This folder contains the active engineering documentation for Muninn.

## Source Of Truth

- The current implementation is the primary source of truth.
- `docs/ARCHITECTURE.md` describes the live system shape.
- `docs/ROADMAP.md` describes the intended product direction.
- `specs/markdown-preview/` is legacy preview-first material and should not be used as the current product definition.

## Index

- [GETTING_STARTED.md](GETTING_STARTED.md)
  Local setup and first-run workflow
- [ARCHITECTURE.md](ARCHITECTURE.md)
  Host/webview split, activation model, and data flow
- [DEVELOPMENT.md](DEVELOPMENT.md)
  Day-to-day contributor workflow
- [TESTING.md](TESTING.md)
  Test layers and verification commands
- [ROADMAP.md](ROADMAP.md)
  Product milestones
- [MIGRATION_FROM_MARKDOWN_PREVIEW.md](MIGRATION_FROM_MARKDOWN_PREVIEW.md)
  Rename and breaking-change guidance from the legacy extension
- [RELEASE.md](RELEASE.md)
  Release process
- [TROUBLESHOOTING.md](TROUBLESHOOTING.md)
  Common maintainer issues

## Project Layout

```text
src/
  extension.ts
  custom-editor/
  integrations/
  services/
  shared/
  types/
  utils/
  webview/editor/
tests/
  unit/
  integration-cli/
  e2e/
  fixtures/
docs/
specs/
assets/
```
