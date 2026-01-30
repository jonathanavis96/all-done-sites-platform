# Analytics and Tracking

Sets up GA4, conversion tracking, and event tracking to measure site performance.

## Quick Reference

| Tool | Purpose | Privacy |
| ------ | --------- | --------- |
| **GA4** | Full analytics | Requires consent in EU |
| **Plausible** | Privacy-focused | No consent needed |
| **Fathom** | Privacy-focused | No consent needed |
| **Vercel Analytics** | Core Web Vitals | Minimal data |
| **PostHog** | Product analytics | Self-host option |

## Trigger Conditions

Use this skill when:

- Launching any website
- Need to track conversions
- Want to understand user behavior
- Measuring marketing effectiveness

## GA4 Setup

### Basic Installation

```html
<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXX"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-XXXXXXXX');
</script>
```text

### Astro Integration

```astro
---
// BaseLayout.astro
const GA_ID = import.meta.env.PUBLIC_GA_ID;
---
<head>
  {GA_ID && (
    <>
      <script async src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}></script>
      <script define:vars={{ GA_ID }}>
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', GA_ID);
      </script>
    </>
  )}
</head>
```text

### With Cookie Consent

```html
<script>
  // Only load GA after consent
  if (localStorage.getItem('analytics-consent') === 'true') {
    loadGA();
  }
  
  function loadGA() {
    const script = document.createElement('script');
    script.src = 'https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXX';
    script.async = true;
    document.head.appendChild(script);
    
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', 'G-XXXXXXXX');
  }
</script>
```text

## Privacy-Focused Alternative: Plausible

```html
<!-- Plausible - no cookies, GDPR-compliant -->
<script defer data-domain="yoursite.com" src="https://plausible.io/js/script.js"></script>
```text

### Track Custom Events (Plausible)

```html
<a href="/contact" onclick="plausible('CTA Click', {props: {location: 'hero'}})">
  Book Now
</a>

<!-- Or via JS -->
<script>
  plausible('Form Submit', {props: {form: 'contact'}});
</script>
```text

## Conversion Tracking

### Define Conversions

| Conversion | Event Name | Value |
| ------------ | ------------ | ------- |
| Contact form submit | `form_submit` | High |
| Phone click | `phone_click` | Medium |
| Email click | `email_click` | Medium |
| CTA click | `cta_click` | Low |

### GA4 Event Tracking

```javascript
// Track CTA clicks
document.querySelectorAll('[data-track-cta]').forEach(el => {
  el.addEventListener('click', () => {
    gtag('event', 'cta_click', {
      'event_category': 'engagement',
      'event_label': el.dataset.trackCta
    });
  });
});

// Track form submissions
document.querySelector('form').addEventListener('submit', () => {
  gtag('event', 'form_submit', {
    'event_category': 'conversion',
    'event_label': 'contact_form'
  });
});

// Track phone clicks
document.querySelectorAll('a[href^="tel:"]').forEach(el => {
  el.addEventListener('click', () => {
    gtag('event', 'phone_click', {
      'event_category': 'conversion'
    });
  });
});
```text

### Track Outbound Links

```javascript
document.querySelectorAll('a[href^="http"]').forEach(link => {
  if (!link.href.includes(window.location.hostname)) {
    link.addEventListener('click', () => {
      gtag('event', 'outbound_click', {
        'event_category': 'engagement',
        'event_label': link.href
      });
    });
  }
});
```text

## Google Tag Manager (GTM)

For complex tracking needs, use GTM:

```html
<!-- GTM Container -->
<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-XXXXXXX');</script>

<!-- GTM noscript (after body tag) -->
<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-XXXXXXX"
height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
```text

Then configure triggers and tags in GTM interface.

## Key Metrics to Track

### For Service Business (Therapy Practice)

```markdown
## Metrics Dashboard

### Traffic
- Sessions / Users
- Traffic sources
- Top pages

### Engagement
- Average session duration
- Pages per session
- Bounce rate

### Conversions (most important)
- Contact form submissions
- Phone clicks
- Email clicks
- Book Now button clicks

### Technical
- Core Web Vitals (LCP, CLS, FID)
- Page load time
- Mobile vs Desktop ratio
```text

## Setting Up Goals in GA4

1. Go to Admin → Events
2. Mark conversion events:
   - `form_submit` → Mark as conversion
   - `phone_click` → Mark as conversion
3. Set up custom events via GTM or code

## UTM Tracking

Track marketing campaigns:

```text
https://jacquihowles.com/?utm_source=google&utm_medium=cpc&utm_campaign=therapy-johannesburg
```text

| Parameter | Purpose | Example |
| ----------- | --------- | --------- |
| `utm_source` | Traffic source | google, facebook, newsletter |
| `utm_medium` | Marketing medium | cpc, email, social |
| `utm_campaign` | Campaign name | spring-promo |
| `utm_content` | Ad variation | blue-button |

## Common Mistakes

| Mistake | Why It's Wrong | Do This Instead |
| --------- | ---------------- | ----------------- |
| No analytics at all | Flying blind | Add basic tracking |
| Tracking everything | Data overload | Track meaningful conversions |
| No conversion goals | Can't measure success | Define 2-3 key conversions |
| Ignoring privacy | Legal issues, trust | Use consent or privacy-focused |
| Not testing | Broken tracking | Verify events fire |
| Only pageviews | Missing insights | Track CTA clicks, forms |

## Testing Your Tracking

### GA4 DebugView

1. Install Google Analytics Debugger extension
2. Visit your site
3. Check GA4 → Configure → DebugView

### Browser Console

```javascript
// Check if gtag is loaded
console.log(typeof gtag); // Should be 'function'

// Check dataLayer
console.log(window.dataLayer);
```text

### Real-Time Reports

GA4 → Reports → Realtime → See events as they happen

## Example

**Project:** Psychology practice website

```astro
---
// BaseLayout.astro
const isProd = import.meta.env.PROD;
---
<head>
  <!-- Plausible (privacy-focused, no consent needed) -->
  {isProd && (
    <script 
      defer 
      data-domain="jacquihowles.com" 
      src="https://plausible.io/js/script.js"
    ></script>
  )}
</head>

<body>
  <slot />
  
  {isProd && (
    <script>
      // Track CTA clicks
      document.querySelectorAll('[data-track]').forEach(el => {
        el.addEventListener('click', () => {
          if (window.plausible) {
            plausible(el.dataset.track);
          }
        });
      });
      
      // Track phone clicks
      document.querySelectorAll('a[href^="tel:"]').forEach(el => {
        el.addEventListener('click', () => {
          if (window.plausible) {
            plausible('Phone Click');
          }
        });
      });
    </script>
  )}
</body>
```text

Usage in components:

```astro
<Button href="/contact" data-track="Book Consultation Click">
  Book Your First Session
</Button>

<a href="tel:+27123456789" class="...">
  Call Now
</a>
```text

## Related Skills

- `forms-integration.md` - Track form submissions
- `copywriting/cta-optimizer.md` - What to track
- `launch/deployment.md` - Environment variables for tracking IDs
- `qa/acceptance-criteria.md` - Verify tracking works
- `../../marketing/growth/analytics-tracking.md` - Advanced analytics setup and measurement
- `../../marketing/cro/ab-test-setup.md` - A/B testing with analytics
