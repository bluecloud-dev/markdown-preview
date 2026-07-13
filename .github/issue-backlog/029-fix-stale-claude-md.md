---
title: Fix stale CLAUDE.md and constitution: v1 "preview-mode" guidance actively misleads AI agents
labels: ai-ready,docs,infra,P1,phase:now
---
## Context

CRITICAL for this repo's AI-delegation workflow: `CLAUDE.md` still describes the v1 product ("opens markdown files in preview mode by default", "Preview: use `markdown.showPreview` (never custom webviews)", "**Forbidden:** custom webviews for markdown") while v2 IS a custom-editor webview (ProseMirror). Any AI agent reading repo instructions will either refuse correct work or "fix" the architecture. Same risk in `.specify/memory/constitution.md` and the stale `@specs/markdown-preview/spec.md` reference.

## Scope

1. Rewrite `CLAUDE.md` for v2 reality: muninn custom editor architecture map (`src/custom-editor/`, `src/webview/editor/`, services), the conventions block from `.github/issue-backlog/_conventions.md` (l10n pattern, no-telemetry gate, CSP rules, test commands incl. `coverage` thresholds and `test:e2e`), round-trip-fidelity as the prime directive, and updated Forbidden list (telemetry; `any`; `console.log` in production; introducing serialization churn; ADDING new webviews beyond the sanctioned editor — keep that nuance).
2. Point "Active Feature Spec" at `specs/round-trip-correctness/spec.md`; keep the SpecKit table if the workflow is still in use (verify `.specify/` is current; align or remove).
3. Update `.specify/memory/constitution.md` clauses that contradict v2 (the custom-webview prohibition) — amend with rationale, preserving the constitution's amendment conventions if it defines any.
4. Cross-check `docs/ARCHITECTURE.md` agrees; fix drift found along the way (small diffs only; bigger drift → file issues).

## Acceptance criteria

- [ ] CLAUDE.md accurately describes v2; an agent following it would pass review on a trivial PR
- [ ] No instruction file forbids what the codebase fundamentally is
- [ ] Conventions block centralized (issue-backlog/_conventions.md and CLAUDE.md reference one source of truth)
