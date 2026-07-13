---
title: Math support: KaTeX rendering for $inline$ and $$block$$ math
labels: ai-ready,feature,P2,phase:next
---
## Context

Matrix gap vs MPE/MAIO/native preview (all ship math). Post-GA differentiation tier (STRATEGIC_ROADMAP #10).

## Scope

1. Parse `$...$` (inline) and `$$...$$` (block) via a markdown-it math plugin compatible with `markdown-it@14` — vendor-evaluate `@vscode/markdown-it-katex` (what native preview uses) first for ecosystem consistency. Extend the ProseMirror schema with `math_inline`/`math_block` nodes + parser tokens + serializer (round-trip byte-identity mandatory — delimiters and inner source preserved exactly; add #003 fixtures).
2. Render with KaTeX in node views: display-mode for blocks, inline otherwise; render errors show the raw source with the standard error styling (never swallow content). KaTeX CSS bundled locally (CSP: no CDN); fonts via `asWebviewUri`.
3. A11y: KaTeX emits MathML alongside HTML — keep it (screen readers use it); set `aria-hidden` on the visual layer per KaTeX docs.
4. Setting `muninn.integrations.math.enabled` (resource scope, default true) following the Mermaid setting pattern; no trust-gating needed (KaTeX renders no active content) — state this in SECURITY_POSTURE.
5. Editing model: math nodes are atomic with a click-to-edit source popover OR source-on-focus inline — pick the simpler (atomic + small textarea editor mirroring the table source pattern) and document.

## Acceptance criteria

- [ ] Inline + block math render and round-trip byte-identically (fixtures in #003 corpus)
- [ ] Invalid LaTeX degrades to visible source + error style; no crash
- [ ] Bundle size delta reported in PR (KaTeX is heavy — lazy-load the renderer like Mermaid if > 300 KB gz)
- [ ] Setting + l10n + README updated; MathML preserved
