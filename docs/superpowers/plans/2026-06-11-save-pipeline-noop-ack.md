# Save Pipeline Reliability (No-op Apply Ack) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the webview→host sync deadlock so every edit reliably reaches the `TextDocument` (making dirty-state, autosave, save, and hot-exit work), and add unit/integration/e2e tests that lock the whole save chain down.

**Architecture:** Muninn is a `CustomTextEditorProvider`: the `TextDocument` is the source of truth and VS Code owns save/autosave/undo. The webview (ProseMirror) serializes markdown and posts `view.applyDocument`; the host applies it via `workspace.applyEdit`, which fires `onDidChangeTextDocument`, which echoes `host.documentChanged` back — that echo is what releases the webview's `inFlightApply` latch (`src/webview/editor/sync.ts`). **The bug:** when the incoming markdown equals the current document text, `DocumentSync.applyDocument()` returns success *without* applying an edit, so no event fires, no echo is sent, and the latch never releases — every subsequent edit is queued forever and silently dropped. (Empirically confirmed by driving the compiled `HostSyncController`: after one silent no-op, `queueApply` and even `flushApply` never post again.) The fix keeps the view code unchanged and makes the host honor the contract: **every `view.applyDocument` gets a reply** — on a no-op, the host posts the current `host.documentChanged` snapshot. A secondary fix flushes pending edits on webview teardown instead of cancelling them.

**Tech Stack:** TypeScript (strict), mocha + chai (dynamic import) + sinon for unit tests with a mocked `vscode` (`tests/helpers/vscode.js`, loaded via NODE_PATH), `@vscode/test-cli` for integration tests against real VS Code, WebdriverIO + `wdio-vscode-service` for e2e.

**Out of scope (follow-up plan):** the ProseMirror undo-history wipe in `applyHostMarkdown` (`EditorState.create` with a fresh `history()` plugin) and the keystrokes-eaten-during-in-flight-apply race. Both hinge on a pending design decision (rebuild-state vs. transaction-based host updates). This plan only guarantees edits reach the document and saves persist.

**Branch / conflict note:** Execute on a fresh branch off `main` (e.g. `fix/sync-noop-ack`), in its own worktree (use `superpowers:using-git-worktrees`). Open PR #294 touches `src/custom-editor/document-sync.ts` (adds `reconcileTrailingNewlineForApply`); this plan touches the same file in a different region (the `ApplyResult` type and return values). Whichever lands second rebases — the changes are semantically orthogonal.

**Verification commands (used throughout):**

```bash
npm run coverage          # compiles + runs ALL unit tests with nyc thresholds (80% lines / 70% branches)
npm run typecheck         # strict tsc on src and tests
npm run lint              # ESLint + unicorn over src/**/*.ts and tests/**/*.ts
npm run format            # prettier --write (run before format:check)
npm run test:integration  # real VS Code instance (compiles + bundles first)
npm run test:e2e          # WebdriverIO e2e (macOS local)
```

---

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `src/custom-editor/document-sync.ts` | Modify | `ApplyResult` success variant gains `applied: boolean` so callers can tell "edit applied" from "nothing to do" |
| `src/custom-editor/muninn-custom-editor-provider.ts` | Modify | On a no-op apply, post `host.documentChanged` snapshot so the view latch releases (THE fix) |
| `src/webview/editor/index.ts` | Modify | `beforeunload` flushes pending edits before disposing the sync controller |
| `tests/helpers/vscode.js` | Modify | Add `Uri.joinPath` (provider's `getHtml` needs it) |
| `tests/unit/sync-controller.test.ts` | Create | Unit coverage for the `HostSyncController` state machine (currently zero tests) |
| `tests/unit/custom-editor-provider.test.ts` | Create | Regression test: no-op apply must be acknowledged; failure path keeps error+snapshot replies |
| `tests/unit/document-sync.test.ts` | Modify | Update assertions for the `applied` flag |
| `tests/unit/protocol.test.ts` | Modify | Backfill missing `host.documentChanged` guard cases |
| `tests/fixtures/save-pipeline.md` | Create | Fixture for save-chain integration test and e2e typing test |
| `tests/fixtures/save-pipeline-autosave.md` | Create | Separate fixture so the autosave test never sees state from the save test |
| `tests/integration-cli/save-chain.test.ts` | Create | Real-VS-Code proof: command edit → dirty → save/autosave → bytes on disk |
| `tests/e2e/save-integrity.e2e.mjs` | Create | Real keystrokes: typing reaches the document, survives a no-op round trip, persists on save |
| `package.json` | Modify | nyc: re-include `out/src/webview/editor/sync.js` in coverage |

---

### Task 1: Unit coverage for `HostSyncController` (state-machine backfill)

The controller that drives every save has zero tests and is excluded from coverage. These tests pass against current code — they characterize the machine, including the latch behavior that makes the host-side ack mandatory (fixed in Task 3).

**Files:**
- Create: `tests/unit/sync-controller.test.ts`

- [ ] **Step 1: Write the test file**

```typescript
import sinon from 'sinon';
import { HostSyncController, type ApplyDocumentPayload } from '../../src/webview/editor/sync';

let expect: Chai.ExpectStatic;

before(async () => {
  ({ expect } = await import('chai'));
});

describe('HostSyncController', () => {
  let clock: sinon.SinonFakeTimers;
  let posted: ApplyDocumentPayload[];
  let controller: HostSyncController;

  beforeEach(() => {
    clock = sinon.useFakeTimers();
    posted = [];
    controller = new HostSyncController({
      debounceMs: 80,
      postApply: (payload) => posted.push(payload),
    });
  });

  afterEach(() => {
    controller.dispose();
    clock.restore();
  });

  it('coalesces rapid edits and serializes at flush time', () => {
    // Production always passes the same serializeMarkdownForHost function; the
    // debounce timer captures the FIRST closure, so the content that gets
    // posted is whatever the document holds when the timer fires.
    let markdown = 'draft one';
    const getMarkdown = (): string => markdown;

    controller.queueApply(getMarkdown);
    markdown = 'draft two';
    controller.queueApply(getMarkdown);
    expect(posted.length).to.equal(0);

    clock.tick(80);
    expect(posted).to.deep.equal([{ markdown: 'draft two', revision: 0 }]);
  });

  it('holds further applies until the host replies, then retries pending edits', () => {
    controller.queueApply(() => 'first');
    clock.tick(80);
    expect(posted.length).to.equal(1);

    controller.queueApply(() => 'second');
    clock.tick(10_000);
    expect(posted.length).to.equal(1);

    const shouldRetry = controller.handleHostDocumentChanged(1);
    expect(shouldRetry).to.equal(true);

    controller.queueApply(() => 'second');
    clock.tick(80);
    expect(posted.length).to.equal(2);
    expect(posted[1]).to.deep.equal({ markdown: 'second', revision: 1 });
  });

  it('never posts again if the host stays silent after an apply', () => {
    // Documents the contract the host MUST honor: every view.applyDocument
    // needs a reply (host.documentChanged or host.error). Without one the
    // latch below is permanent by design — see the no-op ack in the provider.
    controller.queueApply(() => 'first');
    clock.tick(80);
    expect(posted.length).to.equal(1);

    controller.queueApply(() => 'second');
    controller.flushApply(() => 'second');
    clock.tick(60_000);
    expect(posted.length).to.equal(1);
  });

  it('flushApply posts pending content immediately and cancels the timer', () => {
    controller.queueApply(() => 'pending');
    controller.flushApply(() => 'pending');
    expect(posted).to.deep.equal([{ markdown: 'pending', revision: 0 }]);

    clock.tick(80);
    expect(posted.length).to.equal(1);
  });

  it('flushApply does nothing when no edit is pending', () => {
    controller.flushApply(() => 'never sent');
    expect(posted.length).to.equal(0);
  });

  it('ignores edits queued while sync is suppressed', () => {
    controller.withSuppressedSync(() => {
      controller.queueApply(() => 'suppressed');
    });
    clock.tick(80);
    expect(posted.length).to.equal(0);
  });

  it('handleHostError releases the latch and reports pending work', () => {
    controller.queueApply(() => 'first');
    clock.tick(80);
    controller.queueApply(() => 'second');

    const shouldRetry = controller.handleHostError();
    expect(shouldRetry).to.equal(true);

    controller.queueApply(() => 'second');
    clock.tick(80);
    expect(posted.length).to.equal(2);
  });

  it('dispose cancels a scheduled apply', () => {
    controller.queueApply(() => 'pending');
    controller.dispose();
    clock.tick(80);
    expect(posted.length).to.equal(0);
  });

  it('tracks the host revision in posted payloads', () => {
    controller.setRevision(7);
    controller.queueApply(() => 'revisioned');
    clock.tick(80);
    expect(posted).to.deep.equal([{ markdown: 'revisioned', revision: 7 }]);
  });
});
```

- [ ] **Step 2: Run the unit suite**

Run: `npm run coverage`
Expected: PASS — all new `HostSyncController` tests green (they characterize existing behavior). Coverage thresholds still met (sync.js is not yet counted; Task 8 adds it).

- [ ] **Step 3: Commit**

```bash
git add tests/unit/sync-controller.test.ts
git commit -m "test(sync): characterize HostSyncController state machine"
```

---

### Task 2: `DocumentSync.applyDocument` reports whether an edit was applied (TDD)

The provider needs to distinguish "applied an edit (echo will fire)" from "no-op (no echo will ever fire)". Add `applied: boolean` to the success variant.

> **Adaptation (executed 2026-06-11):** PR #294 merged before execution, adding `reconcileTrailingNewlineForApply` to this file. That opened a *second* silent no-op path: a serialization differing from the document only by the dropped final newline reconciles back to identical text, then applies a pointless `WorkspaceEdit` whose change-event behavior is VS Code's discretion. The implemented version reconciles **first** and runs the no-op check on the reconciled text, unifying both paths. The #294 test case `'single newline document'` (current `'\n'`, serialized `''`) was updated to expect the no-op (`applied: false`, no edit) instead of an identity edit, and a new test pins the newline-only no-op.

**Files:**
- Modify: `tests/unit/document-sync.test.ts:87-101` (no-op case), `:103-137` (apply case)
- Modify: `src/custom-editor/document-sync.ts:4-6`, `:39-41`, `:54`

- [ ] **Step 1: Update the failing assertions**

In `tests/unit/document-sync.test.ts`, change the no-op test (currently asserts `{ ok: true }`):

```typescript
  it('skips workspace edits when markdown is unchanged and reports the no-op', async () => {
    const uri = vscode.Uri.file('/workspace/unchanged.md');
    const document = {
      uri,
      getText: () => '# unchanged',
      lineCount: 1,
      lineAt: () => ({
        range: { end: new vscode.Position(0, 11) },
      }),
    } as unknown as vscode.TextDocument;

    const sync = new DocumentSync(document);
    const result = await sync.applyDocument('# unchanged', 0);
    expect(result).to.deep.equal({ ok: true, applied: false });
  });
```

And in `'applies markdown edits and reports host failures'`, change the success assertion:

```typescript
    const success = await sync.applyDocument('# after', 0);
    expect(success).to.deep.equal({ ok: true, applied: true });
```

- [ ] **Step 2: Run to verify failure**

Run: `npm run coverage`
Expected: FAIL — two `deep.equal` mismatches: `{ ok: true }` does not equal `{ ok: true, applied: false }` / `{ ok: true, applied: true }`.

- [ ] **Step 3: Implement the `applied` flag**

In `src/custom-editor/document-sync.ts`, change the result type:

```typescript
type ApplyResult =
  | { ok: true; applied: boolean }
  | { ok: false; code: 'revision_mismatch' | 'apply_failed'; message: string };
```

Replace the unchanged-markdown early return with a unified check on the *reconciled* markdown (this also covers the newline-only no-op introduced by #294's reconcile):

```typescript
    // Reconcile BEFORE the no-op check: a serialization that differs from the
    // document only by the dropped final newline reconciles back to identical
    // text, and applying that edit would be a no-op whose change-event
    // behavior is up to VS Code. Callers rely on `applied` to know whether an
    // onDidChangeTextDocument echo will follow.
    const markdownToApply = reconcileTrailingNewlineForApply(this.document.getText(), markdown);
    if (markdownToApply === this.document.getText()) {
      return { ok: true, applied: false };
    }
```

Change the final return:

```typescript
    return { ok: true, applied: true };
```

- [ ] **Step 4: Run to verify pass**

Run: `npm run coverage && npm run typecheck`
Expected: PASS on both. The provider compiles unchanged — it only narrows on `applyResult.ok`.

- [ ] **Step 5: Commit**

```bash
git add src/custom-editor/document-sync.ts tests/unit/document-sync.test.ts
git commit -m "feat(sync): report whether applyDocument applied a workspace edit"
```

---

### Task 3: Provider acknowledges no-op applies — THE deadlock fix (TDD)

**Files:**
- Modify: `tests/helpers/vscode.js:3-23` (add `Uri.joinPath`)
- Create: `tests/unit/custom-editor-provider.test.ts`
- Modify: `src/custom-editor/muninn-custom-editor-provider.ts:186-205`

- [ ] **Step 1: Add `Uri.joinPath` to the vscode mock**

The provider's `resolveCustomTextEditor` builds webview HTML via `vscode.Uri.joinPath`, which the mock lacks. In `tests/helpers/vscode.js`, add at the top (line 1 area):

```javascript
const fs = require('fs').promises;
const path = require('path');
```

And inside `class Uri`, after `static parse(value)`:

```javascript
  static joinPath(base, ...segments) {
    return Uri.file(path.posix.join(base.fsPath, ...segments));
  }
```

- [ ] **Step 2: Write the failing regression test**

Create `tests/unit/custom-editor-provider.test.ts`:

```typescript
import * as vscode from 'vscode';
import { MuninnCustomEditorProvider } from '../../src/custom-editor/muninn-custom-editor-provider';
import type { HostToViewMessage } from '../../src/custom-editor/protocol';
import type { ConfigService } from '../../src/services/config-service';
import type { Logger } from '../../src/services/logger';

let expect: Chai.ExpectStatic;

before(async () => {
  ({ expect } = await import('chai'));
});

type FakePanel = {
  panel: vscode.WebviewPanel;
  posted: HostToViewMessage[];
  sendViewMessage: (message: unknown) => Promise<void>;
};

const createFakePanel = (): FakePanel => {
  const posted: HostToViewMessage[] = [];
  let messageListener: ((message: unknown) => Promise<void> | void) | undefined;

  const panel = {
    webview: {
      options: {},
      html: '',
      cspSource: 'vscode-webview-resource:',
      asWebviewUri: (uri: vscode.Uri) => uri,
      onDidReceiveMessage: (listener: (message: unknown) => Promise<void> | void) => {
        messageListener = listener;
        return { dispose: () => {} };
      },
      postMessage: async (message: HostToViewMessage) => {
        posted.push(message);
        return true;
      },
    },
    onDidDispose: () => ({ dispose: () => {} }),
  } as unknown as vscode.WebviewPanel;

  return {
    panel,
    posted,
    sendViewMessage: async (message: unknown) => {
      await messageListener?.(message);
    },
  };
};

const createMarkdownDocument = (text: string): vscode.TextDocument =>
  ({
    uri: vscode.Uri.file('/workspace/noop.md'),
    getText: () => text,
    lineCount: 1,
    lineAt: () => ({
      range: { end: new vscode.Position(0, text.length) },
    }),
  }) as unknown as vscode.TextDocument;

describe('MuninnCustomEditorProvider view.applyDocument handling', () => {
  const workspaceWithApplyEdit = vscode.workspace as unknown as {
    applyEdit?: (edit: vscode.WorkspaceEdit) => Promise<boolean>;
  };
  const originalApplyEdit = workspaceWithApplyEdit.applyEdit;
  let provider: MuninnCustomEditorProvider;

  beforeEach(() => {
    provider = new MuninnCustomEditorProvider(
      vscode.Uri.file('/extension'),
      {} as unknown as ConfigService,
      { warn: () => {}, info: () => {}, error: () => {} } as unknown as Logger,
    );
  });

  afterEach(() => {
    provider.dispose();
    workspaceWithApplyEdit.applyEdit = originalApplyEdit;
  });

  it('acknowledges a no-op apply with a documentChanged snapshot', async () => {
    const { panel, posted, sendViewMessage } = createFakePanel();
    await provider.resolveCustomTextEditor(createMarkdownDocument('# unchanged'), panel);

    await sendViewMessage({
      type: 'view.applyDocument',
      payload: { markdown: '# unchanged', revision: 0 },
    });

    // Without this reply the webview's inFlightApply latch never releases and
    // every subsequent edit is dropped (the autosave/data-loss deadlock).
    expect(posted).to.deep.equal([
      {
        type: 'host.documentChanged',
        payload: { markdown: '# unchanged', revision: 0 },
      },
    ]);
  });

  it('posts nothing extra when an edit is applied (the document event echoes instead)', async () => {
    workspaceWithApplyEdit.applyEdit = async () => true;
    const { panel, posted, sendViewMessage } = createFakePanel();
    await provider.resolveCustomTextEditor(createMarkdownDocument('# before'), panel);

    await sendViewMessage({
      type: 'view.applyDocument',
      payload: { markdown: '# after', revision: 0 },
    });

    expect(posted).to.deep.equal([]);
  });

  it('replies with host.error and a snapshot when the apply fails', async () => {
    workspaceWithApplyEdit.applyEdit = async () => false;
    const { panel, posted, sendViewMessage } = createFakePanel();
    await provider.resolveCustomTextEditor(createMarkdownDocument('# before'), panel);

    await sendViewMessage({
      type: 'view.applyDocument',
      payload: { markdown: '# after', revision: 0 },
    });

    expect(posted).to.deep.equal([
      {
        type: 'host.error',
        payload: {
          code: 'apply_failed',
          message: 'VS Code failed to apply the markdown update.',
        },
      },
      {
        type: 'host.documentChanged',
        payload: { markdown: '# before', revision: 0 },
      },
    ]);
  });
});
```

- [ ] **Step 3: Run to verify the right failure**

Run: `npm run coverage`
Expected: FAIL — exactly one test: `'acknowledges a no-op apply with a documentChanged snapshot'` (posted is `[]`, expected one `host.documentChanged`). The other two provider tests PASS (they assert existing behavior).

- [ ] **Step 4: Implement the no-op ack**

In `src/custom-editor/muninn-custom-editor-provider.ts`, replace the `'view.applyDocument'` case (lines 186-205) with:

```typescript
      case 'view.applyDocument': {
        const applyResult = await session.sync.applyDocument(
          message.payload.markdown,
          message.payload.revision,
        );
        if (!applyResult.ok) {
          await this.postMessage(session.panel.webview, {
            type: 'host.error',
            payload: {
              code: applyResult.code,
              message: applyResult.message,
            },
          });
          await this.postMessage(session.panel.webview, {
            type: 'host.documentChanged',
            payload: session.sync.getSnapshot(),
          });
          return;
        }
        if (!applyResult.applied) {
          // No workspace edit was needed, so no onDidChangeTextDocument echo
          // will fire. Reply with the snapshot anyway: the webview sync
          // controller stays latched until the host answers every apply.
          await this.postMessage(session.panel.webview, {
            type: 'host.documentChanged',
            payload: session.sync.getSnapshot(),
          });
        }
        return;
      }
```

- [ ] **Step 5: Run to verify pass**

Run: `npm run coverage && npm run typecheck && npm run lint`
Expected: PASS on all three.

- [ ] **Step 6: Commit**

```bash
git add tests/helpers/vscode.js tests/unit/custom-editor-provider.test.ts src/custom-editor/muninn-custom-editor-provider.ts
git commit -m "fix(sync): acknowledge no-op applies so webview edits keep syncing"
```

---

### Task 4: Backfill `host.documentChanged` protocol guard tests

`tests/unit/protocol.test.ts` covers every host message except the one that releases the sync latch.

**Files:**
- Modify: `tests/unit/protocol.test.ts:49-85` and `:87-113`

- [ ] **Step 1: Add the missing guard assertions**

In `'accepts valid host-to-view payloads'`, add after the `host.init` expectation:

```typescript
    expect(
      isHostToViewMessage({
        type: 'host.documentChanged',
        payload: { markdown: '# doc', revision: 2 },
      }),
    ).to.equal(true);
```

In `'rejects malformed host-to-view payloads'`, add after the `host.init` rejections:

```typescript
    expect(
      isHostToViewMessage({
        type: 'host.documentChanged',
        payload: { markdown: '# doc' },
      }),
    ).to.equal(false);
    expect(
      isHostToViewMessage({
        type: 'host.documentChanged',
        payload: { markdown: 42, revision: 1 },
      }),
    ).to.equal(false);
```

- [ ] **Step 2: Run to verify pass**

Run: `npm run coverage`
Expected: PASS (the guard already implements this — the test was simply missing).

- [ ] **Step 3: Commit**

```bash
git add tests/unit/protocol.test.ts
git commit -m "test(protocol): cover host.documentChanged guard"
```

---

### Task 5: Flush pending edits on webview teardown

`beforeunload` currently calls `syncController.dispose()`, which *cancels* a scheduled apply — silently dropping the last ≤80 ms of typing on tab close. Flush first (best-effort: message delivery during unload is not guaranteed by VS Code, but the common case — an idle pending timer — is saved). `flushApply` is already covered by Task 1's unit tests; the wiring itself has no automated test because `index.ts` is DOM-bound (it is bundled for the webview and excluded from unit coverage).

**Files:**
- Modify: `src/webview/editor/index.ts:830-834`

- [ ] **Step 1: Add the flush**

Replace the `beforeunload` listener:

```typescript
window.addEventListener('beforeunload', () => {
  syncController.flushApply(serializeMarkdownForHost);
  detachHostMessageListener();
  syncController.dispose();
  mermaidPreview.dispose();
});
```

- [ ] **Step 2: Verify build**

Run: `npm run typecheck && npm run bundle && npm run lint`
Expected: PASS on all three.

- [ ] **Step 3: Commit**

```bash
git add src/webview/editor/index.ts
git commit -m "fix(webview): flush pending edits before webview teardown"
```

---

### Task 6: Integration tests — dirty → save → disk, and autosave (real VS Code)

Proves the chain the user reported broken, against a real `TextDocument` (the unit mocks cannot catch dirty/save behavior). These tests pass even before Task 3 — they cover the non-no-op chain and pin it against regressions.

**Files:**
- Create: `tests/fixtures/save-pipeline.md`
- Create: `tests/fixtures/save-pipeline-autosave.md`
- Create: `tests/integration-cli/save-chain.test.ts`

- [ ] **Step 1: Create the fixtures**

`tests/fixtures/save-pipeline.md` (with a trailing newline):

```markdown
# Save Pipeline

Alpha bravo charlie delta.
```

`tests/fixtures/save-pipeline-autosave.md` (with a trailing newline):

```markdown
# Autosave Pipeline

Echo foxtrot golf hotel.
```

- [ ] **Step 2: Write the integration test**

Create `tests/integration-cli/save-chain.test.ts` (mirrors the retry/waitFor patterns of `core-workflow.test.ts` — command-driven edits need retries because webview readiness is asynchronous):

```typescript
import * as vscode from 'vscode';

let expect: Chai.ExpectStatic;

before(async () => {
  ({ expect } = await import('chai'));
});

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

const waitFor = async (
  predicate: () => boolean,
  timeoutMs = 15_000,
  intervalMs = 100,
): Promise<void> => {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (predicate()) {
      return;
    }
    await sleep(intervalMs);
  }
  throw new Error('Timed out waiting for save chain condition.');
};

const getActiveCustomViewType = (): string | undefined => {
  const tab = vscode.window.tabGroups.activeTabGroup.activeTab;
  if (!tab) {
    return undefined;
  }
  if (tab.input instanceof vscode.TabInputCustom) {
    return tab.input.viewType;
  }
  return undefined;
};

const openInCustomEditor = async (fileName: string): Promise<vscode.TextDocument> => {
  const extension = vscode.extensions.getExtension('blueclouddev.muninn-vscode');
  expect(extension).to.not.equal(undefined);
  await extension?.activate();

  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  expect(workspaceFolder, 'expected integration workspace folder').to.not.equal(undefined);

  const uri = vscode.Uri.joinPath(workspaceFolder!.uri, fileName);
  const document = await vscode.workspace.openTextDocument(uri);
  await vscode.commands.executeCommand('vscode.open', uri);
  await waitFor(() => getActiveCustomViewType() === 'muninn.markdownEditor');
  return document;
};

const insertMermaidUntilApplied = async (document: vscode.TextDocument): Promise<void> => {
  let inserted = false;
  for (let attempt = 0; attempt < 20; attempt += 1) {
    await vscode.commands.executeCommand('muninn.insertMermaidBlock');
    await sleep(250);
    if (document.getText().includes('```mermaid')) {
      inserted = true;
      break;
    }
  }
  expect(inserted, 'expected mermaid block to be inserted via webview round trip').to.equal(true);
};

const readDiskText = async (document: vscode.TextDocument): Promise<string> => {
  const bytes = await vscode.workspace.fs.readFile(document.uri);
  return new TextDecoder().decode(bytes);
};

describe('Integration CLI: save chain', () => {
  it('marks the document dirty after a webview edit and persists it on save', async () => {
    const document = await openInCustomEditor('save-pipeline.md');

    await insertMermaidUntilApplied(document);
    expect(document.isDirty, 'webview edit must dirty the TextDocument').to.equal(true);

    await vscode.commands.executeCommand('workbench.action.files.save');
    await waitFor(() => !document.isDirty);

    const diskText = await readDiskText(document);
    expect(diskText).to.include('```mermaid');
    expect(diskText).to.include('Alpha bravo charlie delta.');
  });

  it('persists webview edits through autosave without an explicit save', async () => {
    const filesConfiguration = vscode.workspace.getConfiguration('files');
    await filesConfiguration.update('autoSave', 'afterDelay', vscode.ConfigurationTarget.Global);
    await filesConfiguration.update('autoSaveDelay', 200, vscode.ConfigurationTarget.Global);

    try {
      const document = await openInCustomEditor('save-pipeline-autosave.md');

      await insertMermaidUntilApplied(document);
      await waitFor(() => !document.isDirty);

      const diskText = await readDiskText(document);
      expect(diskText).to.include('```mermaid');
      expect(diskText).to.include('Echo foxtrot golf hotel.');
    } finally {
      await filesConfiguration.update('autoSave', 'off', vscode.ConfigurationTarget.Global);
      await filesConfiguration.update('autoSaveDelay', undefined, vscode.ConfigurationTarget.Global);
    }
  });
});
```

- [ ] **Step 3: Run the integration suite**

Run: `npm run test:integration`
Expected: PASS — both new tests green alongside the existing activation/commands/core-workflow tests. (The test VS Code instance uses a fresh `--user-data-dir` per run, so the Global autosave setting cannot leak outside the run; the `finally` restores it within the run.)

- [ ] **Step 4: Commit**

```bash
git add tests/fixtures/save-pipeline.md tests/fixtures/save-pipeline-autosave.md tests/integration-cli/save-chain.test.ts
git commit -m "test(integration): cover dirty-state, save, and autosave persistence"
```

---

### Task 7: E2E — real keystrokes survive a no-op round trip and persist

This is the user's bug as a spec: type, trigger a no-op apply (char + immediate backspace inside the 80 ms debounce window), keep typing, save, verify disk bytes. Pre-fix, phase 2 deadlocks and the test fails on timeout; post-fix it passes. (Timing caveat: if WebDriver delivers the char and backspace more than 80 ms apart, the no-op window is missed and the test degrades to a plain typing check — the *deterministic* deadlock guard is Task 3's unit test; this spec is the end-to-end safety net. `browser.keys(['x', 'Backspace'])` sends both in one WebDriver action to keep the gap in single-digit milliseconds.)

**Files:**
- Create: `tests/e2e/save-integrity.e2e.mjs`

- [ ] **Step 1: Write the e2e spec**

```javascript
import { expect, browser } from '@wdio/globals';
import {
  openWorkspaceFile,
  waitForCustomEditor,
  waitForCustomEditorWebviewReady,
  waitForWorkspaceFileText,
  withCustomEditorWebview,
} from './helpers.mjs';

const typeInProseMirror = async (keys) => {
  await withCustomEditorWebview(async () => {
    const editor = await browser.$('.ProseMirror');
    await editor.waitForDisplayed({ timeout: 5_000 });
    await editor.click();
    await browser.keys(['End']);
    await browser.keys(keys);
  });
};

const readDiskText = async (fileName) =>
  browser.executeWorkbench(async (vscode, relativeFileName) => {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
      throw new Error('No workspace folder available in VS Code test session.');
    }
    const uri = vscode.Uri.joinPath(workspaceFolder.uri, relativeFileName);
    const bytes = await vscode.workspace.fs.readFile(uri);
    return new TextDecoder().decode(bytes);
  }, fileName);

describe('Save integrity', () => {
  it('keeps syncing keystrokes after a no-op apply and persists them on save', async () => {
    await openWorkspaceFile('save-pipeline.md');
    await waitForCustomEditor('save-pipeline.md');
    await waitForCustomEditorWebviewReady();

    await typeInProseMirror('zulu');
    await waitForWorkspaceFileText(
      'save-pipeline.md',
      (text) => text.includes('zulu'),
      'Expected typed text to reach the host document.',
      { attempts: 25, interval: 200 },
    );

    // Char + immediate backspace serializes to unchanged markdown -> the host
    // treats the apply as a no-op. Typing afterwards must still sync.
    await typeInProseMirror(['x', 'Backspace']);
    await typeInProseMirror('yankee');
    await waitForWorkspaceFileText(
      'save-pipeline.md',
      (text) => text.includes('yankee'),
      'Expected keystrokes after a no-op apply to keep reaching the host document.',
      { attempts: 25, interval: 200 },
    );

    await browser.executeWorkbench(async (vscode) => {
      await vscode.commands.executeCommand('workbench.action.files.save');
    });

    await browser.waitUntil(
      async () => {
        const diskText = await readDiskText('save-pipeline.md');
        return diskText.includes('zulu') && diskText.includes('yankee');
      },
      {
        timeout: 10_000,
        timeoutMsg: 'Expected saved file on disk to contain all typed text.',
      },
    );
  });
});
```

- [ ] **Step 2: Run the e2e suite locally**

Run: `npm run test:e2e`
Expected: PASS — `save-integrity.e2e.mjs` green alongside the existing 8 specs. (Note `readWorkspaceFileText`/`waitForWorkspaceFileText` read the live `TextDocument`, which is why the disk assertion uses `workspace.fs.readFile` after an explicit save.)

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/save-integrity.e2e.mjs
git commit -m "test(e2e): guard keystroke-to-disk save integrity through no-op applies"
```

---

### Task 8: Enforce coverage for the sync controller

`nyc` excludes all of `out/src/webview/**`, which is how a 96-line state machine carrying every save shipped with zero enforced coverage. Re-include just `sync.js` (now fully covered by Task 1). `test-exclude` (nyc's matcher) supports negated patterns in `exclude`.

**Files:**
- Modify: `package.json:485-491` (the `nyc.exclude` array)

- [ ] **Step 1: Add the negated exclude**

In `package.json`, change the nyc `exclude` array to:

```json
    "exclude": [
      "**/*.d.ts",
      "tests/**",
      "out/src/types/config.js",
      "out/src/custom-editor/muninn-custom-editor-provider.js",
      "out/src/webview/**",
      "!out/src/webview/editor/sync.js"
    ],
```

- [ ] **Step 2: Verify coverage picks it up and thresholds hold**

Run: `npm run coverage`
Expected: PASS — the text report now lists `webview/editor/sync.js` with ~100% lines/branches (Task 1 exercises every path), and the global 80/70 thresholds still pass. If `sync.js` does NOT appear in the report, the negation was not honored — stop and check the installed nyc/test-exclude version rather than lowering thresholds (AGENTS.md forbids lowering them).

- [ ] **Step 3: Commit**

```bash
git add package.json
git commit -m "chore(coverage): enforce coverage for the webview sync controller"
```

---

### Task 9: Full gate verification

No new code — prove the branch is green on every gate the CI runs (`gate-linux`: lint → format → typecheck → coverage → integration; `e2e-macos`: wdio).

- [ ] **Step 1: Format and run all local gates**

```bash
npm run format
npm run format:check && npm run lint && npm run typecheck && npm run coverage && npm run test:integration
```

Expected: all PASS. If `npm run format` changed any files, inspect the diff (it should only be formatting), then amend them into a final commit:

```bash
git add -A
git commit -m "chore: prettier formatting for save-pipeline test files" || true
```

- [ ] **Step 2: Run e2e**

Run: `npm run test:e2e`
Expected: PASS (macOS local). Known context: the e2e lane has a history of unrelated flakiness (issue #280) — a failure in `accessibility-toolbar.e2e.mjs` or similar is pre-existing; a failure in `save-integrity.e2e.mjs` is yours.

- [ ] **Step 3: Verify the round-trip suite is untouched**

This plan changes no schema/parser/serializer code (AGENTS.md prime directive). Confirm:

```bash
npm run test:roundtrip
git status --short docs/ROUNDTRIP_REPORT.md docs/KNOWN_DEVIATIONS.md
```

Expected: report regenerates with no diff (clean `git status` for both docs).

---

## Self-review notes

- **Spec coverage:** deadlock fix (Tasks 2–3), teardown data loss (Task 5), "make sure save works" test layers: state machine (Task 1), protocol (Task 4), real dirty/save/autosave (Task 6), keystrokes→disk e2e (Task 7), coverage enforcement (Task 8). Undo-history wipe and in-flight keystroke race intentionally out of scope (documented in header).
- **Type consistency:** `ApplyResult` success variant `{ ok: true; applied: boolean }` is defined in Task 2 and consumed via `applyResult.applied` in Task 3; provider tests assert payload shapes that match `SerializedMarkdownPayload` (`markdown`/`revision`).
- **Known judgment calls:** the e2e no-op window is timing-dependent (documented in Task 7 — Task 3's unit test is the deterministic guard); the `beforeunload` flush is best-effort by platform design (documented in Task 5).
