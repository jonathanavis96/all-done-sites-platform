#!/bin/bash
# Ralph Task Monitor - Real-time display of IMPLEMENTATION_PLAN.md tasks
#
# Usage: bash current_ralph_tasks.sh [--hide-completed]
#
# Features:
#   - Auto-detects task formats (numbered, unnumbered, plain)
#   - Interactive hotkeys for task management
#   - Real-time file change monitoring
#   - Archive completed tasks with timestamps
#
# Supported Task Formats:
#   - [ ] **Task 1:** Description           (numbered)
#   - [ ] **Description text**              (unnumbered bold)
#   - [ ] Description text                  (plain)
#
# Interactive Hotkeys:
#   h - Toggle hide/show completed tasks
#   r - Reset/archive completed tasks to timestamped section
#   f - Force refresh display
#   c - Clear completed tasks (with confirmation)
#   ? - Show help screen
#   q - Quit cleanly

RALPH_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PLAN_FILE="$RALPH_DIR/../IMPLEMENTATION_PLAN.md"
THUNK_FILE="$RALPH_DIR/THUNK.md"
HIDE_COMPLETED=false

# ETA tracking arrays (session-only, no persistence)
declare -a TASK_TIMESTAMPS=()
declare -a TASK_DURATIONS=()
LAST_THUNK_COUNT=0
LAST_MODIFIED=""

# Completed task cache - stores hashes of completed task descriptions
# Key: hash of task description, Value: full task line
declare -A COMPLETED_CACHE

# Display state tracking removed - always do full redraw for simplicity and reliability

# Parse arguments
if [[ "$1" == "--hide-completed" ]]; then
  HIDE_COMPLETED=true
fi

# Check if IMPLEMENTATION_PLAN.md exists
if [[ ! -f "$PLAN_FILE" ]]; then
  echo "Error: IMPLEMENTATION_PLAN.md not found in $RALPH_DIR"
  exit 1
fi

# Function to get file modification time
get_file_mtime() {
  stat -c %Y "$PLAN_FILE" 2>/dev/null || stat -f %m "$PLAN_FILE" 2>/dev/null
}

# Function to generate short human-readable title from task description
# PERFORMANCE: Uses pure bash - no subprocess spawning (sed, cut, echo pipes)
generate_title() {
  local desc="$1"

  # Strip technical IDs (T1.1, P4A.7, 1.1, 2.3, etc.) from the beginning
  # Pattern: optional whitespace, **, optional T, alphanumeric with dots, **, whitespace
  if [[ "$desc" =~ ^[[:space:]]*\*\*[T]?[0-9A-Za-z]+(\.[0-9A-Za-z]+)*\*\*[[:space:]]*(.*) ]]; then
    desc="${BASH_REMATCH[2]}"
  fi

  # Strip markdown bold markers (replace ** with nothing)
  desc="${desc//\*\*/}"

  # Strip leading/trailing whitespace
  desc="${desc#"${desc%%[![:space:]]*}"}"
  desc="${desc%"${desc##*[![:space:]]}"}"

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
      elif [[ ${#rest} -gt 50 ]]; then
        rest="${rest:0:50}"
      fi
      # Remove trailing backticks and whitespace (bash builtins)
      rest="${rest%\`}"
      rest="${rest%"${rest##*[![:space:]]}"}"
      echo "$verb: $rest"
    else
      # For other verbs, take up to colon with space (title separator) or first 50 chars
      if [[ "$rest" =~ ^([^:]+):[[:space:]] ]]; then
        rest="${BASH_REMATCH[1]}"
      elif [[ ${#rest} -gt 50 ]]; then
        rest="${rest:0:50}"
      fi
      # Remove trailing backticks and whitespace (bash builtins)
      rest="${rest%\`}"
      rest="${rest%"${rest##*[![:space:]]}"}"
      echo "$verb $rest"
    fi
  else
    # Fallback: take first 60 chars or up to first colon/period
    if [[ "$desc" =~ ^([^:.]+)[:.] ]]; then
      desc="${BASH_REMATCH[1]}"
    elif [[ ${#desc} -gt 60 ]]; then
      desc="${desc:0:60}"
    fi
    # Remove trailing whitespace
    desc="${desc%"${desc##*[![:space:]]}"}"
    echo "$desc"
  fi
}

# Function to extract tasks from IMPLEMENTATION_PLAN.md
extract_tasks() {
  local show_completed=$1
  local current_section=""
  local in_task_section=false
  local task_counter=0
  local indent_level=0

  while IFS= read -r line; do
    # Detect Manual Review section - skip these tasks entirely
    local line_upper="${line^^}"
    if [[ "$line_upper" =~ ^###[[:space:]]*MANUAL[[:space:]]*REVIEW ]]; then
      in_task_section=false
      continue
    fi

    # Detect Archive sections - these terminate the current task section
    # IMPORTANT: Only treat *headings* as archive markers.
    # Do NOT trigger on bullet lines containing words like "Archived on ...".
    # Matches: "### Archive", "## Archive", "## Archived", or "## Era" (THUNK.md format)
    if [[ "$line" =~ ^###[[:space:]]*(Archive|Archived) ]] || \
       [[ "$line" =~ ^##[[:space:]]*(Archive|Archived) ]] || \
       [[ "$line" =~ ^##[[:space:]]+Era[[:space:]]+ ]]; then
      in_task_section=false
      continue
    fi

    # Detect Phase sections (## Phase X: Description)
    # Match patterns like "## Phase 0-A: ...", "## Phase 1: ...", etc.
    if [[ "$line" =~ ^##[[:space:]]+Phase[[:space:]]+([^:]+):[[:space:]]*(.*)$ ]]; then
      local phase_num="${BASH_REMATCH[1]}"
      local phase_desc="${BASH_REMATCH[2]}"
      current_section="Phase $phase_num: $phase_desc"
      in_task_section=true
      task_counter=0
      continue
    fi

    # Detect High/Medium/Low Priority sections (flexible matching)
    # Matches: "### High Priority", "### Phase 1: Desc (High Priority)", "### 🔴 HIGH PRIORITY: Desc"
    # Case-insensitive matching via converting to uppercase for comparison
    if [[ "$line_upper" =~ HIGH[[:space:]]*PRIORITY ]]; then
      current_section="High Priority"
      in_task_section=true
      task_counter=0
    elif [[ "$line_upper" =~ MEDIUM[[:space:]]*PRIORITY ]]; then
      current_section="Medium Priority"
      in_task_section=true
      task_counter=0
    elif [[ "$line_upper" =~ LOW[[:space:]]*PRIORITY ]]; then
      current_section="Low Priority"
      in_task_section=true
      task_counter=0
    elif [[ "$line" =~ ^##[[:space:]]+ ]] && [[ ! "$line" =~ ^##[[:space:]]+Phase[[:space:]]+ ]]; then
      # Exit task section on ## headers that are NOT Phase sections or Priority sections
      # This allows ### and #### subsection headers to remain within the current section
      in_task_section=false
    fi

    # Only process tasks in valid sections
    if [[ "$in_task_section" == "true" ]]; then
      local status="" task_desc="" is_subtask=false

      # Detect indentation level (count leading spaces)
      if [[ "$line" =~ ^([[:space:]]*)-[[:space:]]\[([ x])\][[:space:]]*(.*)$ ]]; then
        local leading_spaces="${BASH_REMATCH[1]}"
        status="${BASH_REMATCH[2]}"
        task_desc="${BASH_REMATCH[3]}"

        # Skip manual review tasks (only those explicitly in "Manual Review" section)
        # WARN tasks are automated and should be included

        # Calculate indent level (2 spaces = 1 level, 4 spaces = 2 levels, etc.)
        indent_level=$((${#leading_spaces} / 2))

        # Determine if this is a subtask (indented)
        if [[ $indent_level -gt 0 ]]; then
          is_subtask=true
        else
          # Main task - increment counter
          ((task_counter++))
        fi
      fi

      # If we found a task, process it
      if [[ -n "$status" && -n "$task_desc" ]]; then
        # For completed tasks, check cache first
        if [[ "$status" == "x" ]]; then
          # PERFORMANCE: Use line directly as cache key - no subprocess spawning
          # The full line is unique enough (includes section context via line number)
          local cache_key="$line"

          # If cached, return cached value
          if [[ -n "${COMPLETED_CACHE[$cache_key]}" ]]; then
            # Skip completed tasks if --hide-completed is set
            if [[ "$show_completed" == "false" ]]; then
              continue
            fi
            echo "${COMPLETED_CACHE[$cache_key]}"
            continue
          fi

          # Not cached - process and cache it
          local short_title
          short_title=$(generate_title "$task_desc")
          local task_label=""
          if [[ "$is_subtask" == "true" ]]; then
            task_label="subtask"
          else
            task_label="Task $task_counter"
          fi

          local output_line="✓|$current_section|$task_label|$short_title|$indent_level|completed|$task_desc"
          COMPLETED_CACHE[$cache_key]="$output_line"

          # Skip completed tasks if --hide-completed is set
          if [[ "$show_completed" == "false" ]]; then
            continue
          fi

          echo "$output_line"
        else
          # Pending task - always process (no caching)
          local short_title
          short_title=$(generate_title "$task_desc")
          local task_label=""
          if [[ "$is_subtask" == "true" ]]; then
            task_label="subtask"
          else
            task_label="Task $task_counter"
          fi

          # Use current indicator (▶) for first pending task, pending indicator (○) for others
          echo "pending|$current_section|$task_label|$short_title|$indent_level|pending|$task_desc"
        fi
      fi
    fi
  done <"$PLAN_FILE"
}

# Function to show help
show_help() {
  clear
  echo "╔════════════════════════════════════════════════════════════════╗"
  echo "║              CURRENT RALPH TASKS - HELP                        ║"
  echo "╚════════════════════════════════════════════════════════════════╝"
  echo ""
  echo "  HOTKEYS:"
  echo ""
  echo "  [h]  Hide/Show Completed Tasks"
  echo "       Toggle visibility of completed tasks without modifying the file"
  echo ""
  echo "  [r]  Reset/Archive Completed Tasks"
  echo "       Move all completed tasks to an Archive section at the bottom"
  echo "       Creates: ### Archive - YYYY-MM-DD HH:MM"
  echo ""
  echo "  [f]  Force Refresh"
  echo "       Manually refresh the display (auto-refreshes on file changes)"
  echo ""
  echo "  [c]  Clear Completed Tasks"
  echo "       Permanently remove all completed tasks (with confirmation)"
  echo "       WARNING: This action cannot be undone!"
  echo ""
  echo "  [?]  Show This Help"
  echo "       Display this help screen"
  echo ""
  echo "  [q]  Quit"
  echo "       Exit the task monitor cleanly"
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  echo "  Press any key to return to task monitor..."
  read -r -n 1 -s
}

# Function to archive completed tasks
archive_completed_tasks() {
  local timestamp
  timestamp=$(date "+%Y-%m-%d %H:%M")
  local temp_file="${PLAN_FILE}.tmp"
  local archive_section="### Archive - $timestamp"
  local completed_tasks=""
  local in_task_section=false

  # Extract completed tasks
  while IFS= read -r line; do
    if [[ "$line" =~ High[[:space:]]+Priority ]] && [[ ! "$line" =~ ARCHIVE|Archive ]]; then
      in_task_section=true
    elif [[ "$line" =~ Medium[[:space:]]+Priority ]] && [[ ! "$line" =~ ARCHIVE|Archive ]]; then
      in_task_section=true
    elif [[ "$line" =~ Low[[:space:]]+Priority ]] && [[ ! "$line" =~ ARCHIVE|Archive ]]; then
      in_task_section=true
    elif [[ "$line" =~ ^###[[:space:]]+ ]]; then
      in_task_section=false
    fi

    if [[ "$in_task_section" == "true" && "$line" =~ ^[[:space:]]*-[[:space:]]\[x\] ]]; then
      completed_tasks+="$line"$'\n'
    fi
  done <"$PLAN_FILE"

  if [[ -z "$completed_tasks" ]]; then
    echo ""
    echo "  No completed tasks to archive."
    sleep 2
    return
  fi

  # Write new file without completed tasks, add archive at end
  {
    while IFS= read -r line; do
      if [[ "$line" =~ High[[:space:]]+Priority ]] && [[ ! "$line" =~ ARCHIVE|Archive ]]; then
        in_task_section=true
      elif [[ "$line" =~ Medium[[:space:]]+Priority ]] && [[ ! "$line" =~ ARCHIVE|Archive ]]; then
        in_task_section=true
      elif [[ "$line" =~ Low[[:space:]]+Priority ]] && [[ ! "$line" =~ ARCHIVE|Archive ]]; then
        in_task_section=true
      elif [[ "$line" =~ ^###[[:space:]]+ ]]; then
        in_task_section=false
      fi

      # Skip completed tasks in active sections
      if [[ "$in_task_section" == "true" && "$line" =~ ^[[:space:]]*-[[:space:]]\[x\] ]]; then
        continue
      fi

      echo "$line"
    done <"$PLAN_FILE"

    # Add archive section
    echo ""
    echo "$archive_section"
    echo ""
    echo "$completed_tasks"
  } >"$temp_file"

  # Atomic replace
  mv "$temp_file" "$PLAN_FILE"
  echo ""
  echo "  ✓ Archived completed tasks to: $archive_section"
  sleep 2
}

# Function to clear completed tasks
clear_completed_tasks() {
  echo ""
  echo -n "  ⚠️  Clear all completed tasks permanently? [y/N]: "
  read -n 1 -r confirm
  echo ""

  if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
    echo "  Cancelled."
    sleep 1
    return
  fi

  local temp_file="${PLAN_FILE}.tmp"
  local in_task_section=false

  # Write new file without completed tasks
  {
    while IFS= read -r line; do
      # Detect Archive sections - these terminate the current task section
      # Matches: "### Archive", "## Archive", or "## Era" (THUNK.md format)
      local line_upper="${line^^}"
      if [[ "$line_upper" =~ ARCHIVE ]] || [[ "$line" =~ ^##[[:space:]]+Era[[:space:]]+ ]]; then
        in_task_section=false
      fi

      # Detect Phase sections (## Phase X: Description)
      if [[ "$line" =~ ^##[[:space:]]+Phase[[:space:]]+[^:]+:[[:space:]]* ]]; then
        in_task_section=true
      elif [[ "$line" =~ High[[:space:]]+Priority ]]; then
        in_task_section=true
      elif [[ "$line" =~ Medium[[:space:]]+Priority ]]; then
        in_task_section=true
      elif [[ "$line" =~ Low[[:space:]]+Priority ]]; then
        in_task_section=true
      elif [[ "$line" =~ ^##[[:space:]]+ ]] && [[ ! "$line" =~ ^##[[:space:]]+Phase[[:space:]]+ ]]; then
        # Exit task section on ## headers that are NOT Phase sections
        in_task_section=false
      fi

      # Skip completed tasks in active sections
      if [[ "$in_task_section" == "true" && "$line" =~ ^[[:space:]]*-[[:space:]]\[x\] ]]; then
        continue
      fi

      echo "$line"
    done <"$PLAN_FILE"
  } >"$temp_file"

  # Atomic replace
  mv "$temp_file" "$PLAN_FILE"
  echo "  ✓ Cleared all completed tasks."
  sleep 2
}

# Function to display tasks with formatting
display_tasks() {
  # Always do full redraw - simple and reliable
  clear

  # Extract and group tasks by section
  local tasks
  if [[ "$HIDE_COMPLETED" == "true" ]]; then
    tasks=$(extract_tasks "false")
  else
    tasks=$(extract_tasks "true")
  fi

  # Build display content
  local pending_count=0
  local completed_count=0
  local first_pending_seen=false

  # Header
  echo "╔════════════════════════════════════════════════════════════════╗"
  echo "║          CURRENT RALPH TASKS - $(date +%H:%M:%S)                  ║"
  echo "╚════════════════════════════════════════════════════════════════╝"
  echo ""

  if [[ -z "$tasks" ]]; then
    echo "  No tasks found in IMPLEMENTATION_PLAN.md"
    echo ""
  else
    local current_section=""

    while IFS='|' read -r _ section task_label short_title indent_level status full_desc; do
      # Print section header when it changes
      if [[ "$section" != "$current_section" ]]; then
        if [[ -n "$current_section" ]]; then
          echo ""
        fi
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo "  $section"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        current_section="$section"
      fi

      # Calculate base indent (2 spaces per level)
      local base_indent=""
      for ((i = 0; i < indent_level; i++)); do
        base_indent="  ${base_indent}"
      done

      # Determine what to display: use full description for warnings, short title otherwise
      local display_text="$short_title"

      # Check if this is a warning task (WARN.* in full description)
      if [[ "$full_desc" =~ WARN\.[A-Z0-9]+ ]]; then
        # For warnings, use the full description for better context
        display_text="$full_desc"
      fi

      # Format task display with human-friendly title
      local display_line=""
      if [[ "$task_label" == "subtask" ]]; then
        # Subtask: just show the display text with bullet
        display_line="${base_indent}  • ${display_text}"
      else
        # Main task: show "Task N — <display text>" with bold
        if [[ -t 1 ]]; then
          # Terminal supports formatting
          display_line="${base_indent}  \033[1m${task_label}\033[0m — ${display_text}"
        else
          # No terminal formatting
          display_line="${base_indent}  ${task_label} — ${display_text}"
        fi
      fi

      # Build task line with color and appropriate symbol
      local task_line=""
      if [[ "$status" == "completed" ]]; then
        if [[ -t 1 ]]; then
          task_line="  \033[32m✓\033[0m ${display_line:2}"
        else
          task_line="  ✓ ${display_line:2}"
        fi
        ((completed_count++))
      else
        # Pending task: use ▶ for first pending, ○ for others
        local symbol="○"
        if [[ "$first_pending_seen" == "false" ]]; then
          symbol="▶"
          first_pending_seen=true
        fi

        if [[ -t 1 ]]; then
          task_line="  \033[33m${symbol}\033[0m ${display_line:2}"
        else
          task_line="  ${symbol} ${display_line:2}"
        fi
        ((pending_count++))
      fi

      # Display task line
      echo -e "$task_line"

      # Add empty line after each task for readability
      echo ""
    done <<<"$tasks"
  fi

  # Footer with stats and progress bar
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "  Completed: $completed_count | Pending: $pending_count | Total: $((completed_count + pending_count))"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""

  # Calculate progress percentage
  local total=$((completed_count + pending_count))
  local percentage=0
  if [[ $total -gt 0 ]]; then
    percentage=$(((completed_count * 100) / total))
  fi

  # Progress bar (64 chars wide total: "  Progress: XX% [" = 18 chars, "] N/Total" varies)
  # Calculate bar width: 64 - 18 - length("] N/Total") = available for bar
  local fraction_text="] $completed_count/$total"
  local bar_width=$((64 - 18 - ${#fraction_text}))

  # Calculate filled and empty blocks
  local filled=$(((bar_width * completed_count) / (total > 0 ? total : 1)))
  local empty=$((bar_width - filled))

  # Build the bar
  local bar=""
  for ((i = 0; i < filled; i++)); do bar="${bar}█"; done
  for ((i = 0; i < empty; i++)); do bar="${bar}░"; done

  # Display progress bar
  printf "  Progress: %3d%% [%s%s\n" "$percentage" "$bar" "$fraction_text"

  # Display ETA
  if [[ $pending_count -eq 0 ]]; then
    echo "  ETA: Complete"
  else
    calculate_eta "$pending_count"
  fi
  echo ""

  # Hotkey legend
  echo "╔════════════════════════════════════════════════════════════════╗"
  echo "║  HOTKEYS: [h] Hide/Show Done  [r] Reset/Archive  [f] Refresh  ║"
  echo "║           [c] Clear Done      [?] Help           [q] Quit     ║"
  echo "╚════════════════════════════════════════════════════════════════╝"
  echo ""

  if [[ "$HIDE_COMPLETED" == "true" ]]; then
    echo "  Mode: Hiding completed tasks (press 'h' to show)"
  fi
}

# Function to count THUNK entries
count_thunk_entries() {
  if [[ ! -f "$THUNK_FILE" ]]; then
    echo "0"
    return
  fi

  # Count lines that match THUNK table rows (| number | ... |)
  grep -cE '^\|[[:space:]]*[0-9]+[[:space:]]*\|' "$THUNK_FILE" | grep -v "THUNK #"
}

# Function to calculate and display ETA
calculate_eta() {
  local remaining_tasks="$1"

  # If no duration data yet, show placeholder
  if [[ ${#TASK_DURATIONS[@]} -eq 0 ]]; then
    echo "  ETA: --:--:-- (gathering data...)"
    return
  fi

  # Calculate average task duration
  local total_duration=0
  for duration in "${TASK_DURATIONS[@]}"; do
    total_duration=$((total_duration + duration))
  done

  local avg_duration=$((total_duration / ${#TASK_DURATIONS[@]}))
  local eta_seconds=$((avg_duration * remaining_tasks))

  # Convert seconds to HH:MM:SS
  local hours=$((eta_seconds / 3600))
  local minutes=$(((eta_seconds % 3600) / 60))
  local seconds=$((eta_seconds % 60))

  printf "  ETA: %02d:%02d:%02d (%d task avg: %ds)\n" "$hours" "$minutes" "$seconds" "${#TASK_DURATIONS[@]}" "$avg_duration"
}

# Function to update THUNK timestamp tracking
update_thunk_tracking() {
  local current_count
  current_count=$(count_thunk_entries)

  # If count increased, record timestamp and calculate duration
  if [[ $current_count -gt $LAST_THUNK_COUNT ]]; then
    local current_time
    current_time=$(date +%s)

    # If this is not the first entry, calculate duration from last timestamp
    if [[ ${#TASK_TIMESTAMPS[@]} -gt 0 ]]; then
      local last_timestamp="${TASK_TIMESTAMPS[-1]}"
      local duration=$((current_time - last_timestamp))

      # Only add duration if it's reasonable (30 seconds to 1 hour)
      # This filters out anomalies like manual edits or long pauses
      if [[ $duration -ge 30 && $duration -le 3600 ]]; then
        TASK_DURATIONS+=("$duration")
      fi
    fi

    # Record current timestamp
    TASK_TIMESTAMPS+=("$current_time")
    LAST_THUNK_COUNT=$current_count
  fi
}

# Main loop - interactive with file watching
echo "Starting Ralph Task Monitor..."
echo "Watching: $PLAN_FILE"
echo "Interactive mode - press '?' for help"
echo ""

# Display tasks immediately on start
display_tasks

# Get initial modification time
LAST_MODIFIED=$(get_file_mtime)

# Initialize THUNK tracking
LAST_THUNK_COUNT=$(count_thunk_entries)
if [[ $LAST_THUNK_COUNT -gt 0 ]]; then
  # Record initial timestamp
  TASK_TIMESTAMPS+=("$(date +%s)")
fi

# Track THUNK file modification time for change detection
LAST_THUNK_MODIFIED=$(get_file_mtime "$THUNK_FILE" 2>/dev/null || echo "0")

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
  echo "Exiting Ralph Task Monitor..."
  exit 0
}

trap cleanup EXIT INT TERM

# Monitor for file changes and hotkeys
while true; do
  # Check for hotkey input (non-blocking)
  if read -r -t 0.1 -n 1 -r key 2>/dev/null; then
    case "$key" in
      h | H)
        # Toggle hide completed
        if [[ "$HIDE_COMPLETED" == "true" ]]; then
          HIDE_COMPLETED=false
        else
          HIDE_COMPLETED=true
        fi
        display_tasks
        ;;
      r | R)
        # Archive completed tasks
        archive_completed_tasks
        LAST_MODIFIED=$(get_file_mtime)
        display_tasks
        ;;
      f | F)
        # Force refresh
        display_tasks
        ;;
      c | C)
        # Clear completed tasks
        clear_completed_tasks
        LAST_MODIFIED=$(get_file_mtime)
        display_tasks
        ;;
      \?)
        # Show help
        show_help
        display_tasks
        ;;
      q | Q)
        # Quit
        cleanup
        ;;
    esac
  fi

  # Check for file changes
  CURRENT_MODIFIED=$(get_file_mtime)
  if [[ "$CURRENT_MODIFIED" != "$LAST_MODIFIED" ]]; then
    LAST_MODIFIED="$CURRENT_MODIFIED"
    display_tasks
  fi

  # Check for THUNK file changes (for ETA tracking)
  if [[ -f "$THUNK_FILE" ]]; then
    CURRENT_THUNK_MODIFIED=$(get_file_mtime "$THUNK_FILE")
    if [[ "$CURRENT_THUNK_MODIFIED" != "$LAST_THUNK_MODIFIED" ]]; then
      LAST_THUNK_MODIFIED="$CURRENT_THUNK_MODIFIED"
      update_thunk_tracking
      display_tasks
    fi
  fi

  # Small sleep to prevent CPU spinning
  sleep 0.5
done
