# D-002 · ProseMirror as editor engine

**Status:** Accepted
**Date:** 2026 (v2 rewrite)

## Context

The v2 custom editor needs a rich-editing model that can guarantee round-trip fidelity and compose with VS Code's workspace-trust model.

## Decision

ProseMirror (with `prosemirror-markdown`) is the editor engine; the ProseMirror webview is the one sanctioned webview.

## Consequences

Byte-level round-trip work happens at the parser/serializer boundary (`src/webview/editor/markdown-codec.ts`); the golden corpus (`tests/unit/round-trip/`) is the conformance instrument. Known deviations are tracked as issues #282–#289.
