---
title: Single Mermaid preview model: per-block only, remove the global panel
labels: ai-ready,ux,P2,phase:now
---
## Context

Design critique: two preview surfaces coexist — a global panel pinned above the document and a per-block preview inside code node views — so the same diagram can render twice, or the global panel can show a *different* diagram (first-in-doc fallback) than the one being edited. Decision recorded in the critique: per-block previews are the spatially honest model; the global panel goes.

## Current behavior

- Global panel: `<section id="mermaid-preview-panel">` (`src/webview/editor/bootstrap.ts:53-58`), driven by `MermaidPreviewController` (`src/webview/editor/preview.ts`) with selected-or-first-block source resolution (`src/webview/editor/index.ts:204-238`) and render scheduling on every state update (`index.ts:240-242,257-264`).
- Per-block preview: `src/webview/editor/nodes/table-node-view.ts:114` within code node views.

## Desired behavior

1. Remove the global panel DOM, its controller wiring, and the selected/first-block resolution path (`selectCodeBlockSource`, `mermaidPreview` instance, `schedulePreviewRender` call sites) — per-block preview becomes the only render path.
2. Per-block preview inherits the controller's good behaviors if it lacks them: 120ms debounced re-render on source change, trust/`mermaidEnabled` gating (`onSettingsChanged`/`onInit` payloads must keep reaching node views), error rendering (`.muninn-mermaid-error`), and the a11y treatment from issue #005.
3. Keep `MermaidPreviewController` only if it cleanly retargets to per-block hosts; otherwise fold the logic into the node view and delete dead code + the now-unused CSS (`styles.css:184-235` panel-specific rules — audit which selectors the per-block preview reuses via the shared `muninn-mermaid-preview-body` class before deleting).
4. Mermaid disabled/untrusted state: per-block area shows the existing localized gating message instead of silently rendering nothing.

## Acceptance criteria

- [ ] Exactly one preview per Mermaid block; no global panel in DOM
- [ ] Debounce, trust gating, error display, and a11y attributes verified per-block (unit + E2E)
- [ ] No dead CSS/TS left (lint passes with unused-export checks; grep for `mermaid-preview-panel`)
- [ ] Editing a second diagram mid-document previews THAT diagram in place (E2E)
