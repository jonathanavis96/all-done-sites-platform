# Typography System

Creates readable, hierarchical typography with proper font pairing, sizes, and line heights.

## Quick Reference

| Element | Size (Desktop) | Weight | Line Height |
|---------|----------------|--------|-------------|
| H1 | 48-64px | Bold (700) | 1.1-1.2 |
| H2 | 36-48px | Semibold (600) | 1.2-1.3 |
| H3 | 24-32px | Semibold (600) | 1.3 |
| H4 | 20-24px | Medium (500) | 1.4 |
| Body | 16-18px | Regular (400) | 1.5-1.7 |
| Small | 14px | Regular (400) | 1.5 |
| Caption | 12px | Regular (400) | 1.4 |

## Trigger Conditions

Use this skill when:

- Setting up design system
- Text feels hard to read
- Hierarchy is unclear
- Fonts don't work together

## Font Pairing Patterns

### Pattern 1: Same Family (Safest)

Use one font family with different weights.

```css
/* Clean, consistent */
--font-heading: 'Inter', sans-serif;
--font-body: 'Inter', sans-serif;
```text

**Good choices:** Inter, DM Sans, Nunito, Source Sans Pro

### Pattern 2: Sans + Sans (Modern)

Two sans-serifs with different personalities.

```css
/* Headings bold, body neutral */
--font-heading: 'DM Sans', sans-serif;
--font-body: 'Inter', sans-serif;
```text

### Pattern 3: Serif + Sans (Classic)

Serif headings for elegance, sans body for readability.

```css
/* Elegant but readable */
--font-heading: 'Playfair Display', serif;
--font-body: 'Inter', sans-serif;
```text

### Pattern 4: Display + Body (Expressive)

Distinctive display font for headings only.

```css
/* Personality in headings */
--font-heading: 'Fraunces', serif;
--font-body: 'Inter', sans-serif;
```text

## Font Selection by Personality

| Personality | Font Options |
|-------------|--------------|
| **Friendly/Rounded** | Nunito, DM Sans, Poppins, Quicksand |
| **Clean/Modern** | Inter, Geist, SF Pro, Helvetica Neue |
| **Professional/Neutral** | Source Sans Pro, Open Sans, Roboto |
| **Elegant/Premium** | Playfair Display, Cormorant, Libre Baskerville |
| **Technical/Precise** | IBM Plex Sans, JetBrains Mono, Fira Code |
| **Warm/Humanist** | Lato, Merriweather Sans, PT Sans |

## Type Scale

Use a consistent scale. The 1.25 ratio works well:

```css
/* Type scale (1.25 ratio) */
--text-xs: 0.75rem;   /* 12px */
--text-sm: 0.875rem;  /* 14px */
--text-base: 1rem;    /* 16px */
--text-lg: 1.125rem;  /* 18px */
--text-xl: 1.25rem;   /* 20px */
--text-2xl: 1.5rem;   /* 24px */
--text-3xl: 1.875rem; /* 30px */
--text-4xl: 2.25rem;  /* 36px */
--text-5xl: 3rem;     /* 48px */
--text-6xl: 3.75rem;  /* 60px */
```text

## Line Height Rules

| Text Type | Line Height | Why |
|-----------|-------------|-----|
| Headings (large) | 1.1-1.2 | Tight, impactful |
| Headings (small) | 1.2-1.3 | Slightly looser |
| Body text | 1.5-1.7 | Comfortable reading |
| UI elements | 1.4 | Compact but clear |

## Line Length (Measure)

```css
/* Optimal reading width */
p, li, blockquote {
  max-width: 65ch; /* ~65 characters */
}
```text

| Width | Effect |
|-------|--------|
| < 45ch | Too narrow, choppy |
| 45-75ch | Optimal reading |
| > 75ch | Too wide, hard to track |

## Responsive Typography

```css
/* Mobile-first, scale up */
h1 {
  font-size: 2rem;      /* 32px mobile */
}

@media (min-width: 768px) {
  h1 {
    font-size: 3rem;    /* 48px tablet */
  }
}

@media (min-width: 1024px) {
  h1 {
    font-size: 3.75rem; /* 60px desktop */
  }
}
```text

Or use `clamp()`:

```css
h1 {
  font-size: clamp(2rem, 5vw, 3.75rem);
}
```text

## Common Mistakes

| Mistake | Why It's Wrong | Do This Instead |
|---------|----------------|-----------------|
| Body text < 16px | Hard to read | 16-18px minimum |
| Too many fonts | Chaotic | Max 2 font families |
| No hierarchy | Everything looks same | Clear size/weight steps |
| Line height too tight | Hard to read paragraphs | 1.5+ for body |
| Lines too wide | Eye loses track | Max 65-75 characters |
| Inconsistent sizes | Unprofessional | Use a type scale |

## Example

**Project:** Psychology practice website

```css
/* Typography System */

/* Fonts */
--font-heading: 'DM Sans', sans-serif;
--font-body: 'Inter', -apple-system, sans-serif;

/* Scale */
--text-xs: 0.75rem;
--text-sm: 0.875rem;
--text-base: 1rem;
--text-lg: 1.125rem;
--text-xl: 1.25rem;
--text-2xl: 1.5rem;
--text-3xl: 2rem;
--text-4xl: 2.5rem;
--text-5xl: 3rem;

/* Headings */
h1 {
  font-family: var(--font-heading);
  font-size: clamp(2rem, 5vw, 3rem);
  font-weight: 700;
  line-height: 1.1;
  letter-spacing: -0.02em;
}

h2 {
  font-family: var(--font-heading);
  font-size: clamp(1.5rem, 4vw, 2.25rem);
  font-weight: 600;
  line-height: 1.2;
}

h3 {
  font-family: var(--font-heading);
  font-size: clamp(1.25rem, 3vw, 1.5rem);
  font-weight: 600;
  line-height: 1.3;
}

/* Body */
body {
  font-family: var(--font-body);
  font-size: 1rem;
  line-height: 1.6;
  color: #2D3436;
}

p {
  max-width: 65ch;
  margin-bottom: 1.5em;
}

/* Small text */
.text-small {
  font-size: 0.875rem;
  line-height: 1.5;
}
```text

## Related Skills

- `design-direction.md` - Overall visual approach
- `color-system.md` - Text colors and contrast
- `build/accessibility.md` - Font accessibility requirements
