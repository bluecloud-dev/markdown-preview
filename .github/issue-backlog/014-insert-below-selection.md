---
title: Block insertion inserts after the current block instead of replacing the selection
labels: ai-ready,ux,P2,phase:now
---
## Context

Design critique: `insertTable`/`insertCodeBlock`/`insertMermaidBlock` use `replaceSelectionWith` — with text selected, insertion destroys it. Users expect insert-below (Notion/Typora convention). Undo recovers, but the surprise is the harm.

## Current behavior

`src/webview/editor/index.ts:477-520`: all three insert functions call `view.state.tr.replaceSelectionWith(node, false)`.

## Desired behavior

1. With a non-empty selection or a caret inside a non-empty block: insert the new block node AFTER the selection's top-level block (`$to.after(1)` style position), leave existing content untouched, place the caret inside the new block (for table/mermaid: status message unchanged; for code block: caret at start).
2. Caret in an EMPTY paragraph: replace that empty paragraph (current behavior is correct there — avoids stranding blank lines).
3. Shared helper `insertBlockAfterSelection(node: ProseMirrorNode): boolean` used by all three inserts; keep the 150ms double-insert guard for Mermaid (`index.ts:482-486`).
4. Round-trip rule: resulting markdown must equal hand-written equivalent (blank line separated blocks; no stray empty paragraphs) — add round-trip assertions to the unit tests.

## Acceptance criteria

- [ ] Inserting with text selected never deletes content (unit + E2E)
- [ ] Empty-paragraph replacement case preserved
- [ ] Caret lands in the new block; serialized markdown has no artifact blank paragraphs
- [ ] All three inserts share one tested helper
