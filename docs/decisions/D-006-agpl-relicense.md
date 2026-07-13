# D-006 · Relicense MIT → AGPL-3.0-only

**Status:** Accepted (supersedes [D-001](D-001-stay-mit.md))
**Date:** 2026-06-09 · Implemented in commit `a0829d9`

## Context

The May brief's counter-case (Marketplace signaling, §13 network-clause exposure, enterprise legal rejection — see D-001) was reconfirmed and accepted with eyes open. Full rationale: `docs/MARKET_POSITION_2026-06.md` §7.

## Decision

Muninn is AGPL-3.0-only: `LICENSE` replaced, `package.json` `license` field set, README license section rewritten. Relicensing was legally clean — sole contributor (46/46 commits), all runtime dependencies MIT-compatible.

## Consequences

- The license does brand work MIT could not: the uncompromisingly-FOSS option in a niche of proprietary/freeware alternatives.
- Operational follow-ups tracked as issues: SPDX headers + THIRD_PARTY_NOTICES (#264), DCO sign-off before any external PR (#265), README plain-language FAQ (#266), trademark/naming policy (#268).
- Adoption targets take a haircut (some enterprises refuse categorically); Open VSX dual-publish (#244) courts the FOSS-sympathetic audience the license now serves.
