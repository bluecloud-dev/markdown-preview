# Markdown Preview - Roadmap

> Open markdown files in preview mode by default, optimizing the reading experience for developers.

---

## Current State: v1.0.0 (Stable)

The extension has reached its first stable release with all core features implemented:

### Shipped Features

| Feature | Description | Priority |
|---------|-------------|:--------:|
| **Preview by Default** | Markdown files open in rendered preview mode | P0 |
| **Edit Mode Toggle** | Split view with text editor and live preview | P0 |
| **Formatting Toolbar** | Bold, italic, strikethrough, lists, code, links, headings | P1 |
| **Context Menu** | Format submenu with heading and code submenus | P2 |
| **Keyboard Shortcuts** | Ctrl+Shift+V toggle, Ctrl+B bold, Ctrl+I italic | P2 |
| **Configuration** | Enable/disable, exclude patterns, max file size | P2 |
| **Accessibility** | ARIA labels, keyboard navigation, status bar announcements | P0 |

### Quality Metrics Achieved

| Metric | Target | Status |
|--------|--------|:------:|
| Test Coverage | 80%+ | :white_check_mark: |
| Startup Impact | <50ms | :white_check_mark: |
| Mode Switch | <500ms | :white_check_mark: |
| Formatting | <100ms | :white_check_mark: |
| TypeScript Strict | Enabled | :white_check_mark: |
| No Telemetry | Verified | :white_check_mark: |

---

## Design Principles

These principles guide all development decisions:

1. **Native Integration** - Use VS Code's built-in APIs only (no custom webviews)
2. **Reading-First** - Preview mode is the default; editing is opt-in
3. **Zero Configuration** - Works immediately after installation
4. **Non-Intrusive** - Respects user intent; no auto-return to preview on save
5. **Privacy-First** - No telemetry collection

---

## Future Considerations

The following features may be considered for future releases based on user feedback:

### Potential Enhancements

| Feature | Description | Complexity |
|---------|-------------|:----------:|
| Table Formatting | Insert/edit markdown tables | Medium |
| Image Insertion | Insert images with file picker | Low |
| Task Lists | Toggle checkbox `[ ]` / `[x]` | Low |
| Block Quotes | Toggle `> ` prefix | Low |
| Horizontal Rule | Insert `---` | Low |
| Custom Keybindings | More default shortcuts beyond bold/italic | Low |

### Not Planned

These features are explicitly out of scope per the [Project Constitution](../.specify/memory/constitution.md):

- Custom markdown themes/styling
- Export to PDF/HTML
- WYSIWYG editing
- Custom markdown parser/renderer
- Other markup formats (AsciiDoc, reStructuredText)
- Inline preview in editor

---

## Contributing

Have a feature request? Check the existing [GitHub Issues](https://github.com/ayhammouda/markdown-preview/issues) or open a new one.

For implementation details, see:
- [ARCHITECTURE.md](ARCHITECTURE.md) - System design
- [DEVELOPMENT.md](DEVELOPMENT.md) - Development setup
- [CONTRIBUTING.md](../CONTRIBUTING.md) - Contribution guidelines

---

*Roadmap v2.0 - Reflects v1.0.0 stable release*
