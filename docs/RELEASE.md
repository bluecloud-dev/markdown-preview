# Release

Use this checklist before publishing a Muninn release.

## Verification Gate

Run these commands and keep the output:

```bash
npm run lint
npm run typecheck
npm test
npm run coverage
npm run test:e2e
```

## Product Truth Gate

Before release, verify that these all describe the same product:

- `README.md`
- `docs/ARCHITECTURE.md`
- `docs/ROADMAP.md`
- `docs/MIGRATION_FROM_MARKDOWN_PREVIEW.md`
- `package.json` description, keywords, commands, and settings

Muninn should be described as a reading-first markdown custom editor with a raw-markdown escape hatch. Do not ship preview-first or edit-mode language.

## Packaging

```bash
npm run package
```

Validate that the VSIX includes:

- compiled extension output
- `package.json`
- `README.md`
- `LICENSE`
- release assets referenced by the marketplace copy

## Manual Checks

- Open a markdown file and confirm it opens in `muninn.markdownEditor`
- Confirm the editor title bar shows only `Open Raw Markdown`
- Confirm formatting and insertion flows remain available through the Muninn toolbar and command palette
- Confirm Mermaid behavior in trusted and untrusted workspaces
- Confirm raw markdown fallback still works

## Release Notes

Document:

- user-visible behavior changes
- setting and command changes
- any breaking migration notes
- updated screenshots or GIFs when the UX changed
