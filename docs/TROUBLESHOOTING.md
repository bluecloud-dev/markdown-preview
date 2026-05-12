# Troubleshooting Guide

This guide covers common issues for the current Muninn v2 custom editor workflow.

## 1) Markdown does not open with Muninn

### Symptoms

- Opening `.md` files still shows VS Code's default editor.

### Checks

1. Ensure the extension is installed and enabled.
2. Verify `muninn.editorAssociations` is enabled.
3. Verify workspace editor associations:

```json
{
  "workbench.editorAssociations": {
    "*.md": "muninn.markdownEditor",
    "*.markdown": "muninn.markdownEditor"
  }
}
```

4. Run `Muninn for VS Code: Inspect Configuration` and confirm values in output.

## 2) Mermaid is not rendering

### Symptoms

- Mermaid blocks are visible as source but no rendered preview appears.

### Checks

1. Confirm `muninn.integrations.mermaid.enabled` is `true`.
2. If the workspace is untrusted, Mermaid stays disabled by default.
3. In restricted workspaces, explicitly enable:

```json
{
  "muninn.integrations.mermaid.allowInUntrustedWorkspaces": true
}
```

4. Reload the window after changing trust-sensitive settings.

## 3) Toolbar actions are missing

### Symptoms

- Expected buttons are hidden in the custom editor toolbar.

### Checks

1. Confirm the active editor is `muninn.markdownEditor`.
2. Check toolbar mode:
   - `muninn.toolbar.mode = "basic"` hides advanced actions.
   - `muninn.toolbar.mode = "advanced"` shows all authoring buttons.
3. Run `Inspect Configuration` to verify effective setting scope.

## 4) Table source mode does not apply edits

### Symptoms

- Edited table source does not persist.

### Checks

1. Open table source via `View Source` on a table node.
2. Apply with button or `Ctrl/Cmd+Enter`.
3. Wait for source panel to close and grid to reappear.
4. Reopen source to confirm persisted markdown.

## 5) Raw markdown fallback does not open

### Symptoms

- `Muninn for VS Code: Open Raw Markdown` appears to do nothing.

### Checks

1. Ensure a Muninn markdown editor tab is active.
2. Re-run command from command palette while the markdown tab is focused.
3. If needed, use tab menu -> `Reopen Editor With...` -> `Text Editor`.

## 6) Automated tests fail locally

### Known Environment Notes

- Integration tests can fail on some macOS setups with `SIGABRT` from VS Code host runtime.
- E2E browser tests can fail intermittently from VS Code/chromedriver session disconnects.

### What to do

1. Run core local gates first:

```bash
npm run lint
npm run typecheck
npm run coverage
```

2. Re-run flaky suites:

```bash
npm test
npm run test:e2e
```

3. Prefer Linux CI/xvfb results as the stability source of truth when local GUI env is noisy.

## 7) Useful Debug Commands

```bash
npm run compile
npm run bundle
npm test
npm run test:e2e
```

VS Code:

- `Developer: Show Running Extensions`
- `Developer: Reload Window`
- `Muninn for VS Code: Inspect Configuration`

## Need More Help

- File an issue: https://github.com/bluecloud-dev/muninn-vscode/issues
- Include:
  - VS Code version
  - Extension version
  - OS
  - Repro steps
  - Output from `Inspect Configuration`
