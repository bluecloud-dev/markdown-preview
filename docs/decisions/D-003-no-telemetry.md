# D-003 · No telemetry, ever

**Status:** Accepted
**Date:** 2026 (v2 rewrite)

## Context

Trust is the positioning wedge in a category whose flagship competitor carries an unresolved CVE.

## Decision

Muninn collects no telemetry of any kind. Enforced in CI by `scripts/check-no-telemetry.js` (`npm run check:no-telemetry`).

## Consequences

No analytics-informed product decisions — user research comes from reviews and issues instead (STRATEGIC_ROADMAP item 24). The claim is verifiable, which is the point.
