---
title: Commands: toggle task list, toggle blockquote, insert horizontal rule
labels: ai-ready,feature,P2,phase:now
---
## Context

Cheap parity wins (May brief §8.3; matrix "Task list toggle: Absent"). GFM task lists are core to README/spec workflows.

## Scope

1. **`muninn.toggleTaskList`** — wraps/unwraps the selection's list items as `- [ ]` items; on existing task items, toggles checked state if caret is on a single item, else converts back to plain bullets. Schema note: `prosemirror-markdown`'s default schema has no task-list node — extend the schema + parser tokens + serializer (checkbox as leading `[ ] `/`[x] ` text in list items is the lossless route; verify round-trip byte-identity with #003 fixtures incl. `[X]` normalization decision → document in KNOWN_DEVIATIONS if normalized).
2. Rendered checkboxes are interactive: clicking toggles `[ ]`/`[x]` (node view or input rule; keyboard: Space when caret in the marker zone… simplest accessible route: make the checkbox a real `<input type="checkbox">` in a node view with proper label = item text).
3. **`muninn.toggleBlockquote`** — wrap/lift selection in `blockquote` (`prosemirror-commands` `wrapIn`/`lift`).
4. **`muninn.insertHorizontalRule`** — insert `horizontal_rule` node after current block (use issue #014 helper).
5. Register all three: `package.json` commands + palette entries + enablement (mirror `package.json:108-235` pattern), l10n titles, toolbar advanced tier ONLY for blockquote/hr (task list goes in basic — it earns it), keybindings: task list `ctrl/cmd+alt+x`.
6. README command list updated.

## Acceptance criteria

- [ ] Three commands work from palette, toolbar, and keybinding; toggle semantics exactly as specified
- [ ] Task list round-trips byte-identically (fixtures added to #003); checkbox interaction accessible (real input, labeled)
- [ ] Unit tests per command incl. mixed selections; E2E for checkbox click
