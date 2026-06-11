---
title: GFM alerts/callouts: render and author > [!NOTE] blocks
labels: ai-ready,feature,P2,phase:next
---
## Context

`> [!NOTE]`/`[!TIP]`/`[!IMPORTANT]`/`[!WARNING]`/`[!CAUTION]` shipped in GitHub and VS Code's native preview in 2024 — users now expect it (May brief §8.8).

## Scope

1. Recognize the five GFM alert types when a blockquote's first paragraph starts with the marker. Model: keep the underlying ProseMirror structure a `blockquote` whose first text is the literal marker (lossless), with a node-view decoration layer for presentation — do NOT invent a new node type that serializes differently (round-trip rule; the marker line must survive byte-identically; #003 fixtures for all five + unknown markers passed through undecorated).
2. Presentation: type-colored left border + icon + localized type label, colors from VS Code theme tokens (e.g. `--vscode-charts-*` or `editorInfo/Warning/Error-foreground`), consistent with GitHub's rendering idiom. Marker line itself is hidden in rendered view but reappears when the blockquote has focus/caret (edit-in-place honesty, mirroring how the source toggle philosophy works elsewhere).
3. Authoring: `muninn.insertCallout` command (+ palette + advanced toolbar tier) → quick-pick of the five types → inserts `> [!NOTE]\n> ` skeleton after current block (issue #014 helper).
4. A11y: type label rendered as text (not icon-only); `role="note"` on the container; colors meet 3:1 against editor background in default themes (verify Dark Modern/Light Modern).

## Acceptance criteria

- [ ] Five types render distinctly; unknown markers untouched; all round-trip byte-identically
- [ ] Marker visible on focus (E2E asserts hide/show)
- [ ] Insert command localized + registered per repo pattern
- [ ] Contrast + role verified; unit tests for marker detection edge cases (lowercase, extra spaces → spec: GitHub matches case-insensitively but writes uppercase; mirror GitHub, document)
