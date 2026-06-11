# Release Guide

This guide covers packaging and publishing for `muninn-vscode`.

## Versioning

We follow SemVer:

- `X.Y.Z` for stable releases (even minor)
- Pre-release: plain `X.Y.Z` with an ODD minor (e.g. `1.1.x`), published with `vsce publish --pre-release` — the Marketplace rejects semver pre-release suffixes (`-alpha.N`) in the manifest version

The version line restarted at `1.0.0` on 2026-06-11: all legacy tags and releases (`v0.x`–`v1.0.1` "Markdown Reader" line, `v2.0.0-alpha.1`) were deleted, and the first release of the v2 custom editor ships as exactly `1.0.0` (stable). This supersedes the `1.99.x`/`2.0.0` scheme from issue #243.

## Pre-Release Checklist

### 1) Quality gates

```bash
npm run lint
npm run format:check
npm run typecheck
npm run coverage
npm test
npm run test:e2e
npm run check:no-telemetry
```

### 2) Docs alignment

- `README.md` matches shipped commands/settings.
- `CHANGELOG.md` has accurate version notes.
- `docs/` reflects current custom-editor architecture.
- v2 custom-editor behavior supersedes the legacy v1 preview-first spec (`specs/markdown-preview/spec.md`) until that spec is rewritten.

#### Visual QA

- [ ] `assets/hero.png` uses Muninn branding.
- [ ] `assets/icon.png` is 128x128 and readable at small sizes.
- [ ] Light theme screenshot reviewed.
- [ ] Dark theme screenshot reviewed.
- [ ] High contrast focus screenshot reviewed.
- [ ] Table source mode screenshot reviewed.
- [ ] Mermaid preview screenshot reviewed.

### 3) Manifest sanity

Verify `package.json` values:

- `name`: `muninn-vscode`
- `publisher`: `blueclouddev`
- `version`: target release version
- `main`: `dist/extension.js`
- `icon`: `assets/icon.png`
- `preview`: true for pre-release, false for stable

### 4) Build and package

```bash
npm run compile
npm run bundle
npm run package
```

Expected artifact:

- `muninn-vscode-<version>.vsix`

## Local Package Validation

1. Install from VSIX in VS Code.
2. Open `.md` file and verify custom editor loads.
3. Verify:
   - toolbar formatting actions
   - table insert + source apply
   - Mermaid insert/render
   - raw markdown fallback command

## Git Tag and Release

```bash
git add package.json CHANGELOG.md README.md docs
git commit -m "chore(release): vX.Y.Z"
git tag -a vX.Y.Z -m "Release vX.Y.Z"
git push origin main
git push origin vX.Y.Z
```

## CI/CD Release Workflow

The repo includes `.github/workflows/release.yml` for tag-driven releases.

It runs:

1. classify the tag (`vX.Y.Z` required; odd minor → pre-release) and verify it matches `package.json`
2. validate `VSCE_PAT` and `OVSX_PAT` secrets
3. install + lint + format + typecheck
4. compile + bundle
5. coverage + integration + no-telemetry guard
6. package VSIX and extract release notes from `CHANGELOG.md`
7. publish the same VSIX to the VS Code Marketplace and Open VSX
8. create the GitHub release with the VSIX attached

A `workflow_dispatch` run with a `tag` input rehearses everything except the
registry publishes and the GitHub release — use it to validate the pipeline
before pushing a real tag.

## Rollback Strategy

If a release is broken:

1. publish patched version (`+1` patch)
2. update changelog with explicit regression note
3. if necessary, unpublish the specific bad version via `vsce`

## Notes

- Keep release docs truthful to current implementation.
- Avoid documenting commands/settings that are not present in `package.json`.
