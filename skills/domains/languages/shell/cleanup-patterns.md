# Cleanup Patterns

<!-- covers: SC2064, SC2317 -->

> Proper resource cleanup, temp files, and state restoration in bash.

## Trap Basics

Traps ensure cleanup runs even when scripts exit unexpectedly.

### The Standard Pattern

```bash
#!/usr/bin/env bash
set -euo pipefail

cleanup() {
    local exit_code=$?
    # Cleanup logic here
    rm -f "${TEMP_FILE:-}"
    exit "$exit_code"  # Preserve original exit code
}
trap cleanup EXIT
```text

### Trap Signals

| Signal | When Triggered |
|--------|----------------|
| `EXIT` | Always on exit (normal or error) |
| `ERR` | On command failure (with `set -e`) |
| `INT` | Ctrl+C |
| `TERM` | kill command |

```bash
# Multiple signals
trap cleanup EXIT INT TERM
```text

## Temporary Files

### Safe Creation

```bash
# ✅ Right - mktemp creates secure temp file
TEMP_FILE=$(mktemp)

# ✅ With template
TEMP_FILE=$(mktemp /tmp/myapp.XXXXXX)

# ✅ Temp directory
TEMP_DIR=$(mktemp -d)
```text

### Always Clean Up

```bash
#!/usr/bin/env bash
set -euo pipefail

TEMP_FILE=""
TEMP_DIR=""

cleanup() {
    local exit_code=$?
    [[ -f "${TEMP_FILE:-}" ]] && rm -f "$TEMP_FILE"
    [[ -d "${TEMP_DIR:-}" ]] && rm -rf "$TEMP_DIR"
    exit "$exit_code"
}
trap cleanup EXIT

TEMP_FILE=$(mktemp)
TEMP_DIR=$(mktemp -d)

# Use temp resources...
echo "data" > "$TEMP_FILE"
```text

### Common Mistakes

```bash
# ❌ Wrong - no cleanup if script fails
TEMP_FILE=$(mktemp)
# ... script fails here ...
rm "$TEMP_FILE"  # Never runs!

# ❌ Wrong - using /tmp directly without mktemp
TEMP_FILE="/tmp/myfile.txt"  # Race condition, insecure

# ❌ Wrong - cleanup before variable set
cleanup() { rm -f "$TEMP_FILE"; }
trap cleanup EXIT
TEMP_FILE=$(mktemp)  # If this fails, cleanup uses empty var
```text

## State Restoration

### Shell Options (shopt)

```bash
# ❌ Wrong - changes global state, doesn't restore
shopt -s nullglob
for f in *.txt; do  # Works differently now
    echo "$f"
done
# nullglob still enabled for rest of script!

# ✅ Right - save and restore
local old_nullglob
old_nullglob=$(shopt -p nullglob) || true
shopt -s nullglob

for f in *.txt; do
    echo "$f"
done

eval "$old_nullglob"  # Restore original state
```text

### Directory Changes

```bash
# ❌ Wrong - changes global directory
cd /some/path
do_work
cd -  # Fragile, may fail

# ✅ Right - subshell isolates directory change
(
    cd /some/path
    do_work
)  # Automatically back to original dir

# ✅ Also right - explicit save/restore
local original_dir
original_dir=$(pwd)
cd /some/path
do_work
cd "$original_dir"
```text

### Environment Variables

```bash
# Save and restore
local old_path="$PATH"
export PATH="/custom/path:$PATH"
run_command
export PATH="$old_path"

# Or use subshell
(
    export PATH="/custom/path:$PATH"
    run_command
)  # PATH restored automatically
```text

## Complex Cleanup

### Multiple Resources

```bash
#!/usr/bin/env bash
set -euo pipefail

# Track resources to clean
declare -a TEMP_FILES=()
declare -a TEMP_DIRS=()
LOCK_FILE=""

cleanup() {
    local exit_code=$?
    
    # Remove temp files
    for f in "${TEMP_FILES[@]:-}"; do
        [[ -f "$f" ]] && rm -f "$f"
    done
    
    # Remove temp dirs
    for d in "${TEMP_DIRS[@]:-}"; do
        [[ -d "$d" ]] && rm -rf "$d"
    done
    
    # Release lock
    [[ -f "${LOCK_FILE:-}" ]] && rm -f "$LOCK_FILE"
    
    exit "$exit_code"
}
trap cleanup EXIT

# Helper to create tracked temp file
make_temp_file() {
    local f
    f=$(mktemp)
    TEMP_FILES+=("$f")
    echo "$f"
}
```text

### Cleanup with Error Info

```bash
cleanup() {
    local exit_code=$?
    local line_no="${1:-unknown}"
    
    if [[ $exit_code -ne 0 ]]; then
        echo "Error on line $line_no, exit code $exit_code" >&2
    fi
    
    # Cleanup resources...
    rm -f "${TEMP_FILE:-}"
    
    exit "$exit_code"
}
trap 'cleanup $LINENO' EXIT ERR
```text

## Lock Files

```bash
#!/usr/bin/env bash
set -euo pipefail

LOCK_FILE="/tmp/myapp.lock"

cleanup() {
    rm -f "$LOCK_FILE"
}
trap cleanup EXIT

# Acquire lock
if ! (set -o noclobber; echo $$ > "$LOCK_FILE") 2>/dev/null; then
    echo "Script already running (PID: $(cat "$LOCK_FILE"))" >&2
    exit 1
fi

# ... script logic ...
```text

## Background Process Cleanup

```bash
#!/usr/bin/env bash
set -euo pipefail

BACKGROUND_PID=""

cleanup() {
    local exit_code=$?
    if [[ -n "${BACKGROUND_PID:-}" ]]; then
        kill "$BACKGROUND_PID" 2>/dev/null || true
        wait "$BACKGROUND_PID" 2>/dev/null || true
    fi
    exit "$exit_code"
}
trap cleanup EXIT

# Start background process
some_daemon &
BACKGROUND_PID=$!

# ... do work ...

# Clean shutdown
kill "$BACKGROUND_PID"
wait "$BACKGROUND_PID"
BACKGROUND_PID=""  # Clear so cleanup doesn't double-kill
```text

## Related

- [strict-mode.md](./strict-mode.md) - How `-e` affects trap behavior
- [variable-patterns.md](./variable-patterns.md) - Safe variable initialization
