# QUALITY_BASELINE

## Scope

This baseline defines the engineering standards for `muninn-vscode` after the refactor. It translates practices seen in mature VS Code extensions into explicit rules for this repository.

## Benchmark Comparison Highlights

Benchmarked against:

- [prettier/prettier-vscode](https://github.com/prettier/prettier-vscode)
- [golang/vscode-go](https://github.com/golang/vscode-go)
- [VSCodeVim/Vim](https://github.com/VSCodeVim/Vim)
- [gitkraken/vscode-gitlens](https://github.com/gitkraken/vscode-gitlens)
- [microsoft/vscode-extension-samples](https://github.com/microsoft/vscode-extension-samples)
- [hediet/vscode-drawio](https://github.com/hediet/vscode-drawio)
- [microsoft/codetour](https://github.com/microsoft/codetour)

Most relevant standards adopted for this repo:

1. Keep extension entrypoints thin and push feature logic into focused modules.
2. Keep webview messaging strongly typed with runtime validation at the boundary.
3. Enforce deterministic quality gates in CI (`lint`, `format:check`, `typecheck`, tests, coverage/security checks).
4. Keep command IDs/settings stable and namespaced.
5. Keep webview security strict-by-default (minimal `localResourceRoots`, strict CSP, sanitized HTML/SVG).
6. Prefer test layering: unit for core logic, integration for extension host behavior, E2E for user workflows.

## Architecture Principles

1. **Boundary-first layout**

- VS Code host edge: `/Users/aymenhammouda/workspace/markdown-reader/src/extension.ts`, `/Users/aymenhammouda/workspace/markdown-reader/src/custom-editor/*`
- Testable core/services: `/Users/aymenhammouda/workspace/markdown-reader/src/services/*`, `/Users/aymenhammouda/workspace/markdown-reader/src/shared/*`
- Webview runtime: `/Users/aymenhammouda/workspace/markdown-reader/src/webview/editor/*`

2. **Protocol as contract**

- Host/view communication must use `/Users/aymenhammouda/workspace/markdown-reader/src/custom-editor/protocol.ts` types + guards.
- No untyped message handling on either side.

3. **Single owner per concern**

- Settings access: `ConfigService`
- Logging: `Logger`
- Document revisions/sync: `DocumentSync`
- Table markdown transformations: `src/webview/editor/tables/markdown-table-utilities.ts`

4. **No hidden side effects**

- Resource/listener lifecycle must be explicit and disposable.
- Cross-module state is passed via dependencies, not ambient globals.

## Coding Conventions

1. Use descriptive names and short functions.
2. Prefer pure helpers for parsing/transforms.
3. Keep comments minimal; comments explain "why", not "what".
4. Keep command registration centralized.
5. Keep error messages actionable and safe for users (no raw stack traces in UI).

## TypeScript Standards

1. `strict: true` for source and tests.
2. Avoid `any`; use unions/guards for message and config boundaries.
3. Use explicit exported types when they improve comprehension.
4. Prefer `unknown` + narrowing to unsafe casts.
5. Keep shared constants typed with literal-friendly patterns (`as const` where useful).

## VS Code Extension Standards

1. Keep engine compatibility at `^1.85.0`.
2. Keep activation/registration behavior aligned with current VS Code guidance:

- `onCustomEditor` for custom editor entry.
- Contributed commands remain namespaced (`muninn.*`).

3. Every event listener/disposable must be owned and disposed.
4. Settings keys remain stable (`muninn.*`) and are read through `ConfigService`.

## Webview Standards

1. Strict CSP with nonce/script isolation and no inline script relaxation.
2. Restrict `localResourceRoots` to `/media` only.
3. Validate all inbound messages from webview before handling.
4. Sanitize renderable SVG/HTML before assigning `innerHTML`.
5. Keep Mermaid behavior trust-aware and settings-driven.

## Testing Strategy

1. **Unit** (`tests/unit`):

- Protocol guards
- Config/logger services
- `DocumentSync`
- Mermaid trust-gating and sanitizer behavior

2. **Integration CLI** (`tests/integration-cli`):

- Extension activation
- Command registration
- Core custom-editor workflows (including table actions)

3. **E2E** (`tests/e2e`):

- Reading-first custom editor behavior
- Editing/formatting commands
- Mermaid flows
- Table workflows
- Keyboard accessibility path

4. **Minimum gates**

- `npm run lint`
- `npm run format:check`
- `npm run typecheck`
- `npm test`
- `npm run coverage`
- `npm run test:e2e`
- `npm run check:no-telemetry`

## Dependency Standards

1. Minimize runtime dependencies; no dependency added only for style convenience.
2. Prefer platform/standard APIs over custom helpers where clear.
3. Keep build/test-only dependencies isolated in `devDependencies`.
4. Keep CI and release workflows symmetric on quality/security gates.

## Documentation Conventions

1. Keep code comment-light; move rationale to docs:

- `/Users/aymenhammouda/workspace/markdown-reader/README.md`
- `/Users/aymenhammouda/workspace/markdown-reader/docs/GETTING_STARTED.md`
- `/Users/aymenhammouda/workspace/markdown-reader/docs/ARCHITECTURE.md`
- `/Users/aymenhammouda/workspace/markdown-reader/docs/TESTING.md`
- `/Users/aymenhammouda/workspace/markdown-reader/MANUAL_QA.md`

2. Keep docs update-coupled with behavior/architecture changes.
3. Prefer short operational checklists over long narrative prose.

## References

### Context7 MCP (VS Code API and current extension guidance)

1. [Webview guide](https://code.visualstudio.com/api/extension-guides/webview) (CSP, `localResourceRoots`, webview message channel patterns)
2. [Activation events](https://code.visualstudio.com/api/references/activation-events) (`onCommand`, `onCustomEditor`, activation behavior notes)
3. [Testing extensions](https://code.visualstudio.com/api/working-with-extensions/testing-extension) (`@vscode/test-cli`, `@vscode/test-electron` guidance)

### Microsoft Learn MCP (security posture and CSP hardening context)

1. [Secure the developer environment for Zero Trust](https://learn.microsoft.com/security/zero-trust/develop/secure-dev-environment-zero-trust)
2. [Using Content Security Policy (CSP) to control which resources can be run](https://learn.microsoft.com/microsoft-edge/extensions/developer-guide/csp)

Note: Microsoft Learn MCP search results were not sufficiently specific for VS Code extension API testing details, so VS Code API specifics are sourced from official `code.visualstudio.com` documentation via Context7, while Learn sources are used for security baseline/hardening posture.
