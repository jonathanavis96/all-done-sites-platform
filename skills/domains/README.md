# Skills Domains

## Why This Exists

This directory contains **technical domain knowledge** - reusable patterns, conventions, and practices that apply across multiple projects. Domain skill files capture architectural decisions, implementation patterns, and technical best practices discovered during development.

## When to Use It

Create a skill file in `skills/domains/` when you:

- Discover a reusable technical pattern (e.g., authentication flows, caching strategies)
- Document an architectural decision that applies broadly (e.g., API design patterns)
- Capture implementation best practices for a specific technology area
- Need to share technical knowledge across multiple projects

**Examples of domain topics:**

- Authentication patterns (OAuth2, JWT, session management) → `backend/`
- Caching strategies (LRU, Redis patterns, React Query) → `backend/`
- API design patterns (REST conventions, error handling) → `backend/`
- Code quality (testing, linting, hygiene) → `code-quality/`
- Infrastructure (deployment, security) → `infrastructure/`
- Language-specific (Python, Shell) → `languages/`
- Ralph patterns (bootstrap, loop) → `ralph/`
- Website development → `websites/`

## Naming Conventions

- Use **kebab-case** for file names: `auth-patterns.md`, `caching-strategies.md`
- Be **descriptive but concise**: Name should clearly indicate the domain
- Use **plural forms** for collections: `api-patterns.md` not `api-pattern.md`

## Skill File Format

Every domain skill file must follow this structure:

```markdown
# [Domain Name]

## Why This Exists

[Explain the problem this knowledge solves or why this pattern matters]

## When to Use It

[Specific scenarios where this pattern applies]
[Include concrete examples or triggers]

## Details

[The actual knowledge: patterns, code examples, decision criteria]
[Can include multiple subsections as needed]
```text

## Contributing

After creating a new domain skill file:

1. Ensure it follows the format above (Why/When/Details)
2. Update `skills/SUMMARY.md` to link to your new file
3. Use clear, concise language optimized for AI agent consumption
4. Include concrete examples where helpful

## See Also

- `skills/projects/README.md` - Project-specific knowledge (less reusable)
- `skills/conventions.md` - Detailed skill authoring guidelines
- `skills/SUMMARY.md` - Skills index and navigation
