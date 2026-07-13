---
title: README: AGPL FAQ + listing polish (what the license does and does not require)
labels: ai-ready,docs,licensing,P2,phase:now
---
## Context

The most common AGPL misreading ("my documents/company code get infected") will cost installs silently (`docs/MARKET_POSITION_2026-06.md` §7.4). Preempt it in the README — which is also the Marketplace listing body.

## Scope

1. New README section "License — plain language" under the existing License section: (a) using Muninn to edit files imposes nothing on those files or your employer's code; (b) the license governs distributing modified versions of *Muninn itself*; (c) network clause: serving a *modified* Muninn through hosted VS Code environments (code-server/Codespaces images) requires offering that modified source; unmodified redistribution just keeps the license and notices; (d) explicit sentence: "Your markdown, and anything you write with Muninn, is yours." End with: "Common-understanding summary, not legal advice; the LICENSE text governs."
2. Keep it ≤ 12 lines; link LICENSE and THIRD_PARTY_NOTICES (#022).
3. While in the file: the Highlights section still reflects pre-critique UI (header/help line); sync wording after #011/#013/#016 land — coordinate, don't block: write against current state, leave TODO markers out (re-edit in #028's README pass).
4. Marketplace renders README as the listing — verify relative links/images resolve when packaged (vsce rewrites relative URLs only if `repository` is set — it is; confirm in packaged output).

## Acceptance criteria

- [ ] FAQ section present, ≤12 lines, factually consistent with LICENSE and §7 of the market doc
- [ ] No legal-advice phrasing; disclaimer included
- [ ] `npm run package` → README renders correctly in the VSIX listing preview
