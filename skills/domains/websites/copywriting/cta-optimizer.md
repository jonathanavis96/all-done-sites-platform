# CTA Optimizer

Optimizes call-to-action button text, placement, and frequency for maximum conversion without being spammy.

## Quick Reference

| CTA Type | Example Text | Use When |
|----------|--------------|----------|
| High commitment | "Buy Now", "Sign Up" | Ready-to-buy audience |
| Medium commitment | "Book a Consultation", "Get Started" | Warm audience, services |
| Low commitment | "Learn More", "See How It Works" | Cold audience, complex offer |
| Value-focused | "Get Your Free Guide", "Start Free Trial" | Lead magnets |

## Trigger Conditions

Use this skill when:

- Page has no clear CTA
- CTA text is generic ("Submit", "Click Here")
- Only one CTA on a long page
- High traffic, low conversions

## CTA Text Formulas

### Formula 1: Action + Outcome

```text
[Verb] + [What they get]

"Book Your First Session"
"Get Your Free Quote"
"Start Your Journey"
"Download the Guide"
```text

### Formula 2: First Person

```text
"Get My Free [thing]"
"Start My Trial"
"Book My Consultation"
```text

### Formula 3: Urgency

```text
"Claim Your Spot"
"Reserve Your Place"
"Get Started Today"
```text

### Formula 4: Low Friction

```text
"See How It Works"
"Learn More"
"View Examples"
"Take the Quiz"
```text

## Button Text by Industry

| Industry | Primary CTA | Secondary CTA |
|----------|-------------|---------------|
| Therapy/Coaching | "Book a Consultation" | "Learn About My Approach" |
| SaaS | "Start Free Trial" | "See Demo" |
| E-commerce | "Add to Cart" | "View Details" |
| Local Service | "Get Free Quote" | "Call Now" |
| Agency | "Get in Touch" | "View Our Work" |

## CTA Placement Rules

### Rule 1: Above the Fold

Always have a CTA visible without scrolling.

```text
[Hero]
  - Headline
  - Subheadline
  - [Primary CTA Button]
  - Secondary link (optional)
```text

### Rule 2: After Value Sections

Place CTA after you've established value.

```text
[Services Section]
  - Service cards
  - [CTA: "Book a Consultation"]

[Testimonials Section]
  - Social proof
  - [CTA: "Join Them"]
```text

### Rule 3: End of Page

Final CTA before footer.

```text
[Final CTA Section]
  - Headline: "Ready to get started?"
  - [Primary CTA]
  - Alternative: "Or call us at..."
```text

### Rule 4: Repeat Strategically

On long pages, repeat CTA every 2-3 sections.

```text
Hero → CTA
Services → CTA
Testimonials → CTA
FAQ → CTA
Footer CTA Section → CTA
```text

**NOT** after every section (feels desperate).

## CTA Hierarchy

```markdown
## Button Hierarchy

**Primary CTA** (main conversion goal)
- Highest visual prominence
- Solid background color
- "Book a Consultation"

**Secondary CTA** (alternative action)
- Lower prominence
- Outline or text link
- "Learn More" / "Call Us"

**Tertiary** (navigation)
- Text links
- "See all services →"
```text

## Visual CTA Design

| Element | Primary | Secondary |
|---------|---------|-----------|
| Background | Solid brand color | Transparent/outline |
| Text color | White | Brand color |
| Size | Larger | Same or smaller |
| Padding | 16-20px vertical | 12-16px vertical |
| Border radius | Match brand (8-12px) | Same |

## Common Mistakes

| Mistake | Why It's Wrong | Do This Instead |
|---------|----------------|-----------------|
| "Submit" | Boring, unclear | Say what happens: "Send Message" |
| "Click Here" | Vague, bad for accessibility | Describe the action |
| CTA only at bottom | Most won't scroll | Add to hero + repeat |
| Too many CTAs | Decision paralysis | 1 primary, 1 secondary max |
| All CTAs same priority | Confusing | Clear visual hierarchy |
| CTA doesn't stand out | Gets missed | Contrast with page |
| "Buy Now" for cold audience | Too aggressive | Use softer CTAs first |

## A/B Test Ideas

| Test | Option A | Option B |
|------|----------|----------|
| Specificity | "Get Started" | "Book Your Free Call" |
| Person | "Get Your Quote" | "Get My Quote" |
| Urgency | "Book a Consultation" | "Book Today" |
| Risk reduction | "Sign Up" | "Start Free Trial" |

## Example

**Project:** Psychology practice website

```markdown
## CTA Strategy

### Primary CTA
**Text:** "Book Your First Session"
**Style:** Solid sage green (#7C9885), white text, rounded
**Placement:** Hero, after Services, after Testimonials, Final section

### Secondary CTA
**Text:** "Learn About My Approach"
**Style:** Outline, sage green border/text
**Placement:** Hero (below primary), About section

### Alternative CTAs (contact methods)
- "Call Me" (phone number)
- "Send a Message" (contact form)
- "WhatsApp" (if applicable)

### Page Flow

**Hero**
[Book Your First Session] (primary)
"Or learn about my approach →" (text link)

**Services**
Each service card: "Learn More →"
Section end: [Book Your First Session]

**About**
[Learn About My Approach] (to About page)

**Testimonials**
[Book Your First Session]

**FAQ**
"Still have questions?" [Send a Message]

**Final CTA Section**
"Ready to take the first step?"
[Book Your First Session]
"Prefer to talk? Call [number] or WhatsApp"
```text

## Related Skills

- `value-proposition.md` - What goes above the CTA
- `objection-handler.md` - Reducing CTA friction
- `design/color-system.md` - CTA button colors
- `build/forms-integration.md` - What happens after CTA click
- `../../marketing/cro/page-cro.md` - Full page conversion optimization
- `../../marketing/cro/ab-test-setup.md` - Test CTA variations
