# Implementation Plan: Markdown Reader Extension

**Branch**: `feature/markdown-preview` | **Date**: 2025-12-24 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/markdown-preview/spec.md`

## Summary

Build a VS Code extension that opens markdown files in rendered preview mode by default, optimizing the reading experience for developers reviewing AI-generated documentation. Users can toggle to edit mode (split view with live preview) and format text using toolbar, context menu, or keyboard shortcuts. The implementation uses VS Code's native markdown preview commands exclusively (no custom webviews).

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode, ES2022 target, CommonJS module)
**Primary Dependencies**: VS Code Extension API (^1.85.0), minimatch (for glob pattern matching)
**Storage**: In-memory Map for live per-file state; persist only user choices in `context.workspaceState` (e.g., per-file large-file opt-out) and `context.globalState` (e.g., one-time welcome/tutorial dismissal for US1)
**Testing**: Mocha + Sinon + Chai + @vscode/test-electron, nyc for coverage (80% minimum; 100% for formatting operations)
**Target Platform**: VS Code Extension Host (Node.js runtime)
**Project Type**: Single VS Code extension
**Performance Goals**: <50ms startup impact, <1s file open, <500ms mode switch, <100ms formatting
**Constraints**: Native VS Code APIs only, no custom webviews, no telemetry, no synchronous file operations
**Scale/Scope**: Single VS Code window state management, per-file independent state

## Constitution Check

*GATE: Must pass before research. Re-check after design.*

| Principle | ID | Validation | Status |
|-----------|-----|------------|--------|
| Reading-First Experience | P-RF | Uses `markdown.showPreview`; zero UI in preview mode | NEEDS RE-CHECK |
| Native Integration | P-NI | No custom webviews; uses native markdown commands | ✅ Pass |
| Zero-Configuration | P-ZC | Works immediately with sensible defaults | ✅ Pass |
| Non-Intrusive Design | P-ND | No auto-return on save; respects user intent | ✅ Pass |
| Production-Quality Code | P-PQ | TS strict mode; no `any`; kebab-case files | ✅ Pass |
| Test-First Development | P-TF | Tests written before implementation; 80% coverage | ✅ Pass |
| Documentation Excellence | P-DE | JSDoc on public APIs; README complete | NEEDS RE-CHECK |
| Beginner-Friendly | P-BF | Clear docs; simple code; good-first-issues | ✅ Pass |
| Testing Requirements | P-TR | Unit + integration tests; mocked VS Code APIs | NEEDS RE-CHECK |
| VS Code Best Practices | P-VS | Lazy activation; disposables registered; ARIA labels; state changes announced; `vscode.l10n` for user-facing strings | ✅ Pass |

**Gate Status**: NOT PASSED - Re-check required after updates

## Project Structure

### Documentation (this feature)

```text
specs/markdown-preview/
├── plan.md              # This file
├── research.md          # Research output - VS Code API research
├── data-model.md        # Design output - State and configuration types
├── quickstart.md        # Design output - Implementation guide
├── contracts/           # Design output - VS Code contribution contracts
│   ├── commands.json    # Command definitions
│   ├── commands.md      # Command documentation
│   ├── configuration.json # Settings schema
│   ├── configuration.md # Settings documentation
│   ├── keybindings.json # Keyboard shortcut definitions
│   ├── menus.json       # Menu contributions
│   └── events.md        # Event handling documentation
└── tasks.md             # Implementation output - Implementation tasks
```

### Source Code (repository root)

```text
src/
├── extension.ts              # Entry point (activate/deactivate)
├── commands/                 # Command handlers
│   ├── mode-commands.ts      # enterEditMode, exitEditMode, toggleEditMode
│   └── format-commands.ts    # bold, italic, strikethrough, list, code, link, heading
├── services/                 # Business logic
│   ├── preview-service.ts    # showPreview, enterEditMode, exitEditMode logic
│   ├── state-service.ts      # Per-file edit/preview state management
│   ├── formatting-service.ts # Text transformation logic (wrap, toggle prefix)
│   ├── config-service.ts     # Settings access (enabled, excludePatterns, maxFileSize)
│   └── validation-service.ts # File size check, diff view detection, exclusion matching
├── handlers/                 # Event handlers
│   └── markdown-file-handler.ts  # onDidOpenTextDocument interception
├── ui/                       # UI controllers
│   └── title-bar-controller.ts   # Done button, formatting toolbar visibility
└── types/                    # Type definitions
    ├── state.ts              # ViewMode enum, FileState interface
    ├── config.ts             # ExtensionConfiguration interface
    └── formatting.ts         # FormattingAction interface

tests/
├── unit/                     # Unit tests with mocked VS Code APIs
│   ├── state-service.test.ts
│   ├── config-service.test.ts
│   ├── validation-service.test.ts
│   └── formatting-service.test.ts
├── integration/              # Integration tests with @vscode/test-electron
│   ├── preview-mode.test.ts
│   ├── edit-mode.test.ts
│   ├── formatting.test.ts
│   └── commands.test.ts
├── fixtures/                 # Test markdown files
│   ├── sample.md
│   ├── large-file.md
│   ├── with-formatting.md
│   └── git-conflict.md
└── run-test.ts               # VS Code test runner

.github/workflows/
├── ci.yml                    # CI pipeline (lint, test, coverage, package)
└── release.yml               # Tag-based release workflow
```

**Structure Decision**: Single VS Code extension project with clear separation between commands, services, handlers, and types. Tests mirror source structure for easy navigation.

## Complexity Tracking

No constitution violations requiring justification. Design follows all principles.

## Milestones

### Sprint 0 - Test Infrastructure

Includes Setup (test scaffolding, dependencies, CI, walking skeleton).

### v0.1.0 - MVP Core - Preview by Default with Edit Mode

Includes Foundational, US1 (Preview), US2 (Edit Mode).

### v0.2.0 - Formatting Toolbar

Includes US3 (Formatting Toolbar).

### v0.3.0 - Access & Shortcuts

Includes US4 (Context Menu), US5 (Keyboard Shortcuts).

### v0.4.0 - Configuration

Includes US6 (Configuration).

### v1.0.0 - Stable & Polished

Includes Testing and Polish.

**Milestone Completion Requirement**: At the end of each milestone, update README.md to reflect the current project state and update CHANGELOG.md with milestone changes.

## Documentation Outputs

### Research

**Output**: [research.md](./research.md)

Resolved all technical unknowns:
- Extension activation via `onLanguage:markdown`
- Document interception via `onDidOpenTextDocument`
- Native preview via `markdown.showPreview` / `markdown.showPreviewToSide`
- Editor groups via `ViewColumn` enumeration
- Text editing via `TextEditorEdit` API
- Context keys via `setContext` command
- Configuration via `workspace.getConfiguration`
- File validation via `workspace.fs.stat`

### Design & Contracts

**Outputs**:
- [data-model.md](./data-model.md) - State types, configuration interfaces
- [quickstart.md](./quickstart.md) - Implementation guide with code examples
- [contracts/](./contracts/) - VS Code contribution point definitions

**Key Design Decisions**:
1. Use native markdown preview commands (no custom webviews)
2. Per-file state tracked in memory (Map<string, FileState>)
3. Context keys control toolbar visibility (`markdownReader.editMode`)
4. Lazy activation minimizes startup impact
5. All disposables registered with `context.subscriptions`

## Next Steps

Run `/speckit.tasks` to generate the implementation task list based on this plan and the feature specification.

---

**Plan Version**: 1.0.0 | **Created**: 2025-12-24 | **Constitution**: v1.3.0
