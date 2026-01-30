#!/usr/bin/env bash
# sync_brain_skills.sh - Refresh the vendored Brain skills snapshot inside this repo.
#
# Why:
# - RovoDev cannot read files outside the workspace.
# - This project vendors Brain knowledge at ./skills/.
# - This script refreshes that snapshot.
#
# Usage:
#   bash workers/ralph/sync_brain_skills.sh --from-local /path/to/brain
#   bash workers/ralph/sync_brain_skills.sh --from-sibling    # uses ../brain if present
#   bash workers/ralph/sync_brain_skills.sh --from-repo        # clones/pulls BRAIN_REPO into ./brain_upstream
#   bash workers/ralph/sync_brain_skills.sh --dry-run
#
# Env:
#   BRAIN_REPO  (default: https://github.com/jonathanavis96/brain.git)
#   BRAIN_REF   (default: main)

set -euo pipefail

LOG_PREFIX="[sync_brain_skills]"

die() { echo "$LOG_PREFIX ERROR: $1" >&2; exit 1; }
info() { echo "$LOG_PREFIX $1"; }

DRY_RUN=false
MODE=""
LOCAL_PATH=""

BRAIN_REPO="${BRAIN_REPO:-https://github.com/jonathanavis96/brain.git}"
BRAIN_REF="${BRAIN_REF:-main}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    --from-local)
      MODE="local"
      LOCAL_PATH="${2:-}"
      shift 2
      ;;
    --from-sibling)
      MODE="sibling"
      shift
      ;;
    --from-repo)
      MODE="repo"
      shift
      ;;
    -h|--help)
      sed -n '1,120p' "$0"
      exit 0
      ;;
    *)
      die "Unknown arg: $1"
      ;;
  esac
done

if [[ -z "$MODE" ]]; then
  die "Choose one: --from-local PATH | --from-sibling | --from-repo"
fi

# Resolve repo root (script lives at workers/ralph/ in target projects)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

DEST="$ROOT/skills"

source_skills=""
upstream_dir="$ROOT/brain_upstream"

case "$MODE" in
  local)
    [[ -n "$LOCAL_PATH" ]] || die "--from-local requires a path"
    source_skills="$LOCAL_PATH/skills"
    ;;
  sibling)
    source_skills="$ROOT/../brain/skills"
    ;;
  repo)
    source_skills="$upstream_dir/skills"
    ;;
  *)
    die "Unhandled mode: $MODE"
    ;;
esac

if [[ "$MODE" == "repo" ]]; then
  if [[ "$DRY_RUN" == "true" ]]; then
    info "[DRY RUN] Would clone/pull $BRAIN_REPO (ref=$BRAIN_REF) into $upstream_dir"
  else
    if [[ -d "$upstream_dir/.git" ]]; then
      info "Updating upstream brain clone in $upstream_dir"
      git -C "$upstream_dir" fetch --quiet --all
      git -C "$upstream_dir" checkout --quiet "$BRAIN_REF"
      git -C "$upstream_dir" pull --quiet --ff-only
    else
      info "Cloning $BRAIN_REPO into $upstream_dir"
      rm -rf "$upstream_dir"
      git clone --quiet --depth 1 --branch "$BRAIN_REF" "$BRAIN_REPO" "$upstream_dir"
    fi
  fi
fi

if [[ ! -d "$source_skills" ]]; then
  die "Source skills directory not found: $source_skills"
fi

if [[ "$DRY_RUN" == "true" ]]; then
  info "[DRY RUN] Would refresh $DEST from $source_skills"
  exit 0
fi

info "Refreshing vendored brain skills: $DEST"
rm -rf "$DEST"
cp -R "$source_skills" "$DEST"
info "Done"
