# Muninn Security Posture

This document records the security posture that exists in the repository as of
2026-06-14. It is an engineering evidence file, not a marketing badge: every
claim below is tied to repository code or configuration and should be rechecked
before publication or release.

## Runtime Surface

- Muninn is a VS Code extension with a TypeScript extension host entry point and
  one sanctioned custom editor webview (`package.json:63-90`,
  `package.json:92-107`, `src/extension.ts:1-9`,
  `src/custom-editor/muninn-custom-editor-provider.ts:78-86`).
- Runtime activation is limited to startup, the Muninn custom editor, and
  declared Muninn commands (`package.json:63-83`).
- The top-level runtime dependency surface is `markdown-it`,
  `markdown-it-front-matter`, `mermaid`, and the ProseMirror packages listed in
  `package.json:429-441`.
- Development, test, packaging, and release dependencies are separated under
  `devDependencies` (`package.json:443-473`).

## Webview Isolation

- The custom editor webview enables scripts because the ProseMirror editor runs
  inside the webview, but local resources are restricted to the extension's
  `media` directory (`src/custom-editor/muninn-custom-editor-provider.ts:82-85`).
- The generated webview HTML sets a CSP with `default-src 'none'`, a scoped
  image policy, extension-scoped styles, and nonce-only scripts
  (`src/custom-editor/muninn-custom-editor-provider.ts:368-389`).
- The webview bootstrap data is JSON-serialized and escapes `<` before it is
  placed in the nonce-bearing setup script
  (`src/custom-editor/muninn-custom-editor-provider.ts:29-30`,
  `src/custom-editor/muninn-custom-editor-provider.ts:368-387`).

## Host/Webview Message Boundary

- Incoming webview messages are rejected unless they pass the
  `isViewToHostMessage` type guard before dispatch
  (`src/custom-editor/muninn-custom-editor-provider.ts:104-112`).
- Accepted webview-to-host messages are limited to `view.ready`,
  `view.applyDocument`, `view.executeCommand` for `openRawMarkdown`, and
  `view.requestLinkInput` (`src/custom-editor/protocol.ts:60-79`,
  `src/custom-editor/protocol.ts:122-147`).
- Serialized document payloads require a string `markdown` value and a finite
  numeric `revision` before they can cross the boundary
  (`src/custom-editor/protocol.ts:81-100`).
- Host-to-webview messages are also modeled as a closed union and validated by
  `isHostToViewMessage` for callers that need a guard
  (`src/custom-editor/protocol.ts:20-58`,
  `src/custom-editor/protocol.ts:149-197`).

## Markdown and Mermaid Handling

- The Markdown parser is configured with `html: false`, so raw HTML is parsed as
  document text rather than executable HTML
  (`src/webview/editor/markdown-codec.ts:30-33`).
- Mermaid rendering output is sanitized before insertion into the DOM in both
  the preview panel and inline Mermaid preview
  (`src/webview/editor/preview.ts:63-69`,
  `src/webview/editor/nodes/table-node-view.ts:244-250`).
- The Mermaid SVG sanitizer removes `script`, `iframe`, `object`, and `embed`
  nodes; converts `foreignObject` labels to SVG text where possible; removes
  inline event handler attributes; and removes `javascript:` or `data:text/html`
  links from `href`/`xlink:href` (`src/webview/editor/preview.ts:125-160`).
- Mermaid rendering is trust-aware. It is disabled in untrusted workspaces unless
  users explicitly enable `muninn.integrations.mermaid.allowInUntrustedWorkspaces`
  (`package.json:86-90`, `package.json:385-396`,
  `src/services/config-service.ts:11-15`,
  `src/integrations/mermaid-adapter.ts:4-20`).

## Telemetry and Network Behavior

- Muninn declares and enforces a no-telemetry policy with
  `npm run check:no-telemetry` (`package.json:410-427`,
  `scripts/check-no-telemetry.js:22-36`,
  `.github/workflows/ci.yml:61-62`, `.github/workflows/release.yml:53-54`).
- The no-telemetry check scans TypeScript files under `src/` for the token
  `telemetry` and fails if it appears (`scripts/check-no-telemetry.js:4-36`).
- As of the 2026-06-14 audit, runtime source under `src/` contains no direct
  calls to `fetch`, `XMLHttpRequest`, `WebSocket`, `EventSource`, or `eval`. The
  webview CSP permits `https:` image sources but no default network source
  (`src/custom-editor/muninn-custom-editor-provider.ts:376-379`).

## Supply Chain and CI

- CI runs lint, formatting, typecheck, coverage, integration tests, and the
  no-telemetry guard on pull requests to `main` (`.github/workflows/ci.yml:3-7`,
  `.github/workflows/ci.yml:36-62`).
- The security workflow runs CodeQL for JavaScript/TypeScript and GitHub Actions,
  runs Dependency Review on pull requests, and runs OpenSSF Scorecard on
  non-pull-request events with SARIF upload to the Security tab
  (`.github/workflows/security.yml:20-54`,
  `.github/workflows/security.yml:55-73`,
  `.github/workflows/security.yml:74-100`).
- Dependabot is configured for weekly npm and GitHub Actions updates
  (`.github/dependabot.yml:1-40`).
- Current GitHub Actions references use version tags such as
  `actions/checkout@v6`, `github/codeql-action/init@v4`, and
  `ossf/scorecard-action@v2.4.3`; they are not pinned by SHA in the current
  workflows (`.github/workflows/ci.yml:24-31`,
  `.github/workflows/security.yml:38-51`,
  `.github/workflows/security.yml:90-99`,
  `.github/workflows/release.yml:15-20`,
  `.github/workflows/release.yml:96-100`).
- No OpenSSF Scorecard badge is published here because this repository does not
  yet commit a verified score. Add a badge only after a real score exists.

## What Muninn Does Not Do

- Muninn does not intentionally collect telemetry. This is enforced by
  `scripts/check-no-telemetry.js` and CI (`scripts/check-no-telemetry.js:22-36`,
  `.github/workflows/ci.yml:61-62`).
- Muninn does not intentionally execute Markdown document content as HTML:
  Markdown parsing uses `html: false`
  (`src/webview/editor/markdown-codec.ts:30-33`).
- Muninn does not intentionally execute Mermaid output without sanitization:
  rendered SVG passes through `sanitizeMermaidSvg` before DOM insertion
  (`src/webview/editor/preview.ts:63-69`,
  `src/webview/editor/preview.ts:125-160`,
  `src/webview/editor/nodes/table-node-view.ts:244-250`).
- Muninn does not intentionally use `eval` or direct runtime network APIs in
  `src/` as of the 2026-06-14 source audit.

## Maintainer Review Checklist

- [ ] Confirm GitHub private vulnerability reporting is enabled for
      `bluecloud-dev/muninn-vscode`; the repository API response reviewed on
      2026-06-14 did not expose it under `security_and_analysis`.
- [ ] Re-run the no-runtime-network source search before release:
      `rg -n "\\b(fetch|XMLHttpRequest|WebSocket|EventSource|eval\\()" src`.
- [ ] Review whether GitHub Actions should be pinned by SHA in a dedicated
      workflow-hardening issue. Do not claim SHA pinning until it is true.
- [ ] Add an OpenSSF Scorecard badge only after a real published score exists.
