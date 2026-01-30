# Skills File Authoring Conventions

## Why This Exists

Skills files in the brain repository follow specific conventions to ensure consistency, discoverability, and optimal token efficiency for AI agents. This document centralizes all skills authoring guidelines that were previously scattered across templates and README files.

## When to Use It

Reference this document when:

- Creating a new skills file in `skills/domains/` or `skills/projects/`
- Reviewing or updating existing skills files
- Contributing knowledge back to the brain repository
- Ensuring skills files meet quality standards

## Required File Structure

Every skills file **must** follow this four-section structure:

```markdown
# [Title]

## Why This Exists

[1-3 paragraphs explaining the problem, context, or motivation]
[Answer: "Why does this knowledge matter?"]

## When to Use It

[Specific scenarios, triggers, or conditions where this applies]
[Include concrete examples or bullet points]
[Answer: "When should I reference this?"]

## Quick Reference

[Scannable tables for fast lookup - THE MOST IMPORTANT SECTION]
[Include: key concepts table, common mistakes table, decision matrix if applicable]
[Answer: "What do I need to know at a glance?"]

## Details

[The actual knowledge: patterns, code examples, implementation details]
[Can include multiple subsections as needed]
[Can be as long or short as necessary]
```text

### Section Guidelines

#### Why This Exists

- Provide context and motivation
- Explain the problem this knowledge solves
- Keep it brief (1-3 paragraphs)
- Help readers quickly decide if this is relevant

#### When to Use It

- Be specific and actionable
- Include concrete triggers or scenarios
- Use bullet points for clarity
- Think: "What situations warrant reading this?"

#### Quick Reference ⭐ (Most Important for Usability)

- Provide scannable tables for fast lookup
- Include a "key concepts" or "at a glance" table
- Always include a "Common Mistakes" table with ❌/✅ format
- Add decision matrices for choosing between options
- This section enables quick answers without reading the whole file
- Tables should be self-contained - reader shouldn't need Details section for basic use

#### Details

- Contains the actual knowledge
- Can have multiple subsections
- Include code examples where helpful
- Focus on actionable, practical information

## Naming Conventions

### File Names

- **Use kebab-case**: `auth-patterns.md`, `caching-strategies.md`
- **Be descriptive**: Name should clearly indicate content
- **Use plurals for collections**: `api-patterns.md` not `api-pattern.md`
- **Keep it concise**: 2-4 words ideal, avoid unnecessary words

**Good examples:**

- `auth-patterns.md`
- `caching-strategies.md`
- `api-design-conventions.md`

**Bad examples:**

- `AuthPatterns.md` (wrong case)
- `pattern.md` (too vague)
- `authentication-pattern-for-oauth-and-jwt.md` (too long)

### Directory Structure

```text
skills/
├── SUMMARY.md              # Skills index - always update when adding files
├── conventions.md          # This file
├── domains/                # Technical domain knowledge (reusable)
│   ├── README.md
│   └── [domain-skills-files].md
└── projects/               # Project-specific knowledge
    ├── README.md
    └── [project-skills-files].md
```text

## Domain vs Project Skills

### Use `skills/domains/` when

✅ Pattern applies to **multiple projects**  
✅ Technical solution is **reusable**  
✅ Knowledge is **architectural or technology-focused**  
✅ Content is **framework or tool-specific**

**Examples:**

- Authentication patterns (OAuth2, JWT, session management)
- Caching strategies (LRU, Redis, React Query patterns)
- API design conventions (REST, error handling, versioning)
- State management approaches (Context, Zustand, server state)

### Use `skills/projects/` when

✅ Specific to **one project or codebase**  
✅ Context about **project history or decisions**  
✅ Project-specific **conventions or requirements**  
✅ Information about **specific integrations or dependencies**

**Examples:**

- Project-specific file structure conventions
- Custom component library usage
- Project deployment processes
- Third-party service integration patterns specific to one project

## Creating New Skills Files

### Step-by-Step Process

1. **Choose the right directory**
   - Domain knowledge → `skills/domains/`
   - Project-specific → `skills/projects/`

2. **Create the file with required structure**

   ```markdown
   # [Title]
   
   ## Why This Exists
   [Content]
   
   ## When to Use It
   [Content]
   
   ## Details
   [Content]
   ```

1. **Update `skills/SUMMARY.md`**
   - Add link under "Domains" or "Projects" section
   - Use descriptive link text
   - Keep alphabetical order within sections

2. **Validate the file**
   - Check: All three required headers present
   - Check: Content is clear and actionable
   - Check: Linked from SUMMARY.md
   - Check: No duplicate content with existing skills files

## Updating Existing Skills Files

When updating skills files:

- **Preserve structure**: Keep Why/When/Details sections
- **Maintain focus**: Don't let Details section become unfocused
- **Consider splitting**: If file grows too large (>500 lines), consider splitting into multiple files
- **Update dates**: Add "Last updated" note if making significant changes
- **Check links**: Ensure SUMMARY.md link text still accurate

## Writing Style Guidelines

### For AI Agent Consumption

- **Be concise**: Agents pay token costs for reading
- **Use clear hierarchies**: Headers, bullets, numbered lists
- **Front-load key information**: Most important details first
- **Use code examples**: Show, don't just tell
- **Avoid redundancy**: Don't repeat information from other skills files, link instead

### Formatting

- **Headers**: Use `##` for main sections, `###` for subsections
- **Code blocks**: Always specify language (`markdown`, `javascript`, etc.)
- **Lists**: Use `-` for bullets, `1.` for numbered lists
- **Emphasis**: Use **bold** for key terms, `code` for inline code
- **Links**: Use relative paths: `[Skills Summary](./SUMMARY.md)`

### Example Formatting

```markdown
## Details

### Authentication Flow

When implementing OAuth2 authentication:

1. **Redirect to provider**
   ```javascript
   const authUrl = `${OAUTH_URL}?client_id=${CLIENT_ID}`;
   window.location.href = authUrl;
   ```

1. **Handle callback**

   - Verify state parameter
   - Exchange code for tokens
   - Store tokens securely

**Security considerations:**

- Always validate state parameter (prevents CSRF)
- Use PKCE for public clients
- Store refresh tokens in httpOnly cookies

```text
(end of code example)
```text

## Common Mistakes to Avoid

❌ **Missing required sections**

- Every skills file needs Why/When/Details

❌ **Vague "When to Use It" sections**

- Be specific about scenarios and triggers

❌ **Creating orphaned files**

- Always update SUMMARY.md when adding files

❌ **Duplicating existing content**

- Check existing skills files first, consider updating instead

❌ **Using absolute paths**

- Use relative paths: `../references/...` not `/brain/references/...`

❌ **Mixing domain and project knowledge**

- Keep domain knowledge reusable, project knowledge specific

❌ **Over-engineering**

- Don't create skills files for trivial or obvious patterns

## Validation Checklist

Before considering a skills file complete:

- [ ] File has all three required sections (Why/When/Details)
- [ ] File name uses kebab-case
- [ ] File is in correct directory (domains/ or projects/)
- [ ] SUMMARY.md updated with link to file
- [ ] Content is clear, concise, and actionable
- [ ] Code examples include language specifiers
- [ ] No duplicate content with existing files
- [ ] Relative paths used throughout

## Integration with Templates

Project templates reference these conventions:

- `templates/AGENTS.project.md` - Points to skills structure
- `templates/ralph/PROMPT.md` - Includes skills growth instructions

When updating conventions, ensure templates remain consistent.

## See Also

- [skills/SUMMARY.md](SUMMARY.md) - Skills index and navigation
- [skills/domains/README.md](domains/README.md) - Domain skills guidelines
- [skills/projects/README.md](projects/README.md) - Project skills guidelines
- [AGENTS.md](../AGENTS.md) - Agent guidance for brain repository
