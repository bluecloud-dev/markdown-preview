---
title: Give the ProseMirror editor surface an accessible name
labels: ai-ready,a11y,P2,phase:now
---
## Context

Audit finding #6. Screen-reader users land on an unlabeled `contenteditable` region. WCAG 4.1.2.

## Current behavior

`EditorView` is constructed at `src/webview/editor/index.ts:781-796` with no `attributes` option; container is bare `<div id="editor">` (`bootstrap.ts:59`).

## Desired behavior

1. Pass `attributes: { 'aria-label': <localized> , role: 'textbox', 'aria-multiline': 'true' }` to the `EditorView` constructor so the attributes live on the contenteditable element itself.
2. Label template: "Markdown editor — {0}" with the document file name. The webview needs the file name: extend the `host.init` payload (`src/custom-editor/protocol.ts` + provider) with `fileName: string`, and apply it when the view is (re)created in `applyHostMarkdown` (`index.ts:777-812`). Fall back to plain "Markdown editor" if absent.
3. Protocol change must keep host-side message validation in sync (the provider validates messages — extend its schema, do not bypass).

## Acceptance criteria

- [ ] Contenteditable element exposes localized `aria-label` containing the file name, `role="textbox"`, `aria-multiline="true"`
- [ ] Works on first init and after host-driven document replacement
- [ ] Protocol/validator updated symmetrically; integration test asserts init payload carries `fileName`
