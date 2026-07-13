---
title: AGPL ops: SPDX headers in source + THIRD_PARTY_NOTICES bundled into the VSIX
labels: ai-ready,licensing,P1,phase:now
---
## Context

License switched to AGPL-3.0-only (LICENSE, package.json, README — June 9). Two compliance follow-ups (`docs/MARKET_POSITION_2026-06.md` §7.2): per-file SPDX headers, and third-party notices for the MIT dependencies that esbuild inlines into `dist/extension.js` and the webview bundle — their license notices must travel with the distributed artifact.

## Scope

1. Add to every `.ts` source file in `src/`, `tests/`, `scripts/` (first line):
   `// SPDX-License-Identifier: AGPL-3.0-only` and second line `// Copyright (C) 2025-2026 Aymen Hammouda`. For `.css`: `/* ... */` form. Write `scripts/check-spdx.js` (mirror the style of `scripts/check-no-telemetry.js`) that fails CI when a tracked source file lacks the header; add npm script `check:spdx` and wire into CI.
2. Generate `THIRD_PARTY_NOTICES.md`: for each production dependency in the bundle (the `dependencies` block: markdown-it, mermaid, prosemirror-* — plus their transitive deps that esbuild actually includes), list name, version, license id, and the verbatim license text. Implement `scripts/generate-third-party-notices.js` reading the esbuild metafile (add `metafile: true` to `esbuild.mjs`) so the list reflects what is actually bundled, not the whole tree. Commit the generated file and verify in CI that it is current (regenerate + git diff --exit-code).
3. Ensure the file ships: confirm it is NOT excluded by `.vscodeignore`; the Marketplace "Resources" should show the license; the VSIX must contain `LICENSE` and `THIRD_PARTY_NOTICES.md` (assert in a packaging test: unzip the vsix in CI and check).
4. Do NOT add headers to generated/vendored files or JSON.

## Acceptance criteria

- [ ] All source files carry the two-line header; `npm run check:spdx` enforces in CI
- [ ] `THIRD_PARTY_NOTICES.md` generated from the real bundle graph; staleness check in CI
- [ ] VSIX verified to contain LICENSE + notices (CI assertion)
- [ ] `npm run package` output unchanged otherwise
