---
title: Link flow: resolve the "Awaiting link input" state when the host input is cancelled
labels: ai-ready,ux,P3,phase:now
---
## Context

Design critique: `insertLink` posts `view.requestLinkInput` and sets status "Awaiting link input" (`src/webview/editor/index.ts:553-574`). If the user dismisses VS Code's input box, no message returns and the status line strands.

## Scope

1. Host side (`src/custom-editor/muninn-custom-editor-provider.ts`): when `vscode.window.showInputBox` resolves `undefined` (dismissed), post a new `host.linkInputCancelled` message instead of nothing. Extend `src/custom-editor/protocol.ts` + message validation symmetrically.
2. Webview (`src/webview/editor/messages.ts` + `index.ts` handler wiring at :814-854): on cancellation, restore status to the localized ready/idle string and return focus to the editor (`view?.focus()`).
3. While awaiting, a second `insertLink` invocation must not double-fire (guard like the Mermaid 150ms guard, or ignore-while-pending flag cleared on insert/cancel).

## Acceptance criteria

- [ ] Dismissing the input box restores status and editor focus (integration test with stubbed `showInputBox`)
- [ ] Pending guard prevents double prompts
- [ ] Protocol + validator updated; new strings localized
