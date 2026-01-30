# Shell/Bash Project Validation Patterns

<!-- covers: SC1091, SC2148, SC2039 -->

## Overview

Validation patterns for bash/shell script projects. Most Ralph templates assume npm/TypeScript projects, but shell scripts require different validation approaches.

## When to Use

- Bootstrapping a new bash/shell script project with Ralph
- Setting up CI/CD for shell automation tools
- Creating VALIDATION_CRITERIA.md for shell-heavy repositories
- Configuring pre-commit hooks for shell projects

## Quick Reference

| Check Type | Command | What It Catches |
|------------|---------|-----------------|
| **Syntax** | `bash -n script.sh` | Parse errors, syntax mistakes |
| **Linting** | `shellcheck script.sh` | Common pitfalls, best practices violations |
| **Permissions** | `find . -name "*.sh" ! -perm -u+x` | Missing executable bits on scripts |
| **JSON validation** | `jq empty config.json` | Malformed JSON configs |
| **Security** | `grep -r "password\|secret\|token" --include="*.sh"` | Hardcoded credentials |
| **Dependencies** | `command -v required_tool` | Missing required binaries |

## Validation Patterns

### 1. Syntax Validation

```bash
# Single file
bash -n script.sh

# All shell scripts in project
find . -name "*.sh" -exec bash -n {} \; -print

# Exit on first error
for script in *.sh; do
  bash -n "$script" || exit 1
done
```text

**What it catches:**

- Unclosed quotes, brackets, braces
- Invalid syntax (typos in keywords)
- Mismatched control structures (if/fi, case/esac)

### 2. Static Analysis (ShellCheck)

```bash
# Basic check
shellcheck script.sh

# Exclude specific warnings (e.g., SC1091 for sourced files)
shellcheck -e SC1091 script.sh

# All scripts with consistent exclusions
find . -name "*.sh" -exec shellcheck -e SC1091 {} \;

# Batch check with error counting
shellcheck *.sh 2>&1 | grep -c "error:" || echo "All checks passed"
```text

**Common exclusions:**

- `SC1091` - Can't follow sourced files (when you intentionally source from paths)
- `SC2086` - Unquoted variable (when you need word splitting)
- `SC2155` - Declare and assign separately (when you prefer combined syntax)

**What it catches:**

- Unused variables (SC2034)
- Unquoted expansions (SC2086)
- Missing quotes around variables (SC2248)
- Useless use of cat (SC2002)
- Read without -r flag (SC2162)

### 3. Executable Permissions

```bash
# Find shell scripts missing executable permission
find . -name "*.sh" ! -perm -u+x

# Fix all at once
find . -name "*.sh" ! -perm -u+x -exec chmod +x {} \;

# Verify scripts in bin/ directory are executable
for script in bin/*; do
  [[ -x "$script" ]] || { echo "NOT EXECUTABLE: $script"; exit 1; }
done
```text

**What it catches:**

- Scripts that can't be run directly (`./script.sh` fails)
- Missing shebang + executable bit combinations

### 4. JSON Configuration Validation

```bash
# Validate JSON syntax
jq empty config.json

# Check specific keys exist
jq -e '.required_field' config.json > /dev/null

# Validate all JSON files in project
find . -name "*.json" -exec jq empty {} \;

# Validate and extract value
version=$(jq -r '.version' package.json)
[[ -n "$version" ]] || { echo "Missing version field"; exit 1; }
```text

**What it catches:**

- Trailing commas (invalid in JSON)
- Missing quotes around keys
- Unquoted string values
- Missing required fields

### 5. Security Checks

```bash
# Scan for hardcoded secrets (basic patterns)
grep -rn "password\|secret\|api_key\|token" --include="*.sh" --include="*.json"

# Check for credentials in environment variable assignments
grep -rn "export.*PASSWORD\|export.*TOKEN" --include="*.sh"

# Check for curl/wget with hardcoded credentials
grep -rn "curl.*://.*:.*@" --include="*.sh"

# Verify sensitive files are in .gitignore
for file in .env .secrets credentials.json; do
  [[ -f "$file" ]] && ! grep -q "^${file}$" .gitignore && echo "WARNING: $file not in .gitignore"
done
```text

**What it catches:**

- Hardcoded passwords, API keys, tokens
- Credentials in URLs
- Sensitive files not excluded from git

### 6. Dependency Checks

```bash
# Check single required tool
command -v jq &>/dev/null || { echo "jq is required but not installed"; exit 1; }

# Check multiple dependencies
REQUIRED_TOOLS=("jq" "curl" "git" "shellcheck")
for tool in "${REQUIRED_TOOLS[@]}"; do
  command -v "$tool" &>/dev/null || { echo "Missing: $tool"; exit 1; }
done

# Check version requirements (e.g., bash 4+)
bash_version=$(bash --version | head -1 | grep -oP '\d+\.\d+')
[[ "${bash_version%%.*}" -ge 4 ]] || { echo "Bash 4+ required"; exit 1; }
```text

**What it catches:**

- Missing command-line tools
- Incompatible shell versions
- Missing optional dependencies that affect features

### 7. Testing Patterns

```bash
# Source and test function exports
source lib/utils.sh
type my_function &>/dev/null || { echo "Function not exported"; exit 1; }

# Test script exit codes
./script.sh --help &>/dev/null
[[ $? -eq 0 ]] || { echo "Help flag failed"; exit 1; }

# Test error handling
output=$(./script.sh --invalid-flag 2>&1)
[[ $? -ne 0 ]] && [[ "$output" == *"Usage:"* ]] || { echo "Error handling broken"; exit 1; }

# Run tests if test suite exists
if [[ -d tests/ ]]; then
  for test in tests/*.sh; do
    bash "$test" || exit 1
  done
fi
```text

**What it catches:**

- Functions not properly exported
- Broken --help flags
- Missing error handling
- Regression in test suite

## Example VALIDATION_CRITERIA.md for Shell Project

```markdown
# Validation Criteria

## Automated Checks

### Syntax Validation

```bash
# All shell scripts must parse without errors
find . -name "*.sh" -exec bash -n {} \; -print
```text

### Static Analysis

```bash
# ShellCheck with standard exclusions
shellcheck -e SC1091 *.sh lib/*.sh bin/*
```text

### Permissions

```bash
# All .sh files and bin/* must be executable
find . -name "*.sh" ! -perm -u+x
find bin/ -type f ! -perm -u+x
```text

### JSON Validation

```bash
# All JSON configs must be valid
find . -name "*.json" -exec jq empty {} \;
```text

### Security

```bash
# No hardcoded secrets
! grep -rn "password\|secret\|api_key" --include="*.sh" --include="*.json"
```text

### Dependencies

```bash
# Required tools must be available
for tool in jq curl git; do
  command -v "$tool" &>/dev/null || exit 1
done
```text

## Manual Checks

- [ ] README.md has installation instructions
- [ ] README.md has usage examples
- [ ] All user-facing scripts have --help flag
- [ ] Error messages are helpful (not just "error")
- [ ] Scripts clean up temp files on exit (trap)

```text
(end of markdown example)
```text


## Integration with Ralph Templates

When bootstrapping a shell project with Ralph, customize these template sections:

### PROMPT.md

Replace npm-specific validation:

```markdown
## Validation Commands

Before completing iteration:

1. **Syntax check:** `find . -name "*.sh" -exec bash -n {} \;`
2. **Linting:** `shellcheck -e SC1091 *.sh`
3. **Permissions:** `find . -name "*.sh" ! -perm -u+x` (should be empty)
4. **Security:** `! grep -rn "password\|secret" --include="*.sh"`
```text

### VALIDATION_CRITERIA.md

Use the shell project template above instead of web app criteria.

### Pre-commit Config

```yaml
repos:
  - repo: https://github.com/shellcheck-py/shellcheck-py
    rev: v0.9.0.6
    hooks:
      - id: shellcheck
        args: ["-e", "SC1091"]
  
  - repo: https://github.com/scop/pre-commit-shfmt
    rev: v3.7.0-1
    hooks:
      - id: shfmt
        args: ["-w", "-i", "2"]
```text

## Common Pitfalls

### 1. Assuming npm/node Tools Available

**Anti-pattern:**

```bash
# In shell-only project
npm run lint
npm run test
```text

**Correct:**

```bash
shellcheck *.sh
bash tests/run_tests.sh
```text

### 2. Ignoring Executable Permissions

**Anti-pattern:**

- Create script.sh
- Test with `bash script.sh`
- Forget to `chmod +x`
- User tries `./script.sh` → Permission denied

**Correct:**

- Always `chmod +x` after creating scripts
- Add permission check to validation
- Include in pre-commit hook

### 3. Skipping JSON Validation

**Anti-pattern:**

```bash
# Assume config.json is valid
version=$(jq -r '.version' config.json)
```text

**Correct:**

```bash
# Validate first, then use
jq empty config.json || exit 1
version=$(jq -r '.version' config.json)
```text

### 4. No Dependency Checks

**Anti-pattern:**

- Use `jq`, `curl`, `gh` without checking
- User runs script → command not found errors

**Correct:**

```bash
# At top of script
DEPS=("jq" "curl" "gh")
for dep in "${DEPS[@]}"; do
  command -v "$dep" &>/dev/null || {
    echo "Error: $dep is required but not installed"
    exit 1
  }
done
```text


## Related Playbooks

- **[Resolve Verifier Failures](../../../playbooks/resolve-verifier-failures.md)** - Handle verifier check failures including shellcheck, markdown, and template sync issues

## Related Skills

- [Shell Strict Mode](strict-mode.md) - `set -euo pipefail` patterns
- [Shell Variable Patterns](variable-patterns.md) - SC2155, SC2034, scoping
- [Shell Common Pitfalls](common-pitfalls.md) - ShellCheck errors and gotchas
- [Testing Patterns](../../code-quality/testing-patterns.md) - General testing strategies

## See Also

- **[Strict Mode](strict-mode.md)** - `set -euo pipefail` error handling
- **[Variable Patterns](variable-patterns.md)** - Safe variable usage and ShellCheck fixes
- **[Cleanup Patterns](cleanup-patterns.md)** - Trap handlers for cleanup
- **[Testing Patterns](../../code-quality/testing-patterns.md)** - General testing strategies

## References

- ShellCheck wiki: <https://www.shellcheck.net/wiki/>
- Google Shell Style Guide: <https://google.github.io/styleguide/shellguide.html>
- Bash strict mode: <http://redsymbol.net/articles/unofficial-bash-strict-mode/>
