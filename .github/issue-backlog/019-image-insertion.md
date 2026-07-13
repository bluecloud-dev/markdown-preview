---
title: Image insertion: paste from clipboard, drag-and-drop, and insert command
labels: ai-ready,feature,P1,phase:now
---
## Context

Largest functional gap for the wedge audience (`docs/MARKET_POSITION_2026-06.md` §3, §8.4; May brief matrix row "Image paste/insert: Absent"). Target parity: VS Code's native markdown image-paste behavior, so muscle memory transfers.

## Desired behavior

1. **Paste** an image from the clipboard into the editor → image file is written into the workspace and `![](relative/path.png)` inserted at the caret. **Drag-drop** an image file onto the editor → same. **Command** `muninn.insertImage` → OS file picker → copy file (if outside workspace) → insert.
2. Destination + naming: setting `muninn.images.destination` (resource scope, default `"images/"`), path template relative to the document's directory; filename `image-YYYYMMDD-HHmmss.<ext>` for pasted blobs, original (deduped with `-1`, `-2`) for dropped/picked files. Create the directory if missing.
3. Alt text: selected text at paste time becomes the alt; else empty alt with caret positioned inside `![|]` brackets… ProseMirror model: insert an `image` node with `alt`/`src`; caret after node; status announcement "Image added: {filename}".
4. Rendering: image `src` must resolve through `webview.asWebviewUri` — extend the provider to rewrite relative paths on the view side and ensure `localResourceRoots` covers the workspace folder. Broken paths render the alt text (native `img` behavior) — no crash.
5. Security: file writes happen HOST-side only (webview posts base64/uri payload over the protocol; host validates size ≤ 10 MB and extension allowlist png/jpg/jpeg/gif/svg/webp; reject otherwise with localized error through the issue #010 error channel). Untrusted workspaces: writing files is allowed (text edits already are), but document the decision in the PR.
6. Round-trip: serialized markdown is exactly `![alt](path)` — no HTML, no title attribute unless present.

## Protocol additions

`view.requestImageInsert {payload: {kind: 'paste'|'drop', name?, mime, bytesBase64} }` → `host.imageInserted {path}` | `host.imageRejected {reason}`. Update `src/custom-editor/protocol.ts`, provider validation, `src/webview/editor/messages.ts`.

## Out of scope

Image resizing/preview popovers; remote URL download; HEIC conversion.

## Acceptance criteria

- [ ] Paste, drop, and command all produce a file under the configured destination + a correct relative link; image renders in the editor
- [ ] Dedup naming, size/extension rejection paths tested (unit: host handler; integration: command; E2E: paste simulation if WDIO permits, else drop)
- [ ] Works when document is in a subfolder (relative path correctness) and in multi-root workspaces (destination resolved against the document's folder)
- [ ] All strings localized; README commands/settings updated; round-trip fixture added to #003 corpus
