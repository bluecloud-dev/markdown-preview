---
title: Table grid semantics: column scope + accessible table names
labels: ai-ready,a11y,P1,phase:now
---
## Context

Audit finding #3 (P1). The editable grid builds `<th>` without `scope` and `<table>` without caption or accessible name — multiple tables in one document are indistinguishable to AT, and header/data relationships rely solely on per-input `aria-label`s. WCAG 1.3.1.

## Current behavior

Grid construction: `src/webview/editor/nodes/table-node-view.ts:448-471` (`<table class="muninn-table-node-grid-table">`, header `<th>` at :454, body rows :461-470). Per-cell inputs already get coordinate `aria-label`s (`:476-497`).

## Desired behavior

1. `scope="col"` on every header `<th>`.
2. Accessible name per grid table: `aria-label` from localized template, e.g. "Table {0}: {1} columns, {2} rows" — `{0}` is the 1-based index of this table node within the document (compute from ProseMirror doc order at render; recompute on re-render), `{1}`/`{2}` from the parsed model.
3. Keep the name in sync when rows/columns are added/removed (`addRow`/`addColumn`/`updateCell` re-render path).
4. Header-row inputs keep their existing labels; no visual change at all.

## Acceptance criteria

- [ ] All `<th>` carry `scope="col"`; each grid `<table>` has a localized, indexed `aria-label` with live column/row counts
- [ ] Name updates after add-row/add-column and after source-apply
- [ ] No visual regression (E2E screenshot/DOM assertions on existing table fixtures)
- [ ] Strings localized per conventions
