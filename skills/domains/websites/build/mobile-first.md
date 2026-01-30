# Mobile-First Development

Designs and builds for mobile screens first, then enhances for larger screens.

## Quick Reference

| Breakpoint | Name | Target |
|------------|------|--------|
| Default | Mobile | < 640px |
| `sm:` | Small | ≥ 640px |
| `md:` | Medium | ≥ 768px |
| `lg:` | Large | ≥ 1024px |
| `xl:` | Extra large | ≥ 1280px |
| `2xl:` | 2X large | ≥ 1536px |

## Trigger Conditions

Use this skill when:

- Building any website (60%+ traffic is mobile)
- Layout breaks on small screens
- Text too small or buttons too close
- Navigation unusable on mobile

## Mobile-First Principle

```css
/* START with mobile styles (no media query) */
.card {
  padding: 1rem;
  flex-direction: column;
}

/* THEN enhance for larger screens */
@media (min-width: 768px) {
  .card {
    padding: 2rem;
    flex-direction: row;
  }
}
```text

**NOT** desktop-first:

```css
/* ❌ DON'T DO THIS */
.card {
  padding: 2rem;
  flex-direction: row;
}

@media (max-width: 768px) {
  .card {
    padding: 1rem;
    flex-direction: column;
  }
}
```text

## Common Patterns

### Navigation

```astro
<!-- Mobile: hamburger menu -->
<nav>
  <div class="flex justify-between items-center p-4">
    <Logo />
    <button class="md:hidden" id="menu-toggle">☰</button>
    
    <!-- Desktop: inline links -->
    <div class="hidden md:flex gap-6">
      <a href="/">Home</a>
      <a href="/about">About</a>
      <a href="/services">Services</a>
      <a href="/contact">Contact</a>
    </div>
  </div>
  
  <!-- Mobile menu (hidden by default) -->
  <div id="mobile-menu" class="hidden md:hidden">
    <a href="/" class="block p-4 border-t">Home</a>
    <a href="/about" class="block p-4 border-t">About</a>
    <!-- ... -->
  </div>
</nav>
```text

### Grid Layout

```html
<!-- 1 column mobile, 2 tablet, 3 desktop -->
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  <Card />
  <Card />
  <Card />
</div>
```text

### Hero Section

```html
<!-- Stack on mobile, side-by-side on desktop -->
<section class="hero">
  <div class="flex flex-col lg:flex-row gap-8 items-center">
    <div class="w-full lg:w-1/2">
      <h1 class="text-3xl md:text-4xl lg:text-5xl">Headline</h1>
      <p class="text-lg md:text-xl">Subheadline</p>
      <Button>CTA</Button>
    </div>
    <div class="w-full lg:w-1/2">
      <img src="/hero.jpg" alt="" class="w-full rounded-lg" />
    </div>
  </div>
</section>
```text

### Typography Scaling

```css
h1 {
  font-size: 1.875rem; /* 30px mobile */
}

@media (min-width: 768px) {
  h1 {
    font-size: 2.25rem; /* 36px tablet */
  }
}

@media (min-width: 1024px) {
  h1 {
    font-size: 3rem; /* 48px desktop */
  }
}

/* Or use clamp() */
h1 {
  font-size: clamp(1.875rem, 4vw, 3rem);
}
```text

### Spacing

```css
section {
  padding: 3rem 1rem; /* Mobile */
}

@media (min-width: 768px) {
  section {
    padding: 5rem 2rem; /* Tablet+ */
  }
}
```text

## Touch Targets

Minimum touch target: **44x44px** (Apple) or **48x48px** (Google)

```css
/* Buttons and links need adequate size */
button, .nav-link {
  min-height: 44px;
  padding: 12px 16px;
}

/* Spacing between clickable items */
.nav-link + .nav-link {
  margin-top: 8px; /* Prevent mis-taps */
}
```text

## Mobile Checklist

```markdown
## Mobile QA Checklist

### Navigation
- [ ] Menu accessible via hamburger icon
- [ ] Menu items have adequate tap targets (44px+)
- [ ] Logo links to home

### Content
- [ ] Text readable without zooming (16px+ body)
- [ ] Images scale properly
- [ ] No horizontal scroll
- [ ] Forms usable (input sizes, labels)

### CTAs
- [ ] Primary CTA visible without scroll
- [ ] Buttons full-width or large enough to tap
- [ ] Adequate spacing between buttons

### Performance
- [ ] Page loads in < 3 seconds on 3G
- [ ] Images optimized for mobile
- [ ] No layout shift (CLS)

### Interactions
- [ ] Dropdowns/accordions work on tap
- [ ] No hover-only interactions
- [ ] Form validation shows on mobile
```text

## Common Mistakes

| Mistake | Why It's Wrong | Do This Instead |
|---------|----------------|-----------------|
| Desktop-first CSS | Mobile becomes afterthought | Start with mobile styles |
| Hover-only states | No hover on touch | Add focus/active states |
| Tiny touch targets | Hard to tap, frustrating | 44px minimum |
| Fixed widths | Breaks on narrow screens | Use %, max-width, flex |
| Hidden content on mobile | Users miss information | Prioritize, don't hide |
| Huge images | Slow load | Responsive images, srcset |

## Testing

1. **Chrome DevTools** - Toggle device toolbar (Ctrl+Shift+M)
2. **Real devices** - Test on actual phones
3. **Responsively app** - See all breakpoints at once
4. **Lighthouse** - Mobile performance audit

## Example

**Project:** Psychology practice website

```astro
<!-- Hero section - mobile-first -->
<section class="py-12 md:py-20 lg:py-24 px-4 md:px-8">
  <div class="max-w-6xl mx-auto">
    <div class="flex flex-col lg:flex-row gap-8 lg:gap-12 items-center">
      
      <!-- Content - full width mobile, half desktop -->
      <div class="w-full lg:w-1/2 text-center lg:text-left">
        <h1 class="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
          Find your calm. Rebuild your confidence.
        </h1>
        <p class="text-lg md:text-xl text-gray-600 mb-6">
          Professional therapy for anxiety, trauma, and life transitions — 
          online or in-person in Johannesburg.
        </p>
        <p class="text-sm text-gray-500 mb-6">
          HPCSA Registered Psychologist | 10+ Years Experience
        </p>
        
        <!-- CTA - full width on mobile -->
        <Button href="/contact" class="w-full sm:w-auto">
          Book Your First Session
        </Button>
      </div>
      
      <!-- Image - full width, shows below on mobile -->
      <div class="w-full lg:w-1/2">
        <img 
          src="/jacqui.jpg" 
          alt="Jacqui Howles" 
          class="w-full max-w-md mx-auto rounded-2xl shadow-lg"
        />
      </div>
    </div>
  </div>
</section>
```text

## Related Skills

- `component-development.md` - Building responsive components
- `performance.md` - Mobile performance optimization
- `design/spacing-layout.md` - Responsive spacing
- `qa/visual-qa.md` - Testing across devices
