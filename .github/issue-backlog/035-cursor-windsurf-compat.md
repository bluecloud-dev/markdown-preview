---
title: Document Cursor/Windsurf/VSCodium compatibility tier
labels: ai-ready,docs,P3,phase:next
---
## Context

Fork-IDE users install from Open VSX (#002) and are disproportionately vocal evangelists (May brief §8 item 16; markdown-for-humans explicitly courts them). Engine floor is `^1.85.0` — forks track different VS Code baselines.

## Scope

1. Verify on current Cursor + Windsurf + VSCodium: install from Open VSX, custom editor default-open, toolbar, tables, Mermaid (trust model may differ per fork — note behavior), `editorAssociations` interplay with any fork-specific markdown handling (Cursor previously hard-disabled md preview in some directories — test `.cursor`/claude config paths specifically).
2. `docs/COMPATIBILITY.md`: per-IDE status table (version tested, install path, known quirks, workarounds); README links it + adds an "Open VSX for Cursor/VSCodium" install snippet.
3. Where a quirk is fixable in Muninn (e.g., association priority), file follow-up issues rather than scope-creeping here.

## Acceptance criteria

- [ ] Three IDEs tested against the published Open VSX build; results in COMPATIBILITY.md with versions
- [ ] README install section covers non-Marketplace IDEs
- [ ] Follow-up issues filed for fixable quirks
