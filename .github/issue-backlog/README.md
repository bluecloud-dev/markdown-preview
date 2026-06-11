# Muninn Issue Backlog — June 9, 2026

Generated from the market position review, accessibility audit, and design critique (see `docs/`). One file = one GitHub issue. Create them all with:

```bash
./scripts/create-github-issues.sh --dry-run   # preview
./scripts/create-github-issues.sh             # create labels + issues (needs authed gh CLI)
```

**Delegation labels:** `ai-ready` = fully scoped for an AI agent (the shared conventions in `_conventions.md` are auto-appended at creation). `needs-human` = requires accounts, judgment, or the maintainer's voice. Issues with both have a human gate plus delegable parts.

| # | Issue | Delegation | Pri | Phase |
|---|-------|-----------|-----|-------|
| 001 | Publish v2.0.0-alpha.1 to the VS Code Marketplace and tag the GitHub release | needs-human | P1 | now |
| 002 | CI release pipeline: publish to Marketplace + Open VSX on tag | needs-human + ai-ready | P1 | now |
| 003 | Golden-file round-trip test suite: markdown → ProseMirror → markdown is byte-identical | ai-ready | P1 | now |
| 004 | Toolbar keyboard navigation: roving tabindex + arrow keys (ARIA toolbar pattern) | ai-ready | P1 | now |
| 005 | Mermaid diagrams: text alternatives, accessible panel name, show/hide announcements | ai-ready | P1 | now |
| 006 | Table grid semantics: column scope + accessible table names | ai-ready | P1 | now |
| 007 | Table keyboard model: Enter commits + moves down, Escape reverts, arrow-key cell navigation, never drop focus | ai-ready | P1 | now |
| 008 | Table actions parity: delete row, delete column, column alignment | ai-ready | P2 | now |
| 009 | Give the ProseMirror editor surface an accessible name | ai-ready | P2 | now |
| 010 | Distinguish errors from status: assertive channel, explicit Error prefix, no color-only cues | ai-ready | P2 | now |
| 011 | Constrain content to a readable measure (~70ch, centered, configurable) | ai-ready | P1 | now |
| 012 | Re-tier toolbar: lists belong in basic mode | ai-ready | P2 | now |
| 013 | Single Mermaid preview model: per-block only, remove the global panel | ai-ready | P2 | now |
| 014 | Block insertion inserts after the current block instead of replacing the selection | ai-ready | P2 | now |
| 015 | Link flow: resolve the "Awaiting link input" state when the host input is cancelled | ai-ready | P3 | now |
| 016 | Reclaim the brand header: fold identity into the status line | ai-ready | P2 | now |
| 017 | Webview polish bundle: dead CSS, single active-state mechanism, font-size token, hidden document title | ai-ready | P3 | now |
| 018 | Manual screen reader testing pass (VoiceOver + NVDA) after P1 a11y fixes | needs-human | P1 | now |
| 019 | Image insertion: paste from clipboard, drag-and-drop, and insert command | ai-ready | P1 | now |
| 020 | Outline view support: document symbols while the Muninn editor is active | ai-ready | P2 | now |
| 021 | Commands: toggle task list, toggle blockquote, insert horizontal rule | ai-ready | P2 | now |
| 022 | AGPL ops: SPDX headers in source + THIRD_PARTY_NOTICES bundled into the VSIX | ai-ready | P1 | now |
| 023 | DCO sign-off enforcement for all contributions | needs-human + ai-ready | P2 | now |
| 024 | README: AGPL FAQ + listing polish (what the license does and does not require) | ai-ready | P2 | now |
| 025 | Publish docs/SECURITY_POSTURE.md + SECURITY.md disclosure policy | ai-ready | P2 | now |
| 026 | Define a trademark/naming policy for "Muninn" | needs-human | P3 | now |
| 027 | Engage upstream on microsoft/vscode #296639 / #303697 (built-in markdown WYSIWYG proposals) | needs-human | P2 | now |
| 028 | Re-capture hero GIF + README listing pass after UX changes land | needs-human | P2 | now |
| 029 | Fix stale CLAUDE.md and constitution: v1 "preview-mode" guidance actively misleads AI agents | ai-ready | P1 | now |
| 030 | Brand content: 4-post blog series plan and publication | needs-human | P2 | next |
| 031 | Math support: KaTeX rendering for $inline$ and $$block$$ math | ai-ready | P2 | next |
| 032 | GFM alerts/callouts: render and author > [!NOTE] blocks | ai-ready | P2 | next |
| 033 | HTML export: muninn.exportHtml command producing a standalone document | ai-ready | P3 | next |
| 034 | vscode.dev / web extension build (best-effort subset) | ai-ready | P3 | next |
| 035 | Document Cursor/Windsurf/VSCodium compatibility tier | ai-ready | P3 | next |
| 036 | Listicle/curator outreach: get Muninn into the 2026 "best markdown extension" round-ups | needs-human | P3 | next |
