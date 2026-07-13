---
title: Constrain content to a readable measure (~70ch, centered, configurable)
labels: ai-ready,ux,P1,phase:now
---
## Context

Design critique, top recommendation: the ProseMirror surface runs full editor width, so paragraphs can exceed 200 characters per line on wide monitors — hostile to the "reading-first" positioning. VS Code's own preview and every reading app constrain measure. Highest-leverage visual change available.

## Current behavior

`.ProseMirror { min-height: 100%; padding: 18px 22px 40px; }` (`src/webview/editor/styles.css:158-163`) — no max-width; shell scrolls (`styles.css:146-152`).

## Desired behavior

1. Default: content column `max-width: 70ch` horizontally centered within the shell, with the existing padding preserved as minimum gutters. Apply to the ProseMirror content; full-width elements (table cards, code blocks, Mermaid previews) share the same column width — nothing escapes the measure.
2. New setting `muninn.appearance.contentWidth`: `"comfortable"` (default, 70ch) | `"full"` (current behavior) | number 40–120 (ch units). Window scope. Declare in `package.json` `contributes.configuration` mirroring existing entries (`package.json:376-408`) with `package.nls.json` description; flow to the webview through the existing settings path (`onSettingsChanged` handler `src/webview/editor/index.ts:836-840`, provider-side config read in `src/services/config-service.ts`) and apply as a CSS custom property (e.g. `--muninn-content-width`) on the shell — live update, no reload.
3. Toolbar/status bars stay full-width; only the document column narrows.

## Acceptance criteria

- [ ] Default view caps line length at 70ch centered; gutters never collapse below current padding
- [ ] Setting switches comfortable/full/numeric live via `onSettingsChanged` (E2E asserts style change without reopen)
- [ ] Table/code/Mermaid blocks respect the column
- [ ] Setting documented in README settings list; strings in `package.nls.json`
