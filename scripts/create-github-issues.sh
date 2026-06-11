#!/usr/bin/env bash
# Creates the Muninn issue backlog on GitHub from .github/issue-backlog/*.md
# Usage:   ./scripts/create-github-issues.sh [--dry-run]
# Needs:   gh CLI authenticated with repo scope (gh auth status)
set -euo pipefail

REPO="bluecloud-dev/muninn-vscode"
DIR="$(cd "$(dirname "$0")/.." && pwd)/.github/issue-backlog"
DRY="${1:-}"

# ---------- labels (idempotent) ----------
declare -a LABELS=(
  "needs-human|d73a4a|Requires human action (accounts, judgment, voice) - cannot be fully delegated to an AI agent"
  "ai-ready|0e8a16|Fully scoped for autonomous AI implementation - see issue body + repo conventions"
  "P1|b60205|Blocks GA / highest priority"
  "P2|fbca04|Important, post-P1"
  "P3|c5def5|Polish / opportunistic"
  "phase:now|1d76db|Alpha-exit / 2.0.0 GA scope"
  "phase:next|5319e7|Post-GA scope"
  "a11y|0052cc|Accessibility"
  "ux|d4c5f9|User experience / design"
  "feature|a2eeef|New capability"
  "testing|bfd4f2|Test infrastructure or coverage"
  "infra|ededed|CI, release, repo plumbing"
  "licensing|e4b429|AGPL / legal-adjacent (not legal advice)"
  "docs|0075ca|Documentation"
  "marketing|ff7619|Brand, content, outreach"
)

echo "==> Ensuring labels exist on $REPO"
for spec in "${LABELS[@]}"; do
  IFS='|' read -r name color desc <<<"$spec"
  if [ "$DRY" = "--dry-run" ]; then
    echo "  [dry-run] label: $name (#$color)"
  else
    gh label create "$name" --repo "$REPO" --color "$color" --description "$desc" --force >/dev/null
    echo "  ok: $name"
  fi
done

# ---------- issues ----------
CONV="$DIR/_conventions.md"
created=0; skipped=0

# existing titles, for idempotency
existing="$(gh issue list --repo "$REPO" --state all --limit 200 --json title --jq '.[].title' 2>/dev/null || true)"

for f in "$DIR"/[0-9]*.md; do
  title="$(sed -n 's/^title: //p' "$f" | head -1)"
  labels="$(sed -n 's/^labels: //p' "$f" | head -1)"
  if [ -z "$title" ] || [ -z "$labels" ]; then
    echo "  !! malformed front matter, skipping: $f" >&2; continue
  fi
  if printf '%s\n' "$existing" | grep -Fxq "$title"; then
    echo "  skip (exists): $title"; skipped=$((skipped+1)); continue
  fi

  body_file="$(mktemp)"
  # body = everything after the closing '---' of the front matter
  awk 'c==2{print} /^---$/{c++}' "$f" > "$body_file"
  # ai-ready issues get the shared conventions appended (self-contained for agents)
  case ",$labels," in *",ai-ready,"*) cat "$CONV" >> "$body_file";; esac

  if [ "$DRY" = "--dry-run" ]; then
    echo "  [dry-run] would create: $title  [$labels]  ($(wc -l < "$body_file") body lines)"
  else
    url="$(gh issue create --repo "$REPO" --title "$title" --label "$labels" --body-file "$body_file")"
    echo "  created: $url"
    created=$((created+1))
  fi
  rm -f "$body_file"
done

echo "==> Done. created=$created skipped=$skipped"
