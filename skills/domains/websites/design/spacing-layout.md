# Spacing and Layout

Creates consistent grid systems, section spacing, and visual rhythm.

## Quick Reference

| Element | Spacing | Notes |
|---------|---------|-------|
| Base unit | 4px or 8px | All spacing multiples of this |
| Section padding | 80-120px | Vertical breathing room |
| Component gap | 16-32px | Between cards, items |
| Text spacing | 8-16px | Between paragraphs |
| Container max-width | 1200-1400px | Content doesn't stretch too wide |

## Spacing Scale (8px base)

```css
--space-0: 0;
--space-1: 0.25rem;  /* 4px */
--space-2: 0.5rem;   /* 8px */
--space-3: 0.75rem;  /* 12px */
--space-4: 1rem;     /* 16px */
--space-5: 1.25rem;  /* 20px */
--space-6: 1.5rem;   /* 24px */
--space-8: 2rem;     /* 32px */
--space-10: 2.5rem;  /* 40px */
--space-12: 3rem;    /* 48px */
--space-16: 4rem;    /* 64px */
--space-20: 5rem;    /* 80px */
--space-24: 6rem;    /* 96px */
--space-32: 8rem;    /* 128px */
```text

## Container Widths

```css
--container-sm: 640px;   /* Narrow content */
--container-md: 768px;   /* Medium content */
--container-lg: 1024px;  /* Standard content */
--container-xl: 1280px;  /* Wide content */
--container-2xl: 1536px; /* Full-width sections */
```text

## Section Spacing Pattern

```css
/* Consistent section rhythm */
section {
  padding-top: var(--space-20);    /* 80px */
  padding-bottom: var(--space-20); /* 80px */
}

/* Hero gets more space */
.hero {
  padding-top: var(--space-24);    /* 96px */
  padding-bottom: var(--space-24); /* 96px */
}

/* Tighter on mobile */
@media (max-width: 768px) {
  section {
    padding-top: var(--space-12);  /* 48px */
    padding-bottom: var(--space-12);
  }
}
```text

## Grid Systems

### Simple Container

```css
.container {
  width: 100%;
  max-width: var(--container-xl);
  margin: 0 auto;
  padding: 0 var(--space-4); /* 16px gutters */
}

@media (min-width: 768px) {
  .container {
    padding: 0 var(--space-8); /* 32px gutters */
  }
}
```text

### CSS Grid Layout

```css
/* 12-column grid */
.grid {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: var(--space-6); /* 24px */
}

/* Common patterns */
.col-6 { grid-column: span 6; }  /* Half */
.col-4 { grid-column: span 4; }  /* Third */
.col-3 { grid-column: span 3; }  /* Quarter */
```text

### Flexbox Layout

```css
/* Card grid */
.card-grid {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-6);
}

.card {
  flex: 1 1 300px; /* Flexible, min 300px */
}
```text

## Visual Rhythm Rules

| Rule | Description |
|------|-------------|
| **Proximity** | Related items closer together |
| **Consistency** | Same spacing for same elements |
| **Hierarchy** | More space around important things |
| **Breathing room** | Don't crowd content |

## Common Mistakes

| Mistake | Why It's Wrong | Do This Instead |
|---------|----------------|-----------------|
| Random spacing values | Inconsistent, messy | Use spacing scale |
| No section padding | Feels cramped | 80-120px between sections |
| Content too wide | Hard to read | Max 1200-1400px container |
| Same spacing everywhere | No hierarchy | More space = more important |
| Forgetting mobile | Huge gaps on small screens | Reduce spacing on mobile |

## Example

**Project:** Psychology practice website

```css
:root {
  /* Spacing scale */
  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 0.75rem;
  --space-4: 1rem;
  --space-6: 1.5rem;
  --space-8: 2rem;
  --space-12: 3rem;
  --space-16: 4rem;
  --space-20: 5rem;
  --space-24: 6rem;
  
  /* Containers */
  --container-content: 720px;  /* Text content */
  --container-page: 1200px;    /* Full sections */
}

/* Section defaults */
section {
  padding: var(--space-20) var(--space-4);
}

@media (min-width: 768px) {
  section {
    padding: var(--space-24) var(--space-8);
  }
}

/* Container */
.container {
  width: 100%;
  max-width: var(--container-page);
  margin: 0 auto;
}

/* Text container (narrower) */
.prose {
  max-width: var(--container-content);
}

/* Card grid */
.services-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: var(--space-6);
}

/* Component spacing */
.card {
  padding: var(--space-6);
  border-radius: var(--space-3);
}

.stack > * + * {
  margin-top: var(--space-4);
}
```text

## Related Skills

- `design-direction.md` - Overall visual approach
- `build/mobile-first.md` - Responsive spacing
- `qa/visual-qa.md` - Checking spacing consistency
