---
title: CI release pipeline: publish to Marketplace + Open VSX on tag
labels: needs-human,ai-ready,infra,P1,phase:now
---
## Context

Cursor and VSCodium users install from Open VSX, not the Microsoft Marketplace. The closest competitor (concretio.markdown-for-humans) dual-publishes; Muninn must too (`docs/MARKET_POSITION_2026-06.md` §7.3). Muninn is AGPL-3.0-only — Open VSX has no copyleft friction.

## Human-gated prerequisites (label: needs-human)

- Create the `blueclouddev` namespace on https://open-vsx.org and generate an access token → repo secret `OVSX_PAT`.
- `VSCE_PAT` from issue #001.

## Scope (AI-implementable once secrets exist)

Add `.github/workflows/release.yml`:

1. Trigger: push of tag matching `v*`.
2. Steps: checkout → `npm ci` → `npm run typecheck && npm run lint && npm test` → `npm run package` → publish.
3. Publish step: `npx vsce publish --packagePath <vsix> -p $VSCE_PAT` (add `--pre-release` when the tag contains `-alpha`/`-beta`) and `npx ovsx publish <vsix> -p $OVSX_PAT`.
4. Upload the `.vsix` as a release asset on the GitHub release for the tag.
5. Pin action versions by SHA (repo already follows security-hardened workflow practice — see `.github/workflows/` and commit dfafdfe "security hardening workflows").

## Out of scope

Marketplace account creation; changelog automation.

## Acceptance criteria

- [ ] Tagging `v2.0.0-alpha.2` produces: green CI, Marketplace pre-release update, Open VSX update, `.vsix` attached to GitHub release
- [ ] Workflow fails loudly (no silent skip) if either token is missing
- [ ] Actions pinned by SHA; minimal `permissions:` block declared
