---
title: Re-tier toolbar: lists belong in basic mode
labels: ai-ready,ux,P2,phase:now
---
## Context

Design critique: basic mode hides bullet/numbered lists behind "More" while showing Paragraph and Code. Lists are core markdown — hiding them undermines the toolbar for the novice audience basic mode targets.

## Current behavior

`ADVANCED_TOOLBAR_COMMANDS = {setHeading3, toggleBulletList, toggleNumberedList, insertMermaidBlock}` (`src/webview/editor/index.ts:44-49`); `data-advanced="true"` markers in `src/webview/editor/bootstrap.ts:38,40,41,47`.

## Desired behavior

New tiers — basic: Bold, Italic, Link, H1, H2, Bullet list, Numbered list, Table, Source. Advanced adds: H3, Paragraph, Code block, Mermaid.

1. Update `ADVANCED_TOOLBAR_COMMANDS` to `{setHeading3, setParagraph, insertCodeBlock, insertMermaidBlock}` and move the `data-advanced` attributes in `bootstrap.ts` accordingly (lists lose it; Paragraph and Code gain it).
2. Verify the focus-fallback logic (`index.ts:148-183`) and roving tabindex (issue #004, if merged first) still behave with the new membership — they key off the set, so this should be mechanical; update any test fixtures that enumerate advanced commands.
3. Update E2E assertions that check basic-mode visible buttons.

## Acceptance criteria

- [ ] Basic mode shows lists; Paragraph/Code move behind More; advanced mode unchanged in total content
- [ ] `muninn.toolbar.mode` setting behavior unchanged otherwise
- [ ] E2E updated; README/docs screenshots note (hero re-capture tracked in #028)
