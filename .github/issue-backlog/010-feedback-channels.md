---
title: Distinguish errors from status: assertive channel, explicit Error prefix, no color-only cues
labels: ai-ready,a11y,ux,P2,phase:now
---
## Context

Audit findings #7 and #8. Successes and failures share one polite `role="status"` line with identical presentation; the table source-apply feedback differs by color class only. WCAG 4.1.3, 3.3.1, 1.4.1.

## Current behavior

- Single status line `#status` `role="status" aria-live="polite"` (`src/webview/editor/bootstrap.ts:61`), written by `setStatus` (`src/webview/editor/index.ts:128-130`); failures funnel through `formatCommandFailure` (`index.ts:91-100`) and host errors through `onError` (`index.ts:847-853`).
- Table source feedback: `.is-success`/`.is-error` color classes (`src/webview/editor/styles.css:389-395`; element wired at `table-node-view.ts:356`).

## Desired behavior

1. Add a visually identical but separate `#status-alert` element with `role="alert"` (assertive). Route failures (`formatCommandFailure`, `onError`, insert-link failure at `index.ts:843-845`) to it; clear it on the next successful action. Successes keep using the polite `#status`.
2. Prefix all failure strings with a localized "Error: " (single l10n template wrapping existing messages — do not fork every string).
3. Table source feedback: prepend localized "Applied"/"Error:" words so text alone disambiguates; keep the colors as enhancement.
4. Refactor: `setStatus(message)` → `announce(message, { kind: 'status' | 'error' })`; migrate call sites mechanically.

## Acceptance criteria

- [ ] Failures rendered in `role="alert"` element with "Error:" prefix; successes unchanged in `role="status"`
- [ ] Only one of the two elements has non-empty content at any time
- [ ] Table feedback readable without color
- [ ] Unit tests for `announce` routing; all strings localized
