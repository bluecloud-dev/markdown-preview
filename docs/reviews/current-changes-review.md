# Code Review — Current Working-Tree Changes

**Branch:** `main` (uncommitted)
**Scope:** 29 modified, 2 deleted, 4 new files. ~380 insertions / ~1,806 deletions.
**Reviewed at:** 2026-04-20

---

## 1. Overview

This change rips out the `workbench.editorAssociations` auto-mutation feature and the associated public `muninn.editorAssociations` setting, then cleans up around it:

- **Source code**: removes ~220 lines of association-sync logic from `src/extension.ts`, drops the field from `ExtensionConfiguration`, `ConfigService`, and `l10n/bundle.l10n.json`.
- **Manifest**: removes `activationEvents` entirely (relying on VS Code ≥1.75 auto-activation from contribution points), removes 5 `editor/title` menu entries (Bold/Italic/Mermaid/InsertTable/TableActions) leaving only `Open Raw Markdown`, and removes the `prepublish` npm script.
- **Tests**: deletes `tests/unit/extension-associations.test.ts`, adds `tests/unit/extension-activation.test.ts` plus an integration-CLI assertion that activation does **not** touch `workbench.editorAssociations`. Splits the table-delete E2E into its own file `tests/e2e/table-delete.e2e.mjs`. Hardens `resetEditors` / `openWorkspaceFile` for test isolation on Windows.
- **Cross-platform**: replaces hard-coded `/tmp` with `os.tmpdir()` in [.vscode-test.mjs](.vscode-test.mjs) and [wdio.conf.cjs](wdio.conf.cjs); normalizes Windows paths for the WDIO service loader; adds `normalizeNewlines` in core-workflow test.
- **Docs**: ~1,261 lines removed across 12 docs to shed legacy preview-first material. `docs/TEST.md` deleted. New [AGENTS.md](AGENTS.md) is now tracked (negated in `.gitignore`) and legacy specs re-scoped via [specs/markdown-preview/README.md](specs/markdown-preview/README.md).

The removal is advertised in [docs/ROADMAP.md:20](docs/ROADMAP.md) and documented in [TROUBLESHOOTING.md:9](docs/TROUBLESHOOTING.md), [GETTING_STARTED.md:41](docs/GETTING_STARTED.md), [ARCHITECTURE.md:43](docs/ARCHITECTURE.md), and the migration guide.

---

## 2. Code Quality & Style

**Strengths**

- Removal is surgical and consistent across source, types, l10n bundle, NLS strings, settings schema, defaults, tests, and docs — no orphaned identifiers found via grep.
- Cross-platform cleanup is correct: `os.tmpdir()` and the `toWdioAbsoluteImportPath` helper fix a real Windows breakage (absolute `C:\…` paths were rejected by WDIO's service loader).
- New [tests/unit/extension-activation.test.ts:78](tests/unit/extension-activation.test.ts) asserts the inverse (`workbenchUpdate.called === false`) — a good regression guard for the removed behavior.
- The new [tests/integration-cli/activation.test.ts:16](tests/integration-cli/activation.test.ts) end-to-end verifies the same invariant against a real VS Code host.
- Docs cleanup aligns with the [AGENTS.md](AGENTS.md) "current implementation is the source of truth" rule; legacy specs are explicitly flagged rather than silently deleted.

**Minor nits**

- [tests/e2e/table-delete.e2e.mjs:9](tests/e2e/table-delete.e2e.mjs) duplicates `executeUntil` / `waitForWorkspaceMarkdown` from [tests/e2e/table.e2e.mjs](tests/e2e/table.e2e.mjs). Consider lifting them into [tests/e2e/helpers.mjs](tests/e2e/helpers.mjs) to keep E2E helpers DRY.
- `resetEditors` changed from revert-dirty-docs to `saveAll(false)` + `closeAllEditors` in [tests/e2e/helpers.mjs:4](tests/e2e/helpers.mjs). The new design couples `resetEditors` and `openWorkspaceFile` — the latter now restores original file contents from an in-memory snapshot. Works, but the contract ("saving is fine because the next open rewrites the file") is non-obvious and worth a one-line comment near the `originalWorkspaceFiles` map.
- `__testing` export in [src/extension.ts:194](src/extension.ts) now only exposes `formatInspectValue`. Fine to keep, but a single-member testing surface is a code smell — either inline or leave a TODO to drop if not expanded.

---

## 3. Correctness & Risks

### 3a. Orphaned workspace state key *(low, worth addressing)*
The removed code wrote `context.workspaceState` under key `'muninn.editorAssociationsAdded'`. Existing installs will keep that state forever — harmless, but untidy. A one-liner cleanup in `activate()` would zero it out:

```ts
void context.workspaceState.update('muninn.editorAssociationsAdded', undefined);
```

### 3b. User-facing behavior change *(documented, but breaking)*
Users on the previous default (`muninn.editorAssociations: true`) had `*.md` / `*.markdown` auto-registered to the custom editor on first activation. After this change:
- **Existing workspaces** already have the entries in `workbench.editorAssociations` — no regression on reload.
- **New workspaces** will open `.md` in the native text editor by default; users must use *Reopen With…* or edit settings.

This is consistent with the AGENTS.md guardrail ("Be cautious about changing `workbench.editorAssociations`"), and [docs/MIGRATION_FROM_MARKDOWN_PREVIEW.md:20](docs/MIGRATION_FROM_MARKDOWN_PREVIEW.md) documents the absence of a replacement. Because this is alpha-tagged (`2.0.0-alpha.1`), the breakage is acceptable — but a **CHANGELOG.md** entry under the alpha is warranted; I did not see one updated in the diff.

### 3c. Removed `activationEvents` is safe here *(verified)*
`engines.vscode` is `^1.85.0` (package.json:9), well above the 1.75 cutoff where VS Code started auto-deriving activation from contribution points (`customEditors`, `contributes.commands`). Removal is correct and reduces startup cost.

### 3d. Removed title-bar menu entries *(intentional, UX-visible)*
Bold/Italic/Mermaid/InsertTable/TableActions icons no longer appear in the editor title bar — only *Open Raw Markdown* remains. Commands are still registered and available via command palette / keybindings, so no functional loss. AGENTS.md explicitly favors this direction ("Avoid … duplicate actions"), so it's consistent. Verify in a live session that none of these were the only discoverability path for a novice user.

### 3e. E2E `openWorkspaceFile` snapshot semantics *(watch for test-order coupling)*
[tests/e2e/helpers.mjs:25](tests/e2e/helpers.mjs) caches the **first observed** contents of each workspace file in `originalWorkspaceFiles`. If a test suite ever opens a file for the first time *after* another test already mutated it, the "original" baseline will be wrong for the rest of the run. Current suites all hit `openWorkspaceFile('sample.md')` from a clean fixture, so it's safe today — but a comment pinning this invariant would help future-you.

### 3f. `normalizeNewlines` is one-sided
[tests/integration-cli/core-workflow.test.ts:11](tests/integration-cli/core-workflow.test.ts) normalizes `\r\n → \n` only on the document side. Assertions use `'\n| A | 1 |\n'` literals, which is correct on Windows only because of the normalization — fine, just note that any future assertion forgetting to pass through `normalizeNewlines` will silently fail on Windows CI.

### 3g. Webview close error swallow *(scoped correctly)*
[tests/e2e/helpers.mjs:134](tests/e2e/helpers.mjs) swallows `invalid session id` on `webview.close()`. The guard is string-match on `error.message`, which is acceptable for a test helper. Keep an eye on WebdriverIO upgrades — the message wording may change.

---

## 4. Test Coverage

- **Unit**: new `extension-activation.test.ts` covers both `formatInspectValue` (previously in `extension-associations.test.ts`) and the "no mutation" invariant. Deletion of the old file is net-neutral because the removed behavior no longer exists. ✅
- **Integration CLI**: added invariant test in [tests/integration-cli/activation.test.ts:16](tests/integration-cli/activation.test.ts). ✅
- **E2E**: table-delete extracted into its own file — coverage preserved. ✅
- **Fixtures**: [tests/fixtures/.vscode/settings.json](tests/fixtures/.vscode/settings.json) no longer pre-seeds `workbench.editorAssociations`, so the fixture now exercises the new default. ✅

No coverage gap introduced. Confirm `npm run lint && npm run typecheck && npm test` pass per [AGENTS.md:17](AGENTS.md).

---

## 5. Security

- Removing writes to `workbench.editorAssociations` **reduces** blast radius — Muninn no longer mutates user/workspace settings on activation. Net-positive for the security posture called out in AGENTS.md.
- No changes to webview CSP, `localResourceRoots`, or message validation in this diff.
- No new dependencies, no credential-adjacent changes.

---

## 6. Performance

- Dropping `activationEvents` + the association-sync pass on activation and on every `onDidChangeConfiguration` is a small but real startup win. No regressions.

---

## 7. Recommended Actions Before Merge

1. **Add a one-time `workspaceState` cleanup** for the orphaned `muninn.editorAssociationsAdded` key in `activate()`.
2. **Update CHANGELOG.md** under `2.0.0-alpha.1` (or next alpha) noting the removal of `muninn.editorAssociations` and the behavioral change for first-open on new workspaces.
3. **Run `npm run lint && npm run typecheck && npm test`**, and `npm run test:e2e` (table flows changed). Per AGENTS.md.
4. **Consider** lifting the duplicated `executeUntil`/`waitForWorkspaceMarkdown` into [tests/e2e/helpers.mjs](tests/e2e/helpers.mjs) — non-blocking.
5. **Add a short comment** in [tests/e2e/helpers.mjs](tests/e2e/helpers.mjs) describing the `originalWorkspaceFiles` snapshot contract (first-observed-wins).
6. **Manually verify** in a dev host that the title-bar command reduction to just *Open Raw Markdown* still leaves the full toolbar inside the custom editor webview intact — this diff doesn't touch webview code, but confirming avoids UX surprise.

Overall: a clean, well-scoped removal with consistent follow-through. Approve with the above nits addressed.
