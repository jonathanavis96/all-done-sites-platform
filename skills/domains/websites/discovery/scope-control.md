# Scope Control

Separates must-have now vs nice-to-have later to avoid bloated sites and endless projects.

## Quick Reference

| Category | Definition | Example |
|----------|------------|---------|
| **Must-Have** | Site doesn't work without it | Contact form, core services |
| **Should-Have** | Important but can launch without | Blog, testimonials carousel |
| **Nice-to-Have** | Enhances but not essential | Animation effects, chat widget |
| **Out of Scope** | Explicitly not this project | E-commerce, member portal |

## Trigger Conditions

Use this skill when:

- Project scope keeps growing
- Client adds "one more thing" repeatedly
- Timeline or budget is fixed
- Unclear what "done" means

## Procedure

### 1. List Everything Requested

```markdown
## Feature Wishlist (Raw)

- [ ] New homepage design
- [ ] Blog section
- [ ] Online booking system
- [ ] Video testimonials
- [ ] Newsletter signup
- [ ] Live chat
- [ ] Multi-language support
- [ ] Client portal
...
```text

### 2. Apply MoSCoW Prioritization

| Priority | Meaning | Rule |
|----------|---------|------|
| **M**ust | Cannot launch without | Max 40% of items |
| **S**hould | Important, do if time allows | Max 30% of items |
| **C**ould | Nice to have | Max 20% of items |
| **W**on't | Not this phase | Everything else |

### 3. Create Scope Document

```markdown
## Scope Agreement

### Phase 1 (This Project)

**Must Have:**
- [ ] Homepage with clear CTA
- [ ] About page with full bio
- [ ] Services page with offerings
- [ ] Contact page with form
- [ ] Mobile responsive
- [ ] Basic SEO setup

**Should Have:**
- [ ] 3 client testimonials
- [ ] Psychology Today badge integration
- [ ] FAQ section

### Phase 2 (Future)

**Could Have:**
- [ ] Blog section
- [ ] Newsletter integration
- [ ] Online booking calendar

### Out of Scope

**Won't Have (This Project):**
- ❌ Client portal
- ❌ E-commerce/payments
- ❌ Multi-language
- ❌ Custom animations

### Change Request Process
Any additions to "Must Have" require:
1. Removing something of equal effort, OR
2. Extending timeline/budget
```text

### 4. Scope Change Protocol

When client requests additions:

```markdown
## Scope Change Request

**Request:** Add online booking calendar
**Effort:** ~8 hours
**Impact:** Delays launch by 2 days

**Options:**
A) Add to Phase 2 (no current impact)
B) Add now, extend deadline to [date]
C) Add now, remove [equivalent item]

**Recommendation:** Option A - launch sooner, add booking in Phase 2
```text

## Common Mistakes

| Mistake | Why It's Wrong | Do This Instead |
|---------|----------------|-----------------|
| No written scope | Everything becomes "in scope" | Document before starting |
| Saying yes to everything | Project never ships | Use MoSCoW ruthlessly |
| Phase 2 becomes Phase 1 | Scope creep by stealth | Keep phases separate |
| No change process | Awkward conversations | Define process upfront |

## Scope Creep Warning Signs

Watch for these phrases:

- "While you're in there, can you also..."
- "This should be quick..."
- "Just one small thing..."
- "I forgot to mention..."

Response: "I can add that to Phase 2, or we can discuss adjusting the current scope."

## Example

**Project:** Psychology practice website

```markdown
## Scope Agreement: Jacqui Howles Website

### Phase 1 - Launch (2 weeks)

**Must Have:**
- [x] Homepage (hero, services overview, CTA)
- [x] About page (full bio, credentials, approach)
- [x] Services page (therapy + coaching offerings)
- [x] Contact page (form, details, map)
- [x] Mobile responsive
- [x] HPCSA credentials displayed
- [x] Basic SEO (titles, meta, schema)

**Should Have:**
- [ ] Psychology Today verification badge
- [ ] 2-3 client testimonials
- [ ] "How therapy works" section

### Phase 2 - Enhance (post-launch)

- [ ] Blog/articles section
- [ ] Online booking integration (Calendly/similar)
- [ ] Newsletter signup
- [ ] Additional testimonials

### Out of Scope

- ❌ Client portal / secure messaging
- ❌ Online payments
- ❌ Course/workshop e-commerce
- ❌ Multi-language (Afrikaans)
```text

## Related Skills

- `requirements-distiller.md` - Initial requirements gathering
- `qa/acceptance-criteria.md` - Defining "done" for each item
- `architecture/section-composer.md` - Planning what's in each page
