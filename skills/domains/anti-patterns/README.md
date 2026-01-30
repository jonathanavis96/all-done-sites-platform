# Anti-Patterns Domain

## Why This Exists

Learning from failures is often more memorable and impactful than learning patterns alone. This directory captures **common mistakes, bad practices, and anti-patterns** discovered during development - showing what NOT to do, why it's wrong, and how to fix it.

Anti-patterns complement the positive patterns in other domain directories by explicitly documenting pitfalls, traps, and frequently-repeated mistakes.

## When to Use It

Create an anti-pattern entry when you:

- Encounter a recurring mistake across multiple iterations or projects
- Discover a common pitfall that looks correct but causes problems
- Find a "works but wrong" implementation that passes basic tests but fails in production
- Notice a pattern that violates best practices in subtle ways
- Want to document a ShellCheck, linter, or verifier failure that keeps appearing

**Examples of anti-patterns:**

- Shell scripts that fail on edge cases (missing quotes, unset variables)
- Markdown formatting that looks correct but fails linting
- Documentation that's technically accurate but confusing or incomplete
- Code that works in happy path but breaks on error conditions
- Ralph loop behaviors that waste iterations or tokens

## Anti-Pattern Format

Each anti-pattern should follow this structure:

```text
### [Anti-Pattern Name]

**Frequency:** [HIGH|MEDIUM|LOW] - How often this mistake occurs

**Severity:** [CRITICAL|HIGH|MEDIUM|LOW] - Impact when it happens

**Context:** [Brief description of where/when this anti-pattern appears]

**Bad Example:**

```language
[Code or example showing the anti-pattern]
```

**Why It's Wrong:**

[Clear explanation of why this is problematic - what breaks, when it fails, what the consequences are]

**Good Example:**

```language
[Correct implementation that fixes the issue]
```

**How to Detect:**

[Tools, commands, or signals that reveal this anti-pattern - e.g., "ShellCheck SC2034", "markdownlint MD040"]

**Related Patterns:**

[Links to positive pattern docs that provide context or alternatives]

## Directory Structure

```text
anti-patterns/
├── README.md (this file)
├── shell-anti-patterns.md
├── markdown-anti-patterns.md
├── ralph-anti-patterns.md
├── documentation-anti-patterns.md
└── [other domain anti-patterns]
```

## Contributing

When documenting an anti-pattern:

1. **Search first** - Check if the anti-pattern is already documented
2. **Be specific** - Include concrete examples, not vague descriptions
3. **Show, don't tell** - Use bad/good code comparisons
4. **Link to tools** - Reference linters, validators, or checkers that catch it
5. **Rate frequency** - Help prioritize learning by indicating how common it is
6. **Update index** - Add to `skills/index.md` and `skills/SUMMARY.md`

## See Also

- `skills/domains/code-quality/` - Positive patterns for code quality
- `skills/domains/languages/shell/common-pitfalls.md` - Shell-specific pitfalls
- `skills/self-improvement/skills/self-improvement/GAP_BACKLOG.md` - Discovered knowledge gaps
- `skills/conventions.md` - Skill authoring guidelines
