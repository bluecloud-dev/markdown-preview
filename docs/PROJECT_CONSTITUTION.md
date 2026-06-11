# Project Constitution

## 1. Custom Editor Architecture

Muninn v2 is a custom Markdown editor based on VS Code's `CustomTextEditorProvider`. Custom webview usage is allowed only for the sanctioned Muninn editor architecture documented in `docs/ARCHITECTURE.md`.

## 2. Markdown Fidelity

Markdown source fidelity is a product contract. Changes to parser, serializer, table transforms, source toggling, or document sync must preserve unrelated bytes or document known deviations.

## 3. Local-First Behavior

Muninn edits local Markdown documents in the user's workspace. Runtime telemetry, cloud sync, and remote document processing are out of scope unless explicitly approved in a future architecture decision.

## 4. Trust and Security

The extension must keep a strict webview posture:

- CSP remains nonce-based.
- Document content must not execute scripts.
- Mermaid behavior must respect workspace trust.
- Host/webview messages must be validated.

## 5. Accessibility

Keyboard and screen-reader flows are part of the editor contract, not optional polish. Public alpha work must prioritize toolbar navigation, table semantics, editor naming, and error announcements.

## 6. Documentation Honesty

README, Marketplace copy, roadmap docs, and agent instructions must describe the current custom-editor product, not the historical preview-mode product.
