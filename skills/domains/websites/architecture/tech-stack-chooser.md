# Tech Stack Chooser

Selects the best technology stack based on project requirements, content type, and maintenance needs.

## Quick Reference

| If you need... | Choose | Why |
|----------------|--------|-----|
| Static marketing site | Astro | Fast, minimal JS, great DX |
| Blog + marketing | Astro + MDX | Content-focused, fast builds |
| Dynamic app features | Next.js | React ecosystem, API routes |
| Client self-editing | WordPress or Webflow | Non-technical editing |
| E-commerce | Shopify or WooCommerce | Built-in cart, payments |
| Maximum simplicity | Plain HTML + Tailwind | No build step, instant |

## Decision Tree

```text
START: Does the client need to edit content themselves?
│
├─ YES → Do they have technical skills?
│   ├─ YES → Headless CMS (Sanity/Contentful) + Astro/Next
│   └─ NO → WordPress or Webflow
│
└─ NO → Is this content-heavy (blog, docs, many pages)?
    ├─ YES → Astro (static, fast)
    └─ NO → Does it need dynamic features (auth, DB)?
        ├─ YES → Next.js or SvelteKit
        └─ NO → How simple can we go?
            ├─ Very simple (1-5 pages) → Plain HTML + Tailwind
            └─ Some complexity → Astro
```text

## Stack Comparison

### Static Site Generators

| Framework | Best For | Pros | Cons |
|-----------|----------|------|------|
| **Astro** | Marketing sites, blogs | Fast, partial hydration, any UI lib | Newer, smaller ecosystem |
| **Next.js (static)** | React teams, hybrid apps | Huge ecosystem, Vercel native | Heavier, React lock-in |
| **Hugo** | Docs, blogs, speed | Fastest builds, Go templating | Steeper learning curve |
| **11ty** | Simple sites | Flexible, minimal | Less opinionated |

### Full-Stack Frameworks

| Framework | Best For | Pros | Cons |
|-----------|----------|------|------|
| **Next.js** | React apps, API routes | Full-featured, great DX | Complex for simple sites |
| **SvelteKit** | Performance-critical | Small bundles, fast | Smaller ecosystem |
| **Nuxt** | Vue teams | Vue ecosystem | Vue lock-in |
| **Remix** | Data-heavy apps | Great data loading | Steeper learning |

### No-Code / Low-Code

| Platform | Best For | Pros | Cons |
|----------|----------|------|------|
| **Webflow** | Designer-led projects | Visual builder, CMS | Expensive, lock-in |
| **WordPress** | Client self-editing | Familiar, plugins | Security, maintenance |
| **Squarespace** | Simple portfolios | Easy, templates | Limited customization |
| **Framer** | Design-forward sites | Figma-like, animations | Newer, less mature |

### E-Commerce

| Platform | Best For | Pros | Cons |
|----------|----------|------|------|
| **Shopify** | Dedicated stores | Full-featured, reliable | Monthly cost, lock-in |
| **WooCommerce** | WordPress sites | Flexible, open source | Maintenance burden |
| **Snipcart** | Add cart to any site | Simple integration | Per-transaction fees |

## CSS Framework Decision

| Framework | Best For | Bundle Size |
|-----------|----------|-------------|
| **Tailwind CSS** | Most projects | ~10-30kb (purged) |
| **CSS Modules** | Component isolation | 0kb overhead |
| **Vanilla CSS** | Simple sites | 0kb overhead |
| **shadcn/ui** | React + Tailwind | Component-based |

## Component Library Decision

| If using... | Consider |
|-------------|----------|
| React + Tailwind | shadcn/ui, Radix UI |
| Vue + Tailwind | Headless UI, Nuxt UI |
| Astro | Any (island architecture) |
| Plain HTML | DaisyUI, Tailwind UI |

## Hosting Decision

| Host | Best For | Free Tier |
|------|----------|-----------|
| **Vercel** | Next.js, Astro | Generous |
| **Netlify** | Static sites, forms | Generous |
| **Cloudflare Pages** | Global edge, fast | Very generous |
| **Railway** | Full-stack, DBs | Limited |
| **GitHub Pages** | Simple static | Unlimited |

## Common Mistakes

| Mistake | Why It's Wrong | Do This Instead |
|---------|----------------|-----------------|
| Next.js for brochure site | Over-engineered | Use Astro or plain HTML |
| WordPress for static content | Maintenance burden | Static generator |
| No-code when you code | Limits flexibility | Use your skills |
| Ignoring client editing needs | They'll ask later | Plan for CMS upfront |
| Choosing by hype | Wrong fit | Match to requirements |

## Example

**Project:** Psychology practice website

```markdown
## Tech Stack Decision

### Requirements
- 4-5 static pages
- Contact form
- No client self-editing needed (we maintain)
- Good SEO required
- Fast load times
- Simple to maintain

### Decision: Astro + Tailwind + Vercel

**Why Astro:**
- Perfect for content-focused static sites
- Zero JS by default (fast)
- Great SEO out of box
- Simple component model
- Can add React/Vue if needed later

**Why Tailwind:**
- Rapid styling
- Consistent design system
- Small bundle (purged)
- Easy to maintain

**Why Vercel:**
- Free tier covers needs
- Automatic deployments from Git
- Great performance
- Easy SSL/domains

**Alternatives Considered:**
- ❌ Next.js: Overkill for static site
- ❌ WordPress: Client doesn't need to edit
- ❌ Webflow: More expensive, less control

### Form Handling
- Formspree or Netlify Forms (if on Netlify)
- Simple, no backend needed

### Future-Proofing
- If blog needed: Add MDX to Astro
- If booking needed: Embed Calendly or Cal.com
- If CMS needed: Add Sanity or Contentful
```text

## Related Skills

- `build/component-development.md` - Building with chosen stack
- `build/performance.md` - Optimizing for Core Web Vitals
- `launch/deployment.md` - Deploying to chosen host
