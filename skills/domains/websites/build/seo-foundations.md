# SEO Foundations

Sets up technical SEO: titles, meta descriptions, heading structure, schema markup, and Open Graph tags.

## Quick Reference

| Element | Location | Length |
|---------|----------|--------|
| Title tag | `<title>` | 50-60 characters |
| Meta description | `<meta name="description">` | 150-160 characters |
| H1 | One per page | Unique, descriptive |
| URL | Path | Short, descriptive, hyphens |
| Image alt | `alt` attribute | Descriptive, 125 chars max |

## Trigger Conditions

Use this skill when:

- Building any website (SEO is non-negotiable)
- Pages not appearing in search
- Poor click-through rates from search
- Sharing looks bad on social media

## Title Tags

### Formula

```text
[Primary Keyword] - [Brand] | [Modifier]
```text

**Examples:**

```html
<title>Anxiety Therapy in Johannesburg | Jacqui Howles Psychology</title>
<title>About Jacqui Howles - Registered Psychologist | Johannesburg</title>
<title>Contact | Book Your First Therapy Session | Jacqui Howles</title>
```text

### Rules

- 50-60 characters (Google truncates longer)
- Primary keyword near the beginning
- Unique for every page
- Include brand name

## Meta Descriptions

### Formula

```text
[What you offer] + [for whom] + [CTA or benefit]
```text

**Examples:**

```html
<meta name="description" content="Professional therapy for anxiety, trauma, and life transitions. HPCSA-registered psychologist in Johannesburg. Book your first session today." />
```text

### Rules

- 150-160 characters
- Include target keyword naturally
- Compelling (it's your ad copy in search results)
- Unique for every page
- Include call-to-action

## Heading Structure

```html
<!-- Proper hierarchy -->
<h1>Main Page Title (only one)</h1>
  <h2>Major Section</h2>
    <h3>Subsection</h3>
    <h3>Subsection</h3>
  <h2>Another Major Section</h2>
    <h3>Subsection</h3>
```text

### Rules

- One H1 per page
- Don't skip levels (H1 → H3)
- Headings describe content (not for styling)
- Include keywords naturally

## URL Structure

```text
✅ Good URLs:
/services/individual-therapy
/about
/contact

❌ Bad URLs:
/services/service1
/page?id=123
/About-Us-Page
```text

### Rules

- Lowercase
- Hyphens (not underscores)
- Short and descriptive
- Include keywords
- No unnecessary parameters

## Schema Markup (Structured Data)

### Local Business (for therapists, local services)

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "name": "Jacqui Howles Psychology",
  "@id": "https://www.jacquihowles.com",
  "url": "https://www.jacquihowles.com",
  "telephone": "+27-XX-XXX-XXXX",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "123 Example Street",
    "addressLocality": "Johannesburg",
    "addressRegion": "Gauteng",
    "postalCode": "2000",
    "addressCountry": "ZA"
  },
  "priceRange": "$$",
  "image": "https://www.jacquihowles.com/og-image.jpg",
  "description": "Professional therapy for anxiety, trauma, and life transitions.",
  "openingHoursSpecification": {
    "@type": "OpeningHoursSpecification",
    "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
    "opens": "09:00",
    "closes": "17:00"
  }
}
</script>
```text

### Professional Service

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "ProfessionalService",
  "name": "Jacqui Howles Psychology",
  "description": "HPCSA-registered counselling psychologist",
  "areaServed": {
    "@type": "City",
    "name": "Johannesburg"
  },
  "hasOfferCatalog": {
    "@type": "OfferCatalog",
    "name": "Therapy Services",
    "itemListElement": [
      {
        "@type": "Offer",
        "itemOffered": {
          "@type": "Service",
          "name": "Individual Therapy"
        }
      }
    ]
  }
}
</script>
```text

### FAQ Schema

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "How do I know if therapy is right for me?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "If you're feeling overwhelmed, stuck, or struggling with emotions that affect your daily life, therapy can help..."
      }
    }
  ]
}
</script>
```text

## Open Graph Tags (Social Sharing)

```html
<head>
  <!-- Basic OG -->
  <meta property="og:title" content="Jacqui Howles Psychology | Therapy in Johannesburg" />
  <meta property="og:description" content="Professional therapy for anxiety, trauma, and life transitions." />
  <meta property="og:image" content="https://www.jacquihowles.com/og-image.jpg" />
  <meta property="og:url" content="https://www.jacquihowles.com" />
  <meta property="og:type" content="website" />
  
  <!-- Twitter Cards -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="Jacqui Howles Psychology" />
  <meta name="twitter:description" content="Professional therapy for anxiety, trauma, and life transitions." />
  <meta name="twitter:image" content="https://www.jacquihowles.com/og-image.jpg" />
</head>
```text

### OG Image Requirements

- Size: 1200x630px (Facebook/LinkedIn)
- Format: JPG or PNG
- Include logo/brand
- Readable text (if any)

## Technical SEO Checklist

```markdown
## SEO Checklist

### On-Page
- [ ] Unique title tag (50-60 chars)
- [ ] Meta description (150-160 chars)
- [ ] One H1 per page
- [ ] Proper heading hierarchy
- [ ] Keyword in first paragraph
- [ ] Internal links to related pages
- [ ] External links (where relevant)

### Technical
- [ ] XML sitemap (/sitemap.xml)
- [ ] robots.txt configured
- [ ] Canonical URLs set
- [ ] HTTPS enabled
- [ ] Mobile-friendly
- [ ] Fast load time (< 3s)
- [ ] No broken links

### Images
- [ ] Descriptive file names (anxiety-therapy.jpg)
- [ ] Alt text on all images
- [ ] Compressed/optimized

### Schema
- [ ] LocalBusiness or Organization schema
- [ ] FAQ schema (if FAQ exists)
- [ ] Breadcrumb schema (optional)

### Social
- [ ] Open Graph tags
- [ ] Twitter Card tags
- [ ] OG image created
```text

## Sitemap and Robots.txt

### sitemap.xml

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://www.jacquihowles.com/</loc>
    <lastmod>2026-01-22</lastmod>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://www.jacquihowles.com/about</loc>
    <priority>0.8</priority>
  </url>
  <!-- ... -->
</urlset>
```text

### robots.txt

```text
User-agent: *
Allow: /
Sitemap: https://www.jacquihowles.com/sitemap.xml
```text

## Common Mistakes

| Mistake | Why It's Wrong | Do This Instead |
|---------|----------------|-----------------|
| Same title on all pages | Duplicate content signal | Unique titles |
| Missing meta descriptions | Google generates (often badly) | Write compelling ones |
| H1 used for styling | Confuses structure | Use CSS for styling |
| No alt text | Accessibility + SEO miss | Describe every image |
| No schema markup | Missing rich results | Add LocalBusiness at minimum |
| Blocking CSS/JS in robots | Hurts rendering | Allow search engines |

## Related Skills

- `architecture/sitemap-builder.md` - URL structure planning
- `performance.md` - Page speed (ranking factor)
- `qa/accessibility.md` - Overlaps with SEO best practices
- `launch/deployment.md` - SSL, redirects, canonical
- `../../marketing/seo/seo-audit.md` - Full SEO audit checklist
- `../../marketing/seo/schema-markup.md` - Advanced structured data
- `../../marketing/seo/programmatic-seo.md` - Build pages at scale for keywords
