# Strict Mode Patterns

<!-- covers: SC2155, SC2181, SC2320 -->

> Essential safety settings for bash scripts that catch errors early.

## 🚨 Quick Reference

| Situation | Pattern | Why |
|-----------|---------|-----|
| **Every script** | `set -euo pipefail` | Exit on error, undefined vars, pipe failures |
| **Optional vars** | `${VAR:-}` or `${VAR:-default}` | Avoid `-u` errors when checking if set |
| **Commands that may fail** | `cmd \|\| true` or `if ! cmd; then` | Prevent `-e` from exiting script |
| **Check command exists** | `command -v jq >/dev/null` | Use `command -v`, not `which` |
| **Local assignment** | `local var; var=$(cmd)` | Separate declare/assign to catch failures |
| **Subshell handling** | `if ! (cd /dir && cmd); then` | Explicitly check subshell exit code |

**Common Fixes:**

- Split `local var=$(cmd)` into two lines (SC2155)
- Add `|| true` to grep/commands that may return non-zero
- Use `${VAR:-}` when checking if variable is set

---

## The Standard Header

Every bash script should start with:

```bash
#!/usr/bin/env bash
set -euo pipefail
```text

### What Each Option Does

| Option | Effect | Catches |
|--------|--------|---------|
| `-e` | Exit on error | Failing commands that weren't checked |
| `-u` | Error on undefined variables | Typos, unset vars |
| `-o pipefail` | Pipe fails if any command fails | Hidden failures in pipes |

## When to Disable Strict Mode

Sometimes you need to temporarily relax strict mode:

### Checking if Variables Are Set

```bash
# ❌ Wrong - fails with -u
if [[ -z "$OPTIONAL_VAR" ]]; then

# ✅ Right - safe default
if [[ -z "${OPTIONAL_VAR:-}" ]]; then
```text

### Commands That May Fail

```bash
# ❌ Wrong - exits script if grep finds nothing
count=$(grep -c "pattern" file.txt)

# ✅ Right - capture exit code
count=$(grep -c "pattern" file.txt) || true

# ✅ Also right - explicit handling
if ! count=$(grep -c "pattern" file.txt 2>/dev/null); then
    count=0
fi
```text

### Checking Command Existence

```bash
# ❌ Wrong - exits if command not found
if which jq >/dev/null 2>&1; then

# ✅ Right - command -v doesn't fail with -e
if command -v jq >/dev/null 2>&1; then
```text

## Extended Debugging

For development/debugging, add:

```bash
set -euo pipefail
# Uncomment for debugging:
# set -x  # Print each command before execution
```text

## Function-Level Error Handling

```bash
# Functions inherit errexit in bash 4.4+
# For older bash, be explicit:
my_function() {
    local result
    if ! result=$(some_command); then
        echo "Error: command failed" >&2
        return 1
    fi
    echo "$result"
}
```text

## Common Pitfalls

### The `local` Trap

```bash
# ❌ Wrong - masks exit code
my_func() {
    local output=$(failing_command)  # Exit code lost!
}

# ✅ Right - separate declaration
my_func() {
    local output
    output=$(failing_command)  # Now -e catches failure
}
```text

See [variable-patterns.md](./variable-patterns.md) for detailed coverage.

### Subshell Exit Codes

```bash
# ❌ Wrong - subshell exit code ignored
(
    cd /some/dir
    failing_command
)
echo "This still runs!"

# ✅ Right - check explicitly
if ! (cd /some/dir && failing_command); then
    echo "Subshell failed" >&2
    exit 1
fi
```text

## Script Template

```bash
#!/usr/bin/env bash
#
# script-name.sh - Brief description
#
# Usage: script-name.sh [options] <args>
#

set -euo pipefail

# Constants
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly SCRIPT_NAME="$(basename "$0")"

# Main logic
main() {
    # Your code here
    :
}

main "$@"
```text

## Related Playbooks

- [Fix ShellCheck Failures](../../../playbooks/fix-shellcheck-failures.md) - Systematic approach to resolving SC2155, SC2181, SC2320, and other shellcheck warnings

## Related Skills

- [variable-patterns.md](./variable-patterns.md) - Variable declaration patterns
- [cleanup-patterns.md](./cleanup-patterns.md) - Proper cleanup with traps
- [common-pitfalls.md](./common-pitfalls.md) - ShellCheck errors to avoid
