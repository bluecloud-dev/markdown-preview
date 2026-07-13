# D-004 · CommonMark + GFM only — no proprietary syntax

**Status:** Accepted
**Date:** 2026 (v2 rewrite)

## Context

Proprietary markdown dialects (Obsidian-style extensions, Notion blocks) lock users in and break interop with every other renderer.

## Decision

Muninn parses and writes CommonMark + GFM only. Constructs outside that surface pass through opaquely rather than gaining bespoke syntax.

## Consequences

Feature requests for proprietary syntax are declined by policy. Front matter (issue #289) is handled as an opaque passthrough, not a parsed dialect extension.
