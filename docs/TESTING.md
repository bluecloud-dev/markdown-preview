# Testing

Muninn uses three test layers:

- Unit tests for isolated logic and services
- Integration CLI tests for real VS Code extension-host behavior
- WDIO E2E tests for desktop UI flows

## Verification Commands

```bash
npm run lint
npm run typecheck
npm test
npm run bundle
```

Run these when the change requires deeper coverage:

- `npm run coverage`
  Use when changing host-side services or document sync behavior.
- `npm run test:e2e`
  Use when changing webview/editor UX, toolbar behavior, table flows, or Mermaid behavior.
- `npm run bundle`
  Use when changing webview imports or build scripts. The bundle step emits `media/bundle-metadata.json` and enforces the initial webview payload budget.

## Test Layout

- `tests/unit/`
  VS Code API mocks and focused logic tests
- `tests/integration-cli/`
  Extension-host tests through `@vscode/test-cli`
- `tests/e2e/`
  Desktop interaction flows through WebdriverIO
- `tests/fixtures/`
  Run-scoped fixture workspace copied into integration and E2E sessions

## What The Suites Protect

- Activation stays lazy and does not rewrite workspace editor associations
- Focus mode persists as workspace UI state without becoming a public setting
- Native outline and section navigation stay backed by the host heading model
- Markdown round-trips through the custom editor without leaking internal table fences
- Raw markdown fallback remains available
- Mermaid respects workspace trust policy
- Mermaid stays out of the initial webview payload and loads from generated chunks only when needed
- The initial webview payload remains under the milestone-4 bundle budget
- Table editing and command-driven authoring flows remain stable
