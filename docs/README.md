# Documentation

Welcome to the **Markdown Preview** extension engineering documentation. This folder contains guides for developers who want to understand, contribute to, or maintain this VS Code extension.

> **Note:** For end-user guidance, installation instructions, and feature overview, see the [root README](../README.md).

## Documentation Index

| Document | Description | Audience |
|----------|-------------|----------|
| [GETTING_STARTED.md](GETTING_STARTED.md) | New contributor onboarding, first run, and common commands | Newcomers |
| [ARCHITECTURE.md](ARCHITECTURE.md) | System design, module overview, and data flow diagrams | Developers, Contributors |
| [DEVELOPMENT.md](DEVELOPMENT.md) | Setup guide, development workflow, and debugging tips | New Contributors |
| [TESTING.md](TESTING.md) | Test structure, running tests, and writing new tests | Developers, QA |
| [RELEASE.md](RELEASE.md) | Release process checklist and versioning guidelines | Maintainers |
| [TROUBLESHOOTING.md](TROUBLESHOOTING.md) | Common issues and solutions for developers | All |
| [ROADMAP.md](ROADMAP.md) | Feature roadmap and milestone planning | All |

## Quick Links

- **Getting Started:** Begin with [GETTING_STARTED.md](GETTING_STARTED.md) for a guided first run
- **Environment Setup:** Use [DEVELOPMENT.md](DEVELOPMENT.md) for day-to-day workflow
- **Understanding the Code:** Read [ARCHITECTURE.md](ARCHITECTURE.md) for the big picture
- **Running Tests:** See [TESTING.md](TESTING.md) for test commands and structure
- **Releasing:** Follow [RELEASE.md](RELEASE.md) when preparing a release

## Project Structure Overview

```
markdown-reader/
├── src/                    # Extension source code
│   ├── extension.ts        # Entry point (activation/deactivation)
│   ├── commands/           # Command handlers (mode, formatting)
│   ├── services/           # Business logic services
│   ├── handlers/           # Event handlers (file open)
│   ├── ui/                 # UI controllers (title bar)
│   ├── types/              # TypeScript type definitions
│   └── utils/              # Utility functions (localization)
├── tests/                  # Test suites
│   ├── unit/               # Unit tests (mocked VS Code APIs)
│   ├── integration/        # Integration tests (real VS Code)
│   └── fixtures/           # Test data files
├── docs/                   # This documentation folder
├── assets/                 # Images and icons
├── specs/                  # Feature specifications (SpecKit)
└── .specify/               # AI tooling configuration
```

## Key Concepts

### Preview Mode vs Edit Mode

- **Preview Mode:** Read-only rendered markdown using VS Code's native preview
- **Edit Mode:** Split view with text editor (left) and live preview (right)

### Services Architecture

The extension uses a service-oriented architecture:

- **PreviewService:** Manages preview/edit mode transitions
- **StateService:** Tracks per-file state (mode, cursor position)
- **ConfigService:** Reads and caches user settings
- **ValidationService:** Validates files (size, type, conflicts)
- **FormattingService:** Text transformation operations

### Event-Driven Design

The extension responds to VS Code events:

1. `onDidOpenTextDocument` - Intercepts markdown file opens
2. `onDidChangeConfiguration` - Reacts to settings changes
3. `tabGroups.onDidChangeTabs` - Tracks editor visibility

## Contributing

See [CONTRIBUTING.md](../CONTRIBUTING.md) in the project root for contribution guidelines.

## Need Help?

- **Bugs:** [Open an issue](https://github.com/ayhammouda/markdown-preview/issues)
- **Questions:** Check [TROUBLESHOOTING.md](TROUBLESHOOTING.md) first
- **Feature Requests:** [Open a feature request](https://github.com/ayhammouda/markdown-preview/issues/new?template=feature_request.md)
