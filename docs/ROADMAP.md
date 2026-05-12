# Muninn for VS Code - Roadmap

## Current Phase

`2.0.0-alpha` (preview custom editor track)

The current editor is a custom markdown editor (`muninn.markdownEditor`) with:

- one-pane authoring surface
- toolbar formatting commands
- Mermaid fenced-block support
- table node view with grid and source mode
- raw markdown fallback

## Near-Term Goals

### 1) Reliability and polish

- Stabilize integration and E2E behavior across local environments.
- Reduce flaky table-node source/edit flows.
- Keep docs and changelog tightly aligned with shipped behavior.

### 2) Marketplace readiness

- Keep preview metadata and docs accurate.
- Improve install conversion (clear README positioning + visual demo assets).
- Ensure repository/listing identity is consistent across manifest, docs, and release pipeline.

### 3) UX depth (within scope)

- Task list toggle command
- Block quote and horizontal rule insertions
- Image insertion workflow
- Expanded keyboard coverage for high-frequency actions

## Not Planned (Current Product Direction)

- Full Notion-style block editor parity
- PDF/HTML export pipeline
- Non-markdown format support
- Cloud features or telemetry collection

## Success Criteria to Exit Alpha

1. Core quality gates pass reliably in CI:
   - lint
   - typecheck
   - coverage
   - integration
   - e2e
2. README and docs reflect only shipped functionality.
3. First external users can install, open markdown by default, and complete table+Mermaid workflows without manual setup friction.
