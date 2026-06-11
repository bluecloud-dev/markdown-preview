---
title: Publish v2.0.0-alpha.1 to the VS Code Marketplace and tag the GitHub release
labels: needs-human,infra,P1,phase:now
---
## Why now

Muninn is not installable: not on the Marketplace, not on Open VSX, latest GitHub tag is v1.0.1 (Dec 2025) while `package.json` says `2.0.0-alpha.1`. Direct competitors are published and shipping (zaaack.markdown-editor: 183K installs; concretio.markdown-for-humans: 2.5K and courting Cursor users), and Microsoft has an open feature request for a built-in WYSIWYG markdown editor (microsoft/vscode#296639). Per `docs/MARKET_POSITION_2026-06.md` §8, publishing is the #1 priority — everything else compounds only after this.

## Human steps (cannot be delegated)

1. Create/confirm the `blueclouddev` publisher on https://marketplace.visualstudio.com/manage (requires Azure DevOps org + Microsoft account).
2. Generate an Azure DevOps PAT with Marketplace → Manage scope. Store as repo secret `VSCE_PAT`.
3. Verify the listing metadata renders: icon, hero, badges, README (the Marketplace strips some HTML; check `assets/` references resolve).
4. Run `npm run package`, install the produced `.vsix` locally (`code --install-extension`), smoke-test: open a `.md`, edit, toggle source, Mermaid render in trusted + untrusted workspace.
5. `npx vsce publish --pre-release` (keep `"preview": true` in `package.json`).
6. `git tag v2.0.0-alpha.1 && git push origin v2.0.0-alpha.1`; create the GitHub release with changelog notes.

## AI-assistable follow-up (separate issue #002)

CI release workflow + Open VSX dual-publish.

## Acceptance criteria

- [ ] Extension installable from the Marketplace as pre-release
- [ ] GitHub release v2.0.0-alpha.1 exists with notes
- [ ] `VSCE_PAT` secret configured for CI use
