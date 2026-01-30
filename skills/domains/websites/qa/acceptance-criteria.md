# Acceptance Criteria

Defines clear "done" criteria and verifies every requirement is met before launch.

## Quick Reference

| Category | Example Criteria |
| ---------- | ------------------ |
| Functional | Form submits successfully, links work |
| Visual | Matches design, responsive |
| Performance | Lighthouse 90+, LCP < 2.5s |
| SEO | Meta tags present, schema valid |
| Accessibility | WCAG AA compliant |

## Trigger Conditions

Use this skill when:

- Starting any website project (define upfront)
- Ready to call something "done"
- Client asks "is it finished?"
- QA before launch

## Acceptance Criteria Template

```markdown
## Page: [Page Name]

### Functional

- [ ] All links work (no 404s)
- [ ] Form submits and sends email
- [ ] Form shows success message
- [ ] Mobile menu opens/closes
- [ ] All CTAs link to correct destinations

### Visual

- [ ] Matches approved design
- [ ] Responsive: mobile, tablet, desktop
- [ ] Images load correctly
- [ ] Fonts load correctly
- [ ] No layout shifts

### Content

- [ ] All copy is final (no lorem ipsum)
- [ ] No typos or grammar errors
- [ ] Images have alt text
- [ ] Contact info is correct

### Performance

- [ ] Lighthouse Performance: 90+
- [ ] Lighthouse Accessibility: 90+
- [ ] Lighthouse Best Practices: 90+
- [ ] Lighthouse SEO: 90+
- [ ] Page loads in < 3 seconds

### SEO

- [ ] Unique title tag
- [ ] Meta description present
- [ ] H1 present and unique
- [ ] Schema markup valid
- [ ] Open Graph tags set
- [ ] Sitemap generated

### Cross-Browser

- [ ] Chrome ✓
- [ ] Firefox ✓
- [ ] Safari ✓
- [ ] Edge ✓
- [ ] Mobile Safari ✓
- [ ] Mobile Chrome ✓

```text

## Project-Level Criteria

```markdown
## Project Acceptance Criteria

### Before Launch

- [ ] All pages complete per page checklists
- [ ] SSL certificate active (https://)
- [ ] Custom domain connected
- [ ] Analytics installed and tracking
- [ ] Forms tested end-to-end
- [ ] 404 page exists
- [ ] Favicon set
- [ ] robots.txt configured
- [ ] sitemap.xml generated
- [ ] Social sharing preview looks correct

### Performance Targets

- [ ] All pages Lighthouse 90+
- [ ] LCP < 2.5s on mobile
- [ ] CLS < 0.1
- [ ] Total page weight < 1MB

### Legal/Compliance

- [ ] Privacy policy page (if collecting data)
- [ ] Cookie consent (if needed for region)
- [ ] Accessibility WCAG 2.1 AA

### Client Sign-off

- [ ] Client reviewed all pages
- [ ] Content approved
- [ ] Design approved
- [ ] Ready for launch confirmation

```text

## Verification Commands

### Lighthouse CLI

```bash
# Run Lighthouse audit
npx lighthouse https://yoursite.com --output=json --output-path=./report.json

# Quick score check
npx lighthouse https://yoursite.com --only-categories=performance,accessibility,best-practices,seo

```text

### Link Checker

```bash
# Check for broken links
npx broken-link-checker https://yoursite.com --ordered --recursive

```text

### HTML Validation

```bash
# Validate HTML
npx html-validate ./dist/**/*.html

```text

### Schema Validation

Test at: <https://validator.schema.org/>

### Open Graph Preview

Test at: <https://www.opengraph.xyz/>

## Checklist by Page Type

### Homepage Checklist

```markdown

- [ ] Hero headline clear and compelling
- [ ] Primary CTA visible above fold
- [ ] Trust elements present (credentials, logos)
- [ ] Services overview links work
- [ ] Testimonials display correctly
- [ ] Final CTA section present
- [ ] Footer links all work

```text

### About Page Checklist

```markdown

- [ ] Professional photo loads
- [ ] Bio content complete
- [ ] Credentials visible
- [ ] CTA to contact/services

```text

### Services Page Checklist

```markdown

- [ ] All services listed
- [ ] Clear descriptions
- [ ] Pricing or "contact for pricing"
- [ ] CTAs for each service

```text

### Contact Page Checklist

```markdown

- [ ] Form submits successfully
- [ ] Confirmation message shows
- [ ] Email received (test it!)
- [ ] Phone number clickable
- [ ] Email clickable
- [ ] Address/map if applicable
- [ ] Alternative contact methods listed

```text

## Definition of Done

A page is "done" when:

1. **Functional:** All interactive elements work
2. **Visual:** Matches design at all breakpoints
3. **Content:** Final copy, no placeholders
4. **Performance:** Lighthouse 90+ all categories
5. **Accessible:** No critical accessibility issues
6. **Tested:** Verified on real devices

## Common Mistakes

| Mistake | Why It's Wrong | Do This Instead |
| --------- | ---------------- | ----------------- |
| No written criteria | "Done" is subjective | Define upfront |
| Testing only desktop | Mobile users suffer | Test all breakpoints |
| Skipping form test | Forms often break | Submit real test |
| Ignoring Lighthouse | Performance issues | Run before launch |
| Not checking links | Broken links = unprofessional | Use link checker |
| No client sign-off | Disputes later | Get written approval |

## Example

**Project:** Psychology practice website

```markdown
## Acceptance Criteria: Jacqui Howles Website

### Homepage

- [x] Hero: "Find your calm. Rebuild your confidence."
- [x] CTA: "Book Your First Session" → /contact
- [x] Trust line: HPCSA registration visible
- [x] Services grid: 3 cards, links work
- [x] About snippet with photo
- [x] 2 testimonials displayed
- [x] FAQ section: 3 questions
- [x] Final CTA section
- [x] Mobile: hamburger menu works

### About Page

- [x] Full bio content
- [x] Professional photo
- [x] Credentials section
- [x] Approach/philosophy section
- [x] CTA to contact

### Services Page

- [x] Individual therapy section
- [x] Couples therapy section
- [x] Coaching section
- [x] Online vs in-person clarity
- [x] CTAs per service

### Contact Page

- [x] Form: name, email, message
- [x] Form submits to Formspree ✓
- [x] Email received (tested 2026-01-22) ✓
- [x] Success redirect to /thank-you
- [x] Phone number (tel: link)
- [x] Email address (mailto: link)
- [x] Alternative: WhatsApp link

### Technical

- [x] Lighthouse Performance: 94
- [x] Lighthouse Accessibility: 100
- [x] Lighthouse Best Practices: 100
- [x] Lighthouse SEO: 100
- [x] Mobile responsive (tested iPhone, Android)
- [x] SSL active
- [x] Analytics (Plausible) tracking

### SEO

- [x] All pages have unique titles
- [x] All pages have meta descriptions
- [x] Schema: LocalBusiness + FAQPage
- [x] Open Graph tags set
- [x] sitemap.xml generated
- [x] robots.txt configured

### Client Approval

- [x] Content reviewed and approved
- [x] Design approved
- [x] Ready for launch: YES

```text

## Related Skills

- `visual-qa.md` - Visual testing
- `accessibility.md` - Accessibility testing
- `build/performance.md` - Performance targets
- `launch/finishing-pass.md` - Final polish
