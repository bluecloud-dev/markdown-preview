# Muninn Editor — Design Critique (June 9, 2026)

Structured critique of the webview UI as implemented in `src/webview/editor/` (`bootstrap.ts` DOM, `styles.css`, `index.ts` behavior, `table-node-view.ts`). Companion to the accessibility audit; this covers usability, hierarchy, and consistency.

## First impression

The surface reads calm and native: VS Code theme tokens throughout, one quiet toolbar, a status line instead of toasts. That restraint is exactly right for "reading-first" and is worth defending as the product grows. Two things compete with it. First, the persistent brand header (`muninn-editor-header`: name + role + help text) spends ~40px of vertical space on every document telling users what they already know from the editor tab — in a reading-first product, chrome that isn't content must justify itself per-pixel. Fold the identity into the status line (e.g. "Muninn · Ready") or show the header only on first open. Second, the toolbar's three visible group labels ("Text / Structure / Insert") add taxonomy where users just want verbs; they aid first-run scanning but tax every subsequent session. Consider labels as tooltips/ARIA only, letting separators do the visual grouping.

## Usability

**The basic/advanced split hides the wrong things.** Basic mode hides H3, bullet list, numbered list, and Mermaid behind "More" (`ADVANCED_TOOLBAR_COMMANDS`, `index.ts:44-49`). Lists are core markdown — arguably used more than H2 — and hiding them undermines the toolbar's main job for the exact novice audience basic mode targets. Mermaid and H3 are defensible behind More; lists are not. Re-tier: basic = Bold, Italic, Link, H1, H2, lists, Table, Source; advanced adds H3, Paragraph, Code, Mermaid.

**Block insertion replaces the selection.** `insertTable`/`insertCodeBlock`/`insertMermaidBlock` use `replaceSelectionWith` (`index.ts:490-516`): with text selected, insertion destroys it. Undo recovers, but the convention users expect is insert-below-selection (Notion, Typora). Insert after the selection's block parent instead.

**Enter-to-commit in table cells exits the flow.** Committing a cell blurs it (`table-node-view.ts:490-495`), so fast tabular entry becomes type → Enter → re-find → click. Spreadsheet conventions (Enter commits and moves down, Tab moves right — Tab already works natively) would make the grid feel professional. Same fix as accessibility finding #4.

**Table actions are asymmetric.** The grid offers add-row, add-column, delete-table — but no row/column deletion, no reordering, no column alignment, and add-column only appends rightmost. Asymmetric power tools read as unfinished and force round-trips through the source view for routine edits. Minimum viable symmetry: delete row/column (with the existing danger styling) and alignment toggles; a per-row/column context menu can follow.

**The link flow's waiting state can strand.** `insertLink` posts to the host and sets status "Awaiting link input" (`index.ts:553-574`); if the user dismisses VS Code's input box, the webview shows no resolution. Ensure the host reports cancellation so the status resets ("Link cancelled").

**Two Mermaid previews can show at once.** A global preview panel pinned above the document (`bootstrap.ts:53-58`) and a per-block preview inside the code node (`table-node-view.ts:114`) overlap in purpose; a user editing a diagram mid-document may see the same diagram rendered twice in different places, or the global panel showing a *different* (first-in-doc) diagram than the one being edited. Pick one model — per-block previews are the more spatially honest — and let the global panel die or become an explicit "pinned preview" the user opts into.

## Visual hierarchy

Inside the document, hierarchy is sound: browser-default heading scale, 1.6 line-height, code blocks visually contained. The main gap is **measure**: the ProseMirror surface runs full editor width (`styles.css:158-163`), so on a wide monitor a paragraph can run 200+ characters per line — hostile to the reading-first promise. Constrain content to a comfortable measure (~70ch, centered, configurable), as VS Code's own preview and every reading app do. This is the single highest-leverage visual change available.

Block "cards" (table/code nodes with headers and 8px-radius borders) give structure but also visual weight: a doc with five code blocks becomes five boxes with five "Code block" headers competing with real content. Consider showing node headers/actions only on hover or selection, keeping the resting state closer to plain rendered markdown.

## Consistency

Largely strong — one button system, one focus style, one feedback channel, theme tokens everywhere. Genuine inconsistencies: the toolbar uses text-labeled buttons while the VS Code title-bar contributions for the same commands use codicons (`$(bold)`, `package.json`) — two visual languages for one command set (pick codicons + tooltips in the webview toolbar, or accept the divergence deliberately); `.muninn-toolbar-accent` and `.muninn-toolbar-select` styles exist with no corresponding elements (dead CSS — remove or use); transient button "active" flashes use two mechanisms (`is-active` class with 600ms timeout vs `aria-pressed` state, `index.ts:663-690`), which will eventually drift — unify state presentation through one code path.

## Top five, in order

1. Constrain content measure (~70ch) — reading-first becomes visible.
2. Fix table-entry flow: Enter commits + moves down; add row/column delete and alignment.
3. Re-tier basic toolbar to include lists.
4. Single Mermaid preview model (per-block).
5. Reclaim the brand header's vertical space.

Items 2's focus behavior and the toolbar work overlap with accessibility P1s — schedule them as one pass.
