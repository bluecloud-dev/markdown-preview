# Issue Backlog Conventions

These conventions keep Muninn roadmap issues implementable by humans and coding agents.

## Labels

- `P1`: blocks alpha or public credibility.
- `P2`: important after P1, or high-value polish.
- `P3`: opportunistic, cleanup, or post-GA.
- `phase:now`: alpha-exit and 2.0.0 GA scope.
- `phase:next`: post-GA or stretch scope.
- `ai-ready`: issue has enough file paths, expected behavior, and acceptance criteria for an agent to implement.
- `needs-human`: requires accounts, credentials, public voice, legal judgment, or subjective maintainer review.

## Issue Body Shape

Use this order where practical:

1. Context.
2. Current behavior.
3. Desired behavior.
4. Scope.
5. Acceptance criteria.
6. Out of scope.

## Agent Rules

- Verify file paths before editing.
- Keep round-trip Markdown behavior explicit.
- Do not add telemetry.
- Do not weaken workspace-trust behavior.
- Do not introduce extra webviews unless the architecture document is updated and the issue explicitly calls for it.
- Use localized strings for user-facing text.
- Add tests proportional to the behavior changed.

## Dependency References

Always reference real GitHub issue numbers. Do not leave planning placeholders such as `#001` or `#014` in public issues.
