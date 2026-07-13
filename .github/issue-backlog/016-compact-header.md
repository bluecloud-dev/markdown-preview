---
title: Reclaim the brand header: fold identity into the status line
labels: ai-ready,ux,P2,phase:now
---
## Context

Design critique: the persistent header (`muninn-editor-header`: brand name + role + help text) spends ~40px per document restating what the editor tab already says. In a reading-first product, chrome that isn't content must justify itself per-pixel.

## Current behavior

Header markup `src/webview/editor/bootstrap.ts:20-26`; styles `src/webview/editor/styles.css:29-61`; strings `headerBrandName`/`headerBrandRole`/`headerHelp` in the webview-strings set. Status line at `bootstrap.ts:61`.

## Desired behavior

1. Remove the header row entirely.
2. Status line becomes "Muninn · {status}" (localized template; brand prefix once, status text swaps as today via `setStatus`/`announce`).
3. Relocate the help affordance: move `headerHelp` content into the `muninn.inspectConfiguration` surface or a `title` on the status-line brand token — decide in PR, document the choice; do not silently delete the string's information (keyboard-shortcut discoverability).
4. Delete orphaned CSS and strings; `bootstrapEditorApp` return type drops removed elements; update unit/E2E selectors (`data-testid="muninn-editor-header"` usages in tests).

## Acceptance criteria

- [ ] No header row; document content starts at the toolbar
- [ ] Status line carries brand prefix; all states still legible (connected/inserted/error)
- [ ] Help information preserved somewhere reachable; documented in PR description
- [ ] No dead strings/CSS/test selectors remain
