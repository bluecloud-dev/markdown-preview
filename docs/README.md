# Documentation

Welcome to the **Muninn for VS Code** extension engineering documentation. This folder contains guides for developers who want to understand, contribute to, or maintain this VS Code extension.

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
| [BRAND_NAMING_CONTRACT.md](BRAND_NAMING_CONTRACT.md) | Canonical naming, IDs, and logo rules for the Muninn suite | Maintainers, Product |
| [MIGRATION_FROM_MARKDOWN_PREVIEW.md](MIGRATION_FROM_MARKDOWN_PREVIEW.md) | Hard-break migration from legacy extension ID and namespaces | Maintainers, Users |

## Quick Links

- **Getting Started:** Begin with [GETTING_STARTED.md](GETTING_STARTED.md) for a guided first run
- **Environment Setup:** Use [DEVELOPMENT.md](DEVELOPMENT.md) for day-to-day workflow
- **Understanding the Code:** Read [ARCHITECTURE.md](ARCHITECTURE.md) for the big picture
- **Running Tests:** See [TESTING.md](TESTING.md) for test commands and structure
- **Releasing:** Follow [RELEASE.md](RELEASE.md) when preparing a release

## Project Structure Overview

```
muninn-vscode/
├── src/                    # Extension source code
│   ├── extension.ts        # Extension host activation + command wiring
│   ├── custom-editor/      # CustomTextEditorProvider host + protocol + sync
│   ├── integrations/       # Integration adapters (Mermaid trust/config gate)
│   ├── providers/          # Optional provider helpers (paste/drop)
│   ├── services/           # Shared services (config, logger)
│   ├── types/              # TypeScript type definitions
│   ├── utils/              # Utility functions (localization)
│   └── webview/editor/     # Webview editor application (ProseMirror + Mermaid/table UI)
├── tests/                  # Test suites
│   ├── unit/               # Unit tests (mocked VS Code APIs)
│   ├── integration-cli/    # Integration tests via @vscode/test-cli
│   └── e2e/                # WDIO end-to-end tests
│   └── fixtures/           # Test data files
├── docs/                   # This documentation folder
├── assets/                 # Images and icons
├── specs/                  # Feature specifications (SpecKit)
└── .specify/               # AI tooling configuration
```

## Key Concepts

### Custom Editor Default

- Markdown files open in `muninn.markdownEditor` by default.
- The webview editor is the primary editing surface.
- `muninn.openRawMarkdown` is the explicit escape hatch to VS Code's default text editor.

### Host/Webview Split

- Extension host handles activation, command registration, trust-aware config, and `TextDocument` synchronization.
- Webview app handles rich editing UI, formatting actions, and inline Mermaid/table rendering.

### Event-Driven Design

The extension responds to VS Code events:

1. `onCustomEditor:muninn.markdownEditor` - Activates custom editor provider
2. `workspace.onDidChangeTextDocument` - Propagates document updates to webview sessions
3. `onDidChangeConfiguration` - Clears config cache and resyncs editor associations

## Contributing

See [CONTRIBUTING.md](../CONTRIBUTING.md) in the project root for contribution guidelines.

## Need Help?

- **Bugs:** [Open an issue](https://github.com/bluecloud-dev/muninn-vscode/issues)
- **Questions:** Check [TROUBLESHOOTING.md](TROUBLESHOOTING.md) first
- **Feature Requests:** [Open a feature request](https://github.com/bluecloud-dev/muninn-vscode/issues/new?template=feature_request.md)
