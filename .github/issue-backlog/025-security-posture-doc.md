---
title: Publish docs/SECURITY_POSTURE.md + SECURITY.md disclosure policy
labels: ai-ready,docs,P2,phase:now
---
## Context

The trust narrative is a core differentiator the competition cannot match in writing (MPE's CVE-2025-65716 still shows no patched version in GHSA as of June 9, 2026 — cite factually, no dunking; `docs/MARKET_POSITION_2026-06.md` §2/§5). Put the engineering on the record.

## Scope

1. `docs/SECURITY_POSTURE.md` — document what EXISTS (verify each claim against code before writing; cite files): webview CSP with nonces; host-side message validation (`src/custom-editor/` protocol/provider); Mermaid SVG sanitization (`src/webview/editor/preview.ts:129-160` — script/foreignObject/iframe/object/embed stripped + attribute filtering); workspace-trust gating with explicit untrusted opt-in (`package.json` capabilities + `muninn.integrations.mermaid.allowInUntrustedWorkspaces`); zero telemetry with CI enforcement (`scripts/check-no-telemetry.js`); `html: false` in markdown-it (`index.ts:102-105`); CodeQL + Dependabot + pinned actions; dependency surface list. Include a "what we do NOT do" section (no network calls at runtime, no execution of document content, no eval).
2. `SECURITY.md` (root): supported versions, private disclosure channel (GitHub private vulnerability reporting — enabling it in repo settings is a one-click maintainer step; note it), response SLO (e.g. acknowledge 72h), credit policy.
3. Link both from README; add OpenSSF Scorecard badge ONLY if the score is already computed — otherwise leave a TODO and do not fabricate.

## Acceptance criteria

- [ ] Every claim in SECURITY_POSTURE.md is code-cited and true at merge time
- [ ] SECURITY.md present with disclosure channel; README links both
- [ ] Maintainer review checkbox: claims approved before publish (this is the file security researchers will test against)
