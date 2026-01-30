#!/usr/bin/env bash
# validate_links.sh - Validate internal markdown links resolve to existing files
#
# Usage:
#   bash tools/validate_links.sh [--fix-dry-run] [path/to/dir/or/file.md]
#
# Exit codes:
#   0 - All links valid
#   1 - Broken links found
#   2 - Invalid arguments

set -euo pipefail

# Configuration
BRAIN_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BROKEN_LINKS=0
TOTAL_LINKS=0
VERBOSE="${VERBOSE:-0}"

# Paths to ignore when scanning for markdown files
# (vendored deps, virtualenvs, caches)
IGNORE_FIND_PATHS=(
  "*/node_modules/*"
  "*/.venv/*"
  "*/.git/*"
  "*/.ruff_cache/*"
)

# Files that intentionally contain placeholder links.
# We skip validating links inside these files entirely.
IGNORE_FILE_BASENAMES=(
  "PLAYBOOK_TEMPLATE.md"
  "SKILL_TEMPLATE.md"
)

should_skip_file() {
  local file="$1"
  local base
  base="$(basename "$file")"

  for ignored in "${IGNORE_FILE_BASENAMES[@]}"; do
    if [[ "$base" == "$ignored" ]]; then
      return 0
    fi
  done

  return 1
}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

usage() {
  cat <<EOF
Usage: $(basename "$0") [OPTIONS] [PATH]

Validate internal markdown links resolve to existing files.

OPTIONS:
    -h, --help          Show this help message
    -v, --verbose       Show all checked links (not just broken ones)
    --fix-dry-run       Show suggested fixes without modifying files (not implemented)

ARGUMENTS:
    PATH                File or directory to check (default: entire repository)

EXAMPLES:
    # Check all markdown files
    $(basename "$0")

    # Check specific directory
    $(basename "$0") skills/

    # Check single file
    $(basename "$0") README.md

EXIT CODES:
    0 - All links valid
    1 - Broken links found
    2 - Invalid arguments
EOF
}

log_info() {
  echo -e "${GREEN}[INFO]${NC} $*" >&2
}

log_warn() {
  echo -e "${YELLOW}[WARN]${NC} $*" >&2
}

log_error() {
  echo -e "${RED}[ERROR]${NC} $*" >&2
}

# Extract markdown links from a file
# Returns: source_file|line_num|link_text|link_target
extract_links() {
  local file="$1"
  local line_num=0
  local in_code_fence=0

  while IFS= read -r line; do
    ((line_num++)) || true

    # Toggle code fence state on lines that start a fenced block.
    # We intentionally skip validating links inside code fences because they are
    # commonly examples/snippets.
    if [[ "$line" =~ ^[[:space:]]*\`\`\` ]]; then
      if [[ "$in_code_fence" -eq 0 ]]; then
        in_code_fence=1
      else
        in_code_fence=0
      fi
      continue
    fi

    if [[ "$in_code_fence" -eq 1 ]]; then
      continue
    fi

    # Match markdown links: [text](target)
    # Handles: [text](file.md), [text](../file.md), [text](dir/file.md#anchor)
    while [[ "$line" =~ \[([^\]]+)\]\(([^\)]+)\) ]]; do
      local link_text="${BASH_REMATCH[1]}"
      local link_target="${BASH_REMATCH[2]}"

      # Only process internal markdown links (skip URLs, anchors-only)
      # Match .md files (with or without anchor), but skip HTTP/HTTPS URLs
      if [[ "$link_target" == *.md ]] || [[ "$link_target" == *.md#* ]]; then
        if [[ ! "$link_target" =~ ^https?: ]]; then
          echo "$file|$line_num|$link_text|$link_target"
        fi
      fi

      # Remove matched portion to find next link on same line
      line="${line#*\]\("$link_target"\)}"
    done
  done <"$file"
}

# Validate a single link target
# Args: source_file link_target
# Returns: 0 if valid, 1 if broken
validate_link() {
  local source_file="$1"
  local link_target="$2"

  # Strip anchor if present (everything after #)
  local target_path="${link_target%%#*}"

  # Resolve relative path from source file's directory
  local source_dir
  source_dir="$(dirname "$source_file")"

  local resolved_path
  if [[ "$target_path" = /* ]]; then
    # Absolute path from repo root
    resolved_path="${BRAIN_ROOT}${target_path}"
  else
    # Relative path from source file
    resolved_path="${source_dir}/${target_path}"
  fi

  # Normalize path (resolve .., ., etc.)
  resolved_path="$(cd "${source_dir}" && realpath -m --relative-to="$BRAIN_ROOT" "$target_path" 2>/dev/null || echo "$resolved_path")"
  resolved_path="${BRAIN_ROOT}/${resolved_path}"

  # Check if target exists
  if [[ -f "$resolved_path" ]]; then
    return 0
  else
    return 1
  fi
}

# Check all links in a file
check_file() {
  local file="$1"
  local file_broken=0

  if should_skip_file "$file"; then
    if [[ "$VERBOSE" == "1" ]]; then
      log_info "Skipping placeholder file: $file"
    fi
    return 0
  fi

  while IFS='|' read -r source_file line_num link_text link_target; do
    ((TOTAL_LINKS++)) || true

    if validate_link "$source_file" "$link_target"; then
      if [[ "$VERBOSE" == "1" ]]; then
        log_info "$source_file:$line_num: ✓ [$link_text]($link_target)"
      fi
    else
      log_error "$source_file:$line_num: ✗ [$link_text]($link_target) - target not found"
      ((BROKEN_LINKS++)) || true
      ((file_broken++)) || true
    fi
  done < <(extract_links "$file")

  return "$file_broken"
}

# Main validation logic
main() {
  local target_path="$BRAIN_ROOT"

  # Parse arguments
  while [[ $# -gt 0 ]]; do
    case "$1" in
      -h | --help)
        usage
        exit 0
        ;;
      -v | --verbose)
        VERBOSE=1
        shift
        ;;
      --fix-dry-run)
        log_warn "--fix-dry-run not yet implemented"
        shift
        ;;
      -*)
        log_error "Unknown option: $1"
        usage
        exit 2
        ;;
      *)
        target_path="$1"
        # Convert to absolute path
        if [[ ! "$target_path" = /* ]]; then
          target_path="${BRAIN_ROOT}/${target_path}"
        fi
        shift
        ;;
    esac
  done

  # Validate target path exists
  if [[ ! -e "$target_path" ]]; then
    log_error "Path not found: $target_path"
    exit 2
  fi

  log_info "Validating markdown links in: $target_path"

  # Find all markdown files
  local files
  if [[ -f "$target_path" ]]; then
    files=("$target_path")
  else
    # Exclude vendored/cached directories
    local find_args=("$target_path")
    for pat in "${IGNORE_FIND_PATHS[@]}"; do
      find_args+=( -path "$pat" -prune -o )
    done
    find_args+=( -name "*.md" -type f -print )

    mapfile -t files < <(find "${find_args[@]}")
  fi

  log_info "Found ${#files[@]} markdown file(s)"

  # Check each file
  for file in "${files[@]}"; do
    check_file "$file" || true
  done

  # Summary
  echo ""
  log_info "====== Summary ======"
  log_info "Total links checked: $TOTAL_LINKS"

  if [[ "$BROKEN_LINKS" -eq 0 ]]; then
    log_info "All links valid! ✓"
    exit 0
  else
    log_error "Broken links found: $BROKEN_LINKS ✗"
    exit 1
  fi
}

main "$@"
