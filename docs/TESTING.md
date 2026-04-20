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
```

Run these when the change requires deeper coverage:

- `npm run coverage`
  Use when changing host-side services or document sync behavior.
- `npm run test:e2e`
  Use when changing webview/editor UX, toolbar behavior, table flows, or Mermaid behavior.

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
- Markdown round-trips through the custom editor without leaking internal table fences
- Raw markdown fallback remains available
- Mermaid respects workspace trust policy
- Table editing and command-driven authoring flows remain stable
