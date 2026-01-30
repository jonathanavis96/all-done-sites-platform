# Configuration Patterns

> Best practices for portable, secure, and maintainable configuration files.

## Quick Reference

| Issue | Problem | Fix |
| ----- | ------- | --- |
| Hardcoded paths | `/c/Users/name/...` breaks on other machines | Use `$HOME` or relative paths |
| Committed secrets | API keys in repo history | Use `.env` + `.gitignore` |
| No defaults | Missing config = crash | Provide sensible defaults |
| No overrides | Can't customize per-environment | Support env var overrides |

## Path Portability

### Never Hardcode Absolute Paths

```yaml
# ❌ Wrong - machine-specific paths
sessions:
  persistenceDir: C:\Users\grafe.MASTERRIG\.rovodev\sessions
logging:
  path: /c/dev/brain/ralph/logs

# ✅ Right - portable paths
sessions:
  persistenceDir: ${PERSISTENCE_DIR:-.rovodev/sessions}
logging:
  path: ${LOG_DIR:-./logs}
```text

### Use Environment Variables with Defaults

```bash
# ❌ Wrong - hardcoded
CONFIG_DIR="/home/specific-user/.config/myapp"

# ✅ Right - with default
CONFIG_DIR="${CONFIG_DIR:-$HOME/.config/myapp}"

# ✅ Right - XDG compliant
CONFIG_DIR="${XDG_CONFIG_HOME:-$HOME/.config}/myapp"
```text

### Relative Paths from Script Location

```bash
# ❌ Wrong - assumes working directory
source ./lib/utils.sh

# ✅ Right - relative to script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/lib/utils.sh"
```text

### Cross-Platform Path Handling

```bash
# ❌ Wrong - Windows-specific
CONFIG_PATH="C:\Users\name\config.yml"

# ❌ Wrong - assumes Unix
CONFIG_PATH="/home/name/config.yml"

# ✅ Right - cross-platform
CONFIG_PATH="${HOME}/.config/app/config.yml"

# ✅ Right - WSL-aware
if [[ -d "/mnt/c" ]]; then
    # Running in WSL
    WIN_HOME="/mnt/c/Users/${USER}"
else
    WIN_HOME=""
fi
```text

## Template Pattern

### Create Template + Real Config

```text
project/
├── config.yml           # .gitignored - real config
├── config.template.yml  # tracked - template with placeholders
└── .gitignore          # ignores config.yml
```text

### Template File Example

```yaml
# config.template.yml
# Copy to config.yml and fill in values

# Required - no defaults
api_key: ${API_KEY}           # Set API_KEY env var or replace
tenant_url: YOUR_TENANT_URL   # Replace with your URL

# Optional - has defaults
log_level: ${LOG_LEVEL:-info}
timeout_secs: ${TIMEOUT:-30}

# Paths - use env vars or defaults
persistence_dir: ${PERSISTENCE_DIR:-.data/sessions}
```text

### Setup Script

```bash
#!/usr/bin/env bash
# setup.sh - Generate config from template

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEMPLATE="${SCRIPT_DIR}/config.template.yml"
CONFIG="${SCRIPT_DIR}/config.yml"

if [[ -f "$CONFIG" ]]; then
    echo "Config already exists: $CONFIG"
    exit 0
fi

if [[ ! -f "$TEMPLATE" ]]; then
    echo "Template not found: $TEMPLATE"
    exit 1
fi

# Copy and substitute environment variables
envsubst < "$TEMPLATE" > "$CONFIG"
echo "Created: $CONFIG"
echo "Please review and update placeholder values."
```text

## Environment Variable Override

### Support Multiple Override Levels

```bash
# Priority: CLI arg > env var > config file > default

# 1. Default
LOG_LEVEL="info"

# 2. Config file (if exists)
if [[ -f "$CONFIG_FILE" ]]; then
    LOG_LEVEL=$(grep "log_level:" "$CONFIG_FILE" | cut -d: -f2 | tr -d ' ')
fi

# 3. Environment variable
LOG_LEVEL="${LOG_LEVEL:-$LOG_LEVEL}"

# 4. CLI argument (highest priority)
while [[ $# -gt 0 ]]; do
    case "$1" in
        --log-level) LOG_LEVEL="$2"; shift 2 ;;
        *) shift ;;
    esac
done
```text

### Document All Environment Variables

```markdown
## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `APP_CONFIG_PATH` | `~/.config/app/config.yml` | Config file location |
| `APP_LOG_LEVEL` | `info` | Logging verbosity |
| `APP_TIMEOUT` | `30` | Request timeout in seconds |
| `APP_API_KEY` | (required) | API key for authentication |
```text

## Secrets Management

### Never Commit Secrets

```gitignore
# .gitignore
.env
.env.local
*.secret
*_secret.txt
config.yml      # Real config with secrets
!config.template.yml  # Template is OK to commit
```text

### Use .env Files

```bash
# .env (gitignored)
API_KEY=sk-abc123...
DATABASE_URL=postgres://user:pass@host/db  # pragma: allowlist secret
```text

```bash
# Load .env in scripts
if [[ -f .env ]]; then
    export $(grep -v '^#' .env | xargs)
fi
```text

### Validate Required Secrets

```bash
# Fail fast if required secrets missing
: "${API_KEY:?API_KEY environment variable is required}"
: "${DATABASE_URL:?DATABASE_URL environment variable is required}"
```text

## Configuration Validation

### Validate on Load

```bash
validate_config() {
    local config_file="$1"
    local errors=0

    if [[ ! -f "$config_file" ]]; then
        echo "ERROR: Config file not found: $config_file" >&2
        return 1
    fi

    # Check required fields
    if ! grep -q "^api_key:" "$config_file"; then
        echo "ERROR: Missing required field: api_key" >&2
        ((errors++))
    fi

    # Check for placeholder values
    if grep -q "YOUR_.*_HERE\|REPLACE_ME\|TODO" "$config_file"; then
        echo "ERROR: Config contains placeholder values" >&2
        ((errors++))
    fi

    return $errors
}
```text

### Provide Helpful Error Messages

```bash
# ❌ Wrong - cryptic error
[[ -f "$CONFIG" ]] || exit 1

# ✅ Right - helpful error
if [[ ! -f "$CONFIG" ]]; then
    echo "ERROR: Config file not found: $CONFIG" >&2
    echo "" >&2
    echo "To create a config file:" >&2
    echo "  cp config.template.yml config.yml" >&2
    echo "  # Edit config.yml with your values" >&2
    exit 1
fi
```text

## YAML-Specific Patterns

### Use yq for Safe YAML Manipulation

```bash
# ❌ Wrong - fragile sed
sed -i "s/modelId:.*/modelId: $NEW_MODEL/" config.yml

# ✅ Right - proper YAML tool
if command -v yq &>/dev/null; then
    yq e ".agent.modelId = \"$NEW_MODEL\"" -i config.yml
else
    # Fallback with warning
    echo "WARNING: yq not installed, using sed (fragile)" >&2
    sed -i "s/modelId:.*/modelId: $NEW_MODEL/" config.yml
fi
```text

### Validate YAML Syntax

```bash
# Check YAML is valid
if command -v yq &>/dev/null; then
    yq e '.' config.yml > /dev/null || {
        echo "ERROR: Invalid YAML in config.yml" >&2
        exit 1
    }
fi
```text

## Common Mistakes Summary

| Mistake | Problem | Fix |
| ------- | ------- | --- |
| `/c/Users/name/...` | Only works on one machine | Use `$HOME` or relative |
| Secrets in repo | Security risk forever | Use `.env` + `.gitignore` |
| No defaults | Crashes without config | `${VAR:-default}` pattern |
| sed on YAML | Can corrupt structure | Use `yq` for YAML |
| No validation | Silent failures | Validate config on load |
| Placeholder committed | `YOUR_API_KEY` in repo | Use template pattern |

## See Also

- **[Deployment Patterns](../infrastructure/deployment-patterns.md)** - CI/CD and environment management
- **[Security Patterns](../infrastructure/security-patterns.md)** - Secrets management and secure defaults
- **[Error Handling Patterns](error-handling-patterns.md)** - Configuration validation and error recovery
- **[Shell Strict Mode](../languages/shell/strict-mode.md)** - Error handling in configuration scripts
