# AGENTS.md — Muninn agent instructions

Canonical instructions for AI agents working in this repository. If any other instruction file (a local `CLAUDE.md`, `.specify/` constitution, or older docs) conflicts with this file, **this file wins**. In particular: any rule stating this extension "opens markdown in preview mode using native APIs" or "forbids custom webviews" describes the retired v1 architecture. v2 *is* a custom-editor webview.

## What this project is

Muninn (`muninn-vscode`) is a VS Code extension: a ProseMirror-based **custom text editor** (`muninn.markdownEditor`) that opens `.md`/`.markdown` by default and provides single-pane, reading-first rich editing — toolbar formatting, editable table grids, trust-gated Mermaid previews, a raw-markdown escape hatch. License: AGPL-3.0-only. No telemetry, ever.

## Prime directive: round-trip fidelity

`markdown → ProseMirror → markdown` must be byte-identical. Never introduce serialization churn (re-wrapped lines, renumbered lists, normalized whitespace). If your change touches the schema, parser tokens, serializer, or `src/webview/editor/markdown-transforms.ts`, run and extend the round-trip suite (`specs/round-trip-correctness/spec.md`, roadmap issue #245). A feature that breaks round-trip is wrong even if it works.

## Commands

```bash
npm run compile        # tsc build (src + tests)
npm run bundle         # esbuild bundle
npm run typecheck      # strict type gate
npm run lint           # ESLint + unicorn
npm run format:check   # Prettier
npm test               # VS Code integration tests
npm run coverage       # unit tests + enforced thresholds (80% lines, 70% branches)
npm run test:e2e       # WebdriverIO E2E
npm run check:no-telemetry
npm run package        # build .vsix
```

## Architecture

```
src/
├── extension.ts                      # activation, command registration
├── custom-editor/                    # CustomTextEditorProvider, message protocol,
│                                     #   revision-aware document sync, host-side validation
├── webview/editor/                   # ProseMirror app: index.ts (commands/toolbar state),
│                                     #   bootstrap.ts (DOM), nodes/ (table + code node views),
│                                     #   tables/ (markdown table model), preview.ts (Mermaid),
│                                     #   sync.ts, messages.ts, localization.ts, styles.css
├── services/                         # config-service, logger
├── integrations/mermaid-adapter.ts
└── shared/                           # webview-strings (l10n defaults), code-languages
```

Security infrastructure already in place (do not re-create): `SECURITY.md`, `.github/dependabot.yml`, hardened workflows (May 2026).

## Hard rules

1. **Localization**: every user-facing string goes through l10n. Webview strings: add the key to `src/shared/webview-strings.ts` (type + defaults), the host injection in `src/custom-editor/muninn-custom-editor-provider.ts`, and `l10n/bundle.l10n.json` — copy the pattern of an existing key like `statusInsertedTable`. Host-side strings (commands, settings): `package.nls.json`.
2. **Security**: webview stays CSP-safe — nonced scripts only, no inline handlers, no remote resources, no `eval`. Host validates every webview message against the protocol. Mermaid rendering stays behind workspace trust + the explicit untrusted-workspace setting. markdown-it keeps `html: false`.
3. **No telemetry** of any kind. CI enforces it.
4. **TypeScript strict**; no `any` without a justifying comment. No `console.log` in production code — use `src/services/logger.ts`.
5. **No new webviews** beyond the sanctioned custom editor. Prefer native VS Code APIs for everything else (pickers, inputs, notifications, symbols).
6. **No proprietary markdown syntax** (no wikilinks, no Notion-style blocks). CommonMark + GFM only.
7. **Tests are part of the change**: unit (`tests/unit`), integration (`npm test`), E2E (`tests/integration-cli`) when UI behavior changes. Coverage thresholds are enforced — don't lower them.

## Working the roadmap

- Issue sources live in `.github/issue-backlog/` (one file per issue; `_conventions.md` is appended to `ai-ready` issues at creation). Live issues: #243–#278.
- Labels: `ai-ready` = fully delegable; `needs-human` = has a human gate (accounts, judgment, maintainer voice) — do not attempt the human parts.
- Code line references in issues are pinned to commit `dfafdfe`; re-locate by symbol name if lines drifted.
- Decision records: `docs/MARKET_POSITION_2026-06.md` (current strategy + AGPL decision §7), `docs/COMPETITIVE_BRIEF.md`, `docs/STRATEGIC_ROADMAP.md`, `docs/design/ACCESSIBILITY_AUDIT_2026-06.md`, `docs/design/DESIGN_CRITIQUE_2026-06.md`. Don't re-litigate decided questions in PRs; flag concerns in the issue instead.

## License obligations for contributions

The project is AGPL-3.0-only. Once issue #264 lands, every new source file needs the two-line SPDX header. Sign commits per DCO once #265 lands (`git commit -s`).
