# SpecKit FastAPI Export Instructions

This package contains the SpecKit workflow files needed to replicate the same flow in a Python FastAPI project.

## What is included

- `.specify/` (templates, scripts, skills, memory, docs)
- `.claude/commands/` (SpecKit command behaviors)

## Install in your FastAPI repo

1. Copy folders into your FastAPI repo root:

   ```bash
   rsync -a /path/to/spec-kit-fastapi-export/.specify /path/to/fastapi-repo/.specify
   rsync -a /path/to/spec-kit-fastapi-export/.claude/commands /path/to/fastapi-repo/.claude/
   ```

2. Confirm the layout exists:

   ```bash
   ls -a /path/to/fastapi-repo/.specify
   ls -a /path/to/fastapi-repo/.claude/commands
   ```

## Recommended FastAPI adjustments (to keep the flow but use Python tooling)

1. Update the constitution for your FastAPI project:

   - Run `/speckit.constitution` and describe the FastAPI project.
   - This replaces the VS Code extension-specific rules in `.specify/memory/constitution.md`.

2. Swap Node-specific steps in these command files with Python equivalents:

   - `.claude/commands/speckit.milestone.md`
   - `.claude/commands/speckit.implement.md`
   - `.claude/commands/speckit.implement-tdd.md`
   - `.claude/commands/speckit.workflow.md`

   Typical replacements:

   - `npm test` -> `pytest`
   - `npm run lint` -> `ruff check .` or `flake8`
   - `npm run coverage` -> `pytest --cov`
   - `package.json` version bump -> update `pyproject.toml`
   - VSIX packaging -> `python -m build` for sdist/wheel

## Notes

- This package does not include `.claude/settings.local.json` because it is machine- and repo-specific.
- If you want local command allowlists, add a `.claude/settings.local.json` in your FastAPI repo.
