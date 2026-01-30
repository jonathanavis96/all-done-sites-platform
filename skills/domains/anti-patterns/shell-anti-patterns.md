# Shell Anti-Patterns

<!-- covers: SC2034, SC2155, SC2086, SC2181, SC1091, SC2046, SC2006, SC2162 -->

> Common bash mistakes that break scripts, cause subtle bugs, or trigger ShellCheck warnings.

## Purpose

Learn from actual shell scripting failures encountered in the brain repository. Each anti-pattern includes the ShellCheck code, frequency assessment, real-world impact, and correct alternatives.

## Quick Reference

| Anti-Pattern | ShellCheck | Frequency | Severity | Why It Breaks |
|--------------|------------|-----------|----------|---------------|
| [Masked Exit Codes](#1-masked-exit-codes-sc2155) | SC2155 | ⚠️ Very High | 🔴 Critical | Hides command failures |
| [Unused Variables](#2-unused-variables-sc2034) | SC2034 | ⚠️ Very High | 🟡 Medium | Code clutter, possible bugs |
| [Unquoted Variables](#3-unquoted-variables-sc2086) | SC2086 | ⚠️ High | 🔴 Critical | Word splitting breaks paths |
| [Checking $? Directly](#4-checking--directly-sc2181) | SC2181 | 🟠 Medium | 🟡 Medium | Fragile, loses context |
| [Sourcing Non-Existent Files](#5-sourcing-non-existent-files-sc1091) | SC1091 | 🟠 Medium | 🟢 Low | False positive, disable OK |
| [Unquoted Command Substitution](#6-unquoted-command-substitution-sc2046) | SC2046 | 🟢 Low | 🔴 Critical | Word splitting explosions |
| [Using Backticks](#7-using-backticks-sc2006) | SC2006 | 🟢 Low | 🟡 Medium | Hard to nest, deprecated |
| [Missing read -r](#8-missing-read--r-sc2162) | SC2162 | 🟠 Medium | 🟡 Medium | Backslashes mangled |

**Legend:**

- Frequency: ⚠️ Very High (>20 fixes) \| 🟠 Medium (10-20) \| 🟢 Low (<10)
- Severity: 🔴 Critical (data loss/security) \| 🟡 Medium (bugs/warnings) \| 🟢 Low (style/minor)

---

## 1. Masked Exit Codes (SC2155)

**The #1 shell scripting bug** - combining `local`/`export`/`readonly` with command substitution masks the command's exit code.

### Context

- **Frequency:** ⚠️ **Very High** - Appears in 30-40% of shell scripts
- **Severity:** 🔴 **Critical** - Silent failures, errors go undetected
- **Detection:** `shellcheck` catches automatically, search for `local.*=$(` pattern

### The Problem

```bash
# ❌ ANTI-PATTERN: Exit code masked
local config=$(load_config_file)
echo $?  # Always 0, even if load_config_file failed!

# Why this happens:
# 1. load_config_file returns non-zero (failure)
# 2. But `local` succeeds (always returns 0)
# 3. $? reflects `local`, not load_config_file
# 4. Script continues with empty/invalid $config

# ❌ Also wrong with other declaration keywords
export PATH=$(build_custom_path)
readonly VERSION=$(get_version)
declare -r TIMESTAMP=$(date +%s)
```

### Why It's Bad

1. **Silent failures:** Commands fail but script continues
2. **Data corruption:** Empty variables propagate through script
3. **Hard to debug:** No error message, just wrong results
4. **Violates fail-fast:** Contradicts `set -e` philosophy

### Real-World Impact

```bash
# Example from brain repository fix
# Before (broken):
local branch=$(git rev-parse --abbrev-ref HEAD)
git push origin "$branch"  # Pushes to wrong branch if git rev-parse failed!

# After (fixed):
local branch
branch=$(git rev-parse --abbrev-ref HEAD) || {
    echo "Error: Failed to determine current branch" >&2
    return 1
}
git push origin "$branch"  # Safe - exits if branch unknown
```

### The Correct Pattern

```bash
# ✅ CORRECT: Separate declaration from assignment
local config
config=$(load_config_file) || {
    echo "Error: Failed to load config" >&2
    return 1
}

# ✅ CORRECT: For export
local path
path=$(build_custom_path) || return 1
export PATH="$path"

# ✅ CORRECT: For readonly
local version
version=$(get_version) || return 1
readonly version
```

### Quick Fix Template

```bash
# Pattern to find:  local VAR=$(command)
# Replace with:
local VAR
VAR=$(command) || { echo "Error: command failed" >&2; return 1; }
```

### Related Patterns

- See **[variable-patterns.md](../languages/shell/variable-patterns.md)** for detailed SC2155 patterns
- See **[strict-mode.md](../languages/shell/strict-mode.md)** for `set -e` interaction

---

## 2. Unused Variables (SC2034)

Variables assigned but never used indicate dead code, refactoring remnants, or potential bugs.

### Context

- **Frequency:** ⚠️ **Very High** - Common in copy-paste code
- **Severity:** 🟡 **Medium** - Not a bug itself, but signals problems
- **Detection:** `shellcheck script.sh | grep SC2034`

### The Problem

```bash
# ❌ ANTI-PATTERN: Variable assigned but never used
process_file() {
    local input_file="$1"
    local output_file="$2"
    local timestamp=$(date +%s)  # Never used!
    
    cat "$input_file" > "$output_file"
}

# Why this happens:
# 1. Copy-paste from another function
# 2. Refactored code, variable no longer needed
# 3. Planned feature never implemented
```

### Why It's Bad

1. **Code clutter:** Makes scripts harder to read
2. **Performance waste:** Unnecessary command execution
3. **Misleading intent:** Readers expect variable to be used
4. **Possible bug:** Maybe you MEANT to use it?

### Real-World Impact

```bash
# Example: Misleading unused variable
backup_database() {
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_dir="/var/backups"
    
    # BUG: Should have used $timestamp in filename!
    pg_dump mydb > "$backup_dir/backup.sql"  # Overwrites previous backup!
}

# Correct version:
backup_database() {
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_dir="/var/backups"
    
    pg_dump mydb > "$backup_dir/backup_${timestamp}.sql"
}
```

### The Correct Pattern

```bash
# ✅ CORRECT: Remove unused variables
process_file() {
    local input_file="$1"
    local output_file="$2"
    # Removed unused timestamp
    
    cat "$input_file" > "$output_file"
}

# ✅ CORRECT: If variable needed for debugging, guard it
process_file() {
    local input_file="$1"
    
    if [[ "${DEBUG:-}" == "1" ]]; then
        local timestamp=$(date +%s)
        echo "Debug: Processing at $timestamp" >&2
    fi
    
    cat "$input_file"
}

# ✅ CORRECT: Intentional unused (for external consumption)
export CHILD_VAR="value"  # Used by child process, not in this script
./child_script.sh
```

### Legitimate Exceptions

```bash
# 1. Read with discards (use _ for clarity)
while IFS=: read -r username _ uid _ _ homedir _; do
    echo "$username lives in $homedir"
done < /etc/passwd

# 2. Environment variables for child processes
export DEBUG_MODE=1
./run_tests.sh  # Uses DEBUG_MODE

# 3. Trap cleanup variables (set but used by trap)
cleanup_file="/tmp/cleanup_$$"
trap 'rm -f "$cleanup_file"' EXIT
```

### Quick Fix

```bash
# Find all SC2034 warnings:
shellcheck script.sh | grep SC2034

# For each one, either:
# 1. Remove the variable
# 2. Use it somewhere
# 3. Prefix with _ if intentionally unused: _debug_var="value"
```

### Related Patterns

- See **[variable-patterns.md](../languages/shell/variable-patterns.md)** for scoping patterns

---

## 3. Unquoted Variables (SC2086)

Unquoted variable expansion causes word splitting and globbing, breaking on spaces and special characters.

### Context

- **Frequency:** ⚠️ **High** - Very common in beginner scripts
- **Severity:** 🔴 **Critical** - Data loss, command injection, wrong files deleted
- **Detection:** `shellcheck` catches automatically, look for `$var` without quotes

### The Problem

```bash
# ❌ ANTI-PATTERN: Unquoted variables
file="my document.txt"
cat $file  # Expands to: cat my document.txt (2 arguments!)

dest="/tmp/backup dir"
cp $file $dest  # Expands to: cp my document.txt /tmp/backup dir (WRONG!)

# ❌ Dangerous with rm
files="file1.txt file2.txt"
rm $files  # OK if files exist, but...

files="*.txt"
rm $files  # DISASTER: Glob expansion deletes all .txt files!
```

### Why It's Bad

1. **File path breaking:** Spaces in filenames cause wrong files to be processed
2. **Glob expansion:** `*` `?` `[` characters trigger unexpected wildcard matching
3. **Command injection risk:** User input can inject additional commands
4. **Silent failures:** Wrong arguments may fail differently than expected

### Real-World Impact

```bash
# Example: Dangerous file deletion
backup_old_logs() {
    local log_pattern="*.log"
    local backup_dir="/var/backups"
    
    # ❌ WRONG: If backup_dir is unset, this becomes:
    mv $log_pattern $backup_dir
    # Expands to: mv file1.log file2.log file3.log
    # Result: file3.log overwritten with file2.log!
    
    # ✅ CORRECT:
    if [[ -z "$backup_dir" ]]; then
        echo "Error: backup_dir not set" >&2
        return 1
    fi
    mv *.log "$backup_dir/"  # Glob used intentionally, destination quoted
}
```

### The Correct Pattern

```bash
# ✅ CORRECT: Quote all variable expansions
file="my document.txt"
cat "$file"

dest="/tmp/backup dir"
cp "$file" "$dest"

# ✅ CORRECT: Quote even in [[ ]] for consistency
if [[ "$var" = "value" ]]; then

# ✅ CORRECT: Array expansion
files=("file1.txt" "file2.txt")
for f in "${files[@]}"; do
    echo "$f"
done
```

### When To Intentionally Not Quote

```bash
# Only skip quotes when you INTENTIONALLY want word splitting:

# Example: Passing multiple flags to a command
flags="-v -x -e"
set $flags  # Intentional: set positional parameters

# Better: Use arrays instead
flags=(-v -x -e)
set "${flags[@]}"
```

### Quick Fix Template

```bash
# Search for unquoted variables:
rg '\$[A-Za-z_][A-Za-z0-9_]*[^"]' script.sh

# Wrap each in quotes:
echo $var     → echo "$var"
cp $src $dst  → cp "$src" "$dst"
rm $files     → rm "$files"  # Or better: rm "${files[@]}" for array
```

### Related Patterns

- See **[variable-patterns.md](../languages/shell/variable-patterns.md)** for quoting rules
- See **[common-pitfalls.md](../languages/shell/common-pitfalls.md)** for word splitting details

---

## 4. Checking $? Directly (SC2181)

Testing `$?` immediately after a command is fragile and loses context. Test the command directly instead.

### Context

- **Frequency:** 🟠 **Medium** - Common in older scripts
- **Severity:** 🟡 **Medium** - Not wrong, just fragile and verbose
- **Detection:** `shellcheck` suggests better alternatives

### The Problem

```bash
# ❌ ANTI-PATTERN: Checking $? separately
some_command
if [[ $? -ne 0 ]]; then
    echo "Command failed"
    exit 1
fi

# Why it's fragile:
# 1. If you add ANY command between some_command and the check, $? changes
# 2. Easy to accidentally check wrong command's exit code
# 3. More verbose than direct testing
```

### Why It's Bad

```bash
# Example of fragility:
validate_input "$user_data"
echo "Validating..."  # Oops! Now $? is from echo, not validate_input
if [[ $? -ne 0 ]]; then
    # This never triggers, even if validate_input failed!
    exit 1
fi
```

### The Correct Pattern

```bash
# ✅ CORRECT: Test command directly
if ! some_command; then
    echo "Command failed"
    exit 1
fi

# ✅ CORRECT: With error message
if ! validate_input "$user_data"; then
    echo "Error: Invalid input" >&2
    exit 1
fi

# ✅ CORRECT: Continue on failure
command || echo "Warning: command failed, continuing"

# ✅ CORRECT: Chain multiple commands
command1 && command2 && command3 || {
    echo "Error in command chain" >&2
    exit 1
}
```

### Legitimate Uses of $?

```bash
# ✅ OK: When you need the specific exit code
some_command
exit_code=$?
if [[ $exit_code -eq 1 ]]; then
    echo "Specific error 1"
elif [[ $exit_code -eq 2 ]]; then
    echo "Specific error 2"
fi

# ✅ OK: When you run multiple commands before checking
result=$(complex_command)
lines=$(echo "$result" | wc -l)
if [[ $? -ne 0 ]]; then  # Checking wc, not complex_command
    echo "Failed to count lines"
fi
```

### Quick Fix Template

```bash
# Pattern to find:
command
if [[ $? -ne 0 ]]; then

# Replace with:
if ! command; then
```

### Related Patterns

- See **[strict-mode.md](../languages/shell/strict-mode.md)** for error handling patterns
- See **[common-pitfalls.md](../languages/shell/common-pitfalls.md)** for test constructs

---

## 5. Sourcing Non-Existent Files (SC1091)

ShellCheck warns when it can't follow `source` statements, but this is often a false positive.

### Context

- **Frequency:** 🟠 **Medium** - Common in scripts with dynamic paths
- **Severity:** 🟢 **Low** - Usually safe to disable
- **Detection:** `shellcheck` warns about files it can't statically verify

### The Problem

```bash
# ❌ ShellCheck warns here (SC1091):
source /etc/profile.d/custom.sh  # File may not exist on developer machine
source "${CONFIG_DIR}/settings.sh"  # Path constructed at runtime
source "$(find_config_file)"  # Dynamic path

# ShellCheck says: "Not following: file not found"
```

### Why It's Often a False Positive

1. **Different environments:** File exists in production but not dev machine
2. **Runtime paths:** Path constructed dynamically, ShellCheck can't follow
3. **Optional configs:** Script handles missing file gracefully

### The Correct Pattern

```bash
# ✅ CORRECT: Disable SC1091 when you've verified the source
# shellcheck disable=SC1091
source /etc/profile.d/custom.sh

# ✅ CORRECT: Check existence before sourcing
if [[ -f "${CONFIG_DIR}/settings.sh" ]]; then
    # shellcheck disable=SC1091
    source "${CONFIG_DIR}/settings.sh"
fi

# ✅ CORRECT: Handle missing file gracefully
# shellcheck disable=SC1091
source "$(find_config_file)" || {
    echo "Warning: Config file not found, using defaults" >&2
}
```

### When It's a Real Problem

```bash
# ❌ BAD: Typo in filename
source /etc/proflie.d/custom.sh  # Typo: "proflie" instead of "profile"

# ❌ BAD: Missing file with no fallback
source "${HOME}/.myconfig"  # Fails silently if file missing
do_something_that_needs_config  # Breaks because config not loaded
```

### Quick Fix Template

```bash
# For known-good sources, add disable comment:
# shellcheck disable=SC1091
source /path/to/file.sh

# For optional sources, check first:
if [[ -f /path/to/file.sh ]]; then
    # shellcheck disable=SC1091
    source /path/to/file.sh
fi
```

### Related Patterns

- See **[strict-mode.md](../languages/shell/strict-mode.md)** for error handling with sourced files

---

## 6. Unquoted Command Substitution (SC2046)

Unquoted `$(command)` causes word splitting on the command output, breaking on spaces.

### Context

- **Frequency:** 🟢 **Low** - Less common than SC2086, but severe
- **Severity:** 🔴 **Critical** - Can cause command explosion or data loss
- **Detection:** `shellcheck` catches automatically

### The Problem

```bash
# ❌ ANTI-PATTERN: Unquoted command substitution
rm $(find /tmp -name "*.tmp")

# If find returns: /tmp/my file.tmp
# Expands to: rm /tmp/my file.tmp (2 arguments!)
# Deletes: /tmp/my and file.tmp (WRONG!)

# ❌ Dangerous with multiple results
for file in $(ls *.txt); do  # Word splitting on each filename
    process "$file"  # Breaks if filenames have spaces
done
```

### Why It's Bad

1. **Word splitting:** Output split on spaces, tabs, newlines (IFS)
2. **Glob expansion:** `*` `?` in output trigger unwanted wildcards
3. **Command explosion:** 100 files → 100 arguments, exceeds command limits
4. **Security risk:** User-controlled output can inject commands

### Real-World Impact

```bash
# Example: Dangerous file processing
delete_temp_files() {
    # ❌ WRONG: Breaks on spaces in filenames
    rm $(find /tmp -name "*.tmp" -mtime +7)
    
    # If a malicious user created: /tmp/'; rm -rf / #.tmp
    # This becomes: rm /tmp/'; rm -rf / #.tmp
    # Result: Potential system deletion!
}

# ✅ CORRECT: Use quotes or array
delete_temp_files() {
    while IFS= read -r -d '' file; do
        rm "$file"
    done < <(find /tmp -name "*.tmp" -mtime +7 -print0)
}
```

### The Correct Pattern

```bash
# ✅ CORRECT: Quote command substitution
files=$(find /tmp -name "*.tmp")
echo "Found: $files"  # Quoted

# ✅ CORRECT: Use arrays for multiple items
mapfile -t files < <(find . -name "*.txt")
for file in "${files[@]}"; do
    echo "$file"
done

# ✅ CORRECT: Process line-by-line
while IFS= read -r line; do
    echo "$line"
done < <(some_command)

# ✅ CORRECT: Use find -exec
find /tmp -name "*.tmp" -exec rm {} +
```

### Quick Fix Template

```bash
# Find unquoted command substitution:
rg '\$\([^)]+\)(?!")' script.sh

# Fix by quoting:
rm $(find ...)     → rm "$(find ...)"  # Or better: find -exec
for f in $(ls ...) → mapfile -t arr < <(ls ...); for f in "${arr[@]}"
```

### Related Patterns

- See **[variable-patterns.md](../languages/shell/variable-patterns.md)** for array handling
- See **[common-pitfalls.md](../languages/shell/common-pitfalls.md)** for word splitting details

---

## 7. Using Backticks (SC2006)

Backticks (`` `command` ``) are deprecated in favor of `$(command)` for command substitution.

### Context

- **Frequency:** 🟢 **Low** - Mostly in legacy scripts
- **Severity:** 🟡 **Medium** - Works but hard to maintain
- **Detection:** `shellcheck` recommends `$(...)` instead

### The Problem

```bash
# ❌ ANTI-PATTERN: Backticks
result=`command`
nested=`echo \`date\``  # Nesting requires escaping

# Why it's bad:
# 1. Hard to nest (requires escaping)
# 2. Hard to read (looks like quotes)
# 3. Deprecated in favor of $(...)
```

### Why It's Bad

```bash
# Example: Nested backticks are ugly
# ❌ With backticks:
timestamp=`date +%Y%m%d_\`date +%H%M%S\``  # Ugly escaping

# ✅ With $(...):
timestamp=$(date +%Y%m%d_$(date +%H%M%S))  # Clean nesting
```

### The Correct Pattern

```bash
# ✅ CORRECT: Use $(command) instead
result=$(command)
nested=$(echo $(date))

# ✅ CORRECT: Nested substitution
timestamp=$(date +%Y%m%d_$(date +%H%M%S))

# ✅ CORRECT: Multi-line commands
config=$(
    echo "host=$hostname"
    echo "port=$port"
    echo "debug=$debug"
)
```

### Quick Fix Template

```bash
# Find all backticks:
rg '`[^`]+`' script.sh

# Replace with $(...):
`command`  → $(command)
```

### Related Patterns

- See **[common-pitfalls.md](../languages/shell/common-pitfalls.md)** for command substitution best practices

---

## 8. Missing read -r (SC2162)

Using `read` without `-r` flag interprets backslashes, mangling input data.

### Context

- **Frequency:** 🟠 **Medium** - Common in file processing loops
- **Severity:** 🟡 **Medium** - Data corruption on input with backslashes
- **Detection:** `shellcheck` warns automatically

### The Problem

```bash
# ❌ ANTI-PATTERN: read without -r
while read line; do
    echo "$line"
done < input.txt

# If input contains: path\to\file
# Output becomes: pathtofile (backslashes interpreted!)

# If input contains: line1\nline2
# Output becomes: line1
#                 line2 (newline interpreted!)
```

### Why It's Bad

1. **Data corruption:** Backslashes in input are interpreted as escape sequences
2. **Unexpected behavior:** `\n` becomes newline, `\t` becomes tab, etc.
3. **Loss of data:** Trailing backslashes disappear silently

### Real-World Impact

```bash
# Example: Processing Windows paths
# Input file contains: C:\Users\Alice\Documents\file.txt

# ❌ WRONG: Backslashes interpreted
while read line; do
    echo "$line"
done < paths.txt
# Output: C:UsersAliceDocumentsfile.txt (backslashes gone!)

# ✅ CORRECT: Use -r to preserve backslashes
while read -r line; do
    echo "$line"
done < paths.txt
# Output: C:\Users\Alice\Documents\file.txt (preserved!)
```

### The Correct Pattern

```bash
# ✅ CORRECT: Always use read -r
while read -r line; do
    echo "$line"
done < input.txt

# ✅ CORRECT: With IFS for field splitting
while IFS=: read -r username uid gid home shell; do
    echo "User: $username, Home: $home"
done < /etc/passwd

# ✅ CORRECT: Read into array
mapfile -t lines < input.txt
for line in "${lines[@]}"; do
    echo "$line"
done
```

### Quick Fix Template

```bash
# Find all read without -r:
rg 'while read [^-]' script.sh

# Add -r flag:
while read line     → while read -r line
while IFS=: read    → while IFS=: read -r
```

### Related Patterns

- See **[common-pitfalls.md](../languages/shell/common-pitfalls.md)** for read patterns
- See **[variable-patterns.md](../languages/shell/variable-patterns.md)** for IFS handling

---

## Detection Strategy

### Automated Detection

```bash
# Run shellcheck on all shell scripts
find . -name "*.sh" -exec shellcheck {} +

# Focus on high-severity issues
shellcheck --severity=warning script.sh

# Check specific codes
shellcheck script.sh | grep -E "SC2155|SC2034|SC2086"
```

### Prevention

1. **Enable shellcheck in editor:** Most IDEs support shellcheck integration
2. **Pre-commit hooks:** Run shellcheck before allowing commits
3. **CI/CD checks:** Fail builds on shellcheck warnings
4. **Code review:** Check for common anti-patterns manually

### Batch Fixes

```bash
# Find all scripts with SC2155
for script in **/*.sh; do
    if shellcheck "$script" | grep -q SC2155; then
        echo "Fix needed: $script"
    fi
done

# Find all scripts with unused variables
shellcheck **/*.sh | grep SC2034 | cut -d: -f1 | sort -u
```

## Related Skills

- **[variable-patterns.md](../languages/shell/variable-patterns.md)** - Correct variable declaration and scoping
- **[common-pitfalls.md](../languages/shell/common-pitfalls.md)** - General shell gotchas
- **[strict-mode.md](../languages/shell/strict-mode.md)** - Defensive scripting with set -euo pipefail
- **[cleanup-patterns.md](../languages/shell/cleanup-patterns.md)** - Resource management patterns
- **[fix-shellcheck-failures.md](../../playbooks/fix-shellcheck-failures.md)** - Systematic shellcheck resolution

## See Also

- **[Anti-Patterns README](README.md)** - Anti-patterns library overview and format guidelines
- **[ShellCheck Wiki](https://www.shellcheck.net/wiki/)** - Official documentation for all SC codes
- **[Bash Pitfalls](https://mywiki.wooledge.org/BashPitfalls)** - Comprehensive bash gotchas guide
