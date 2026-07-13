---
title: Golden-file round-trip test suite: markdown → ProseMirror → markdown is byte-identical
labels: ai-ready,testing,P1,phase:now
---
## Context

Muninn's headline competitive claim is "the WYSIWYG that doesn't touch your bytes" (`docs/MARKET_POSITION_2026-06.md` §3, §8.2). The failure mode that defines the category's bad reviews is editors rewriting untouched markdown (zaaack/Vditor whole-file churn). A spec already exists: `specs/round-trip-correctness/spec.md` — read it first; this issue executes it. The serialization path under test: `markdownParser.parse()` → `markdownSerializer.serialize()` + the table wrap/unwrap pair `wrapTablesForEditor`/`unwrapTablesForHost` (`src/webview/editor/index.ts:102-117,185-192`, `src/webview/editor/markdown-transforms.ts`).

## Scope

1. New test directory `tests/unit/round-trip/` with a golden-corpus runner: for each `*.md` fixture, assert `unwrapTablesForHost(serialize(parse(wrapTablesForEditor(input)))) === input` byte-for-byte.
2. Corpus, one fixture file per construct: ATX headings 1–6, setext headings, paragraphs with hard/soft breaks, emphasis/strong/code-span edge cases (nested, adjacent, underscores-in-words), links (inline/reference/autolink), images, blockquotes (nested), fenced code blocks (with/without language, ~~~ fences, indented content), indented code blocks, bullet lists (-, *, +; loose/tight), ordered lists (start numbers, `)` delimiter), GFM tables (alignment colons, escaped pipes, ragged rows), task lists, thematic breaks (---, ***, ___), HTML blocks passed through, front matter (YAML), trailing-whitespace and no-final-newline cases, Windows CRLF input, unicode/emoji, mermaid fenced blocks.
3. Where the current parser/serializer pair CANNOT round-trip a construct byte-identically, do NOT silently normalize the fixture: record it in `tests/unit/round-trip/KNOWN_DEVIATIONS.md` with input, output, and root cause, and mark the fixture as a documented expected-failure. The deliverable is an honest conformance report, not a green wall.
4. Generate a summary (`npm run test:roundtrip` → writes `docs/ROUNDTRIP_REPORT.md`: N pass / M documented deviations, by category). This report is marketing-grade evidence; keep it factual.
5. Wire into CI test job.

## Out of scope

Fixing the deviations found (file follow-up issues per construct); editing-operation fidelity (covered by spec's later phases).

## Acceptance criteria

- [ ] ≥40 fixtures covering every construct listed above
- [ ] Runner asserts byte equality including trailing whitespace and final-newline state
- [ ] CRLF fixture present and behavior documented
- [ ] `KNOWN_DEVIATIONS.md` + generated `docs/ROUNDTRIP_REPORT.md` exist and are accurate
- [ ] CI runs the suite; coverage thresholds still pass
