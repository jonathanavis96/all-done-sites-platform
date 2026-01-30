# Skills Projects

## Why This Exists

This directory contains **project-specific knowledge** - conventions, decisions, and context specific to individual projects. Project skill files capture lessons learned, project-specific patterns, and contextual information that helps agents work effectively on a particular codebase.

## When to Use It

Create a skill file in `skills/projects/` when you:

- Document project-specific conventions (file structure, naming patterns)
- Capture project context that agents need to know
- Record project-specific technical decisions or constraints
- Share lessons learned that are specific to one project
- Document project-specific gotchas or quirks

**Examples of project topics:**

- Project-specific API conventions and endpoint patterns
- Custom component libraries and usage guidelines
- Project-specific deployment processes or requirements
- Integration patterns with specific third-party services
- Project history, evolution, and architectural decisions

## Naming Conventions

- Use **kebab-case** for file names: `my-project.md`, `customer-portal.md`
- Match the **project directory name** when possible
- Be **specific**: `ecommerce-site.md` not `site.md`

## Skill File Format

Every project skill file must follow this structure:

```markdown
# [Project Name]

## Why This Exists

[Brief project description and purpose]
[Why this knowledge base file is needed]

## When to Use It

[When agents should reference this file]
[What work requires this context]

## Details

[Project-specific conventions, patterns, and knowledge]
[Can include multiple subsections as needed]
```text

## Contributing

After creating a new project skill file:

1. Ensure it follows the format above (Why/When/Details)
2. Update `skills/SUMMARY.md` to link to your new file
3. Focus on actionable, relevant information for agents
4. Keep it updated as the project evolves

## Domain vs Project Skills

**Use `skills/domains/`** when:

- ✅ Pattern applies to multiple projects
- ✅ Technical solution is reusable
- ✅ Knowledge is architectural or technology-focused

**Use `skills/projects/`** when:

- ✅ Specific to one project or codebase
- ✅ Context about project history or decisions
- ✅ Project-specific conventions or requirements

## See Also

- `skills/domains/README.md` - Reusable technical domain knowledge
- `skills/conventions.md` - Detailed skill authoring guidelines (planned)
- `skills/SUMMARY.md` - Skills index and navigation
