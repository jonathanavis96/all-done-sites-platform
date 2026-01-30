# Accessibility

Ensures WCAG 2.1 AA compliance: contrast, focus states, keyboard navigation, screen reader support.

## Quick Reference

| Requirement | WCAG Level | Target |
|-------------|------------|--------|
| Color contrast (text) | AA | 4.5:1 minimum |
| Color contrast (large text) | AA | 3:1 minimum |
| Color contrast (UI) | AA | 3:1 minimum |
| Focus visible | AA | Clear focus indicator |
| Keyboard accessible | A | All functions via keyboard |
| Alt text | A | All meaningful images |

## Trigger Conditions

Use this skill when:

- Building any website (accessibility is required, not optional)
- Lighthouse accessibility score < 90
- Users report issues
- Legal compliance needed

## Core Requirements

### 1. Color Contrast

**Text contrast must be 4.5:1 minimum**

```css
/* ✅ Good contrast */
color: #1f2937; /* gray-800 */
background: #ffffff;
/* Contrast: 16:1 ✓ */

/* ❌ Bad contrast */
color: #9ca3af; /* gray-400 */
background: #ffffff;
/* Contrast: 2.5:1 ✗ */
```text

**Test with:**

- <https://webaim.org/resources/contrastchecker/>
- Chrome DevTools (inspect element → color picker)

### 2. Keyboard Navigation

All interactive elements must be reachable via Tab key.

```html
<!-- Natural tab order -->
<nav>
  <a href="/">Home</a>        <!-- Tab 1 -->
  <a href="/about">About</a>  <!-- Tab 2 -->
  <a href="/contact">Contact</a> <!-- Tab 3 -->
</nav>

<!-- Skip link for keyboard users -->
<a href="#main-content" class="skip-link">
  Skip to main content
</a>

<main id="main-content">
  <!-- Content -->
</main>
```text

```css
/* Skip link - hidden until focused */
.skip-link {
  position: absolute;
  top: -40px;
  left: 0;
  padding: 8px;
  background: #000;
  color: #fff;
  z-index: 100;
}

.skip-link:focus {
  top: 0;
}
```text

### 3. Focus States

**Every focusable element needs visible focus indicator**

```css
/* ✅ Good: Custom focus style */
a:focus,
button:focus {
  outline: 2px solid var(--primary-500);
  outline-offset: 2px;
}

/* ❌ Bad: Removing focus outline */
*:focus {
  outline: none; /* Never do this! */
}

/* ✅ Better: focus-visible for mouse users */
a:focus-visible,
button:focus-visible {
  outline: 2px solid var(--primary-500);
  outline-offset: 2px;
}
```text

### 4. Alt Text

**All meaningful images need alt text**

```html
<!-- ✅ Meaningful image -->
<img src="/jacqui.jpg" alt="Jacqui Howles, counselling psychologist" />

<!-- ✅ Decorative image (empty alt) -->
<img src="/decorative-pattern.svg" alt="" />

<!-- ❌ Bad alt text -->
<img src="/jacqui.jpg" alt="image" />
<img src="/jacqui.jpg" alt="photo.jpg" />
<img src="/jacqui.jpg" /> <!-- Missing! -->
```text

### 5. Semantic HTML

```html
<!-- ✅ Use semantic elements -->
<header>
  <nav>...</nav>
</header>

<main>
  <article>
    <h1>Page Title</h1>
    <section>
      <h2>Section Title</h2>
    </section>
  </article>
</main>

<footer>...</footer>

<!-- ❌ Div soup -->
<div class="header">
  <div class="nav">...</div>
</div>
```text

### 6. Form Accessibility

```html
<form>
  <!-- Associate label with input -->
  <div>
    <label for="email">Email address</label>
    <input 
      type="email" 
      id="email" 
      name="email"
      required
      aria-required="true"
      aria-describedby="email-hint"
    />
    <p id="email-hint" class="hint">We'll never share your email</p>
  </div>
  
  <!-- Error messages -->
  <div>
    <label for="phone">Phone</label>
    <input 
      type="tel" 
      id="phone" 
      aria-invalid="true"
      aria-describedby="phone-error"
    />
    <p id="phone-error" class="error" role="alert">
      Please enter a valid phone number
    </p>
  </div>
  
  <!-- Clear submit button -->
  <button type="submit">Send Message</button>
</form>
```text

### 7. Heading Hierarchy

```html
<!-- ✅ Correct hierarchy -->
<h1>Page Title</h1>
  <h2>Section</h2>
    <h3>Subsection</h3>
  <h2>Another Section</h2>

<!-- ❌ Skipping levels -->
<h1>Page Title</h1>
  <h3>Subsection</h3> <!-- Skipped h2! -->
```text

## ARIA When Needed

Only use ARIA when HTML semantics aren't enough:

```html
<!-- Accordion -->
<button 
  aria-expanded="false" 
  aria-controls="faq-1"
>
  Question text
</button>
<div id="faq-1" hidden>
  Answer text
</div>

<!-- Modal -->
<div 
  role="dialog" 
  aria-labelledby="modal-title"
  aria-modal="true"
>
  <h2 id="modal-title">Modal Title</h2>
</div>

<!-- Loading state -->
<div aria-live="polite" aria-busy="true">
  Loading...
</div>
```text

## Testing Accessibility

### Automated Tools

```bash
# Lighthouse (built into Chrome)
# DevTools → Lighthouse → Accessibility

# axe-core CLI
npx @axe-core/cli https://yoursite.com
```text

### Browser Extensions

- axe DevTools
- WAVE
- Accessibility Insights

### Manual Testing

1. **Keyboard only:** Tab through entire page
2. **Screen reader:** Test with VoiceOver (Mac) or NVDA (Windows)
3. **Zoom:** 200% zoom, still usable?
4. **Color:** Grayscale mode, still understandable?

## Accessibility Checklist

```markdown
## Accessibility Audit

### Perceivable
- [ ] Color contrast 4.5:1 for text
- [ ] Color contrast 3:1 for UI elements
- [ ] Images have alt text
- [ ] Videos have captions (if applicable)
- [ ] Content readable at 200% zoom

### Operable
- [ ] All functions keyboard accessible
- [ ] Focus visible on all interactive elements
- [ ] Skip link present
- [ ] No keyboard traps
- [ ] Touch targets 44px+ minimum

### Understandable
- [ ] Language set (<html lang="en">)
- [ ] Form labels present
- [ ] Error messages clear
- [ ] Consistent navigation
- [ ] Predictable interactions

### Robust
- [ ] Valid HTML
- [ ] Semantic elements used
- [ ] ARIA used correctly (if at all)
- [ ] Works with screen readers
```text

## Common Mistakes

| Mistake | Impact | Fix |
|---------|--------|-----|
| `outline: none` | Keyboard users lost | Keep or replace focus style |
| Missing alt text | Screen readers skip | Add descriptive alt |
| Low contrast text | Unreadable for many | Check contrast ratios |
| Click-only interactions | Keyboard users excluded | Add keyboard support |
| Missing form labels | Confusing for screen readers | Associate labels |
| Color-only meaning | Colorblind users miss info | Add text/icons too |

## Example

**Project:** Psychology practice website

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Jacqui Howles | Counselling Psychologist in Johannesburg</title>
</head>
<body>
  <!-- Skip link -->
  <a href="#main" class="skip-link">Skip to main content</a>
  
  <header>
    <nav aria-label="Main navigation">
      <a href="/" aria-current="page">Home</a>
      <a href="/about">About</a>
      <a href="/services">Services</a>
      <a href="/contact">Contact</a>
    </nav>
  </header>
  
  <main id="main">
    <section aria-labelledby="hero-heading">
      <h1 id="hero-heading">Find your calm. Rebuild your confidence.</h1>
      <p>Professional therapy for anxiety, trauma, and life transitions.</p>
      <a href="/contact" class="button">Book Your First Session</a>
    </section>
    
    <section aria-labelledby="services-heading">
      <h2 id="services-heading">Services</h2>
      <!-- Service cards -->
    </section>
  </main>
  
  <footer>
    <p>© 2026 Jacqui Howles Psychology</p>
    <p>HPCSA Registration: PS XXXXX</p>
  </footer>
</body>
</html>
```text

```css
/* Focus styles */
a:focus-visible,
button:focus-visible {
  outline: 2px solid var(--primary-500);
  outline-offset: 2px;
}

/* Skip link */
.skip-link {
  position: absolute;
  top: -100%;
  left: 16px;
  padding: 8px 16px;
  background: var(--gray-900);
  color: white;
  z-index: 100;
  border-radius: 4px;
}

.skip-link:focus {
  top: 16px;
}
```text

## Related Skills

- `visual-qa.md` - Overlapping visual checks
- `design/color-system.md` - Choosing accessible colors
- `build/forms-integration.md` - Accessible forms
- `acceptance-criteria.md` - Include accessibility in criteria
