# Roadmap

Muninn is being repositioned as a reading-first markdown workspace for specs and long-form developer documentation, with a credible built-in editor instead of a preview-first workflow.

## Current Product Truth

Today Muninn ships:

- A VS Code custom editor for markdown
- A built-in authoring toolbar
- Raw markdown fallback through `muninn.openRawMarkdown`
- Trust-aware Mermaid rendering
- Table editing that round-trips back to markdown source

Muninn does not currently ship focus mode, outline navigation, or broader note-taking platform features.

## Milestone 1: Product Truth, Trust, and Stability

- Align README, docs, roadmap, and contributor guidance with the shipped custom-editor product
- Remove the public `muninn.editorAssociations` setting
- Stop mutating `workbench.editorAssociations` during activation
- Keep only `Open Raw Markdown` in the editor title bar
- Keep formatting and insertion actions in the Muninn toolbar and command palette
- Maintain regression coverage for table editing flows before new UX work

## Milestone 2: Reading-First UX

- Add `muninn.toggleFocusMode`
- Persist focus mode in workspace state
- Introduce a native `Muninn Outline` Explorer view
- Add `muninn.goToSection`
- Drive outline and section reveal from a host-owned heading model

## Milestone 3: Authoring Polish Without Product Sprawl

- Improve command stability for headings, lists, links, code blocks, and tables
- Keep note-taking intentionally file-based and lightweight
- Narrow `muninn.toolbar.mode` to editing-density control only
- Refactor the webview into smaller modules with clearer boundaries

## Milestone 4: Performance, Test Depth, and Showcase

- Code-split Mermaid and other optional heavy webview paths
- Add a bundle budget gate for the initial webview payload
- Expand regression coverage for focus mode, outline navigation, table deletion, raw markdown round-tripping, and Mermaid trust behavior
- Produce updated showcase assets and benchmarks

## Legacy Material

Preview-first planning material under `specs/markdown-preview/` is retained only as legacy reference. The current implementation, this roadmap, and `docs/ARCHITECTURE.md` are the live source of truth.
