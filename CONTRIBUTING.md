# Contributing

Muninn is a reading-first markdown workspace built around a VS Code custom editor. Keep that product shape intact unless there is a strong user or maintenance reason to change it.

## Before You Change Behavior

Read these files first:

- `package.json`
- `src/extension.ts`
- `src/custom-editor/`
- `src/webview/editor/`

The current implementation is the source of truth. Several older specs and preview-first documents remain in the repo for historical context; do not treat them as the live product definition.

## Working Principles

- Preserve the custom editor architecture.
- Keep the product reading-first.
- Do not add duplicate actions across the title bar, toolbar, and command palette without a clear reason.
- Keep `muninn.openRawMarkdown` as a first-class escape hatch.
- Preserve workspace-trust-aware Mermaid behavior.
- Avoid startup-time work unless it is clearly justified.
- Do not weaken the webview security posture.

## Verification

Run these after meaningful code changes:

- `npm run lint`
- `npm run typecheck`
- `npm test`

Run these when the change calls for them:

- `npm run coverage`
  Use when changing host-side services or document sync behavior.
- `npm run test:e2e`
  Use when changing webview/editor UX, toolbar behavior, table flows, or Mermaid behavior.

## Pull Requests

- Keep the scope focused.
- Add or update tests for behavior changes.
- Update docs in the same change when the product, architecture, or user-visible workflow changes.
- Do not assume Unix-only paths or line endings; the project is developed on Windows.
