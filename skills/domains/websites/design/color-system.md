# Color System

Creates cohesive color palette with primary, secondary, accent, and neutral colors plus semantic colors for states.

## Quick Reference

| Color Role | Usage | Example |
|------------|-------|---------|
| **Primary** | Brand color, main CTAs, links | Blue, Green, Purple |
| **Secondary** | Supporting elements, backgrounds | Lighter/complementary |
| **Accent** | Highlights, hover states | Contrasting pop |
| **Neutrals** | Text, backgrounds, borders | Gray scale |
| **Success** | Confirmations, positive | Green |
| **Warning** | Cautions, alerts | Yellow/Orange |
| **Error** | Errors, destructive | Red |

## Trigger Conditions

Use this skill when:

- Creating new design system
- Colors feel random or clashing
- Accessibility contrast failing
- Brand colors need expansion

## Procedure

### 1. Start with Brand Color

If client has brand color, use it as primary. If not, choose based on:

| Industry | Suggested Colors | Psychology |
|----------|------------------|------------|
| Healthcare/Therapy | Blue, Green, Teal | Trust, calm, growth |
| Finance | Blue, Navy, Green | Trust, stability, prosperity |
| Tech/SaaS | Blue, Purple, Cyan | Innovation, reliability |
| Creative | Any bold, often purple/orange | Creativity, energy |
| Eco/Wellness | Green, Earth tones | Nature, health |
| Luxury | Black, Gold, Muted tones | Elegance, exclusivity |

### 2. Generate Palette

```markdown
## Color Palette Structure

**Primary (Brand)**
- 50: Very light tint
- 100: Light tint
- 200: Lighter
- 300: Light
- 400: Light-medium
- 500: Base (your brand color)
- 600: Medium-dark
- 700: Dark
- 800: Darker
- 900: Very dark
- 950: Near black

**Secondary** (complementary or analogous)
- Same 50-950 scale

**Neutrals** (gray scale)
- 50: Near white (#F9FAFB)
- 100: Lightest (#F3F4F6)
- 200-800: Range
- 900: Near black (#111827)
- 950: Darkest
```text

### 3. Define Semantic Colors

```css
/* Semantic colors */
--color-success: #10B981;
--color-warning: #F59E0B;
--color-error: #EF4444;
--color-info: #3B82F6;
```text

### 4. Check Contrast

| Text/Background | Minimum Ratio | WCAG Level |
|-----------------|---------------|------------|
| Normal text | 4.5:1 | AA |
| Large text (18px+) | 3:1 | AA |
| UI components | 3:1 | AA |
| Enhanced | 7:1 | AAA |

Use: <https://webaim.org/resources/contrastchecker/>

## Color Palette Templates

### Calm & Professional (Therapy/Healthcare)

```css
/* Primary - Sage Green */
--primary-50: #F0F5F1;
--primary-100: #D9E6DB;
--primary-500: #7C9885;
--primary-600: #5F7A68;
--primary-900: #2D3B31;

/* Secondary - Warm Cream */
--secondary-50: #FDFCFA;
--secondary-100: #F5F1EB;
--secondary-500: #C4B5A0;

/* Accent - Soft Terracotta */
--accent-500: #C4A484;

/* Neutrals - Warm Gray */
--gray-50: #FAFAF9;
--gray-500: #78716C;
--gray-900: #292524;
```text

### Modern & Clean (SaaS/Tech)

```css
/* Primary - Blue */
--primary-50: #EFF6FF;
--primary-500: #3B82F6;
--primary-600: #2563EB;
--primary-900: #1E3A8A;

/* Secondary - Slate */
--secondary-100: #F1F5F9;
--secondary-500: #64748B;

/* Accent - Violet */
--accent-500: #8B5CF6;

/* Neutrals - Slate */
--gray-50: #F8FAFC;
--gray-500: #64748B;
--gray-900: #0F172A;
```text

### Warm & Friendly (Local Business)

```css
/* Primary - Warm Orange */
--primary-50: #FFF7ED;
--primary-500: #F97316;
--primary-600: #EA580C;

/* Secondary - Cream */
--secondary-100: #FEF3C7;
--secondary-500: #D97706;

/* Neutrals - Warm */
--gray-50: #FAFAF9;
--gray-500: #78716C;
--gray-900: #1C1917;
```text

## Usage Guidelines

```css
/* Background usage */
--bg-page: var(--gray-50);
--bg-card: white;
--bg-muted: var(--gray-100);
--bg-accent: var(--primary-50);

/* Text usage */
--text-primary: var(--gray-900);
--text-secondary: var(--gray-600);
--text-muted: var(--gray-500);
--text-inverse: white;

/* Border usage */
--border-default: var(--gray-200);
--border-muted: var(--gray-100);
--border-accent: var(--primary-500);

/* Interactive */
--button-primary-bg: var(--primary-500);
--button-primary-hover: var(--primary-600);
--link-color: var(--primary-600);
--link-hover: var(--primary-700);
```text

## Common Mistakes

| Mistake | Why It's Wrong | Do This Instead |
|---------|----------------|-----------------|
| Pure black text (#000) | Too harsh | Use gray-900 (#111827) |
| Pure white bg (#FFF) | Can strain eyes | Use gray-50 or off-white |
| Too many colors | Chaotic | 1 primary + 1 accent max |
| Ignoring contrast | Inaccessible | Check WCAG ratios |
| No color for states | Users confused | Define hover/focus/active |
| Using color alone for meaning | Accessibility issue | Add icons/text too |

## Example

**Project:** Psychology practice website

```css
:root {
  /* Primary - Sage Green (calm, growth) */
  --primary-50: #F0F5F1;
  --primary-100: #D9E6DB;
  --primary-200: #B5CEB9;
  --primary-300: #91B698;
  --primary-400: #6D9E76;
  --primary-500: #7C9885; /* Base */
  --primary-600: #5F7A68;
  --primary-700: #4A5F51;
  --primary-800: #35443B;
  --primary-900: #202924;

  /* Secondary - Warm Cream (approachable) */
  --secondary-50: #FDFCFA;
  --secondary-100: #F5F1EB;
  --secondary-200: #E8E0D5;
  --secondary-500: #C4B5A0;

  /* Accent - Soft Terracotta (warmth) */
  --accent-400: #D4B494;
  --accent-500: #C4A484;
  --accent-600: #A88B6D;

  /* Neutrals - Warm Charcoal */
  --gray-50: #FAFAF9;
  --gray-100: #F5F5F4;
  --gray-200: #E7E5E4;
  --gray-300: #D6D3D1;
  --gray-400: #A8A29E;
  --gray-500: #78716C;
  --gray-600: #57534E;
  --gray-700: #44403C;
  --gray-800: #292524;
  --gray-900: #1C1917;

  /* Semantic */
  --success: #10B981;
  --warning: #F59E0B;
  --error: #EF4444;

  /* Applied */
  --bg-page: var(--secondary-50);
  --bg-card: white;
  --text-primary: var(--gray-800);
  --text-secondary: var(--gray-600);
  --border-default: var(--gray-200);
  --button-primary: var(--primary-500);
  --button-hover: var(--primary-600);
}
```text

## Related Skills

- `design-direction.md` - Overall visual approach
- `typography-system.md` - Text colors
- `qa/accessibility.md` - Color contrast requirements
