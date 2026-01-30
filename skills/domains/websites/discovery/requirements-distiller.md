# Requirements Distiller

Turns messy client notes into clear goals, pages, sections, constraints, and "done looks like".

## Quick Reference

| Input | Output |
|-------|--------|
| Client emails, calls, existing site | Structured requirements doc |
| Vague goals ("make it better") | Specific success metrics |
| Feature wish list | Prioritized must-have vs nice-to-have |

## Trigger Conditions

Use this skill when:

- Starting any new website project
- Client provides unstructured requirements
- Scope is unclear or keeps changing
- Multiple stakeholders with different priorities

## Procedure

### 1. Audit Existing Site (if any)

```markdown
## Current State Audit
- **Pages:** [list all pages]
- **Content:** [what exists, what's missing]
- **CTAs:** [current calls to action]
- **Trust markers:** [credentials, testimonials, logos]
- **Pain points:** [what's not working]
```text

### 2. Extract Core Requirements

Ask/determine:

- **Primary goal:** What's the ONE thing this site must do?
- **Target audience:** Who visits? What problem do they have?
- **Conversion event:** Book call? Buy? Submit form? WhatsApp?
- **Constraints:** Budget, timeline, brand guidelines, must-keep content

### 3. Create Requirements Document

```markdown
## Project Requirements

### Goals
- Primary: [one clear goal]
- Secondary: [nice to have]

### Target Audience
- Who: [specific person]
- Problem: [what they're trying to solve]
- Desired outcome: [what success looks like for them]

### Pages Required
1. [Page] - [purpose]
2. [Page] - [purpose]

### Content Inventory
| Content | Status | Source |
|---------|--------|--------|
| Logo | ✅ Have | Client |
| Photos | ❌ Need | Photoshoot |
| Testimonials | ⚠️ Partial | Request more |

### Non-Negotiables
- [Things that MUST be preserved/included]

### Out of Scope
- [Things explicitly NOT doing this phase]

### Done Looks Like
- [ ] [Specific acceptance criteria]
- [ ] [Measurable outcome]
```text

## Common Mistakes

| Mistake | Why It's Wrong | Do This Instead |
|---------|----------------|-----------------|
| Accepting "make it modern" | Not measurable | Ask "what does modern mean to you?" |
| Starting without content audit | Will miss things | Always audit existing site first |
| No "done looks like" | Scope creep guaranteed | Define acceptance criteria upfront |
| Combining must-have + nice-to-have | Bloated scope | Separate and prioritize ruthlessly |

## Example

**Input:** "We need a new website. Current one is outdated. We want more clients."

**Output:**

```markdown
## Project Requirements: Jacqui Howles Psychology

### Goals
- Primary: Increase therapy booking inquiries by 30%
- Secondary: Reduce "how do I book?" support questions

### Target Audience
- Who: Adults (25-55) seeking therapy in Johannesburg
- Problem: Struggling with anxiety, depression, trauma, life transitions
- Desired outcome: Find a therapist who feels trustworthy and approachable

### Pages Required
1. Home - Quick overview, primary CTA to book consultation
2. About - Full bio, credentials, approach
3. Services - Clear service offerings with pricing guidance
4. Contact - Easy booking path, multiple contact methods

### Non-Negotiables
- Keep ALL existing bio content (restructure only)
- HPCSA registration number visible
- Psychology Today verification badge
- Both online AND in-person services clearly shown

### Done Looks Like
- [ ] All existing content preserved and reorganized
- [ ] Clear booking CTA above fold on every page
- [ ] Mobile-friendly (Lighthouse mobile score 90+)
- [ ] Load time under 3 seconds
```text

## Related Skills

- `audience-mapping.md` - Deep dive on target audience
- `scope-control.md` - Managing scope creep
- `architecture/section-composer.md` - Next step after requirements
