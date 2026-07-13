# Feature Specification: Golden‑File Round‑Trip Correctness

**Feature Branch:** `feature/round-trip-correctness`
**Created:** 2026-05-14
**Status:** Draft
**Input:** Roadmap initiative #1 — Golden‑file round‑trip tests for CommonMark + GFM (`docs/STRATEGIC_ROADMAP.md`)
**Owner:** Aymen Hammouda
**Target release:** `2.0.0` GA (Q3 2026)

---

## 1. Problem statement

Muninn is a WYSIWYG markdown editor, and the category has a well‑documented failure mode: WYSIWYG editors silently rewrite users' files. Vditor (used by `zaaack.markdown-editor`) churns the whole file on every keystroke and gets 1‑star reviews for it. Typora has occasional surprise rewrites. Notion's "markdown export" is structurally lossy. Obsidian's wikilinks are non‑portable.

Muninn's ProseMirror foundation *can* round‑trip markdown losslessly — `markdown → ProseMirror document → markdown` should produce the same bytes the user typed. But "can" is not "does." Without an enforced, comprehensive test corpus running in CI, this property silently rots: a new schema node, a regex tweak, a markdown‑it plugin upgrade can break it for a syntax variant nobody tested, and the regression only surfaces when a user's file gets mangled. By then trust is already gone.

**Who experiences this:** every Muninn user. The damage shows up in git diffs (a one‑character edit triggering 200 lines of whitespace changes), in PR reviews (reviewers wondering why all the lists got renumbered), in personal note collections that diverge from their backups.

**Impact of not solving:** Muninn cannot credibly claim "the honest WYSIWYG" — the single biggest positioning lever it has against the existing WYSIWYG competitors (see `docs/COMPETITIVE_BRIEF.md` §5). Without this, Muninn is just another Vditor wrapper.

---

## 2. Goals

1. **100% pass rate on the CommonMark 0.31.2 spec example set** (~650 examples) before `2.0.0` GA ships.
2. **≥95% pass rate on GFM extensions Muninn supports** (tables, task lists, strikethrough, autolinks, footnotes); each unsupported case documented as an explicit known limitation with a GitHub issue.
3. **Round‑trip test report published as a CI artifact on every run** and linked from the README.
4. **Zero round‑trip regressions reach `main`** — failing round‑trip = failing CI = no merge.
5. **A public marketing claim that holds up to scrutiny:** *"Muninn's WYSIWYG round‑trips your markdown byte‑for‑byte. We test it."*

---

## 3. Non‑goals

1. **Pixel‑perfect rendering snapshots.** This spec is about source‑in / source‑out fidelity, not visual rendering correctness. Visual regression testing is a separate (lower‑priority) concern.
2. **Auto‑normalizing user markdown.** If the user types `*` for emphasis and Muninn happily round‑trips it as `*`, that's correct. If the user types `_` and Muninn rewrites it as `*` on save, that's broken — even if the rendered output is identical. Style preservation is the whole point.
3. **Testing markdown extensions Muninn doesn't yet support.** Math, GFM alerts, and custom containers ship in Q3 (roadmap items 10, 11). Their fixtures land alongside their features, not before.
4. **Replacing the existing integration/E2E suites.** This is an additional test surface, not a substitute. Integration tests cover behavior; round‑trip tests cover content preservation.
5. **CRLF / line‑ending evangelism.** Muninn preserves the file's existing line endings; the round‑trip test normalizes for comparison but does not enforce a project‑wide line‑ending policy.

---

## 4. User scenarios

### Scenario 1 — The contributor maintaining round‑trip safety (Priority: P0)

**As a** Muninn maintainer (or external contributor),
**I want** every change that touches the markdown serialization or ProseMirror schema to fail CI if it breaks round‑trip on any fixture,
**so that** regressions cannot reach `main` and our public correctness claim stays true.

**Acceptance scenarios:**

1. **Given** a PR that introduces a serialization bug, **When** CI runs the round‑trip suite, **Then** the failing fixture(s), the original markdown, and the bytes Muninn produced are all visible in the failure output.
2. **Given** a passing round‑trip suite, **When** a maintainer merges to `main`, **Then** the test report is uploaded as a CI artifact tagged with the commit SHA.
3. **Given** a new CommonMark spec release, **When** the fixture corpus is regenerated, **Then** any new failures surface as expected diffs reviewers can evaluate.

---

### Scenario 2 — The end user trusting Muninn with real files (Priority: P0)

**As a** developer who just opened a 2,000‑line README in Muninn and edited one paragraph,
**I want** `git diff` to show *exactly* that paragraph changed,
**so that** my PR review focuses on my edit and not on whitespace, list renumbering, or quote style churn.

**Acceptance scenarios:**

1. **Given** a markdown file with mixed emphasis markers (`*` and `_`), **When** the user edits any part of it in Muninn, **Then** untouched paragraphs serialize back unchanged byte‑for‑byte.
2. **Given** a markdown file with setext headings (`===` underline), **When** the user edits a different section, **Then** the setext headings are not silently rewritten to ATX (`#`) form.
3. **Given** a markdown file with a hard‑wrapped paragraph (newlines at column 80), **When** the user edits a different paragraph, **Then** the hard wrap on the untouched paragraph is preserved.
4. **Given** a markdown file with reference‑style links, **When** the user edits link text but not the URL, **Then** the reference style is preserved, not flattened to inline.

---

### Scenario 3 — The marketing claim holding up to public scrutiny (Priority: P0)

**As a** prospective Muninn user reading the README who has been burned by Vditor or Notion before,
**I want** to see concrete evidence that Muninn's round‑trip property is enforced and measurable,
**so that** I can trust the WYSIWYG claim before installing.

**Acceptance scenarios:**

1. **Given** the README, **When** the user looks for the round‑trip claim, **Then** they see a passing/failing count against named spec versions (CommonMark 0.31.2, GFM) linked to the latest CI run.
2. **Given** the marketplace listing, **When** the user clicks through to the docs, **Then** they find a public list of known round‑trip limitations with linked GitHub issues for each.
3. **Given** a skeptical reader, **When** they clone the repo and run `npm run test:round-trip`, **Then** the suite runs locally with the same results.

---

### Scenario 4 — Honest about edges (Priority: P1)

**As a** maintainer,
**I want** the test corpus to distinguish "bug we must fix" from "documented known limitation" from "intentional normalization,"
**so that** the public report doesn't mislead and contributors know what's in scope.

**Acceptance scenarios:**

1. **Given** a fixture with a documented limitation, **When** CI runs, **Then** the fixture is marked `expected-limitation` in the report, not `fail`, and the report still passes overall.
2. **Given** a fixture marked `expected-limitation`, **When** a future change makes it pass, **Then** CI reports an *improvement* and prompts moving the fixture to the strict suite.

---

## 5. Requirements

### Must‑have (P0)

| ID | Requirement | Acceptance criteria |
|---|---|---|
| **R‑01** | Build a fixture corpus from CommonMark 0.31.2 spec examples (~650). | Each example checked into `tests/fixtures/markdown/commonmark/<example-N>.md`. Generation script reproducible from upstream spec. |
| **R‑02** | Build a GFM fixture corpus covering Muninn‑supported extensions: tables, task lists, strikethrough, autolinks, footnotes. | Minimum 50 hand‑written fixtures covering common, edge, and pathological cases. |
| **R‑03** | Round‑trip test runner: load markdown → instantiate Muninn's ProseMirror parser → serialize → compare. | Pure Node, no VS Code host needed for the fast suite. Reuses `src/custom-editor/document-sync.ts` parsing pipeline. |
| **R‑04** | Failure output includes the unified diff between expected and produced bytes. | Failing test prints input filename, expected (truncated to 50 lines + context), and actual diff inline. |
| **R‑05** | CI integration: `npm run test:round-trip` blocks merge on failure. | New GitHub Actions job added to `.github/workflows/ci.yml`; required check on PRs to `main`. |
| **R‑06** | Test report uploaded as a CI artifact on every run, JSON + human‑readable HTML. | Artifact retention 90 days. Linked from README via shields.io badge. |
| **R‑07** | Documented normalization policy: line endings, trailing whitespace, terminal newline. | Published in `docs/ROUND_TRIP.md`. Each normalization rule justified. |
| **R‑08** | Known‑limitation registry. | `tests/fixtures/markdown/known-limitations.json` lists each documented gap with linked issue. Counted separately in the report. |

### Nice‑to‑have (P1)

| ID | Requirement | Acceptance criteria |
|---|---|---|
| **R‑09** | Property‑based fuzz testing layer using fast‑check that generates valid markdown and asserts round‑trip. | 5,000 random fixtures per CI run; failing seeds saved for reproduction. |
| **R‑10** | Per‑category pass rate breakdown in the report (headings, lists, emphasis, code, links, tables, etc.). | Visible in HTML report dashboard. |
| **R‑11** | Comparison against the prior commit's report; surface "improvements" and "regressions" separately. | Pull‑request comment summarizing the delta. |
| **R‑12** | Mermaid block source preservation as part of round‑trip. | Fenced ` ```mermaid ` blocks round‑trip without re‑indentation or whitespace churn. |

### Future considerations (P2)

| ID | Requirement | Why deferred |
|---|---|---|
| **R‑13** | Round‑trip tests for KaTeX math blocks. | Math support ships in Q3 (roadmap item 10); fixtures land then. |
| **R‑14** | Round‑trip tests for GFM alerts/callouts. | Ships in Q3 (roadmap item 11). |
| **R‑15** | Round‑trip benchmarking suite (perf budget per fixture). | Useful but not blocking GA; revisit post‑GA. |
| **R‑16** | A public "submit your file for round‑trip testing" web tool. | Marketing nice‑to‑have for 2027 only if installs warrant it. |

---

## 6. Success metrics

### Leading indicators (update during the Q2 sprint)

- **Fixture coverage:** ≥650 CommonMark + ≥50 GFM by end of week 2.
- **Pass rate trajectory:** week 1 ≥70%, week 2 ≥95%, week 3 (pre‑GA) 100% CommonMark / ≥95% GFM.
- **CI integration done:** required check on PRs by end of week 2.

### Lagging indicators (measure post‑GA, monthly)

- **User‑reported round‑trip issues:** ≤1 per quarter (vs. `zaaack.markdown-editor` baseline of recurring "Vditor rewrote my file" reports).
- **Marketplace review mentions of round‑trip / file safety:** track sentiment via `product-management:metrics-review`.
- **Listicle mentions citing the property as a differentiator:** target ≥2 by end of 2026.
- **Marketplace rating:** ≥4.6★ within 90 days of GA.

---

## 7. Open questions

| # | Question | Owner |
|---|---|---|
| Q‑01 | Should reference‑style links be preserved when the user edits the link's text via the rich editor? Implementation cost vs. user value unclear. | engineering |
| Q‑02 | How do we treat hard line wraps in paragraphs (column 80)? Preserve byte‑for‑byte, or normalize to a single line internally and restore on serialize? Latter is hard to do faithfully. | engineering |
| Q‑03 | List marker preservation: if user typed `1.`, `2.`, `3.`, do we preserve those exact numbers when the user inserts a new item in the middle (forcing renumbering)? CommonMark allows `1. 1. 1.` to render correctly — should Muninn keep them static? | product |
| Q‑04 | Setext vs ATX heading preservation cost: ProseMirror's schema has one heading node. Distinguishing between the two source forms requires custom marks or per‑node metadata. Worth the cost? | engineering |
| Q‑05 | How to handle CRLF files on macOS/Linux developers' machines — does the test runner normalize before compare, or fail to surface line‑ending corruption? | engineering |
| Q‑06 | Public phrasing of the marketing claim: "byte‑perfect," "lossless," "honest WYSIWYG"? Tested user preference unknown. | brand |
| Q‑07 | Should the property‑based fuzz layer (R‑09) be a required CI check, or advisory only? It will find new bugs but may flake. | engineering |
| Q‑08 | Where do we host the public test report — GitHub Pages, the README badge linking to artifacts, or both? Pages adds build complexity but gives a stable URL. | ops |

---

## 8. Timeline & dependencies

**Estimate:** 2 weeks of focused effort (per roadmap RICE), spread over ~3 calendar weeks at solo‑maintainer cadence.

**Phasing:**

| Week | Deliverable |
|---|---|
| 1 | Fixture generation pipeline; CommonMark corpus checked in; runner prototype passing on ≥70% of cases. |
| 2 | Hand‑written GFM corpus; runner stabilization; CI integration; report generator. |
| 3 | Push to 100% CommonMark / ≥95% GFM; document known limitations; README + `docs/ROUND_TRIP.md`; marketing claim wording locked. |

**Dependencies:**

- **Hard dependency:** none. This work can start immediately and unblocks the `2.0.0` GA release (roadmap item 9).
- **Soft dependency:** P1 item R‑09 (fuzz layer) depends on fast‑check being added to dev dependencies — trivially low risk.
- **Coordinated change:** the README rewrite (roadmap item 7) consumes the test report; sequence so the corpus is stable before the README hero changes ship.

**Blocks:**

- This spec is on the **critical path** to `2.0.0` GA. Failing this spec means failing the GA gate, which means the entire Q3 differentiation theme slides right.

---

## 9. Risks

| Risk | Likelihood | Severity | Mitigation |
|---|---|---|---|
| Some CommonMark constructs are genuinely hard to round‑trip (e.g., loose vs. tight lists, setext vs ATX) and force visible normalization. | High | Medium | Document each normalization in `docs/ROUND_TRIP.md` with rationale; classify as "intentional" not "limitation." |
| ProseMirror schema lacks the metadata needed to preserve all source forms; would require schema extensions. | Medium | High | Spike in week 1; if schema work needed, scope it as a separate child spec and reduce the GFM target to ≥85% for 2.0.0, push to 95% in 2.0.1. |
| Fuzz layer flakes in CI and starts blocking unrelated PRs. | Medium | Low | Ship as advisory (non‑required) check until two weeks of green; then promote to required. |
| Maintainer underestimates fixture authoring effort. | Medium | Medium | Reuse CommonMark spec's existing examples directly — no hand authoring needed for that corpus. Only GFM extension cases need hand work. |
| Marketing claim phrasing turns out to be technically false in an edge case. | Low | High | Phrase claim with the *measured* number ("passes 100% of CommonMark 0.31.2 spec examples") not the absolute ("byte‑perfect for all markdown"). |

---

## 10. Out of scope (explicitly)

- Visual rendering correctness tests.
- Performance benchmarks beyond a basic timing guard.
- Cross‑editor compatibility (e.g., does Muninn's output match GitHub's renderer? — that's a *different* property and not part of this spec).
- Migration tooling for users coming from Vditor‑based extensions whose files already got rewritten.
- A public submission/leaderboard UI.

---

## 11. References

- `docs/COMPETITIVE_BRIEF.md` §5 — positioning rationale for the round‑trip claim.
- `docs/STRATEGIC_ROADMAP.md` items 1, 7, 9 — sequencing and dependencies.
- `docs/ARCHITECTURE.md` — current document sync protocol that the runner reuses.
- [CommonMark Spec 0.31.2](https://spec.commonmark.org/0.31.2/) — primary fixture source.
- [GitHub Flavored Markdown Spec](https://github.github.com/gfm/) — secondary fixture source.
- [fast‑check](https://github.com/dubzzz/fast-check) — property‑based testing library (P1).
- [ProseMirror markdown serializer docs](https://prosemirror.net/docs/ref/#markdown) — implementation reference.

---

## 12. Next steps after spec approval

1. **Engineering plan** (separate doc, `specs/round-trip-correctness/plan.md`) following the existing SpecKit pattern — break each requirement into tasks with effort estimates.
2. **Tasks breakdown** (`specs/round-trip-correctness/tasks.md`) — convert the plan into actionable, sequenced units of work.
3. **Spike on Q‑02 and Q‑04** (line wrapping, setext preservation) before locking the schema. Two days max.
4. **Run `engineering:testing-strategy` skill** to design the corpus generation + comparison harness specifically.
5. **Run `engineering:architecture` skill** to capture an ADR on the normalization policy (Q‑01 through Q‑05) — public ADR doubles as a personal‑brand artifact.
6. **Lock the marketing claim wording** via `brand-voice:brand-voice-enforcement` before the README rewrite consumes it.
