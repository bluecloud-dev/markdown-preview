# Security Policy

## Supported Versions

Muninn is currently pre-release software. Security fixes target the default branch and the latest published preview release.

| Version                        | Supported |
| ------------------------------ | --------- |
| `main`                         | Yes       |
| Latest published `2.x` preview | Yes       |
| Older preview builds           | No        |
| `1.x` and earlier              | No        |

## Reporting a Vulnerability

Please do not report security vulnerabilities through public GitHub issues, pull requests, discussions, or social channels.

Use GitHub's private vulnerability reporting flow:

https://github.com/bluecloud-dev/muninn-vscode/security/advisories/new

If private vulnerability reporting is unavailable, open a minimal public issue asking for a private security contact. Do not include exploit details, proof-of-concept code, affected files, or sensitive logs in that public issue.

Please include as much of the following as you can:

- Affected Muninn version, commit, or VSIX package.
- Operating system and VS Code version.
- Affected feature area, such as the custom editor, webview rendering, Mermaid rendering, file handling, or release pipeline.
- Reproduction steps and any required configuration.
- Impact assessment, including what data or capability could be exposed or modified.
- Proof-of-concept details, if available.

You should receive an initial response within 72 hours. Confirmed vulnerabilities will be triaged privately, fixed on a branch or private fork when needed, and disclosed after a patched release or mitigation is available.
