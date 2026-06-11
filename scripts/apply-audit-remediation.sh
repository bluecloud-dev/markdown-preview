#!/usr/bin/env bash
# Applies the GitHub-side fixes for the June 2026 orchestrator-audit findings.
#   Finding 2: cross-reference normalization (#0NN -> #243-#278)
#   Finding 3: supersession of old issues #204-#214
#   Finding 4: gate/unblock SPDX (#264) + DCO (#265) on the license commit
#   Finding 5: retitle #271 to the AGENTS.md reality
#   Finding 6: 9-issue "2.0.0 GA" milestone + P1 diet (12 -> 8)
#   Bonus:     #267 scope fix (SECURITY.md already exists since dfafdfe)
#
# Usage: ./scripts/apply-audit-remediation.sh [--dry-run] [--close-superseded]
#   default            safe edits (milestone, labels, titles, comments) + prints
#                      a review packet for old issues WITHOUT closing them
#   --close-superseded additionally comments on + closes #204,#208,#209,#210,#211,#214
#   --dry-run          print every action, change nothing
set -euo pipefail
REPO="bluecloud-dev/muninn-vscode"
DRY=false; CLOSE=false
for a in "$@"; do case "$a" in --dry-run) DRY=true;; --close-superseded) CLOSE=true;; esac; done
run() { if $DRY; then echo "[dry-run] $*"; else "$@"; fi }

echo "== A. Normalize cross-references in #243-#278 =="
if $DRY; then "$(dirname "$0")/normalize-issue-refs.sh" --dry-run; else "$(dirname "$0")/normalize-issue-refs.sh"; fi

echo "== B. Milestone '2.0.0 GA' =="
MS_TITLE="2.0.0 GA"
ms=$(gh api "repos/$REPO/milestones?state=all" --jq ".[] | select(.title==\"$MS_TITLE\") | .number" || true)
if [ -z "$ms" ]; then
  if $DRY; then echo "[dry-run] create milestone '$MS_TITLE'"; ms="(new)"; else
    ms=$(gh api -X POST "repos/$REPO/milestones" -f title="$MS_TITLE" \
      -f description="GA-gating set per June 2026 audit remediation: publish, round-trip proof, a11y P1s, image insertion, hero asset, agent instructions." --jq .number)
  fi
fi
echo "milestone #$ms"
for n in 243 245 246 247 248 249 261 270 271; do run gh issue edit "$n" --repo "$REPO" --milestone "$MS_TITLE"; done

echo "== C. P1 diet: demote 244,253,260,264 to P2 =="
for n in 244 253 260 264; do run gh issue edit "$n" --repo "$REPO" --remove-label P1 --add-label P2; done

echo "== D. Retitle #271 (AGENTS.md reality) =="
run gh issue edit 271 --repo "$REPO" --title "Maintain AGENTS.md agent instructions for the v2 custom-editor architecture"
run gh issue comment 271 --repo "$REPO" --body "Scope update after audit verification: CLAUDE.md and .specify/ are *deliberately git-ignored* (local-only AI config), which is why the audit could not find them on the remote — they were never phantom. Canonical agent instructions now live in committed AGENTS.md (the stale local v1 CLAUDE.md was replaced by a shim pointing at it). Remaining scope for this issue: (1) keep AGENTS.md accurate as architecture evolves; (2) cross-check docs/ARCHITECTURE.md for drift; (3) decide whether the local .specify/ constitution gets retired or rewritten — its 'no custom webviews' P1 rule is v1-era and must not be followed."

echo "== E. License gate on #264 (SPDX) and #265 (DCO) =="
lic=$(gh api "repos/$REPO/contents/package.json" --jq .content | base64 -d | grep -o '"license": *"[^"]*"' || true)
if echo "$lic" | grep -q AGPL; then
  body="Unblocked: the AGPL-3.0-only relicense is now on main ($lic). Safe for an agent to pick up."
else
  body="BLOCKED — do not implement yet: remote main still shows $lic. The MIT->AGPL-3.0-only relicense (decision record: docs/MARKET_POSITION_2026-06.md §7) is committed locally and must land on main first, or SPDX/DCO work will be built on the wrong license. Remove this block when the relicense commit is pushed."
fi
for n in 264 265; do run gh issue comment "$n" --repo "$REPO" --body "$body"; done

echo "== G. #267 scope fix: SECURITY.md already exists =="
run gh issue comment 267 --repo "$REPO" --body "Scope correction: SECURITY.md, .github/dependabot.yml and hardened workflows already exist (security-hardening commit dfafdfe, May 2026) — this issue wrongly asked to create SECURITY.md. Narrowed scope: (1) write docs/SECURITY_POSTURE.md with code-cited claims; (2) verify the existing SECURITY.md statements still hold; (3) link both from README."

echo "== F. Supersession of old issues =="
declare -a PAIRS=("204:243" "211:244" "214:261" "208:263" "209:263" "210:263")
for p in "${PAIRS[@]}"; do
  old="${p%%:*}"; new="${p##*:}"
  echo "---- review packet: #$old -> superseded by #$new ----"
  gh issue view "$old" --repo "$REPO" --json title,state,body --template '{{.state}} | {{.title}}
{{slice .body 0 400}}
' 2>/dev/null || echo "(could not fetch #$old)"
  if $CLOSE; then
    # 2026-06-11: maintainer already closed #204-#214 with supersession comments;
    # commenting/closing again would duplicate breadcrumbs and gh-close would fail.
    if [ "$(gh issue view "$old" --repo "$REPO" --json state --jq .state)" = "CLOSED" ]; then
      echo "#$old already closed — skipping comment+close"
      continue
    fi
    run gh issue comment "$old" --repo "$REPO" --body "Superseded by #$new in the June 2026 roadmap batch (sources: .github/issue-backlog/). If this issue contains context missing from #$new, please copy it across there."
    run gh issue close "$old" --repo "$REPO" --reason "not planned"
  else
    echo "(review only — rerun with --close-superseded to comment+close)"
  fi
done
echo "== #206 overlap (not a clean supersession): link only =="
# 2026-06-11: maintainer closed #206 with a supersession comment pointing at #266/#270,
# so the "keeping this open" comment below only applies if it is ever reopened.
if [ "$(gh issue view 206 --repo "$REPO" --json state --jq .state)" = "CLOSED" ]; then
  echo "#206 already closed upstream — skipping overlap comment"
else
  run gh issue comment 206 --repo "$REPO" --body "Partial overlap with the June 2026 batch: marketplace metadata/discoverability is now split across #266 (README/AGPL FAQ listing copy) and #270 (hero asset + README listing pass). Keeping this open until both land; close then if nothing unique remains."
fi
echo "== done =="
