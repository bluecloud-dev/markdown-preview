# Troubleshooting

## Markdown Does Not Open In Muninn

- Make sure the extension is installed and enabled.
- Open the Command Palette and run `Developer: Show Running Extensions` to confirm Muninn is active.
- If another extension or a user preference owns markdown files, use `Reopen With...` and choose `Muninn Markdown Editor`.

Muninn does not rewrite `workbench.editorAssociations`, so ownership conflicts should be resolved explicitly instead of expecting startup-time settings mutation.

## Raw Markdown Opens Instead Of The Custom Editor

- Confirm the file is a normal `.md` or `.markdown` resource.
- Check whether you previously selected another editor for that file type.
- Use `Reopen With...` to switch back to Muninn while testing.
- Source-control resources such as Git revisions intentionally open in VS Code's default editor so comparison views can show textual changes.

## Mermaid Does Not Render

- Check `muninn.integrations.mermaid.enabled`.
- In restricted workspaces, Mermaid stays disabled unless `muninn.integrations.mermaid.allowInUntrustedWorkspaces` is enabled.
- Use `Muninn for VS Code: Inspect Configuration` and review the `Output -> Muninn for VS Code` channel.

## Table Or Source Round-Trip Looks Wrong

- Use `Open Raw Markdown` to inspect the persisted markdown directly.
- Verify the document does not contain leaked `muninn-table` code fences after saving.
- If the problem is reproducible, capture the markdown before and after the action and include both in the bug report.

## Need More Context

- [ARCHITECTURE.md](ARCHITECTURE.md)
- [TESTING.md](TESTING.md)
- [MIGRATION_FROM_MARKDOWN_PREVIEW.md](MIGRATION_FROM_MARKDOWN_PREVIEW.md)
