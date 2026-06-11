---
title: Outline view support: document symbols while the Muninn editor is active
labels: ai-ready,feature,P2,phase:now
---
## Context

Outline/breadcrumb navigation is table-stakes (matrix row "Outline/TOC: Absent" vs Strong for MAIO/MPE/native). With a CustomTextEditorProvider, the underlying `TextDocument` stays open, but VS Code's Outline view tracks the *active editor* — symbol visibility with custom editors must be verified empirically. STEP 0 of this issue is a spike with findings written into the PR.

## Scope

1. **Spike (½ day):** with the alpha build, open a `.md` in Muninn — does the Outline view populate from the built-in markdown symbol provider? Record per VS Code 1.85 base. If yes, this issue reduces to tests + docs. If no:
2. Register a `DocumentSymbolProvider` for `{language: 'markdown'}` (host side, `src/extension.ts` + new `src/services/symbol-provider.ts`) that parses headings from the live `TextDocument` (reuse `markdown-it` tokens — already a dependency — heading open/close with line ranges; range = heading line to before next same-or-higher heading). Nested `DocumentSymbol[]` tree, `SymbolKind.String` for headings (matches built-in markdown).
3. If the Outline still ignores the custom editor, fall back to a Muninn tree view (`contributes.views`) ONLY after recording the limitation — do not build the tree view speculatively; prefer upstream behavior.
4. Symbols update on document change (provider reads current `TextDocument` — no extra sync needed).

## Acceptance criteria

- [ ] Spike findings documented in PR (what populates Outline with custom editor active, exact behavior)
- [ ] Headings appear in Outline/breadcrumbs in the chosen mechanism; nesting correct for skipped levels (H1→H3)
- [ ] Unit tests for the heading-tree builder incl. setext headings, duplicate titles, code-fence `#` false positives
- [ ] No new webview surface; no custom TOC rendering inside the document
