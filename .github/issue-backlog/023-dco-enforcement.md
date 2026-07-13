---
title: DCO sign-off enforcement for all contributions
labels: needs-human,ai-ready,licensing,infra,P2,phase:now
---
## Context

Sole copyright ownership is what keeps dual-licensing and future relicensing possible under AGPL (`docs/MARKET_POSITION_2026-06.md` §7.1). The moment an external PR merges without sign-off, that option silently degrades. Enforce BEFORE the first outside contribution.

## AI-implementable scope

1. `CONTRIBUTING.md`: how to contribute, DCO explanation, `git commit -s` instructions, statement that contributions are accepted under AGPL-3.0-only and that the maintainer retains the right to offer the work under other licenses (contributions licensed in, not copyright-assigned — keep wording factual; flag for maintainer review).
2. DCO check workflow: add a `dco` job (the standard `Signed-off-by` trailer check) to PR CI — implement as a small script step (grep commits in the PR range for the trailer) to avoid third-party action dependencies, consistent with the repo's pinned-action policy.
3. PR template (`.github/pull_request_template.md`) with sign-off checkbox + conventions checklist (lint/typecheck/tests/l10n/no-telemetry).

## Human-gated steps (label: needs-human)

- Decide the exact inbound-license wording (the dual-licensing reservation has legal weight — get it reviewed).
- Repo settings: make the DCO check required in branch protection.
- Optional: install the DCO GitHub App instead of the CI grep — maintainer's call.

## Acceptance criteria

- [ ] PR without sign-off fails the required check; with sign-off passes
- [ ] CONTRIBUTING.md + PR template merged; wording reviewed by maintainer
- [ ] Branch protection updated (screenshot or settings note in issue)
