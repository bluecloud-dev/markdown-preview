---
title: Toolbar keyboard navigation: roving tabindex + arrow keys (ARIA toolbar pattern)
labels: ai-ready,a11y,ux,P1,phase:now
---
## Context

Accessibility audit finding #1 (P1), `docs/design/ACCESSIBILITY_AUDIT_2026-06.md`. The toolbar declares `role="toolbar"` (`src/webview/editor/bootstrap.ts:27`) which sets the expectation of the WAI-ARIA toolbar pattern (single tab stop, arrow keys move within), but every one of the up-to-13 buttons is currently a tab stop — keyboard users must tab through all of them to reach the document. WCAG 2.1.1 / 2.4.3.

## Current behavior

All `<button>` elements in `.muninn-toolbar` are in the natural tab order (`bootstrap.ts:27-51`). Click handlers live in `src/webview/editor/index.ts:663-700`. The More button (`muninn-toolbar-more`) toggles `hidden` on buttons in `ADVANCED_TOOLBAR_COMMANDS` (`index.ts:44-49,132-146`) and already manages focus fallback (`index.ts:170-183`).

## Desired behavior

1. Toolbar is ONE tab stop. Exactly one button has `tabindex="0"`; all others `tabindex="-1"`.
2. ArrowRight/ArrowLeft move focus to next/previous *visible* (`!hidden`) button, wrapping at the ends. Home/End jump to first/last visible button.
3. The roving stop follows the last-focused button; when that button becomes hidden (basic-mode collapse), the stop falls back to the More button or first visible button (preserve the existing fallback logic in `setToolbarMode`).
4. Tab/Shift+Tab exit the toolbar entirely (browser default once non-focused buttons are `tabindex="-1"`).
5. Add `aria-controls` on the More button listing the IDs of the advanced buttons (give the advanced buttons stable `id`s) — folds in audit finding #10.
6. No behavior change for mouse users.

## Implementation notes

Implement as a small `attachToolbarRovingFocus(toolbar: HTMLElement)` module in `src/webview/editor/` with its own unit tests (jsdom-style DOM tests run under the existing mocha unit setup). Keep it dependency-free. Update `bootstrap.ts` to set initial tabindexes and call it. Visibility changes already funnel through `updateAdvancedToolbarVisibility` (`index.ts:132-146`) — hook the roving-stop revalidation there.

## Acceptance criteria

- [ ] One tab stop for the whole toolbar; arrows/Home/End navigate visible buttons with wrap
- [ ] Hidden (advanced, collapsed) buttons are skipped; stop revalidates on mode toggle and More toggle
- [ ] More button has `aria-controls` referencing real IDs
- [ ] Unit tests for: arrow wrap, hidden-skip, stop-revalidation on collapse
- [ ] E2E (WDIO): Tab lands once in toolbar, ArrowRight reaches Source button, Tab exits to editor
