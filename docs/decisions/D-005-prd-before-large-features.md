# D-005 · One PRD before any >1-week feature

**Status:** Accepted
**Date:** 2026-05 (strategic roadmap)

## Context

Solo-maintainer capacity (~10–15 h/week) cannot absorb scope creep; 80% of indie roadmaps die of triple-booking.

## Decision

Every initiative estimated over one week of effort gets a one-page PRD in `specs/<feature>/spec.md` before code.

## Consequences

`specs/round-trip-correctness/spec.md` is the pattern instance. Issues reference their spec; agents read the spec first.
