---
title: Mermaid diagrams: text alternatives, accessible panel name, show/hide announcements
labels: ai-ready,a11y,P1,phase:now
---
## Context

Audit findings #2 (P1) and #9 (P2), `docs/design/ACCESSIBILITY_AUDIT_2026-06.md`. Rendered Mermaid SVGs carry no `role`, no accessible name — diagrams are invisible to screen readers. WCAG 1.1.1.

## Current behavior

- Global preview panel: `MermaidPreviewController` injects sanitized SVG via `innerHTML` (`src/webview/editor/preview.ts:68`); sanitizer at `preview.ts:129-160` strips `script,foreignObject,iframe,object,embed`.
- Per-block preview inside code node views: `src/webview/editor/nodes/table-node-view.ts:114` (`muninn-code-node-mermaid-preview`).
- The panel `<section id="mermaid-preview-panel">` has no accessible name (`src/webview/editor/bootstrap.ts:53-58`); its `hidden` toggling is unannounced.

## Desired behavior

1. After sanitization, before injection: set on the `<svg>` `role="img"` and `aria-label` = localized template "Mermaid diagram: {0}" where `{0}` is a short description derived from source — diagram type keyword (first non-empty line, e.g. `graph TD`, `sequenceDiagram`) plus first node/participant label when cheaply parseable; fall back to just the type. Insert an SVG `<title>` element with the same text as first child (some AT prefers it).
2. Strip any `aria-describedby`/`desc` injected by Mermaid that dangles after sanitization.
3. Give the panel an accessible name: `aria-label` from new l10n key (e.g. `mermaidPreviewAriaLabel`) on the `<section>`.
4. Announce visibility transitions through the existing status line (`setStatus`, `index.ts:128-130`): localized "Diagram preview shown"/"Diagram preview hidden" — only on actual state changes, not every render tick (`MermaidPreviewController.scheduleRender` debounces at 120ms; announce in the show/hide branch, not the render branch).
5. Apply 1–2 to BOTH the global panel and per-block previews (shared helper, e.g. `applyDiagramA11y(svg: SVGElement, source: string)` exported from `preview.ts`).

## Out of scope

Long-form diagram descriptions; AI-generated alt text; resolving the dual-preview redundancy (issue #013).

## Acceptance criteria

- [ ] Every rendered Mermaid SVG has `role="img"`, non-empty `aria-label`, and `<title>`
- [ ] Label degrades gracefully for unparseable/invalid source ("Mermaid diagram")
- [ ] Panel section has localized `aria-label`; show/hide announced once per transition via status line
- [ ] All new strings localized per conventions; sanitizer behavior unchanged (unit-test that `script`/`foreignObject` still stripped)
- [ ] Unit tests for the label-derivation helper (graph/sequence/class/invalid inputs)
