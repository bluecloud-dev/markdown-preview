---
title: Table keyboard model: Enter commits + moves down, Escape reverts, arrow-key cell navigation, never drop focus
labels: ai-ready,a11y,ux,P1,phase:now
---
## Context

Audit findings #4 (P1) and #5 (P2) + design critique "Usability" (`docs/design/DESIGN_CRITIQUE_2026-06.md`). Enter in a cell calls `input.blur()`, dumping focus on `<body>` — keyboard users lose their place after every commit, and fast tabular entry is impossible. WCAG 2.4.3.

## Current behavior

`src/webview/editor/nodes/table-node-view.ts:476-497`: `createCellInput` — `change` event commits via `updateCell`; `keydown` Enter → `preventDefault()` + `input.blur()`. Commits re-render the grid (`applyTable`), which replaces the DOM (`:448-471` rebuild), so any focus-preservation must survive re-render.

## Desired behavior

Spreadsheet conventions:

1. **Enter**: commit the cell, move focus to the same column in the next row; in the last row, commit and stay (do NOT auto-add a row). Shift+Enter: commit, move up.
2. **Escape**: revert the input to its last committed value, keep focus in the cell.
3. **Arrow Up/Down**: move to the adjacent row, same column (commit-on-leave via existing `change` semantics). **Arrow Left/Right**: move between cells ONLY when the caret is at the start/end of the input's text (otherwise let the caret move within text). Header row participates as row 0.
4. **Tab/Shift+Tab**: keep native behavior (already moves across inputs).
5. After ANY commit-triggered re-render, focus returns to the logically-correct cell (track target coordinates across `applyTable` re-render; re-query the new input by row/col and `.focus()` + select content).
6. No focus may ever land on `<body>` as a result of grid interaction.

## Implementation notes

Add a `pendingFocus: {row: number; col: number} | null` field on the node view; set before `applyTable`; consume after grid rebuild. Row/col indices already flow through `createCellInput(value, rowIndex, columnIndex)` — reuse. Keep all key handling inside the node view (no global listeners).

## Out of scope

Row/column deletion and alignment (issue #008); cell range selection.

## Acceptance criteria

- [ ] Enter/Shift+Enter/Escape/arrow behaviors exactly as specified, including header row and last-row cases
- [ ] Focus survives re-render for: cell edit commit, add-row, add-column, source-apply
- [ ] Left/Right only cross cells at text boundaries (unit-test the boundary predicate)
- [ ] E2E: type into cell → Enter → assert focus in next-row cell with value committed; Escape restores prior value
