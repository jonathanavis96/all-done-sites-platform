# Visual QA

Checks alignment, padding, inconsistent font sizes, contrast issues, and spacing drift.

## Quick Reference

| Check | What to Look For |
|-------|------------------|
| Alignment | Elements line up on grid |
| Spacing | Consistent padding/margins |
| Typography | Correct sizes, weights, line-heights |
| Colors | Match design system, sufficient contrast |
| Responsive | No breaks at any viewport |

## Trigger Conditions

Use this skill when:

- Build is "complete" but before launch
- Design review with client
- Something feels "off" but unclear what
- After making changes (regression check)

## Visual QA Checklist

### Typography

```markdown
- [ ] Headings use correct font family
- [ ] Headings use correct sizes (H1 > H2 > H3)
- [ ] Body text is readable (16px+ on mobile)
- [ ] Line height comfortable (1.5+ for body)
- [ ] No orphaned words in headings
- [ ] No widows (single words on last line)
- [ ] Text doesn't touch edges
```text

### Spacing

```markdown
- [ ] Consistent section padding
- [ ] Consistent component spacing
- [ ] No elements touching unexpectedly
- [ ] Breathing room around text
- [ ] Cards have equal padding
- [ ] Button padding consistent
```text

### Alignment

```markdown
- [ ] Text aligns to grid
- [ ] Images align with content
- [ ] Cards in rows align tops/bottoms
- [ ] Form labels align with inputs
- [ ] Nav items evenly spaced
- [ ] Footer columns align
```text

### Colors

```markdown
- [ ] Colors match design system
- [ ] Text has sufficient contrast (4.5:1)
- [ ] Links are distinguishable
- [ ] Hover states visible
- [ ] Focus states visible
- [ ] Error states red/visible
- [ ] Success states green/visible
```text

### Images

```markdown
- [ ] Images not stretched/squished
- [ ] Images not pixelated
- [ ] Consistent image aspect ratios
- [ ] Images have alt text
- [ ] Placeholder images replaced
```text

### Components

```markdown
- [ ] Buttons consistent size/style
- [ ] Cards consistent style
- [ ] Icons consistent size/style
- [ ] Forms styled consistently
- [ ] Links styled consistently
```text

## Responsive Checkpoints

Test at these widths:

| Width | Device |
|-------|--------|
| 320px | Small phone |
| 375px | iPhone SE/mini |
| 390px | iPhone 14 |
| 768px | Tablet portrait |
| 1024px | Tablet landscape / small desktop |
| 1280px | Desktop |
| 1440px | Large desktop |
| 1920px | Full HD |

### What Breaks

```markdown
- [ ] No horizontal scroll at any width
- [ ] Text doesn't overflow containers
- [ ] Images scale properly
- [ ] Navigation works at all sizes
- [ ] Buttons/CTAs accessible
- [ ] Forms usable
- [ ] Tables scroll or stack
```text

## Common Visual Bugs

### Spacing Issues

```css
/* Problem: Inconsistent margins */
.card { margin: 20px; }
.card:nth-child(2) { margin: 15px; } /* Oops */

/* Fix: Use spacing scale */
.card { margin: var(--space-4); }
```text

### Typography Issues

```css
/* Problem: Random font sizes */
.heading { font-size: 32px; }
.other-heading { font-size: 30px; } /* Inconsistent */

/* Fix: Use type scale */
.heading { font-size: var(--text-3xl); }
```text

### Alignment Issues

```css
/* Problem: Misaligned content */
.container { padding-left: 20px; }
.other-section { padding-left: 16px; } /* Different! */

/* Fix: Consistent container */
.container { padding: 0 var(--space-4); }
```text

## Testing Tools

### Browser DevTools

- Toggle device toolbar (Ctrl/Cmd + Shift + M)
- Test responsive breakpoints
- Inspect computed styles

### Visual Regression Tools

- Percy (percy.io)
- Chromatic (chromatic.com)
- BackstopJS (open source)

### Design Comparison

- Overlay design in browser (Figma plugin)
- PixelPerfect extension

### Accessibility Checks

- axe DevTools extension
- WAVE extension
- Lighthouse accessibility audit

## Process

### 1. Full Page Scroll

Scroll through entire page slowly. Look for:

- Spacing jumps
- Alignment shifts
- Color inconsistencies

### 2. Resize Window

Drag browser width narrow to wide. Look for:

- Layout breaks
- Text overflow
- Image issues

### 3. Component Audit

Check each component type:

- All buttons
- All cards
- All headings
- All forms

### 4. Interactive States

Test:

- Hover states
- Focus states (tab through)
- Active/pressed states

### 5. Dark Mode (if applicable)

- Colors adapt correctly
- Contrast maintained
- Images work

## Common Mistakes

| Mistake | Why It's Wrong | Do This Instead |
|---------|----------------|-----------------|
| Only checking one breakpoint | Bugs at other sizes | Test all breakpoints |
| Eyeballing alignment | Miss small issues | Use grid overlay |
| Ignoring hover states | Incomplete UX | Test all states |
| Skipping keyboard nav | Accessibility gap | Tab through page |
| Not checking real devices | Emulators miss things | Test on phone/tablet |

## Example

**Project:** Psychology practice website

```markdown
## Visual QA: Homepage

### Typography ✓
- [x] H1: DM Sans Bold, 48px desktop / 30px mobile
- [x] H2: DM Sans Semibold, 36px / 24px
- [x] Body: Inter, 16px, line-height 1.6
- [x] Trust line: 14px, gray-500

### Spacing ✓
- [x] Section padding: 96px desktop / 48px mobile
- [x] Container max-width: 1200px
- [x] Card gap: 24px
- [x] Stack spacing: 16px

### Colors ✓
- [x] Primary green: #7C9885 ✓
- [x] Text: #292524 (gray-800) ✓
- [x] Background: #FDFCFA (warm white) ✓
- [x] Contrast check: All pass WCAG AA

### Responsive ✓
- [x] 320px: No overflow, readable
- [x] 375px: Good
- [x] 768px: 2-column grid works
- [x] 1024px: Full layout
- [x] 1440px: Centered, not stretched

### Components ✓
- [x] Primary button: Consistent across page
- [x] Cards: Equal padding, aligned
- [x] Testimonials: Quote styling consistent

### Issues Found
1. ~~FAQ accordion arrow misaligned~~ → Fixed
2. ~~Mobile nav too close to edge~~ → Added padding
```text

## Related Skills

- `acceptance-criteria.md` - Overall done criteria
- `accessibility.md` - Overlapping concerns
- `design/spacing-layout.md` - Spacing reference
- `design/typography-system.md` - Type reference
