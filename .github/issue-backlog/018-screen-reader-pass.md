---
title: Manual screen reader testing pass (VoiceOver + NVDA) after P1 a11y fixes
labels: needs-human,a11y,testing,P1,phase:now
---
## Why human

Static audit (`docs/design/ACCESSIBILITY_AUDIT_2026-06.md`) covers code-verifiable criteria only; real AT behavior — ProseMirror announcement quality, live-region timing, focus perception — requires a human driving VoiceOver (macOS) and NVDA (Windows). Automated review typically surfaces a minority of real-world issues.

## Prerequisites

Issues #004, #005, #006, #007 merged.

## Test script (≈45 min per AT)

1. Open a `.md` with headings, lists, two tables, two Mermaid blocks, code blocks.
2. Tab into toolbar → arrow through buttons → activate Bold — verify name/role/state ("Bold, toggle button, pressed").
3. Navigate document content; verify heading levels and list semantics announce.
4. Enter a table grid: cell labels ("Row 2 column 3"), Enter-to-next-row focus announcement, add/delete row announcements via status line.
5. Mermaid block: verify diagram announces type label; toggle Mermaid setting off → gating message announces.
6. Trigger a command failure (add row with no table after deleting it) → verify assertive "Error:" interrupt.
7. Toggle source editor and back; verify no focus loss to body at any point.
8. Repeat key flows at 200% zoom and in a High Contrast theme.

## Deliverable

`docs/design/SR_TEST_RESULTS_<date>.md`: per-step pass/fail per AT, recordings where useful; file follow-up issues for failures (label `a11y`). On pass: update README with the conformance note (claim wording in MARKET_POSITION §3).

## Acceptance criteria

- [ ] Results doc for both VoiceOver and NVDA committed
- [ ] Follow-up issues filed for every failure
- [ ] README conformance statement updated (or explicitly deferred with reason)
