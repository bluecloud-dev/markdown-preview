# AGENTS.md

## Repository expectations

- Treat Muninn as a desktop-first VS Code custom editor extension, not as a native preview-wrapper extension.
- Preserve the current custom editor architecture unless there is a strong product or maintenance reason to change it.
- Before changing behavior, inspect `package.json`, [`src/extension.ts`](/C:/Users/hammo/Documents/GitHub/bluecloud-dev/markdown-preview/src/extension.ts), and the custom editor/webview files under [`src/custom-editor/`](/C:/Users/hammo/Documents/GitHub/bluecloud-dev/markdown-preview/src/custom-editor/) and [`src/webview/editor/`](/C:/Users/hammo/Documents/GitHub/bluecloud-dev/markdown-preview/src/webview/editor/).

## Source of truth

- The current implementation is the source of truth.
- `specs/markdown-preview/` and several docs under `docs/` still describe an older preview-first product direction and must be treated as legacy until they are rewritten.
- If you update architecture or UX, update the affected docs in the same change or explicitly note the drift.

## Verification

- Run `npm run lint`, `npm run typecheck`, and `npm test` after meaningful code changes.
- Run `npm run coverage` when changing host-side services or document sync behavior.
- Run `npm run test:e2e` when changing webview/editor UX, toolbar behavior, table flows, or Mermaid behavior.
- Keep cross-platform behavior in mind. This repo is developed on Windows and should not assume Unix-only paths or `\n` line endings.

## UX guardrails

- Keep the product reading-first. Avoid adding noisy chrome, duplicate actions, or generic editor clutter without a clear workflow win.
- Prefer native VS Code surfaces where they improve discoverability, but do not duplicate the same action across too many surfaces without justification.
- Maintain the raw-markdown escape hatch and workspace-trust-aware Mermaid behavior.

## Performance and safety

- Keep activation lazy and justify any startup-time work.
- Preserve webview security posture: strict CSP, limited `localResourceRoots`, validated message payloads, and private VS Code API access.
- Be cautious about changing `workbench.editorAssociations`; it is user/workspace-affecting behavior.
