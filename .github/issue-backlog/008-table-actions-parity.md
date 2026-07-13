---
title: Table actions parity: delete row, delete column, column alignment
labels: ai-ready,ux,feature,P2,phase:now
---
## Context

Design critique: the grid offers add-row/add-column/delete-table but no row/column deletion, no alignment — asymmetric power tools that force round-trips through source view for routine edits and read as unfinished.

## Current behavior

- Model + (de)serialization: `src/webview/editor/tables/markdown-table-utilities.ts` (`parseMarkdownTable`/`serializeMarkdownTable`) — check whether the parsed model already captures alignment colons; if not, extend it (alignment must round-trip byte-identically; see issue #003 fixtures).
- Actions UI: header buttons in the node view (`src/webview/editor/nodes/table-node-view.ts:311-395`); commands `muninn.addTableRow`/`muninn.addTableColumn` + `muninn.tableActions` quick-pick on the host side; danger styling exists (`.muninn-button-danger`, `src/webview/editor/styles.css:289-296`).

## Desired behavior

1. **Delete row / delete column**, operating on the row/column containing the focused cell (or last-focused cell; disabled when none). Guards: cannot delete the header row; cannot delete the last remaining column (min 1 col × 0 rows). Danger styling; localized confirm-free (undo covers it — ProseMirror history already tracks `replaceCodeBlock` transactions).
2. **Column alignment toggle** for the focused column: none → left → center → right → none, serialized as GFM colons (`:---`, `:---:`, `---:`). Visually reflect alignment on the grid column (`text-align` on cells).
3. Add both to: per-table action buttons (compact), the `muninn.tableActions` quick-pick, and the command palette (new commands `muninn.deleteTableRow`, `muninn.deleteTableColumn`, `muninn.setColumnAlignment` — `package.json` `contributes.commands` + enablement `activeCustomEditorId == muninn.markdownEditor`, mirroring existing entries at `package.json:213-234`).
4. Focus rules from issue #007 apply: after deletion, focus the nearest surviving cell.

## Acceptance criteria

- [ ] Row/column delete with stated guards; undo restores exactly (byte-identical markdown)
- [ ] Alignment cycles and serializes to GFM colons; grid reflects it visually; round-trips byte-identically
- [ ] Commands registered host-side with l10n titles (`package.nls.json`) and listed in README commands section
- [ ] Unit tests on the table-utilities model ops; E2E for delete-column focus survival
