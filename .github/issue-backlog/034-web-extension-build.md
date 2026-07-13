---
title: vscode.dev / web extension build (best-effort subset)
labels: ai-ready,feature,P3,phase:next
---
## Context

`npm run test:web` currently asserts web is NOT supported (`scripts/test-web-not-supported.js`). A web build serves vscode.dev + github.dev and widens the funnel (STRATEGIC_ROADMAP #13 — explicitly a stretch item; timebox the spike).

## Scope

1. Spike (1 day, timeboxed): add `browser` entry point via esbuild (platform: browser, no Node APIs in the extension host path — audit `src/extension.ts`, services, provider for `fs`/`path` usage; document findings).
2. If viable: ship the editor with Mermaid enabled (pure browser lib) and file-write features (#019 images, #033 export) disabled with capability detection + localized "desktop only" notices. `package.json` gains `"browser"` field; CI adds `@vscode/test-web` smoke (replace the not-supported assertion).
3. If NOT viable within the timebox: write `docs/WEB_SUPPORT.md` with the blocking inventory and close as documented-deferral. An honest no beats a broken half-yes.

## Acceptance criteria

- [ ] Spike outcome documented either way
- [ ] If shipped: extension activates on vscode.dev, core editing + Mermaid work, disabled features announce themselves; web smoke test in CI
- [ ] README platform-support matrix added
