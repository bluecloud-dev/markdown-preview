---
title: HTML export: muninn.exportHtml command producing a standalone document
labels: ai-ready,feature,P3,phase:next
---
## Context

Export gap (matrix: MPE Strong, Muninn Absent). HTML chosen over PDF deliberately — ~80% of the use case, none of the Chromium dependency/security burden (May brief §8.9, MARKET_POSITION §8.7).

## Scope

1. Command `muninn.exportHtml` (palette + editor title overflow when Muninn active): render the CURRENT document to a single self-contained `.html` next to the source file (save dialog defaulting to `<name>.html`).
2. Pipeline runs HOST-side (no webview dependency): markdown-it with the same config as the editor (`html: false`, linkify) + Mermaid pre-rendered to inline SVG via the existing `mermaid` dependency where feasible — if headless render is unreliable without a browser context, embed diagrams as fenced source with a notice and record the limitation (do not add puppeteer).
3. Output: minimal clean semantic HTML5, inline CSS (~the editor's reading styles: measure, type scale, code blocks), images embedded as data URIs ≤ 2 MB each (else relative paths + warning summary), document title from first H1/filename, `<meta name="generator" content="Muninn">`.
4. Security: output contains NO scripts; sanitize any raw HTML per `html:false` policy already in force.
5. Localized progress/success/error notifications via `vscode.window` APIs.

## Acceptance criteria

- [ ] Exported file opens correctly in a browser with no network access (fully self-contained case)
- [ ] Mermaid: inline SVG or documented fallback — decision recorded in PR + docs
- [ ] No script tags in output (unit assertion); golden-file test for a representative document
- [ ] Command registered + localized + README updated
