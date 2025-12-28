# Troubleshooting Guide

This guide helps you diagnose and resolve common issues with the Markdown Preview extension.

## Table of Contents

- [Preview Issues](#preview-issues)
- [Edit Mode Issues](#edit-mode-issues)
- [Formatting Issues](#formatting-issues)
- [Configuration Issues](#configuration-issues)
- [Performance Issues](#performance-issues)
- [Extension Conflicts](#extension-conflicts)
- [Getting Help](#getting-help)

## Preview Issues

### Preview does not open automatically

**Symptom:** Clicking a markdown file opens the text editor instead of preview.

**Possible Causes & Solutions:**

1. **Extension is disabled**
   - Open Settings (`Ctrl+,`)
   - Search for `markdownReader.enabled`
   - Ensure it's set to `true`

2. **File is in excluded path**
   - Check `markdownReader.excludePatterns` setting
   - Common exclusions: `**/node_modules/**`, `**/.git/**`
   - Remove the pattern if you want preview for that path

3. **File exceeds size limit**
   - Default limit is 1MB (`markdownReader.maxFileSize`)
   - For large files, you'll see an info message with option to preview anyway
   - Increase the limit if needed (value is in bytes)

4. **File opened via specific method**
   - Diff views are not intercepted (by design)
   - "Open With" menu bypasses the extension
   - Terminal-opened files should still preview

**Verification:**
```bash
# Check if extension is active
# Open Command Palette (Ctrl+Shift+P)
# Type: "Developer: Show Running Extensions"
# Look for "Markdown Preview" in the list
```

### Preview shows but is blank or broken

**Symptom:** Preview pane opens but content doesn't render.

**Solutions:**

1. **Check the Output panel for errors**
   - View > Output (`Ctrl+Shift+U`)
   - Select "Markdown Reader" from dropdown
   - Look for error messages

2. **Try VS Code's native preview**
   - Right-click the file > "Open Preview"
   - If this also fails, it's a VS Code issue, not the extension

3. **Reload the window**
   - Command Palette > "Developer: Reload Window"

4. **Check file encoding**
   - Bottom-right status bar shows encoding
   - Try changing to UTF-8 if different

### Preview fails to render (shows error notification)

**Symptom:** Error notification appears: "Unable to open markdown preview"

**Solutions:**

1. **Click "Open in Editor" button** in the notification to work with the file

2. **Check if file is binary**
   - Some files have `.md` extension but contain binary data
   - Extension will show "Cannot preview binary file" error

3. **Check for syntax issues**
   - Extremely malformed markdown might cause issues
   - Try with a simple test file first

## Edit Mode Issues

### Cannot enter edit mode

**Symptom:** Pressing `Ctrl+Shift+V` or running the command doesn't work.

**Solutions:**

1. **Ensure you're focused on a markdown preview**
   - The command only works when a markdown file/preview is active

2. **Check keyboard shortcut conflicts**
   - Command Palette > "Preferences: Open Keyboard Shortcuts"
   - Search for `Ctrl+Shift+V`
   - Look for conflicting commands

3. **Use Command Palette instead**
   - `Ctrl+Shift+P` > "Markdown Preview: Enter Edit Mode"

### Edit mode shows wrong layout

**Symptom:** Text editor and preview are in unexpected positions.

**Explanation:**

- Default layout: Editor on left, Preview on right
- The extension respects VS Code's `workbench.editor.splitInGroupLayout` setting
- User can manually rearrange panes; the extension tracks both

**To reset:**
1. Exit edit mode completely
2. Close all markdown tabs
3. Re-enter edit mode

### Cursor position not restored

**Symptom:** When re-entering edit mode, cursor is at line 1 instead of previous position.

**Explanation:**

- Cursor position is stored in memory only (not persisted)
- Position is lost when:
  - VS Code window is closed/reloaded
  - Extension is reloaded
  - File is closed completely

### Unsaved changes warning keeps appearing

**Symptom:** Dialog asking to save appears when exiting edit mode.

**Solutions:**

1. **Enable Auto Save**
   - File > Auto Save (or Settings > `files.autoSave`)
   - When enabled, the warning won't appear

2. **Choose your preference**
   - "Save & Exit" - Saves and returns to preview
   - "Exit Without Saving" - Discards changes
   - "Cancel" - Stay in edit mode

## Formatting Issues

### Formatting buttons not visible

**Symptom:** Title bar doesn't show Bold, Italic, and other buttons.

**Requirements for toolbar visibility:**

1. File must be markdown (`resourceLangId == markdown`)
2. Edit mode must be active (`markdownReader.editMode == true`)
3. Text editor must be focused (not preview pane)

**Verification:**
- Status bar should indicate edit mode is active
- Click in the text editor pane, not the preview

### Formatting doesn't apply

**Symptom:** Clicking format button or using shortcut does nothing.

**Solutions:**

1. **Check focus is in text editor**
   - Click inside the markdown source editor
   - Not the preview pane

2. **Check for selection**
   - Some operations work differently with/without selection
   - Try selecting text first

3. **Check for read-only**
   - Ensure file isn't read-only
   - Check file permissions

### Formatting produces wrong output

**Symptom:** Bold adds wrong markers, lists don't toggle correctly.

**Expected behavior:**

| Action | With Selection | Without Selection |
|--------|---------------|-------------------|
| Bold | Wraps with `**` | Wraps word under cursor, or inserts placeholder |
| Bullet List | N/A | Toggles `- ` at line start |
| Heading | N/A | Prepends `# ` to line |

**If behavior differs:**
- Report as bug with exact steps to reproduce
- Include VS Code version and extension version

### Keyboard shortcuts conflict with other extensions

**Symptom:** `Ctrl+B` or `Ctrl+I` does something else (like toggle sidebar).

**Solutions:**

1. **Formatting shortcuts are scoped**
   - They only activate in markdown edit mode
   - Outside markdown, VS Code defaults apply

2. **Check for conflicts**
   - Keyboard Shortcuts (`Ctrl+K Ctrl+S`)
   - Search for conflicting command
   - Adjust as needed

## Configuration Issues

### Settings don't take effect

**Symptom:** Changed setting but behavior didn't change.

**Solutions:**

1. **Check setting scope**
   - User settings vs Workspace settings
   - Workspace settings override user settings

2. **Reload window**
   - Some settings require reload
   - Command Palette > "Developer: Reload Window"

3. **Check correct setting name**
   - All settings use `markdownReader.` prefix
   - Example: `markdownReader.enabled`, not just `enabled`

### Exclude patterns not working

**Symptom:** Files in excluded paths still open in preview.

**Common issues:**

1. **Pattern syntax**
   - Use glob patterns: `**/node_modules/**`
   - Not regex or simple paths

2. **Case sensitivity**
   - Patterns are case-insensitive on Windows
   - Case-sensitive on macOS/Linux

3. **Test your pattern**
   ```
   Pattern: **/docs/**
   Matches: /project/docs/readme.md
   Matches: /project/src/docs/api.md
   Does NOT match: /project/documentation/readme.md
   ```

### Workspace settings not overriding user settings

**Symptom:** Workspace-specific config isn't applied.

**Verification:**

1. Open Settings (`Ctrl+,`)
2. Click "Workspace" tab
3. Search for `markdownReader`
4. Ensure settings are defined at workspace level

## Performance Issues

### Preview is slow to open

**Symptom:** Takes more than 1 second to show preview.

**Solutions:**

1. **Check file size**
   - Large files (>1MB) may be slow
   - Consider splitting large documentation

2. **Disable other markdown extensions**
   - Other extensions might add processing
   - Try with only this extension enabled

3. **Check VS Code performance**
   - Help > "Toggle Developer Tools"
   - Check Console for errors
   - Check Performance tab

### Mode switching is slow

**Symptom:** Takes more than 0.5 seconds to switch modes.

**Expected:** Mode switch should complete in <500ms

**Solutions:**

1. **Check for extension conflicts**
   - Disable other extensions temporarily
   - Test with extension development host

2. **Report performance issue**
   - Include file size
   - Include other active extensions
   - Include VS Code version

### High CPU/memory usage

**Symptom:** VS Code becomes slow when extension is active.

**Solutions:**

1. **Check Output channel for errors**
   - Repeated errors can cause resource issues

2. **Reload VS Code**
   - Sometimes state accumulates

3. **Report with details**
   - Use "Help > Report Issue"
   - Include performance profile if possible

## Extension Conflicts

### Conflicts with other markdown extensions

**Known compatible extensions:**
- Markdown All in One
- markdownlint
- Markdown Preview Enhanced (may need configuration)

**Troubleshooting conflicts:**

1. **Disable other markdown extensions one by one**
2. **Test which one causes the conflict**
3. **Report the conflict** with both extension names

### Commands not found

**Symptom:** "Command not found" error when running extension commands.

**Solutions:**

1. **Check extension is activated**
   - Extension activates on `onLanguage:markdown`
   - Open any markdown file first

2. **Check extension is installed**
   - Extensions view (`Ctrl+Shift+X`)
   - Search for "Markdown Preview"

3. **Reinstall extension**
   - Uninstall, reload, reinstall

## Getting Help

### Before reporting an issue

Collect this information:

1. **VS Code version**
   - Help > About

2. **Extension version**
   - Extensions view > Markdown Preview > Version

3. **Operating system**
   - Windows/macOS/Linux + version

4. **Steps to reproduce**
   - Exact sequence of actions
   - Expected vs actual behavior

5. **Error messages**
   - From Output panel ("Markdown Reader" channel)
   - From Developer Tools Console

### Where to report issues

- **GitHub Issues:** [Open an issue](https://github.com/ayhammouda/markdown-preview/issues)
- **Feature Requests:** Use the "feature request" template

### Quick diagnostics

Run these commands to gather diagnostic info:

1. **Check running extensions:**
   - Command Palette > "Developer: Show Running Extensions"

2. **Check extension host log:**
   - Command Palette > "Developer: Open Extension Logs Folder"

3. **Inspect configuration:**
   - Command Palette > "Markdown Preview: Inspect Configuration"
   - Check Output panel for effective settings

## Related Documentation

- [DEVELOPMENT.md](DEVELOPMENT.md) - Development setup
- [ARCHITECTURE.md](ARCHITECTURE.md) - How the extension works
- [TESTING.md](TESTING.md) - Running and writing tests
