# Testing Guide

This guide documents the complete automated and manual QA strategy for Muninn for VS Code.

## Test Stack

| Layer       | Tooling                                      | Scope                                              |
| ----------- | -------------------------------------------- | -------------------------------------------------- |
| Unit        | Mocha + Chai + Sinon                         | Isolated logic and service behavior                |
| Integration | `@vscode/test-cli` + `@vscode/test-electron` | Real extension host behavior in VS Code desktop    |
| UI E2E      | WebdriverIO + `wdio-vscode-service`          | Click-through user journeys in the real VS Code UI |

## Commands

| Command                    | Purpose                                                          |
| -------------------------- | ---------------------------------------------------------------- |
| `npm run lint`             | Static checks for source and tests                               |
| `npm run format:check`     | Formatting gate (Prettier)                                       |
| `npm run typecheck`        | Type-only TypeScript validation (`--noEmit`)                     |
| `npm run compile`          | Build extension + tests                                          |
| `npm test`                 | Standard integration suite (`@vscode/test-cli`)                  |
| `npm run test:integration` | Explicit integration run                                         |
| `npm run test:e2e`         | Desktop UI E2E tests with WDIO                                   |
| `npm run test:e2e:headed`  | Desktop UI E2E tests (same suite, explicit local run entrypoint) |
| `npm run test:web`         | Web test status check (currently not supported)                  |
| `npm run coverage`         | Unit coverage run                                                |

## Integration Tests (`@vscode/test-cli`)

- Configuration file: `.vscode-test.mjs`
- Test files loaded:
  - `out/tests/integration-cli/**/*.test.js`
- Runner behavior:
  - Uses VS Code stable by default
  - Creates an isolated run directory per invocation under `/tmp/muninn-vscode-test/<run-id>/`
  - Copies `tests/fixtures` into a run-scoped workspace to avoid cross-test contamination
  - Uses isolated user-data and extensions directories via launch args

## Debugging Integration Tests in VS Code

Use the launch configuration in `.vscode/launch.json`:

- **Extension Tests**
- It references `testConfiguration: ${workspaceFolder}/.vscode-test.mjs`

Typical flow:

1. Run `npm run compile`
2. Open Run and Debug
3. Start **Extension Tests**

## UI E2E Tests (WebdriverIO)

- WDIO config: `wdio.conf.cjs`
- Launcher script: `scripts/run-e2e.js`
- Specs:
  - `tests/e2e/reading-first.e2e.mjs`
  - `tests/e2e/edit-mode.e2e.mjs`
  - `tests/e2e/formatting-mermaid.e2e.mjs`
  - `tests/e2e/mermaid.e2e.mjs`
  - `tests/e2e/table.e2e.mjs`
  - `tests/e2e/accessibility-toolbar.e2e.mjs`

`table.e2e.mjs` includes source-panel apply verification (button + `Ctrl/Cmd+Enter`) and markdown persistence checks.
`mermaid.e2e.mjs` includes a regression assertion that Mermaid preview renders visible SVG label text.

### Stability Controls

- `maxInstances: 1`
- explicit waits with `browser.waitUntil`
- run-scoped workspace copy under `.vscode-test/e2e-runs/<run-id>/workspace`
- deterministic artifact tree per date and run-id (`WDIO_RUN_ID`)
- `WDIO_RUN_ID` is auto-generated per invocation by `scripts/run-e2e.js` and shared across workers

### Artifacts

Artifacts are stored under:

`artifacts/e2e/<YYYY-MM-DD>/<run-id>/`

Includes:

- `screenshots/` (captured on every failed test)
- `videos/` (failure-focused via `saveAllVideos: false`, enabled in CI by default)
- `junit/` (CI-friendly XML)
- `logs/`

By default, local runs disable video (`E2E_VIDEO=0`) and CI enables it (`E2E_VIDEO=1`).

## VS Code Web Test Support

This extension is currently **desktop-only** (no `browser` entry in `package.json`), so `@vscode/test-web` is not enabled.

If web support is added later:

1. Add a web entrypoint in `package.json`
2. Add `test:web` runner using `@vscode/test-web`
3. Add a dedicated CI job for web extension validation

## CI

CI runs:

1. lint
2. format check
3. typecheck
4. compile + bundle
5. unit coverage
6. integration tests (`npm test`)
7. desktop E2E (`npm run test:e2e`)
8. artifact upload (VSIX + E2E screenshots/videos/junit)

### Notes on Local macOS

If E2E startup fails before test execution with a session bootstrap error (e.g., Chromedriver unable to attach to VS Code pages), this is environment-specific and not assertion flakiness. In that case, use Linux CI (xvfb) as the source of truth while keeping local runs for quick smoke attempts.

## Manual QA

Manual verification checklist:

- `MANUAL_QA.md`

## Manual Visual QA

1. Open Extension Development Host.
2. Open `tests/fixtures/sample.md`.
3. Capture editor overview in light and dark themes.
4. Tab through toolbar, editor, table controls, and Source button.
5. Confirm visible focus rings on every interactive control.
6. Insert a table and confirm Delete is visually dangerous.
7. Insert Mermaid and confirm disabled/enabled states are understandable.
8. Compare screenshots against `docs/design/MUNINN_VISUAL_QA.md`.
