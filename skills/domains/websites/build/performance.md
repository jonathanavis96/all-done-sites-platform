# Performance Optimization

Optimizes for Core Web Vitals and fast load times across all devices.

## Quick Reference

| Metric | Target | What It Measures |
| ------ | ------ | ---------------- |
| **LCP** (Largest Contentful Paint) | < 2.5s | Loading speed |
| **FID** (First Input Delay) | < 100ms | Interactivity |
| **CLS** (Cumulative Layout Shift) | < 0.1 | Visual stability |
| **TTFB** (Time to First Byte) | < 800ms | Server response |
| **Lighthouse Score** | 90+ | Overall performance |

## Trigger Conditions

Use this skill when:

- Lighthouse score below 90
- Page feels slow to load
- Layout jumps around during load
- Mobile performance is poor

## Core Web Vitals Optimization

### LCP (Largest Contentful Paint)

The largest image or text block must render quickly.

**Fixes:**

```html
<!-- Preload hero image -->
<link rel="preload" as="image" href="/hero.webp" />

<!-- Use modern formats -->
<picture>
  <source srcset="/hero.avif" type="image/avif" />
  <source srcset="/hero.webp" type="image/webp" />
  <img src="/hero.jpg" alt="" width="800" height="600" />
</picture>

<!-- Inline critical CSS -->
<style>
  .hero { /* critical styles */ }
</style>
```text

### FID / INP (Interaction Responsiveness)

Page must respond to clicks/taps immediately.

**Fixes:**

```html
<!-- Defer non-critical JavaScript -->
<script src="/analytics.js" defer></script>

<!-- Use async for independent scripts -->
<script src="/chat-widget.js" async></script>

<!-- Avoid long tasks (>50ms) in JS -->
```text

### CLS (Cumulative Layout Shift)

Elements shouldn't jump around during load.

**Fixes:**

```html
<!-- Always set dimensions on images -->
<img src="/photo.jpg" width="800" height="600" alt="" />

<!-- Reserve space for dynamic content -->
<div style="aspect-ratio: 16/9;">
  <img src="/video-thumb.jpg" loading="lazy" alt="" />
</div>

<!-- Use font-display: swap for web fonts -->
<style>
  @font-face {
    font-family: 'CustomFont';
    src: url('/font.woff2') format('woff2');
    font-display: swap;
  }
</style>
```text

## Image Optimization

### Format Selection

| Format | Use For | Savings |
| ------ | ------- | ------- |
| **WebP** | Photos, general use | 25-35% smaller than JPEG |
| **AVIF** | Best compression | 50% smaller than JPEG |
| **SVG** | Icons, logos | Scales infinitely |
| **PNG** | Transparency needed | Use sparingly |

### Responsive Images

```html
<img
  src="/hero-800.webp"
  srcset="
    /hero-400.webp 400w,
    /hero-800.webp 800w,
    /hero-1200.webp 1200w
  "
  sizes="(max-width: 768px) 100vw, 50vw"
  alt="Description"
  width="800"
  height="600"
  loading="lazy"
  decoding="async"
/>
```text

### Lazy Loading

```html
<!-- Native lazy loading for below-fold images -->
<img src="/photo.jpg" loading="lazy" alt="" />

<!-- Eager load above-fold (hero) images -->
<img src="/hero.jpg" loading="eager" fetchpriority="high" alt="" />
```text

## JavaScript Optimization

### Bundle Size

```javascript
// ✅ Import only what you need
import { format } from 'date-fns/format';

// ❌ Don't import entire library
import * as dateFns from 'date-fns';
```text

### Defer Non-Critical JS

```html
<!-- Analytics, chat widgets, etc. -->
<script src="/analytics.js" defer></script>

<!-- Or load after interaction -->
<script>
  document.addEventListener('scroll', () => {
    import('./heavy-feature.js');
  }, { once: true });
</script>
```text

### Astro: Zero JS by Default

```astro
<!-- Static by default - no JS shipped -->
<Button>Click Me</Button>

<!-- Add JS only when needed -->
<InteractiveWidget client:visible />
```text

## CSS Optimization

### Critical CSS

Inline styles needed for above-fold content.

```html
<head>
  <style>
    /* Only critical styles */
    .hero { ... }
    .nav { ... }
  </style>
  <!-- Load full CSS async -->
  <link rel="preload" href="/styles.css" as="style" onload="this.onload=null;this.rel='stylesheet'">
</head>
```text

### Reduce CSS Size

```css
/* Use Tailwind's purge - only ships used classes */
/* Configure in tailwind.config.js */
module.exports = {
  content: ['./src/**/*.{astro,html,js,jsx,ts,tsx}'],
}
```text

## Font Optimization

```html
<!-- Preload critical fonts -->
<link rel="preload" href="/fonts/inter.woff2" as="font" type="font/woff2" crossorigin />

<!-- Use font-display: swap -->
<style>
  @font-face {
    font-family: 'Inter';
    src: url('/fonts/inter.woff2') format('woff2');
    font-display: swap;
  }
</style>

<!-- Or use system fonts (fastest) -->
<style>
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }
</style>
```text

## Hosting & CDN

| Host | Features | Best For |
| ---- | -------- | -------- |
| **Vercel** | Edge, automatic optimization | Next.js, Astro |
| **Netlify** | CDN, easy deploys | Static sites |
| **Cloudflare Pages** | Global edge, fast | Any static |
| **AWS CloudFront** | Enterprise CDN | High traffic |

## Performance Checklist

```markdown
## Performance Audit

### Images
- [ ] All images in WebP/AVIF format
- [ ] Responsive srcset for different sizes
- [ ] Lazy loading on below-fold images
- [ ] Width/height attributes set (prevents CLS)
- [ ] Hero image preloaded

### JavaScript
- [ ] Minimal JS (or zero with Astro)
- [ ] Scripts deferred or async
- [ ] No render-blocking scripts
- [ ] Tree-shaking enabled

### CSS
- [ ] Critical CSS inlined
- [ ] Unused CSS removed (Tailwind purge)
- [ ] No render-blocking stylesheets

### Fonts
- [ ] font-display: swap
- [ ] Fonts preloaded or system fonts used
- [ ] Limited font weights (2-3 max)

### General
- [ ] GZIP/Brotli compression enabled
- [ ] Caching headers set
- [ ] CDN in use
- [ ] Lighthouse score 90+
```text

## Common Mistakes

| Mistake | Impact | Fix |
| ------- | ------ | --- |
| Unoptimized images | Slow LCP | Compress, use WebP |
| No image dimensions | CLS issues | Always set width/height |
| Too much JavaScript | Slow FID | Use Astro, defer scripts |
| Web fonts without swap | Flash of invisible text | font-display: swap |
| No lazy loading | Slow initial load | loading="lazy" |
| No CDN | Slow globally | Use Vercel/Netlify/CF |

## Testing Tools

- **Lighthouse** (Chrome DevTools > Lighthouse)
- **PageSpeed Insights** (web.dev/measure)
- **WebPageTest** (webpagetest.org)
- **Bundlephobia** (bundlephobia.com) - Check package sizes

## Example

**Project:** Psychology practice website

```astro
---
// Optimized homepage
import BaseLayout from '../layouts/BaseLayout.astro';
import Hero from '../components/sections/Hero.astro';
import Services from '../components/sections/Services.astro';
---

<BaseLayout>
  <!-- Preload hero image in head -->
  <link slot="head" rel="preload" as="image" href="/jacqui-hero.webp" />
  
  <Hero 
    headline="Find your calm. Rebuild your confidence."
    image="/jacqui-hero.webp"
  />
  
  <!-- Lazy load below-fold images -->
  <Services />
</BaseLayout>
```text

```astro
<!-- BaseLayout.astro head -->
<head>
  <!-- Critical CSS inlined -->
  <style>
    .hero { min-height: 80vh; }
    /* ... */
  </style>
  
  <!-- Preload font -->
  <link rel="preload" href="/fonts/dm-sans.woff2" as="font" type="font/woff2" crossorigin />
  
  <!-- Load full CSS -->
  <link rel="stylesheet" href="/styles.css" />
  
  <slot name="head" />
</head>
```text

## Related Skills

- `mobile-first.md` - Mobile performance
- `architecture/tech-stack-chooser.md` - Performance-focused choices
- `qa/acceptance-criteria.md` - Performance requirements
- `launch/deployment.md` - CDN and hosting
