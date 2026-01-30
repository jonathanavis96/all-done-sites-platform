# Shell Scripting Skills

> Best practices for writing robust, maintainable bash scripts.
> Based on ShellCheck, Google Shell Style Guide, and industry standards.

---

## Quick Reference

| Problem | Solution | See |
| ------- | -------- | --- |
| `local foo=$(cmd)` masks exit code | Split: `local foo; foo=$(cmd)` | [variable-patterns.md](variable-patterns.md) |
| Unused variable warnings | Remove or prefix with `_` | [variable-patterns.md](variable-patterns.md) |
| Variables lost in pipelines | Use `< <(cmd)` or `< file` | [variable-patterns.md](variable-patterns.md) |
| Temp files leak on exit | Use `trap 'rm -f "$tmp"' EXIT` | [cleanup-patterns.md](cleanup-patterns.md) |
| `shopt` state not restored | Save/restore pattern | [cleanup-patterns.md](cleanup-patterns.md) |
| Script fails silently | Use strict mode | [strict-mode.md](strict-mode.md) |
| Undefined variable bugs | `set -u` | [strict-mode.md](strict-mode.md) |

---

## Skill Files

| File | Purpose | Key Patterns |
| ---- | ------- | ------------ |
| [strict-mode.md](strict-mode.md) | Defensive script headers | `set -euo pipefail`, error functions |
| [variable-patterns.md](variable-patterns.md) | Variable declaration & scoping | SC2155, SC2034, subshell fixes |
| [cleanup-patterns.md](cleanup-patterns.md) | Resource management | Traps, temp files, shopt |
| [common-pitfalls.md](common-pitfalls.md) | Miscellaneous gotchas | Quoting, `read -r`, `cd \|\| exit` |

---

## When to Use These Skills

**Trigger:** Any time you're writing or modifying `.sh` files.

**Pre-commit checklist:**

```bash
# Run shellcheck on modified scripts
shellcheck script.sh

# Common issues to watch for:
# SC2155 - local/export with command substitution
# SC2034 - unused variables  
# SC2086 - unquoted variables
# SC2162 - read without -r
```

**Formatting with shfmt:**

```bash
# Manual formatting (write changes):
shfmt -i 2 -ci -w script.sh

# Pre-commit check (diff only, no auto-fix):
shfmt -d -i 2 -ci script.sh

# Flags explained:
#   -i 2  = 2-space indentation
#   -ci   = indent case statement bodies
#   -w    = write in place (manual use)
#   -d    = diff mode (pre-commit config - check only)
#
# Note: Pre-commit uses `-d -i 2 -ci` (check only, no auto-fix)
#       Manual fixes use `-i 2 -ci -w` (write changes)
```

---

## ShellCheck Integration

Always run ShellCheck before committing bash scripts:

```bash
# Check a single file
shellcheck script.sh

# Check all shell scripts in ralph/
find . -name "*.sh" -exec shellcheck {} \;

# Ignore specific rules (use sparingly)
# shellcheck disable=SC2034
unused_but_intentional="value"
```text

---

## Related Skills

- [code-hygiene.md](../../code-quality/code-hygiene.md) - General cleanup patterns
- [ralph-patterns.md](../../ralph/ralph-patterns.md) - Ralph-specific workflows

---

## Sources

These patterns are derived from:

1. **[ShellCheck Wiki](https://www.shellcheck.net/wiki/)** - Static analysis rules
2. **[Google Shell Style Guide](https://google.github.io/styleguide/shellguide.html)** - Industry standard
3. **[Bash Strict Mode](http://redsymbol.net/articles/unofficial-bash-strict-mode/)** - Defensive patterns
4. **[Greg's Wiki](https://mywiki.wooledge.org/BashFAQ)** - Bash FAQ and pitfalls
5. **[Pure Bash Bible](https://github.com/dylanaraps/pure-bash-bible)** - Trap patterns

## See Also

- **[Strict Mode](strict-mode.md)** - `set -euo pipefail` patterns and error handling
- **[Variable Patterns](variable-patterns.md)** - ShellCheck fixes (SC2034, SC2155, SC2086)
- **[Cleanup Patterns](cleanup-patterns.md)** - Trap handlers and temp file management
- **[Common Pitfalls](common-pitfalls.md)** - Frequent ShellCheck errors and fixes
- **[Validation Patterns](validation-patterns.md)** - Shell project validation and testing
- **[Code Hygiene](../../code-quality/code-hygiene.md)** - General code quality practices
