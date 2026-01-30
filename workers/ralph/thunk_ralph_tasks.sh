#!/bin/bash
# Thunk Ralph Tasks Monitor - Persistent completion log display
#
# Usage: bash thunk_ralph_tasks.sh
#
# Features:
#   - Displays completed tasks from THUNK.md (Ralph appends when marking tasks complete)
#   - Groups tasks by Era
#   - Interactive hotkeys for management
#   - Display-only monitor (does not modify files)
#
# Hotkeys:
#   r - Refresh/Clear display (re-read THUNK.md, clear terminal)
#   e - New era (prompt for era name, add new section)
#   q - Quit cleanly

RALPH_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
THUNK_FILE="$RALPH_DIR/THUNK.md"
LAST_THUNK_MODIFIED=""
LAST_CONTENT_ROW=0
LAST_TOTAL_COUNT=0

# Check if required files exist
if [[ ! -f "$THUNK_FILE" ]]; then
  echo "Error: THUNK.md not found in $RALPH_DIR"
  echo "Please create THUNK.md first (see THOUGHTS.md for template)"
  exit 1
fi

# Function to get file modification time
get_file_mtime() {
  local file="$1"
  stat -c %Y "$file" 2>/dev/null || stat -f %m "$file" 2>/dev/null
}

# Function to generate short human-readable title from task description
generate_title() {
  local desc="$1"

  # Strip technical IDs (T1.1, P4A.7, 1.1, 2.3, etc.) from the beginning - use bash parameter expansion
  desc="${desc#"${desc%%[![:space:]]*}"}" # Trim leading whitespace
  if [[ "$desc" =~ ^\*\*[T]?[0-9A-Za-z]+(\.[0-9A-Za-z]+)*\*\*[[:space:]]* ]]; then
    desc="${desc#*\*\* }" # Remove up to and including "** "
  fi

  # Strip markdown bold markers - use bash parameter expansion
  desc="${desc//\*\*/}"

  # Extract action verb and main object (look for common action verbs)
  if [[ "$desc" =~ ^(Rename|Update|Create|Verify|Delete|Add|Remove|Test|Implement|Fix|Refactor|Document|Migrate|Copy|Set|Run|If)([[:space:]]*:[[:space:]]*|[[:space:]]+)(.+)$ ]]; then
    local verb="${BASH_REMATCH[1]}"
    local separator="${BASH_REMATCH[2]}"
    local rest="${BASH_REMATCH[3]}"

    # For "Test:" prefix, include the object being tested
    if [[ "$verb" == "Test" ]] && [[ "$separator" =~ : ]]; then
      # Take up to arrow, period, or first 50 chars
      if [[ "$rest" =~ ^([^.→]+)[.→] ]]; then
        rest="${BASH_REMATCH[1]}"
      else
        rest="${rest:0:50}" # Use bash substring instead of cut
      fi
      # Remove trailing whitespace and backticks - use bash parameter expansion
      rest="${rest%\`}"
      rest="${rest%"${rest##*[![:space:]]}"}" # Trim trailing whitespace
      echo "$verb: $rest"
    else
      # For other verbs, take up to colon with space (title separator) or first 50 chars
      if [[ "$rest" =~ ^([^:]+):[[:space:]] ]]; then
        rest="${BASH_REMATCH[1]}"
      else
        rest="${rest:0:50}" # Use bash substring instead of cut
      fi
      # Remove trailing whitespace and backticks - use bash parameter expansion
      rest="${rest%\`}"
      rest="${rest%"${rest##*[![:space:]]}"}" # Trim trailing whitespace
      echo "$verb $rest"
    fi
  else
    # Fallback: take first 60 chars or up to first colon
    if [[ "$desc" =~ ^([^:.]+)[:.] ]]; then
      echo "${BASH_REMATCH[1]}"
    else
      local result="${desc:0:60}"                   # Use bash substring instead of cut
      result="${result%"${result##*[![:space:]]}"}" # Trim trailing whitespace
      echo "$result"
    fi
  fi
}

# Function to get next THUNK number
get_next_thunk_number() {
  local max_num=0

  # Parse THUNK.md for highest THUNK number using regex
  while IFS= read -r line; do
    if [[ "$line" =~ ^\|[[:space:]]*([0-9]+)[[:space:]]*\| ]]; then
      local thunk_num="${BASH_REMATCH[1]}"
      if [[ $thunk_num -gt $max_num ]]; then
        max_num=$thunk_num
      fi
    fi
  done < <(grep -E '^\|[[:space:]]*[0-9]+[[:space:]]*\|' "$THUNK_FILE")

  echo $((max_num + 1))
}

# Function to display THUNK.md contents (full refresh)
display_thunks() {
  clear

  # Header
  echo "╔════════════════════════════════════════════════════════════════╗"
  echo "║          THUNK RALPH TASKS - $(date +%H:%M:%S)                     ║"
  echo "╚════════════════════════════════════════════════════════════════╝"
  echo ""

  local current_era=""
  local total_count=0
  local display_row=4 # Track row position (starting after header)

  while IFS= read -r line; do
    # Detect Era headers
    if [[ "$line" =~ ^##[[:space:]]+Era:[[:space:]]+(.+)$ ]]; then
      current_era="${BASH_REMATCH[1]}"
      echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
      ((display_row++))
      echo "  Era: $current_era"
      ((display_row++))
    elif [[ "$line" =~ ^Started:[[:space:]]+(.+)$ ]]; then
      echo "  Started: ${BASH_REMATCH[1]}"
      ((display_row++))
      echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
      ((display_row++))
    elif [[ "$line" =~ ^\|[[:space:]]*([0-9]+)[[:space:]]*\|[[:space:]]*([^|]+)[[:space:]]*\|[[:space:]]*([^|]+)[[:space:]]*\|[[:space:]]*([^|]+)[[:space:]]*\|[[:space:]]*([^|]+)[[:space:]]*\|$ ]]; then
      # Parse table row
      local thunk_num="${BASH_REMATCH[1]}"
      local orig_num="${BASH_REMATCH[2]}"
      local priority="${BASH_REMATCH[3]}"
      local description="${BASH_REMATCH[4]}"
      local completed="${BASH_REMATCH[5]}"

      # Strip whitespace using bash parameter expansion (faster than xargs)
      thunk_num="${thunk_num#"${thunk_num%%[![:space:]]*}"}" # Trim leading
      thunk_num="${thunk_num%"${thunk_num##*[![:space:]]}"}" # Trim trailing
      orig_num="${orig_num#"${orig_num%%[![:space:]]*}"}"
      orig_num="${orig_num%"${orig_num##*[![:space:]]}"}"
      priority="${priority#"${priority%%[![:space:]]*}"}"
      priority="${priority%"${priority##*[![:space:]]}"}"
      description="${description#"${description%%[![:space:]]*}"}"
      description="${description%"${description##*[![:space:]]}"}"
      completed="${completed#"${completed%%[![:space:]]*}"}"
      completed="${completed%"${completed##*[![:space:]]}"}"

      # Skip header row
      if [[ "$thunk_num" =~ ^[0-9]+$ ]]; then
        # Generate human-friendly short title
        local short_title
        short_title=$(generate_title "$description")

        # Format as "THUNK N — <short title>" with bold if terminal supports
        if [[ -t 1 ]]; then
          echo -e "  \033[32m✓\033[0m \033[1mTHUNK #$thunk_num\033[0m — $short_title"
        else
          echo "  ✓ THUNK #$thunk_num — $short_title"
        fi
        ((total_count++))
        ((display_row++))
      fi
    fi
  done <"$THUNK_FILE"

  if [[ $total_count -eq 0 ]]; then
    echo "  No completed tasks yet."
    ((display_row++))
    echo ""
    ((display_row++))
  fi

  # Store content row BEFORE footer (for incremental updates)
  LAST_CONTENT_ROW=$display_row

  # Footer
  echo ""
  ((display_row++))
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  ((display_row++))
  echo "  Total Thunked: $total_count"
  ((display_row++))
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  ((display_row++))
  echo ""
  ((display_row++))

  # Hotkey legend
  echo "╔════════════════════════════════════════════════════════════════╗"
  ((display_row++))
  echo "║  HOTKEYS: [r] Refresh/Clear   [e] New Era   [q] Quit         ║"
  ((display_row++))
  echo "╚════════════════════════════════════════════════════════════════╝"
  ((display_row++))
  echo ""
  ((display_row++))

  # Store last display row and total count for incremental updates
  LAST_TOTAL_COUNT=$total_count
}

# Function to parse only new entries from THUNK.md (tail-only parsing)
# Args: $1 = start_line (line number to start reading from)
# Appends new entries to display and updates footer
parse_new_thunk_entries() {
  local start_line="$1"
  local line_num=0
  local new_count=0

  # LAST_CONTENT_ROW tracks the row after the last THUNK entry (before footer)
  # Footer structure is 9 lines:
  #   blank (1) + separator (1) + total (1) + separator (1) + blank (1) +
  #   hotkey top (1) + hotkey text (1) + hotkey bottom (1) + blank (1)
  local append_row=$LAST_CONTENT_ROW

  while IFS= read -r line; do
    ((line_num++))

    # Skip lines before start_line
    if [[ $line_num -le $start_line ]]; then
      continue
    fi

    # Parse table rows only (skip headers, era markers, etc.)
    if [[ "$line" =~ ^\|[[:space:]]*([0-9]+)[[:space:]]*\|[[:space:]]*([^|]+)[[:space:]]*\|[[:space:]]*([^|]+)[[:space:]]*\|[[:space:]]*([^|]+)[[:space:]]*\|[[:space:]]*([^|]+)[[:space:]]*\|$ ]]; then
      # Parse table row
      local thunk_num="${BASH_REMATCH[1]}"
      local orig_num="${BASH_REMATCH[2]}"
      local priority="${BASH_REMATCH[3]}"
      local description="${BASH_REMATCH[4]}"
      local completed="${BASH_REMATCH[5]}"

      # Strip whitespace using bash parameter expansion (faster than xargs)
      thunk_num="${thunk_num#"${thunk_num%%[![:space:]]*}"}" # Trim leading
      thunk_num="${thunk_num%"${thunk_num##*[![:space:]]}"}" # Trim trailing
      orig_num="${orig_num#"${orig_num%%[![:space:]]*}"}"
      orig_num="${orig_num%"${orig_num##*[![:space:]]}"}"
      priority="${priority#"${priority%%[![:space:]]*}"}"
      priority="${priority%"${priority##*[![:space:]]}"}"
      description="${description#"${description%%[![:space:]]*}"}"
      description="${description%"${description##*[![:space:]]}"}"
      completed="${completed#"${completed%%[![:space:]]*}"}"
      completed="${completed%"${completed##*[![:space:]]}"}"

      # Skip header row
      if [[ "$thunk_num" =~ ^[0-9]+$ ]]; then
        # Generate human-friendly short title
        local short_title
        short_title=$(generate_title "$description")

        # Position cursor and append new entry (clear line first)
        if [[ -t 1 ]]; then
          tput cup $append_row 0
          tput el # Clear to end of line
          echo -e "  \033[32m✓\033[0m \033[1mTHUNK #$thunk_num\033[0m — $short_title"
        else
          echo "  ✓ THUNK #$thunk_num — $short_title"
        fi

        ((new_count++))
        ((append_row++))
      fi
    fi
  done <"$THUNK_FILE"

  # Only redraw footer if we added new entries
  if [[ $new_count -eq 0 ]]; then
    return
  fi

  # Update the total count
  local new_total=$((LAST_TOTAL_COUNT + new_count))

  # Redraw complete footer starting at append_row
  # Footer row is where we insert the blank line before separator
  local footer_start=$append_row

  if [[ -t 1 ]]; then
    # BUGFIX: Clear the OLD footer lines (9 lines starting at old LAST_CONTENT_ROW)
    # before redrawing at new position to prevent ghost footer artifacts
    # Save the old position BEFORE updating LAST_CONTENT_ROW
    local old_footer_row=$LAST_CONTENT_ROW

    # Update LAST_CONTENT_ROW to new position BEFORE clearing old footer
    LAST_CONTENT_ROW=$append_row

    for ((i = 0; i < 9; i++)); do
      tput cup $((old_footer_row + i)) 0
      tput el # Clear entire line
    done

    # Clear everything from footer_start to end of screen to remove old footer
    tput cup $footer_start 0
    tput ed # Clear from cursor to end of display

    # Now draw the footer cleanly
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "  Total Thunked: $new_total"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "╔════════════════════════════════════════════════════════════════╗"
    echo "║  HOTKEYS: [r] Refresh/Clear   [e] New Era   [q] Quit         ║"
    echo "╚════════════════════════════════════════════════════════════════╝"
    echo ""
  else
    # Non-TTY fallback: DO NOT append footer on incremental updates
    # Footer only gets printed during full refresh (display_thunks)
    # This prevents duplication in non-TTY environments
    : # No-op - skip footer in non-TTY mode for incremental updates
  fi

  # Update stored state (LAST_CONTENT_ROW already updated above before clearing)
  LAST_TOTAL_COUNT=$new_total
}

# Function to create new era
create_new_era() {
  clear
  echo "╔════════════════════════════════════════════════════════════════╗"
  echo "║                    CREATE NEW ERA                              ║"
  echo "╚════════════════════════════════════════════════════════════════╝"
  echo ""
  echo -n "  Enter new era name: "
  read -r era_name

  if [[ -z "$era_name" ]]; then
    echo "  Cancelled - no name provided."
    sleep 2
    return
  fi

  local timestamp
  timestamp=$(date "+%Y-%m-%d")

  # Append new era section to THUNK.md
  cat >>"$THUNK_FILE" <<EOF # Era: write operation for new era creation

## Era: $era_name
Started: $timestamp

| THUNK # | Original # | Priority | Description | Completed |
|---------|------------|----------|-------------|-----------|

EOF

  echo ""
  echo "  ✓ Created new era: $era_name"
  sleep 2
}

# Main loop
echo "Starting Thunk Ralph Tasks Monitor..."
echo "Watching: $THUNK_FILE"
echo ""

# Display thunks immediately
display_thunks

# Get initial modification times and line count
LAST_THUNK_MODIFIED=$(get_file_mtime "$THUNK_FILE")
LAST_LINE_COUNT=$(wc -l <"$THUNK_FILE" 2>/dev/null || echo "0")

# Enable non-blocking input
if [[ -t 0 ]]; then
  stty -echo -icanon time 0 min 0
fi

# Cleanup function
cleanup() {
  if [[ -t 0 ]]; then
    stty sane
  fi
  echo ""
  echo "Exiting Thunk Ralph Tasks Monitor..."
  exit 0
}

trap cleanup EXIT INT TERM

# Monitor loop
while true; do
  # Check for hotkey input
  if read -r -t 0.1 -n 1 key 2>/dev/null; then
    case "$key" in
      r | R)
        # Refresh/Clear
        display_thunks
        LAST_THUNK_MODIFIED=$(get_file_mtime "$THUNK_FILE")
        LAST_LINE_COUNT=$(wc -l <"$THUNK_FILE" 2>/dev/null || echo "0")
        ;;
      e | E)
        # New era
        create_new_era
        LAST_THUNK_MODIFIED=$(get_file_mtime "$THUNK_FILE")
        LAST_LINE_COUNT=$(wc -l <"$THUNK_FILE" 2>/dev/null || echo "0")
        display_thunks
        ;;
      q | Q)
        # Quit
        cleanup
        ;;
    esac
  fi

  # Check for file changes
  CURRENT_THUNK_MODIFIED=$(get_file_mtime "$THUNK_FILE")

  if [[ "$CURRENT_THUNK_MODIFIED" != "$LAST_THUNK_MODIFIED" ]]; then
    LAST_THUNK_MODIFIED="$CURRENT_THUNK_MODIFIED"

    # Check line count to determine update strategy
    CURRENT_LINE_COUNT=$(wc -l <"$THUNK_FILE" 2>/dev/null || echo "0")

    if [[ "$CURRENT_LINE_COUNT" -lt "$LAST_LINE_COUNT" ]]; then
      # Line count decreased - full refresh needed (rare case: deletions)
      display_thunks
    elif [[ "$CURRENT_LINE_COUNT" -gt "$LAST_LINE_COUNT" ]]; then
      # Line count increased - only new lines added (common case: append-only)
      # Use tail-only parsing for efficiency
      parse_new_thunk_entries "$LAST_LINE_COUNT"
    else
      # Same line count - content modified (edits)
      display_thunks
    fi

    LAST_LINE_COUNT="$CURRENT_LINE_COUNT"
  fi

  # Small sleep to prevent CPU spinning
  sleep 0.5
done
