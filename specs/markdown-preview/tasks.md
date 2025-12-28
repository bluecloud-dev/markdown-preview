# Implementation Tasks: Markdown Reader

**Feature**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md) | **Data Model**: [data-model.md](data-model.md)
**Created**: 2025-12-23 | **Updated**: 2025-12-24

## Overview

Dependency-ordered tasks organized by user story. Testing and tooling land first to keep every increment executable.

## Required Execution Policy (Read Before Implementing)

- Follow `CLAUDE.md` for the implementation loop and repo conventions.
- Follow the project constitution at `.specify/memory/constitution.md`.
- Use `specs/markdown-preview/quickstart.md` as the scenario checklist.

**Notes**:
- Plan research/design refer to documentation gates; this file starts at implementation setup.
- Task IDs are stable identifiers and may not be strictly sequential by phase.
- Extension name: "Markdown Reader" (display name), command prefix: `markdownReader.*`

**Milestones**: Sprint 0 (Test Infrastructure), v0.1.0 (MVP Core), v0.2.0 (Formatting Toolbar), v0.3.0 (Access & Shortcuts), v0.4.0 (Configuration), v1.0.0 (Stable & Polished) (scheduled for v1: 143)

## Implementation Strategy

MVP (release) = Sprint 0 + User Story 1 (Preview by Default) + User Story 2 (Edit Mode). Add US3 through US6 incrementally. Keep tests green each step.

## Milestone Closeout Requirement

- At the end of each milestone, update README.md so Features/Commands list only what is available in the release (no milestone/version mentions) and reflect current settings and known limitations.
- At the end of each milestone, update CHANGELOG.md with the milestone changes.

## Task Dependency Graph

```
Sprint 0 (Test Infrastructure)
  ↓
Foundational (v0.1.0)
  ↓
US1 (Preview by Default) [P0] ← Core feature, others depend on this (v0.1.0)
  ↓ (needs preview mode to toggle from)
US2 (Edit Mode) [P0] (v0.1.0)
  ↓ (needs edit mode for formatting)
US3 (Formatting Toolbar) [P1] (v0.2.0)
  ↓ (reuses format commands)
  ├── US4 (Context Menu) [P2] ←┐
  ├── US5 (Keyboard Shortcuts) [P2] ← Can run in parallel
  └── US6 (Configuration) [P2] ←┘ (can also start after Foundational)
```

## Parallel Execution Opportunities

- **Sprint 0**: T005-T011 can proceed in parallel after T001-T004.
- **Foundational (v0.1.0)**: Types (T012-T014) in parallel; L10n setup (T139) in parallel with fixtures (T018-T019); Tests (T021-T022) in parallel.
- **US1 Tests (v0.1.0)**: All test tasks (T023-T027) can run in parallel.
- **US3 Formatting (v0.2.0)**: Service implementations (T059-T062) can run in parallel.
- **US4/US5/US6 (v0.3.0/v0.4.0)**: Can proceed in parallel once US3 is complete (share format commands).
- **Polish (v1.0.0)**: Documentation tasks (T116-T118) can run in parallel.

---

## Sprint 0 - Test Infrastructure

### Setup (Test Infrastructure)

- [X] T001 Create test scaffolding (`tests/unit`, `tests/integration`, `tests/fixtures`) and add `tests/run-test.ts` for VS Code test runner
- [X] T002 Install dependencies in `package.json` (dependencies: minimatch; devDependencies: mocha, chai, @types/chai, @vscode/test-electron, nyc, sinon, ts-node, esbuild, eslint, @typescript-eslint/parser, @typescript-eslint/eslint-plugin, eslint-plugin-unicorn, prettier, typescript, @types/vscode, @types/node, @types/minimatch)
- [X] T003 Configure `package.json` scripts: `test`, `test:integration`, `lint`, `coverage`, `compile`, `package` (vsce), `prepublish`, `check:no-telemetry`
- [X] T004 Add nyc config (80% overall coverage gate; 100% for formatting operations) in `package.json` or `.nycrc`
- [X] T005 [P] Add ESLint config `.eslintrc.json` (TS rules, `no-console` error in production, `@typescript-eslint/no-explicit-any` set to error severity requiring justification comments, enforce kebab-case filenames via `unicorn/filename-case`) (NFR-006)
- [X] T006 [P] Add Prettier config `.prettierrc` (singleQuote, 2-space indentation, 100 char print width, trailingComma)
- [X] T007 [P] Initialize VS Code extension manifest in `package.json` (name: "markdown-reader", displayName: "Markdown Reader", activationEvents: ["onLanguage:markdown"], commands placeholders)
- [X] T008 [P] Create base source tree (`src/extension.ts`, `src/commands/`, `src/services/`, `src/handlers/`, `src/ui/`, `src/types/`)
- [X] T009 [P] Add TS strict config in `tsconfig.json` with `"strict": true` (ES2022 target, CommonJS module, Node16 module resolution)
- [X] T010 [P] Create `.vscode/launch.json` for extension debugging
- [X] T011 [P] Verify `.github/workflows/ci.yml` and `.github/workflows/release.yml` include required gates: lint, unit tests, integration tests (xvfb), coverage gate (>=80%), no-telemetry guard, VSIX build artifact; release is tag-based and publishes VSIX

---

## v0.1.0 - MVP Core - Preview by Default with Edit Mode

### Foundational

**CRITICAL**: No user story work can begin until this phase is complete.

- [x] T012 [P] Create `ViewMode` enum and `FileState` interface in `src/types/state.ts`
- [x] T013 [P] Create `ExtensionConfiguration` interface in `src/types/config.ts`
- [x] T014 [P] Create `FormattingAction`, `FormattingType`, `FormattingConfig` types in `src/types/formatting.ts`
- [x] T021 [P] Create `tests/unit/state-service.test.ts` with tests for state management
- [x] T022 [P] Create `tests/unit/config-service.test.ts` with tests for configuration access
- [x] T015 Create `StateService` skeleton in `src/services/state-service.ts` (Map<string, FileState>); keep behavior minimal until unit tests exist (T021)
- [x] T016 Create `ConfigService` skeleton in `src/services/config-service.ts` (getEnabled, getExcludePatterns, getMaxFileSize, isExcluded); keep behavior minimal until unit tests exist (T022)
- [x] T017 Create extension entry point skeleton in `src/extension.ts` with activate/deactivate and disposable array
- [x] T018 [P] Create test fixtures: `tests/fixtures/sample.md`, `tests/fixtures/large-file.md` (>1MB), `tests/fixtures/with-formatting.md`
- [x] T019 [P] Create `tests/fixtures/git-conflict.md` with conflict markers for edge case testing
- [x] T020 Wire up Mocha + @vscode/test-electron harness (bootstrap, TS transpile strategy, and runner entrypoints) to support scripts created in T003
- [x] T139 [P] Set up l10n infrastructure: create `package.nls.json` with default English strings, add `l10n` directory structure for future translations, and export `t()` helper from `src/utils/l10n.ts` wrapping `vscode.l10n.t()` for consistent usage across the codebase (prerequisite for T031, T038, T115, T122, T132, T134, T135)
- [x] T125 Implement StateService behavior to satisfy `tests/unit/state-service.test.ts` (T021) (FR-042)
- [x] T126 Implement ConfigService behavior to satisfy `tests/unit/config-service.test.ts` (T022) (FR-035-FR-038, FR-041)

---

### User Story 1 - Preview Markdown by Default [P0] MVP

**Story Goal**: Markdown files open in rendered preview mode by default.
**Independent Test**: Install extension, click any .md file in explorer, verify it opens in preview mode.

### Tests (Write First - Must Fail Before Implementation)

- [x] T023 [P] [US1] Create `tests/integration/preview-mode.test.ts` with test: "opens markdown file in preview mode by default" and shows a one-time welcome/tutorial message on first open
- [x] T024 [P] [US1] Add test: "respects VS Code's native markdown preview rendering"
- [x] T025 [P] [US1] Add test: "file opened via Quick Open (Ctrl+P) opens in preview mode"
- [x] T026 [P] [US1] Add test: "preview mode shows no additional UI elements"
- [x] T127 [P] [US1] Add test: "large files (>1MB) skip auto-preview and show notification actions; per-file opt-out persists via workspaceState" (FR-041)
- [x] T027 [P] [US1] Create `tests/unit/validation-service.test.ts` with tests for file validation logic

### Implementation

- [x] T028 [US1] Create `src/services/validation-service.ts` with ValidationService class (isMarkdownFile, isDiffView, isLargeFile, isBinaryFile methods)
- [x] T029 [US1] Create `src/services/preview-service.ts` with PreviewService class (showPreview method using `markdown.showPreview` command)
- [x] T030 [US1] Implement `shouldShowPreview()` decision logic in PreviewService
- [x] T031 [US1] Implement large file handling (>1MB) per FR-041: skip auto-preview, open in text editor, show non-modal info message with [Open Preview Anyway] and [Don't Show Again for This File]; persist per-file choice in `context.workspaceState` and skip future prompts when "Don't Show Again" is selected; localize strings via `vscode.l10n` (FR-041)
- [x] T032 [US1] Create `src/handlers/markdown-file-handler.ts` with MarkdownFileHandler class
- [x] T033 [US1] Implement `handleDocumentOpen()` in MarkdownFileHandler: check validation, close text editor, show preview
- [x] T034 [US1] Register `onDidOpenTextDocument` event listener in `src/extension.ts` and show a one-time, non-blocking welcome message with optional US1 tutorial link (store dismissal in `context.globalState`)
- [x] T035 [US1] Implement exclude pattern matching using minimatch in ConfigService
- [x] T036 [US1] Handle edge cases: untitled files → edit mode, diff views → skip interception
- [x] T037 [US1] Set context key `markdownReader.isMarkdown` via setContext for markdown files
- [x] T038 [US1] Detect binary .md files (check first 8KB for NUL byte or invalid UTF-8 sequences) and fall back to text editor with warning message (localized via `vscode.l10n`): "This file appears to be binary and cannot be previewed"

**Manual Test Checklist (US1)**
- [ ] Click .md file in explorer → opens in preview mode
- [ ] Ctrl+P → select .md file → opens in preview mode
- [ ] Go to Definition to .md file → opens in preview mode
- [ ] Disable extension → .md opens in text editor
- [ ] Large file (>1MB) → opens in text editor with info message and actions
- [ ] Fresh install with no configuration → .md opens in preview mode (verifies FR-004)

---

### User Story 2 - Switch to Edit Mode [P0]

**Story Goal**: Users can toggle to Edit Mode (split view with text editor left, live preview right).
**Independent Test**: Open markdown in preview, run "Markdown Reader: Enter Edit Mode" from Command Palette (or Ctrl+Shift+V), verify split view appears.

### Tests

- [x] T039 [P] [US2] Create `tests/integration/edit-mode.test.ts` with test: "Enter Edit Mode command opens split view"
- [x] T040 [P] [US2] Add test: "Exit Edit Mode command returns to preview-only"
- [x] T041 [P] [US2] Add test: "Toggle Edit Mode command switches between modes"
- [x] T042 [P] [US2] Add test: "edit mode shows text editor on left, live preview on right"
- [x] T043 [P] [US2] Add test: "preview updates automatically as user types"
- [x] T044 [P] [US2] Add test: "saving in edit mode does not return to preview mode"
- [x] T128 [P] [US2] Add test: "exiting edit mode with unsaved changes prompts to save (Save & Exit / Exit Without Saving / Cancel)" (FR-045)
- [x] T129 [P] [US2] Add test: "pane moves/closes preserve expected state (move preview; close preview; close editor)" (FR-006a, FR-006b, FR-006c)
- [x] T130 [P] [US2] Add test: "after mode switch, focus moves as specified; scroll position preserved when feasible" (FR-051)
- [x] T140 [P] [US2] Add test: "manual open of text editor stays in edit mode (no auto-preview)" (FR-006f)

### Implementation

- [x] T045 [US2] Extend PreviewService with `enterEditMode()` method (open text editor in ViewColumn.One, showPreviewToSide in ViewColumn.Two)
- [x] T046 [US2] Add `exitEditMode()` method to PreviewService (close text editor, keep preview)
- [x] T131 [US2] Research VS Code editor group APIs for split ratio control (FR-006d) and `workbench.editor.splitInGroupLayout` (FR-006e):
  - If supported: implement split ratio and layout preference
  - If not supported: document limitation in README.md
- [x] T132 [US2] Implement unsaved-changes prompt on exit edit mode per FR-045 (check Auto Save + `document.isDirty`; localize strings via `vscode.l10n`) (FR-045)
- [x] T133 [US2] Implement pane tracking/close handling for edit mode per FR-006a/006b/006c (update StateService + context keys based on editor/preview presence) (FR-006a, FR-006b, FR-006c)
- [x] T141 [US2] Respect explicit text editor opens for markdown files (detect user intent; skip auto-preview and keep edit mode until user exits) (FR-006f)
- [x] T134 [US2] Implement focus handling per FR-051:
  - Focus moves to text editor on enter edit mode (line 1, col 1 or last cursor if returning)
  - Focus moves to preview on exit edit mode
  - Scroll sync: attempt `editor.revealRange()` but accept VS Code's native preview scroll behavior if sync not achievable
  - Localize user-facing strings via `vscode.l10n`
- [x] T047 [US2] Create `src/commands/mode-commands.ts` with enterEditMode, exitEditMode, toggleEditMode command handlers
- [x] T048 [US2] Register mode commands in package.json contributes.commands per contracts/commands.json
- [x] T049 [US2] Update context key `markdownReader.editMode` via setContext on mode changes in StateService
- [x] T050 [US2] Register mode commands in `src/extension.ts` with proper disposables
- [x] T051 [US2] Add "Done" button to editor title bar (edit mode only) in package.json menus per contracts/menus.json
- [x] T052 [US2] Create `tests/integration/commands.test.ts` with command registration tests

**Manual Test Checklist (US2)**
- [ ] Preview mode → Command Palette "Markdown Reader: Enter Edit Mode" (or Ctrl+Shift+V) → split view (editor left, preview right)
- [ ] Type in editor → preview updates in real-time
- [ ] Edit mode → click Done button → returns to preview-only
- [ ] Edit mode → Ctrl+Shift+V → returns to preview-only
- [ ] Edit mode + unsaved changes → Done/Ctrl+Shift+V → prompt appears (Save & Exit / Exit Without Saving / Cancel)
- [ ] Manually open text editor (Reopen Editor With...) → stays in edit mode until Exit Edit Mode
- [ ] Move preview pane to another group → edit mode state persists
- [ ] Close preview pane → remains in edit mode (text editor only)
- [ ] Close text editor pane → exits edit mode (preview only)
- [ ] Each file maintains independent edit/preview state

- [x] T142 Release closeout (v0.1.0): update README.md Features/Commands to list only released functionality (no milestone/version mentions) and reflect current settings/known limitations; update CHANGELOG.md with release notes

---

## v0.2.0 - Formatting Toolbar

### User Story 3 - Format Text with Toolbar [P1]

**Story Goal**: Formatting toolbar visible in edit mode with common actions.
**Independent Test**: Enter edit mode, select text, click Bold button, verify text wrapped with **.

### Tests

- [x] T053 [P] [US3] Create `tests/integration/formatting.test.ts` with test: "toolbar icons visible only in edit mode"
- [x] T054 [P] [US3] Add test: "Bold button wraps selection with ** markers"
- [x] T055 [P] [US3] Add test: "Italic button wraps selection with _ markers"
- [x] T056 [P] [US3] Add test: "Strikethrough button wraps selection with ~~ markers"
- [x] T057 [P] [US3] Add test: "no-selection behavior: word under cursor or placeholder"
- [x] T058 [P] [US3] Create `tests/unit/formatting-service.test.ts` with unit tests for all formatting methods

### Services

- [x] T059 [P] [US3] Create `src/services/formatting-service.ts` with FormattingService class
- [x] T060 [P] [US3] Implement `wrapSelection()` for inline formatting (bold, italic, strikethrough, inline code)
- [x] T061 [P] [US3] Implement `toggleLinePrefix()` for lists/headings (bullet, numbered, heading levels)
- [x] T062 [P] [US3] Implement `wrapBlock()` for code block formatting
- [x] T063 [US3] Implement `insertLink()` with URL prompt via vscode.window.showInputBox

### Commands

- [x] T064 [US3] Create `src/commands/format-commands.ts` with formatBold, formatItalic, formatStrikethrough handlers
- [x] T065 [US3] Add formatBulletList, formatNumberedList handlers
- [x] T066 [US3] Add formatInlineCode, formatCodeBlock handlers
- [x] T067 [US3] Add formatLink handler with URL prompt
- [x] T068 [US3] Add formatHeading1, formatHeading2, formatHeading3 handlers

### Integration

- [x] T069 [US3] Register all formatting commands and toolbar menu items in package.json per contracts/commands.json and contracts/menus.json (with icons)
- [x] T070 [US3] Create `src/ui/title-bar-controller.ts` with TitleBarController class managing toolbar visibility
- [x] T071 [US3] Register formatting commands in `src/extension.ts` with proper disposables

**Manual Test Checklist (US3)**
- [ ] Edit mode → select text → click Bold → text wrapped with **
- [ ] Edit mode → select text → click Italic → text wrapped with _
- [ ] Edit mode → cursor on line → click Bullet List → line prefixed with -
- [ ] Edit mode → no selection → click Bold → placeholder inserted or word wrapped
- [ ] Preview mode → toolbar icons NOT visible

- [x] T143 Release closeout (v0.2.0): update README.md Features/Commands to list only released functionality (no milestone/version mentions) and reflect current settings/known limitations; update CHANGELOG.md with release notes

---

## v0.3.0 - Access & Shortcuts

### User Story 4 - Format Text with Context Menu [P2]

**Story Goal**: Right-click context menu with Format submenu.
**Independent Test**: Enter edit mode, right-click, verify Format submenu appears.

### Tests

- [x] T072 [P] [US4] Add test to formatting.test.ts: "Format submenu appears in context menu in edit mode"
- [x] T073 [P] [US4] Add test: "Format submenu not shown in preview-only mode"
- [x] T074 [P] [US4] Add test: "Heading submenu shows H1, H2, H3 options"
- [x] T075 [P] [US4] Add test: "Code submenu shows Inline and Block options"

### Implementation

- [x] T076 [US4] Add submenus to package.json contributes.submenus per contracts/menus.json (markdownReader.formatSubmenu, headingSubmenu, codeSubmenu)
- [x] T077 [US4] Add editor/context menu contribution with Format submenu in package.json
- [x] T078 [US4] Add markdownReader.formatSubmenu menu items in package.json (Bold, Italic, Strikethrough, lists)
- [x] T079 [US4] Add markdownReader.headingSubmenu menu items (H1, H2, H3)
- [x] T080 [US4] Add markdownReader.codeSubmenu menu items (Inline, Block)
- [x] T081 [US4] Apply `when` clause: `markdownReader.editMode && resourceLangId == markdown`

**Manual Test Checklist (US4)**
- [ ] Edit mode → right-click → Format submenu visible
- [ ] Format > Bold → applies bold formatting
- [ ] Format > Heading → submenu shows H1, H2, H3
- [ ] Format > Code → submenu shows Inline, Block
- [ ] Preview mode → right-click → Format submenu NOT visible

---

### User Story 5 - Use Keyboard Shortcuts [P2]

**Story Goal**: Keyboard shortcuts for mode switching and formatting.
**Independent Test**: Edit mode, select text, press Ctrl+B, verify text becomes bold.

### Tests

- [x] T082 [P] [US5] Add test to commands.test.ts: "Ctrl+Shift+V toggles edit mode"
- [x] T083 [P] [US5] Add test: "Ctrl+B applies bold in edit mode only"
- [x] T084 [P] [US5] Add test: "Ctrl+I applies italic in edit mode only"
- [x] T085 [P] [US5] Add test: "Ctrl+B does not interfere with VS Code sidebar toggle outside edit mode"

### Implementation

- [x] T086 [US5] Add keybindings to package.json contributes.keybindings per contracts/keybindings.json
- [x] T087 [US5] Add Ctrl+Shift+V / Cmd+Shift+V for toggleEditMode with `when: resourceLangId == markdown`
- [x] T088 [US5] Add Ctrl+B / Cmd+B for formatBold with `when: markdownReader.editMode && editorLangId == markdown && editorTextFocus`
- [x] T089 [US5] Add Ctrl+I / Cmd+I for formatItalic with `when: markdownReader.editMode && editorLangId == markdown && editorTextFocus`
- [x] T090 [US5] Document all keyboard shortcuts in README.md

**Manual Test Checklist (US5)**
- [ ] Preview mode → Ctrl+Shift+V → enters edit mode
- [ ] Edit mode → Ctrl+Shift+V → returns to preview mode
- [ ] Edit mode → select text → Ctrl+B → text becomes bold
- [ ] Edit mode → select text → Ctrl+I → text becomes italic
- [ ] Outside markdown edit mode → Ctrl+B → toggles sidebar (VS Code default)

- [x] T144 Release closeout (v0.3.0): update README.md Features/Commands to list only released functionality (no milestone/version mentions) and reflect current settings/known limitations; update CHANGELOG.md with release notes

---

## v0.4.0 - Configuration

### User Story 6 - Configure Extension Behavior [P2]

**Story Goal**: Users can configure exclude patterns and enable/disable extension.
**Independent Test**: Set exclude pattern for node_modules, open markdown there, verify text editor.

### Tests

- [x] T091 [P] [US6] Add test to preview-mode.test.ts: "excluded files open in text editor mode"
- [x] T092 [P] [US6] Add test: "files in node_modules excluded by default"
- [x] T093 [P] [US6] Add test: "files in .git excluded by default"
- [x] T094 [P] [US6] Add test: "extension disabled globally skips preview interception"
- [x] T096 [P] [US6] Add test: "workspace settings override user settings"

### Implementation

- [x] T097 [US6] Define configuration properties in package.json contributes.configuration per contracts/configuration.json
- [x] T098 [US6] Add `markdownReader.enabled` boolean setting (default: true, scope: resource)
- [x] T099 [US6] Add `markdownReader.excludePatterns` array setting (default: ["**/node_modules/**", "**/.git/**"], scope: resource)
- [x] T100 [US6] Add `markdownReader.maxFileSize` number setting (default: 1048576, scope: resource)
- [x] T101 [US6] Implement `ConfigService.reload()` for config changes
- [x] T102 [US6] Register `onDidChangeConfiguration` event listener in `src/extension.ts`
- [x] T103 [US6] Update context key `markdownReader.enabled` on config change

**Manual Test Checklist (US6)**
- [ ] Exclude pattern `**/node_modules/**` → .md in node_modules opens in text editor
- [ ] Disable extension globally → all .md files open in text editor
- [ ] Disable for workspace only → affects only that workspace
- [ ] Re-enable extension → preview-by-default resumes

- [x] T145 Release closeout (v0.4.0): update README.md Features/Commands to list only released functionality (no milestone/version mentions) and reflect current settings/known limitations; update CHANGELOG.md with release notes

---

## v1.0.0 - Stable & Polished

### Testing & Quality

### Test Infrastructure

- [x] T104 Verify VS Code test runner wiring in `tests/run-test.ts` works (should already exist from T001; no new file creation)
- [x] T105 Verify `npm test` scripts run locally and in CI

### Coverage & Quality

- [x] T106 Add integration tests for remaining edge cases (untitled, diff views, binary files) not already covered
- [x] T136 [P] Add tests for error handling + observability + announcements (preview failure → [Open in Editor], Output Channel logging, state-change announcements) (FR-046, FR-049, FR-052)
- [x] T107 Verify `markdown.showPreview` and `markdown.showPreviewToSide` commands work correctly after extension activation
- [x] T108 Add performance validation: measure SC-001 (<1s file open) via integration test timer, SC-002 (<500ms mode switch) via integration test timer, SC-004 (<100ms formatting) via unit test timer, SC-005 (<50ms startup) via VS Code Developer: Startup Performance command or extension activation event timing
- [x] T109 Run full test suite and ensure all tests pass with >=80% coverage

---

### Polish & Cross-Cutting Concerns

### Edge Cases

- [x] T110 [P] Handle new untitled markdown files: open in edit mode (FR-039)
- [x] T111 [P] Handle diff views: do not intercept (FR-040)
- [x] T112 [P] Ensure each open file maintains independent edit/preview state (FR-042)
- [x] T113 [P] Handle git conflict markers (detect `<<<<<<<`, `=======`, `>>>>>>>` patterns): skip auto-preview and open in edit mode to allow conflict resolution
- [x] T137 [P] Clean up per-file state on document close and handle external deletion gracefully (no crashes; state removed when document closes) (FR-047)

### Accessibility

- [x] T114 Add ARIA labels to all UI elements (toolbar buttons, Done button) for accessibility (NFR-009)
- [x] T115 Ensure keyboard navigation works per FR-050 (Tab/Shift+Tab/Enter/Escape/Ctrl+Shift+V) and add manual checklist coverage; localize any labels/tooltips via `vscode.l10n` (FR-050, FR-052)
- [x] T135 Implement state-change announcements via `vscode.window.setStatusBarMessage` for edit/preview mode transitions and other user-visible state changes; localize strings via `vscode.l10n` (FR-052)

### Documentation

- [x] T116 [P] Add JSDoc comments to all public functions (NFR-008)
- [x] T117 [P] Release closeout (v1.0.0): update README.md with installation, feature overview + screenshots/GIFs, keyboard shortcuts table, configuration options table, known limitations, contributing guide link, and license; ensure Features/Commands list only released functionality (no milestone/version mentions) and add a README "Changelog" section linking to CHANGELOG.md
- [x] T118 [P] Release closeout (v1.0.0): update CHANGELOG.md following Keep a Changelog format

### Marketplace Readiness

- [x] T119 Add extension icon (128x128 PNG) and marketplace metadata in package.json (FR-043)
- [x] T120 Add categories ["Other"], keywords, repository field (GitHub URL), license (MIT)
- [x] T121 Performance optimization: debounce rapid events in MarkdownFileHandler
- [x] T122 Implement error handling + observability: create Output Channel "Markdown Reader" and log failures/conflicts; implement preview-failure UX with [Open in Editor]; no silent failures; localize user-facing strings via `vscode.l10n` (FR-046, FR-049, FR-052)
- [x] T123 Validate against quickstart.md scenarios (US1-US6 + edge cases + error paths + accessibility announcements); confirm behavior matches spec acceptance scenarios
- [x] T124 Build and package extension with `vsce package`

---

## Task Summary

### By Milestone

| Step | Tasks | Notes |
|------|-------|-------|
| Sprint 0 | 11 | Setup |
| v0.1.0 | 55 | Foundational + US1 + US2 |
| v0.2.0 | 20 | US3 |
| v0.3.0 | 20 | US4 + US5 |
| v0.4.0 | 13 | US6 |
| v1.0.0 | 24 | Testing + Polish |
| **Total** | **143** | |

### By User Story

| User Story | Tasks | MVP |
|------------|-------|-----|
| US1 (Preview by Default) | 17 | Yes |
| US2 (Edit Mode) | 23 | Yes |
| US3 (Formatting Toolbar) | 19 | No |
| US4 (Context Menu) | 10 | No |
| US5 (Keyboard Shortcuts) | 9 | No |
| US6 (Configuration) | 12 | No |
| Setup + Foundational | 25 | Required |
| Testing + Polish | 24 | Required |
| Release Closeout | 4 | Required |

### MVP (Sprint 0 + v0.1.0)

- Setup: T001-T011
- Foundational: T012-T022, T125-T126, T139
- US1 (Preview): T023-T038, T127
- US2 (Edit Mode): T039-T052, T128-T134, T140-T141
- Release closeout: T142
- **Total MVP tasks**: 66

---

## Notes

- [P] tasks = different files, no dependencies, can run in parallel
- [Story] label maps task to specific user story for traceability
- Tooling/release tasks (T010, T011, T123, T124) are operational and not tied to a specific requirement; T006 maps to NFR-011
- Each user story should be independently completable and testable
- Verify tests fail before implementing (TDD approach per NFR-007)
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Command prefix: `markdownReader.*` (e.g., `markdownReader.enterEditMode`)
- Context keys: `markdownReader.editMode`, `markdownReader.enabled`, `markdownReader.isMarkdown`
