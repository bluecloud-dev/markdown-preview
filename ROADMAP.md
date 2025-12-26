# Markdown Reader - Roadmap

> Open markdown files in preview mode by default, optimizing the reading experience for developers reviewing AI-generated documentation. (rolling, no fixed dates)

---

## Executive Summary

**Current State:** v0.0.0 - Pre-release development

**Core Value Proposition:**
1. **Reading-First Experience** - Markdown files open in rendered preview mode, eliminating visual noise from raw syntax
2. **Seamless Edit Mode** - Split view with text editor and live preview for efficient editing when needed
3. **Zero Configuration** - Works immediately after installation with sensible defaults

**Design Principles:** Native VS Code integration only (no custom webviews), non-intrusive design, privacy-first (no telemetry)

---

## Version Milestones

### v0.1.0 - MVP Core

**Theme:** Preview by default with edit mode toggle
**Phases Included:** Setup, Foundational, US1 (Preview), US2 (Edit Mode)
**Task Count:** 65 tasks

#### Features

| Priority | Feature | User Story | Status |
|----------|---------|------------|--------|
| P0 | **Test & Build Infrastructure** | Setup | Planned |
| P0 | **Core Types & Services** | Foundational | Planned |
| P1 | **Preview by Default** | US1 | Planned |
| P2 | **Edit Mode Toggle** | US2 | Planned |

#### Capabilities

- Markdown files open in rendered preview mode automatically
- "Enter Edit Mode" command opens split view (editor + live preview)
- "Exit Edit Mode" returns to preview-only mode
- Ctrl+Shift+V toggles between modes
- "Done" button in title bar for exiting edit mode
- Large file handling (>1MB) with user choice
- Binary file detection and graceful handling
- Independent per-file state management
- Unsaved changes prompt on exit edit mode
- Pane tracking (move/close preview or editor)
- Focus and scroll position management
- Localization infrastructure (l10n ready)

#### Quality Gates

- All tests passing (80%+ coverage)
- No ESLint warnings
- TypeScript strict mode enabled
- JSDoc on public APIs

---

### v0.2.0 - Formatting Toolbar

**Theme:** Visual formatting tools for markdown editing
**Phases Included:** US3 (Formatting Toolbar)
**Task Count:** 19 tasks

#### Features

| Priority | Feature | User Story | Status |
|----------|---------|------------|--------|
| P3 | **Formatting Toolbar** | US3 | Planned |

#### Capabilities

- Bold, Italic, Strikethrough buttons in title bar
- Bullet and Numbered list formatting
- Inline code and code block formatting
- Link insertion with URL prompt
- Heading levels (H1, H2, H3)
- Smart no-selection behavior (word under cursor or placeholder)
- Toolbar visible only in edit mode
- 100% test coverage for formatting operations

---

### v0.3.0 - Access & UX

**Theme:** Multiple ways to access formatting
**Phases Included:** US4 (Context Menu), US5 (Keyboard Shortcuts)
**Task Count:** 19 tasks (US4: 10, US5: 9)

#### Features

| Priority | Feature | User Story | Status |
|----------|---------|------------|--------|
| P4 | **Context Menu** | US4 | Planned |
| P5 | **Keyboard Shortcuts** | US5 | Planned |

#### Capabilities

- Format submenu in right-click context menu
- Heading submenu (H1, H2, H3)
- Code submenu (Inline, Block)
- Ctrl+B for bold (edit mode only)
- Ctrl+I for italic (edit mode only)
- Configurable shortcuts for all formatting actions
- Context-scoped keybindings (no conflicts with VS Code defaults)

---

### v0.4.0 - Configuration

**Theme:** User customization options
**Phases Included:** US6 (Configuration)
**Task Count:** 12 tasks

#### Features

| Priority | Feature | User Story | Status |
|----------|---------|------------|--------|
| P6 | **Extension Configuration** | US6 | Planned |

#### Capabilities

- Enable/disable extension globally or per-workspace
- Exclude patterns for specific files/folders
- Max file size threshold for auto-preview
- Default excludes: `**/node_modules/**`, `**/.git/**`
- Hot-reload on configuration changes
- Context key updates on config change

---

### v1.0.0 - Stable Release

**Theme:** Production-ready release
**Phases Included:** Testing, Polish
**Task Count:** 24 tasks (Testing: 7, Polish: 17)

#### Features

| Priority | Feature | Description | Status |
|----------|---------|-------------|--------|
| P0 | **Test Coverage** | 80%+ overall, 100% formatting | Planned |
| P0 | **Documentation** | README, CHANGELOG, JSDoc | Planned |
| P0 | **Accessibility** | ARIA labels, keyboard nav, announcements | Planned |
| P0 | **Marketplace** | Icon, metadata, publishing | Planned |

#### Capabilities

- Full test suite with performance validation
- Edge case handling (untitled, diff views, git conflicts)
- Accessible UI with screen reader support
- State-change announcements via status bar
- Localized strings (l10n ready)
- 128x128 marketplace icon
- Error handling with Output Channel logging
- Quickstart scenario validation

---

## Feature Comparison Matrix

| Feature | v0.1 | v0.2 | v0.3 | v0.4 | v1.0 |
|---------|:----:|:----:|:----:|:----:|:----:|
| Preview by Default | :white_check_mark: | :white_check_mark: | :white_check_mark: | :white_check_mark: | :white_check_mark: |
| Edit Mode Toggle | :white_check_mark: | :white_check_mark: | :white_check_mark: | :white_check_mark: | :white_check_mark: |
| Ctrl+Shift+V Shortcut | :white_check_mark: | :white_check_mark: | :white_check_mark: | :white_check_mark: | :white_check_mark: |
| Done Button | :white_check_mark: | :white_check_mark: | :white_check_mark: | :white_check_mark: | :white_check_mark: |
| Large File Handling | :white_check_mark: | :white_check_mark: | :white_check_mark: | :white_check_mark: | :white_check_mark: |
| Formatting Toolbar | | :white_check_mark: | :white_check_mark: | :white_check_mark: | :white_check_mark: |
| Bold/Italic/Strike | | :white_check_mark: | :white_check_mark: | :white_check_mark: | :white_check_mark: |
| Lists (bullet/numbered) | | :white_check_mark: | :white_check_mark: | :white_check_mark: | :white_check_mark: |
| Code Formatting | | :white_check_mark: | :white_check_mark: | :white_check_mark: | :white_check_mark: |
| Link Insertion | | :white_check_mark: | :white_check_mark: | :white_check_mark: | :white_check_mark: |
| Headings | | :white_check_mark: | :white_check_mark: | :white_check_mark: | :white_check_mark: |
| Context Menu | | | :white_check_mark: | :white_check_mark: | :white_check_mark: |
| Ctrl+B / Ctrl+I | | | :white_check_mark: | :white_check_mark: | :white_check_mark: |
| Exclude Patterns | | | | :white_check_mark: | :white_check_mark: |
| Enable/Disable Toggle | | | | :white_check_mark: | :white_check_mark: |
| Workspace Config | | | | :white_check_mark: | :white_check_mark: |
| Full Accessibility | | | | | :white_check_mark: |
| Marketplace Ready | | | | | :white_check_mark: |

---

## Success Metrics

| Metric | MVP Target | v1.0 Target | Source |
|--------|------------|-------------|--------|
| File open time | <1s | <1s | SC-001 |
| Mode switch time | <500ms | <500ms | SC-002 |
| First-time success rate | 90% | 90% | SC-003 |
| Formatting latency | - | <100ms | SC-004 |
| Startup impact | <50ms | <50ms | SC-005 |
| User retention (survey) | - | 80%+ | SC-006 |
| Positive reviews | - | 3+ | SC-007 |
| Command collisions | 0 | 0 | SC-008 |

---

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|:-----------:|:------:|------------|
| VS Code preview API changes | Low | High | Use stable API commands only; monitor release notes |
| Large file performance | Medium | Medium | Skip auto-preview for >1MB; user-controlled opt-in |
| Keybinding conflicts | Medium | Low | Scope shortcuts to markdown edit mode context |
| Binary file corruption | Low | High | Detect binary content before processing; graceful fallback |
| State sync issues | Medium | Medium | Independent per-file state; clear cleanup on document close |
| Pane tracking complexity | Medium | Low | Clear state transitions; handle all pane events |

---

## Task Summary

| Phase | Tasks | Parallel | Description |
|-------|:-----:|:--------:|-------------|
| Phase 1: Setup | 11 | 7 | Test scaffolding, dependencies, configuration |
| Phase 2: Foundational | 14 | 8 | Types, core services, test fixtures, l10n |
| Phase 3: US1 (Preview) | 17 | 6 | Preview by default implementation |
| Phase 4: US2 (Edit Mode) | 23 | 10 | Split view editing, pane tracking, focus |
| Phase 5: US3 (Toolbar) | 19 | 10 | Formatting toolbar and operations |
| Phase 6: US4 (Context Menu) | 10 | 4 | Right-click menu with submenus |
| Phase 7: US5 (Shortcuts) | 9 | 4 | Keyboard shortcuts (scoped) |
| Phase 8: US6 (Config) | 12 | 5 | User settings and configuration |
| Phase 9: Testing | 7 | 1 | Quality verification and coverage |
| Phase 10: Polish | 17 | 8 | Documentation, accessibility, marketplace |

**Total**: 139 tasks | **Parallel Opportunities**: 63 tasks | **MVP**: 65 tasks

---

## Dependency Flow

```
Setup (11) --> Foundational (14)
                    |
                    v
            US1: Preview (17) [P1]
                    |
                    v
            US2: Edit Mode (23) [P2]
                    |
                    v
            US3: Toolbar (19) [P3]
                    |
        +-----------+-----------+
        |           |           |
        v           v           v
    US4 (10)    US5 (9)    US6 (12)
    [P4]        [P5]        [P6]
        |           |           |
        +-----------+-----------+
                    |
                    v
            Testing (7) + Polish (17)
                    |
                    v
                  v1.0.0
```

---

## User Story Mapping

| User Story | Priority | Tasks | Version | Dependency |
|------------|:--------:|:-----:|:-------:|------------|
| US1: Preview by Default | P1 | 17 | v0.1.0 | Foundational |
| US2: Edit Mode Toggle | P2 | 23 | v0.1.0 | US1 |
| US3: Formatting Toolbar | P3 | 19 | v0.2.0 | US2 |
| US4: Context Menu | P4 | 10 | v0.3.0 | US3 |
| US5: Keyboard Shortcuts | P5 | 9 | v0.3.0 | US3 |
| US6: Configuration | P6 | 12 | v0.4.0 | Foundational |

---

## Implementation Notes

- **[P]** marks tasks that can run in parallel within their phase
- **MVP** = Setup + Foundational + US1 + US2 (65 tasks)
- US4, US5, US6 can proceed in parallel once US3 is complete
- Testing and Polish tasks span all user stories
- Command prefix: `markdownReader.*`
- Context keys: `markdownReader.editMode`, `markdownReader.enabled`, `markdownReader.isMarkdown`

---

*Roadmap v1.1 (rolling) - No time estimates per project constitution*
