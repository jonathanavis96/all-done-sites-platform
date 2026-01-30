# Variable Patterns

<!-- covers: SC2034, SC2155, SC2086, SC2004, SC2153, SC2154 -->

> Safe variable declaration, assignment, and scoping in bash.

## Quick Reference

| Issue | Anti-Pattern | Correct Pattern | Why It Matters |
|-------|--------------|-----------------|----------------|
| **SC2155** Masked exit codes | `local x=$(cmd)` | `local x; x=$(cmd)` | Assignment masks command failure |
| **SC2034** Unused variable | `local unused="val"` | Remove or use `_unused="val"` | Dead code, possible bug |
| **Subshell scope loss** | `cat f \| while read x; do count=$((count+1)); done` | `while read x; do ...; done < <(cat f)` | Variables set in pipe subshell are lost |
| **Unquoted expansion** | `echo $var` | `echo "$var"` | Word splitting breaks on spaces |
| **Optional variable** | `file=${CONFIG}` (fails if unset) | `file=${CONFIG:-default}` | Provide fallback value |
| **Required variable** | `path=$REQUIRED` (silent if unset) | `: ${REQUIRED:?error msg}` | Fail fast with clear error |
| **Export for child** | `VAR=x; ./child.sh` | `export VAR=x; ./child.sh` | Children don't inherit non-exported vars |
| **Array iteration** | `for x in ${arr[@]}` | `for x in "${arr[@]}"` | Unquoted breaks on whitespace |

**Quick Fixes:**

1. **SC2155 everywhere?** Search `local.*=$(` and split into two lines
2. **SC2034 cleanup:** Run `shellcheck script.sh \| grep SC2034`, remove or prefix with `_`
3. **Lost variable in loop?** Check for `| while read` - replace with `< <(command)` or `<<< "$(command)"`

## SC2155: Separate Declaration from Assignment

**The #1 most common shell bug** - masking command exit codes.

### The Problem

```bash
# ❌ Wrong - exit code of $(command) is masked by `local`
local output=$(some_command)
echo $?  # Always 0, even if some_command failed!

# ❌ Also wrong with export, readonly, declare
export PATH=$(build_path)
readonly CONFIG=$(load_config)
declare -r VALUE=$(compute_value)
```text

### The Solution

```bash
# ✅ Right - separate declaration from assignment
local output
output=$(some_command)

# ✅ Right - export/readonly after assignment
local path
path=$(build_path)
export PATH="$path"

# ✅ Right - readonly after
local config
config=$(load_config)
readonly config
```text

### Quick Pattern

```bash
# Template for any local variable from command
local varname
varname=$(command) || { echo "Failed" >&2; return 1; }
```text

## SC2034: Unused Variables

Variables assigned but never used clutter code and may indicate bugs.

### Finding Unused Variables

```bash
# Run shellcheck to find them
shellcheck -e SC2034 script.sh
```text

### Common Causes

1. **Refactored code** - variable was used, now isn't
2. **Copy-paste errors** - brought along unnecessary vars
3. **Premature optimization** - computed but never needed

### Exceptions (Legitimate Uses)

```bash
# 1. Read with unused parts (use _ for discards)
read -r used _ _ rest < <(command)

# 2. Environment variables for child processes
export DEBUG=1
child_script.sh

# 3. Variables for debugging (remove or guard)
if [[ "${VERBOSE:-}" == "1" ]]; then
    local debug_info="$1"
    echo "Debug: $debug_info"
fi
```text

## Variable Scoping

### Local Variables

```bash
# Always use local in functions
my_func() {
    local internal_var="value"  # Only exists in this function
    echo "$internal_var"
}
```text

### Subshell Scoping Trap

```bash
# ❌ Wrong - variable set in subshell, lost after
cat file.txt | while read -r line; do
    count=$((count + 1))  # This count is in subshell!
done
echo "$count"  # Still 0!

# ✅ Right - process substitution avoids subshell
while read -r line; do
    count=$((count + 1))
done < <(cat file.txt)
echo "$count"  # Correct value

# ✅ Also right - here-string for simple cases
while read -r line; do
    count=$((count + 1))
done <<< "$(cat file.txt)"
```text

### Exporting to Child Processes

```bash
# Variables are NOT inherited by child scripts unless exported
MY_VAR="value"
./child.sh  # Cannot see MY_VAR

export MY_VAR="value"
./child.sh  # Can see MY_VAR
```text

## Safe Defaults

```bash
# Use ${var:-default} for optional variables
echo "Using: ${CONFIG_FILE:-/etc/default.conf}"

# Use ${var:?error} for required variables
: "${REQUIRED_VAR:?Must set REQUIRED_VAR}"

# Difference between :- and -
unset var
echo "${var:-default}"   # "default" (unset or empty)
var=""
echo "${var:-default}"   # "default" (empty triggers default)
echo "${var-default}"    # "" (only unset triggers default)
```text

## Array Variables

```bash
# Declaration
local -a my_array=()

# Adding elements
my_array+=("element")

# Iterating (quote properly!)
for item in "${my_array[@]}"; do
    echo "$item"
done

# Length
echo "${#my_array[@]}"
```text

## Associative Arrays (bash 4+)

```bash
# Declaration (must use declare -A)
declare -A my_map

# Assignment
my_map["key"]="value"

# Access
echo "${my_map["key"]}"

# Check if key exists
if [[ -v my_map["key"] ]]; then
    echo "Key exists"
fi
```text

## Naming Conventions

```bash
# Constants: UPPER_SNAKE_CASE
readonly MAX_RETRIES=3
readonly CONFIG_PATH="/etc/myapp"

# Local variables: lower_snake_case  
local current_count=0
local file_path=""

# Loop variables: short, contextual
for f in *.txt; do
for i in {1..10}; do
for line in "${lines[@]}"; do
```text

## Related Playbooks

- **[Fix ShellCheck Failures](../../../playbooks/fix-shellcheck-failures.md)** - Systematic approach to resolving SC2034, SC2155, SC2086, and other shellcheck warnings

## See Also

- **[Strict Mode](strict-mode.md)** - How `set -euo pipefail` affects undefined variables
- **[Common Pitfalls](common-pitfalls.md)** - More ShellCheck patterns and best practices
- **[Cleanup Patterns](cleanup-patterns.md)** - Trap handlers and temp file management
- **[Shell README](README.md)** - Shell scripting overview and best practices
