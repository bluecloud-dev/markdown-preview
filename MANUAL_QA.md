# Manual QA Checklist

This checklist validates the custom-editor-first Markdown workflows for Muninn for VS Code.

## Environment Matrix

- VS Code: Stable (required), Insiders (recommended smoke run)
- OS: macOS, Linux, Windows
- Workspace types: single-folder, multi-root, untrusted workspace

## Pre-flight

1. Install extension `blueclouddev.muninn-vscode`.
   Expected:

- Extension installs cleanly.
- Command category appears as **Muninn for VS Code**.

2. Open Output panel and select **Muninn for VS Code** channel.
   Expected:

- Channel exists.
- Activation logs are readable.

## Installation + Activation Behavior

1. Open a markdown file from Explorer.
   Expected:

- File opens in `muninn.markdownEditor`.
- Active tab label references the markdown file.
- No error notification.

2. Open a markdown file from Quick Open (`Ctrl+P` / `Cmd+P`).
   Expected:

- Same custom editor behavior.

3. Set `muninn.editorAssociations` to `false` for workspace and reopen markdown file.
   Expected:

- File opens using VS Code's standard text editor.

## Core Editing Workflows

1. Open `tests/fixtures/with-formatting.md`.
   Expected:

- Custom editor toolbar appears.
- One click in document allows immediate editing commands.

2. Run `muninn.toggleBold` twice.
   Expected:

- First run applies emphasis.
- Second run removes emphasis (no marker stacking).

3. Run `muninn.toggleItalic` twice.
   Expected:

- First run applies emphasis.
- Second run removes emphasis.

4. Run `muninn.openRawMarkdown`.
   Expected:

- Same file opens in default markdown text editor.

## Mermaid and Table Workflows

1. Run `muninn.insertMermaidBlock`.
   Expected:

- Mermaid block is inserted once per invocation.
- Editor remains responsive (no runaway insertion).
- Mermaid preview renders visible node labels (not empty boxes).

2. Use `muninn.insertTable`, then `muninn.addTableRow`, then `muninn.addTableColumn`.
   Expected:

- Markdown table is preserved as valid table text.
- Table preview panel remains stable.

3. In a table block, click **View Source**, edit source text, then click **Apply Source**.
   Expected:

- Grid updates immediately.
- Updated markdown persists to file.
- Source panel closes and returns to preview mode.

4. In a table source textarea, edit source and press `Ctrl+Enter` / `Cmd+Enter`.
   Expected:

- Same behavior as clicking **Apply Source**.
- No silent no-op after focus changes.

5. Open `tests/fixtures/mermaid.md` and scroll while Mermaid panel is focused.
   Expected:

- Page scroll is not trapped by Mermaid preview area.
- Preview remains legible in both dark and light themes.

6. While Mermaid preview is open, switch between a light and dark VS Code theme.
   Expected:

- Mermaid labels and edges stay readable after rerender.

## Error and Empty States

1. Open empty markdown file.
   Expected:

- No crash; toolbar and commands still work.

2. Disable `muninn.integrations.mermaid.enabled`, reopen Mermaid document.
   Expected:

- Mermaid integration behavior is disabled without breaking editing.

3. In untrusted workspace, keep `muninn.integrations.mermaid.allowInUntrustedWorkspaces=false`.
   Expected:

- Mermaid rendering is gated off by policy.

4. Trigger a table source apply race condition (quickly close/reopen editor while applying source).
   Expected:

- Local source panel shows `Could not apply table source. Please retry.` without crashing the editor.

## Accessibility Basics

1. Keyboard-only flow: open markdown file, run bold/italic/table actions, apply table source via `Ctrl+Enter`/`Cmd+Enter`, switch to raw editor.
   Expected:

- No mouse dependency for critical flow.

2. High contrast theme smoke check.
   Expected:

- Toolbar, table source feedback, and Mermaid labels remain legible.

## Release Readiness Sign-off

- [ ] Stable on macOS
- [ ] Stable on Linux
- [ ] Stable on Windows
- [ ] Stable on VS Code Stable
- [ ] Smoke-passed on VS Code Insiders
- [ ] No critical regressions in custom editor workflows
