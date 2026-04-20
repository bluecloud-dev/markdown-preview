# QA Report

Date: 2026-02-21

## 1. Quality Risks and Flaky Areas

- High: Desktop E2E bootstrap is currently unstable on local macOS in this environment (`Timeout awaiting 'response'` on WebDriver `POST /session`), so no UI assertions execute.
- Medium: E2E failure before test start means screenshot hooks do not run (no browser session available); chromedriver/junit artifacts are still produced.
- Medium: Integration tests exercise core flows but do not yet deeply assert every custom-editor menu visibility path.

## 2. QA Surface Area Map (Phase 0)

- Extension support: desktop extension only (no `browser` entrypoint; `test:web` intentionally reports unsupported).
- Build/test toolchain: TypeScript (`tsc`), esbuild bundle, Mocha-based unit/integration.
- Contributes footprint:
  - Commands: 9 (`muninn.*`)
  - Settings: 3 (`muninn.*`)
  - Menus: 6
  - Keybindings: 5
- Primary QA journeys:
  - Open markdown in custom editor
  - Formatting command execution from toolbar/commands
  - Mermaid and table workflow stability
  - Raw editor fallback
  - Configuration and trust-sensitive behavior

## 3. Manual QA Checklist

- Manual checklist file: `/Users/aymenhammouda/workspace/markdown-reader/MANUAL_QA.md`

## 4. Automated Coverage Matrix

| Feature / Journey | Integration Coverage | E2E Coverage | Current Status |
| --- | --- | --- | --- |
| Extension activation | `/Users/aymenhammouda/workspace/markdown-reader/tests/integration-cli/activation.test.ts` | Included in all E2E startup flows | Integration passing |
| Command registration | `/Users/aymenhammouda/workspace/markdown-reader/tests/integration-cli/commands.test.ts` | Command palette usage in `/Users/aymenhammouda/workspace/markdown-reader/tests/e2e/edit-mode.e2e.mjs` | Integration passing |
| Custom editor open by default | `/Users/aymenhammouda/workspace/markdown-reader/tests/integration-cli/core-workflow.test.ts` | `/Users/aymenhammouda/workspace/markdown-reader/tests/e2e/reading-first.e2e.mjs` | Integration passing; E2E blocked by bootstrap |
| Raw fallback command | `/Users/aymenhammouda/workspace/markdown-reader/tests/integration-cli/core-workflow.test.ts` | `/Users/aymenhammouda/workspace/markdown-reader/tests/e2e/edit-mode.e2e.mjs` | Integration passing; E2E blocked by bootstrap |
| Formatting command behavior | Existing integration formatting coverage + workflow smoke | `/Users/aymenhammouda/workspace/markdown-reader/tests/e2e/formatting-mermaid.e2e.mjs` | Integration passing; E2E blocked by bootstrap |
| Mermaid workflow stability | Core workflow + fixture open path | `/Users/aymenhammouda/workspace/markdown-reader/tests/e2e/mermaid.e2e.mjs` | Integration partial; E2E blocked by bootstrap |
| Artifact generation on E2E failures | N/A | WDIO config (`afterTest` screenshot hook, junit/video reporters) | Implemented; pre-session failures cannot capture screenshots |

## 5. Gaps and Prioritized Next Tests

1. Fix local/CI E2E session bootstrap reliability first (highest priority); until then UI assertions are not executed.
2. Add integration tests for context-key-driven menu visibility and title-bar actions.
3. Add integration tests for trust-gated features (`muninn.integrations.*`) in restricted mode scenarios.
4. Add integration coverage for paste/drop providers and focus mode toggling side effects.
5. Add deterministic parity fixtures (GitHub/GitLab markdown samples) to validate rendering compatibility over time.

## 6. Known Limitations

- Local macOS E2E runs in this environment fail before test execution with WebDriver bootstrap timeout issues.
- `@vscode/test-web` is not enabled because the extension currently has no web entrypoint.
- Screenshots are guaranteed for assertion-level test failures; they cannot be captured when no browser session is established.
- Most recent local E2E artifacts (bootstrap-failure run): `/Users/aymenhammouda/workspace/markdown-reader/artifacts/e2e/2026-02-21/qa-e2e-fullcheck`

## Validation Snapshot

- `npm run lint`: pass
- `npm run compile`: pass
- `npm test` (integration via `@vscode/test-cli`): pass
- `npm run test:e2e`: fail in local environment during session bootstrap (no test bodies executed)
