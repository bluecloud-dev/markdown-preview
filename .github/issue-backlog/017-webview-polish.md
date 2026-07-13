---
title: Webview polish bundle: dead CSS, single active-state mechanism, font-size token, hidden document title
labels: ai-ready,ux,a11y,P3,phase:now
---
## Context

Design critique "Consistency" + audit findings #11/#12. Four small items, one PR.

## Scope

1. **Dead CSS**: `.muninn-toolbar-accent` and `.muninn-toolbar-select` (`src/webview/editor/styles.css:119-126,132-138`) have no corresponding elements — delete (or wire up if a near-term issue needs them; default: delete).
2. **One active-state mechanism**: transient button flashes use raw `classList.add('is-active')` + 600ms timeouts in two places (`src/webview/editor/index.ts:663-690`) while persistent state flows through `updateToolbarPressedState` (`:702-710`). Funnel transient flashes through a single `flashActive(command)` helper that uses the same code path (class + `aria-pressed` only where the command is in `PRESSABLE_TOOLBAR_COMMANDS`), so presentation cannot drift.
3. **Font-size token**: root `font-size: 13px` (`styles.css:1-4`) → `font-size: var(--vscode-font-size, 13px)` so webview text follows the user's UI font size. Verify toolbar min-heights still meet 24px targets at small font sizes.
4. **Hidden document title**: add a visually-hidden `<h1>` ("Muninn markdown editor") as first child of `#app` for AT landmark/heading navigation; add the standard `.visually-hidden` utility class.

## Acceptance criteria

- [ ] Grep confirms removed selectors unused; bundle size not increased
- [ ] Exactly one code path mutates `is-active`/`aria-pressed` (unit test the helper)
- [ ] Webview type scale follows `--vscode-font-size` (manual check at 11/13/16px noted in PR)
- [ ] Hidden h1 present; axe-style DOM assertions added to E2E if harness allows
