#!/usr/bin/env bash
# Fixes audit finding 2: backlog files cross-referenced each other as #001-#036;
# on GitHub they were created as #243-#278 (offset +242). Rewrites those tokens
# in the live issue bodies. Only matches '#0NN' (two digits, leading zero), so
# real refs like #204-#214 or microsoft/vscode#296639 are untouched.
# Usage: ./scripts/normalize-issue-refs.sh [--dry-run]
set -euo pipefail
REPO="bluecloud-dev/muninn-vscode"
OFFSET=242
DRY="${1:-}"
changed=0
for n in $(seq 243 278); do
  body="$(gh issue view "$n" --repo "$REPO" --json body --jq .body)"
  new="$(printf '%s' "$body" | perl -pe 's/#0(\d{2})\b/sprintf("#%d", $1 + 242)/ge')"
  if [ "$body" = "$new" ]; then continue; fi
  changed=$((changed+1))
  if [ "$DRY" = "--dry-run" ]; then
    echo "--- #$n would change these lines:"
    # diff exits 1 when files differ — the expected case here; don't let -e/pipefail kill the dry-run
    diff <(printf '%s\n' "$body") <(printf '%s\n' "$new") | grep '^[<>]' | head -8 || true
  else
    printf '%s' "$new" | gh issue edit "$n" --repo "$REPO" --body-file -
    echo "updated #$n"
  fi
done
echo "done; issues touched: $changed"
