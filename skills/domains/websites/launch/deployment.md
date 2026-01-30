# Deployment

Deploys sites with SSL, redirects, canonical URLs, and proper staging vs production setup.

## Quick Reference

| Host | Best For | Deploy Method |
|------|----------|---------------|
| **Vercel** | Next.js, Astro, React | Git push |
| **Netlify** | Static sites, forms | Git push |
| **Cloudflare Pages** | Global edge, fast | Git push |
| **GitHub Pages** | Simple static | Git push |
| **Railway** | Full-stack, databases | Git push |

## Trigger Conditions

Use this skill when:

- Ready to make site live
- Setting up staging environment
- Connecting custom domain
- Configuring redirects

## Deployment Checklist

```markdown
## Pre-Deployment

### Build
- [ ] `npm run build` succeeds
- [ ] No build warnings/errors
- [ ] Preview build locally

### Environment Variables
- [ ] Production env vars set
- [ ] API keys are production keys
- [ ] Analytics IDs correct

### Content
- [ ] All placeholder content replaced
- [ ] Contact info correct
- [ ] Links tested

## Deployment

### DNS/Domain
- [ ] Domain purchased
- [ ] DNS configured
- [ ] SSL certificate active
- [ ] www → non-www redirect (or vice versa)

### Configuration
- [ ] Custom 404 page
- [ ] Redirects configured
- [ ] Headers set (caching, security)
- [ ] robots.txt correct

### Verification
- [ ] Site loads on custom domain
- [ ] HTTPS works (no mixed content)
- [ ] All pages accessible
- [ ] Forms working
- [ ] Analytics receiving data
```text

## Vercel Deployment

### Initial Setup

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy (first time)
vercel

# Deploy to production
vercel --prod
```text

### Git Integration

1. Connect GitHub repo to Vercel
2. Push to `main` → auto-deploys to production
3. Push to other branches → preview deployments

### Environment Variables

```bash
# Set via CLI
vercel env add ANALYTICS_ID

# Or in Vercel Dashboard:
# Settings → Environment Variables
```text

### Custom Domain

1. Vercel Dashboard → Project → Domains
2. Add domain: `jacquihowles.com`
3. Configure DNS at registrar:

   ```text
   Type: A
   Name: @
   Value: 76.76.21.21

   Type: CNAME
   Name: www
   Value: cname.vercel-dns.com
   ```text

### Redirects (`vercel.json`)

```json
{
  "redirects": [
    { "source": "/old-page", "destination": "/new-page", "permanent": true },
    { "source": "/blog/:slug", "destination": "/articles/:slug", "permanent": true }
  ]
}
```text

## Netlify Deployment

### Initial Setup

```bash
# Install Netlify CLI
npm i -g netlify-cli

# Deploy
netlify deploy

# Deploy to production
netlify deploy --prod
```text

### netlify.toml

```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/old-page"
  to = "/new-page"
  status = 301

[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-Content-Type-Options = "nosniff"
```text

### Custom Domain

1. Netlify Dashboard → Domain Settings
2. Add custom domain
3. Configure DNS:

   ```text
   Type: A
   Name: @
   Value: 75.2.60.5

   Type: CNAME
   Name: www
   Value: your-site.netlify.app
   ```text

## Cloudflare Pages

### Setup

1. Connect GitHub repo
2. Configure build settings:
   - Build command: `npm run build`
   - Output directory: `dist`

### Custom Domain

1. Add site to Cloudflare (free plan)
2. Update nameservers at registrar
3. Pages → Custom domains → Add

### _redirects file

```text
/old-page /new-page 301
/blog/* /articles/:splat 301
```text

## SSL/HTTPS

All modern hosts provide free SSL via Let's Encrypt.

### Verify HTTPS

```bash
# Check certificate
curl -vI https://yoursite.com 2>&1 | grep -i "ssl\|certificate"
```text

### Force HTTPS

Most hosts do this automatically. If not:

```text
# Netlify _redirects
http://yoursite.com/* https://yoursite.com/:splat 301!

# Vercel (automatic)
# Cloudflare (automatic)
```text

### Fix Mixed Content

If HTTPS but browser shows "not secure":

```html
<!-- Change all http:// to https:// or use protocol-relative -->
<img src="https://example.com/image.jpg" />

<!-- Or let browser decide -->
<img src="//example.com/image.jpg" />
```text

## WWW vs Non-WWW

Pick one and redirect the other:

### Redirect www → non-www

```json
// vercel.json
{
  "redirects": [
    {
      "source": "https://www.jacquihowles.com/:path*",
      "destination": "https://jacquihowles.com/:path*",
      "permanent": true
    }
  ]
}
```text

### Canonical URLs

```html
<head>
  <link rel="canonical" href="https://jacquihowles.com/about" />
</head>
```text

## Staging vs Production

### Branch-Based (Recommended)

```text
main branch    → production (jacquihowles.com)
staging branch → staging (staging.jacquihowles.com)
feature/*      → preview URLs (auto-generated)
```text

### Environment Variables

```bash
# Production
SITE_URL=https://jacquihowles.com
ANALYTICS_ID=G-XXXXXXXX

# Staging
SITE_URL=https://staging.jacquihowles.com
ANALYTICS_ID=G-STAGING  # Or disable analytics
```text

## Security Headers

```json
// vercel.json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "X-XSS-Protection", "value": "1; mode=block" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" }
      ]
    }
  ]
}
```text

## Common Mistakes

| Mistake | Impact | Fix |
|---------|--------|-----|
| No SSL | "Not Secure" warning | Use host's free SSL |
| Mixed content | Broken HTTPS | Fix all http:// URLs |
| No redirects | SEO issues, 404s | Set up redirects |
| Forgot www redirect | Duplicate content | Redirect one to other |
| Wrong env vars | Broken features | Check production values |
| No custom 404 | Poor UX | Create 404 page |

## Example

**Project:** Psychology practice website on Vercel

```json
// vercel.json
{
  "redirects": [
    {
      "source": "/services/therapy",
      "destination": "/services",
      "permanent": true
    }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "X-Frame-Options", "value": "DENY" }
      ]
    },
    {
      "source": "/fonts/(.*)",
      "headers": [
        { "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }
      ]
    }
  ]
}
```text

```markdown
## Deployment Checklist

### DNS (at registrar)
- [x] A record: @ → 76.76.21.21
- [x] CNAME: www → cname.vercel-dns.com

### Vercel
- [x] Project connected to GitHub
- [x] Custom domain: jacquihowles.com
- [x] SSL active
- [x] www redirects to non-www

### Environment Variables
- [x] PUBLIC_SITE_URL=https://jacquihowles.com
- [x] FORMSPREE_ID=xxxxx
- [x] PUBLIC_PLAUSIBLE_DOMAIN=jacquihowles.com

### Verification
- [x] https://jacquihowles.com loads
- [x] https://www.jacquihowles.com redirects
- [x] All pages work
- [x] Form submits
- [x] Analytics tracking
```text

## Related Skills

- `qa/acceptance-criteria.md` - Pre-launch checklist
- `build/performance.md` - CDN and caching
- `build/seo-foundations.md` - Canonical URLs, redirects
- `finishing-pass.md` - Final checks before launch
