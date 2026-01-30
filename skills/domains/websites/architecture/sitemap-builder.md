# Sitemap Builder

Proposes clean navigation structure (usually 4-7 top items) and footer organization.

## Quick Reference

| Site Type | Typical Nav Items | Notes |
| --------- | ----------------- | ----- |
| Solo service provider | Home, About, Services, Contact | 4 items, simple |
| Small business | Home, Services, About, Portfolio, Contact | 5 items |
| SaaS | Product, Pricing, Docs, Blog, Contact | 5-6 items |
| E-commerce | Shop, Categories, About, Support, Cart | 5+ items |

## Trigger Conditions

Use this skill when:

- Planning a new website structure
- Existing navigation is confusing
- Too many or too few nav items
- Users can't find what they need

## Procedure

### 1. List All Content/Pages

```markdown
## Content Inventory

- Homepage
- About the founder
- Service A details
- Service B details
- Pricing
- FAQ
- Blog
- Contact
- Privacy Policy
- Terms of Service
```text

### 2. Apply the 7±2 Rule

Primary nav should have **4-7 items max**. More = cognitive overload.

### 3. Group and Prioritize

```markdown
## Navigation Structure

### Primary Nav (visible always)
1. Home
2. About
3. Services (dropdown: Service A, Service B)
4. Contact

### Secondary Nav (header utility)
- Blog (if active)
- Book Now (CTA button)

### Footer Nav
- Quick Links: Home, About, Services, Contact
- Legal: Privacy Policy, Terms
- Social: LinkedIn, Instagram
- Contact: Email, Phone, Address
```text

### 4. Define Page Hierarchy

```text
Home
├── About
├── Services
│   ├── Individual Therapy
│   ├── Couples Therapy
│   └── Coaching
├── Blog (optional)
│   └── [Articles]
└── Contact
```text

## Navigation Patterns

### Simple (4 items) - Best for most service sites

```text
[Logo] Home | About | Services | Contact [CTA Button]
```text

### With Dropdown (5-6 items)

```text
[Logo] Home | About | Services ▼ | Resources | Contact [CTA]
                      └── Service A
                      └── Service B
                      └── Pricing
```text

### Mega Menu (7+ sections) - Only for large sites

```text
[Logo] Products ▼ | Solutions ▼ | Resources ▼ | Company ▼ [CTA]
```text

## Footer Structure

```markdown
## Footer Layout (4-column typical)

| Column 1 | Column 2 | Column 3 | Column 4 |
|----------|----------|----------|----------|
| Logo + tagline | Quick Links | Services | Contact |
| Brief description | Home | Service A | Email |
| Social icons | About | Service B | Phone |
| | Blog | Pricing | Address |

---
© 2026 Company | Privacy Policy | Terms of Service
```text

## Common Mistakes

| Mistake | Why It's Wrong | Do This Instead |
| ------- | -------------- | --------------- |
| 10+ nav items | Overwhelming, hard to scan | Max 7, use dropdowns |
| "Resources" with 1 item | Pointless category | Promote or remove |
| No clear CTA in nav | Misses conversion opportunity | Add "Book Now" button |
| Footer = dumping ground | Nobody reads walls of links | Curate, prioritize |
| Hiding Contact | Frustrates users | Always visible in nav |

## Example

**Project:** Psychology practice

```markdown
## Navigation Structure

### Primary Nav
1. **Home** - Overview, primary CTA
2. **About** - Bio, credentials, approach
3. **Services** - Therapy, coaching, consultancy
4. **Contact** - Form, details, booking

### Header CTA Button
"Book a Consultation" → links to Contact or booking system

### Footer
| About | Services | Get Help | Legal |
|-------|----------|----------|-------|
| About Jacqui | Individual Therapy | Contact | Privacy |
| My Approach | Couples Therapy | Book Online | Terms |
| Credentials | Coaching | FAQ | |
| | Consultancy | | |

---
© 2026 Jacqui Howles | HPCSA Reg: [Number] | Psychology Today Verified
```text

## Related Skills

- `section-composer.md` - What goes IN each page
- `discovery/requirements-distiller.md` - Understanding what pages are needed
- `build/seo-foundations.md` - URL structure and hierarchy
