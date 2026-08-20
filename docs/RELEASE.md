# Release

Use this checklist before publishing a Muninn release.

## Versioning and Channel

Muninn for VS Code is published to the VS Marketplace as `blueclouddev.muninn-vscode`, starting at
`0.1.0`.

- **Versions must be plain `major.minor.patch`.** `vsce publish` rejects semver prerelease tags such
  as `0.1.0-alpha.1` outright. The release workflow fails fast on this before running the test gate.
- **The git tag must equal the manifest version**, prefixed with `v` (`v0.1.0` ↔ `"version": "0.1.0"`).
- **`CHANGELOG.md` must contain a `## [<version>]` section.** The workflow extracts GitHub release
  notes from it and throws if the section is missing.
- **Pre-1.0 releases carry `"preview": true`** in `package.json`, which renders the Preview badge on
  the Marketplace listing. Drop the flag when cutting `1.0.0`.
- These four rules are enforced by `tests/unit/package-contributions.test.ts` and by the
  `Verify tag matches manifest version` workflow step.

Muninn currently ships on the **stable channel only**. If a pre-release channel is added later,
follow VS Code's convention of odd minors for pre-release (`0.3.x`) and even minors for stable
(`0.4.x`), and pass `--pre-release` to **both** `vsce package` and `vsce publish` — publishing with
the flag against a VSIX that was not packaged with it is a hard error.

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
