# Changelog

All notable changes to this project will be documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added
- N/A

### Changed
- N/A

### Fixed
- N/A

## [0.4.0] - 2025-12-27

### Added
- Configuration settings for enablement, exclusion patterns, and max file size
- Inspect Configuration command for effective settings diagnostics
- Configuration integration tests for exclusions, disabled state, and workspace overrides

### Changed
- Configuration cache reloads and context updates when settings change

## [0.3.0] - 2025-12-27

### Added
- Format context menu with heading and code submenus in edit mode
- Keyboard shortcuts for toggle edit mode, bold, and italic (edit mode only)
- Context menu and shortcut coverage in integration tests

## [0.2.0] - 2025-12-27

### Added
- Formatting toolbar actions in edit mode for bold, italic, strikethrough, lists, code, links, and headings
- Formatting commands with selection-aware placeholder handling
- URL prompt placeholder for link insertion

### Changed
- Formatting commands now require an active markdown editor
- Settings resolve per resource/workspace scope

## [0.1.0] - 2025-12-27

### Added
- Preview markdown files by default using VS Code's native renderer
- Edit mode split view with Done button and toggle command
- Large file handling with opt-in preview and per-file opt-out
- Binary markdown detection fallback with warning
- One-time welcome message with quick-start link
- Localization scaffolding for user-facing strings
