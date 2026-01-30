# Finishing Pass

Final polish: spacing tightening, copy refinement, button hierarchy, and visual balance before launch.

## Quick Reference

| Pass | Focus | Time |
|------|-------|------|
| Content pass | Copy, typos, accuracy | 30 min |
| Visual pass | Spacing, alignment, balance | 30 min |
| Technical pass | Links, forms, performance | 30 min |
| Device pass | Mobile, tablet, desktop | 20 min |
| Fresh eyes pass | Overall impression | 10 min |

## Trigger Conditions

Use this skill when:

- Site is "done" but needs polish
- Before client review
- Before launch
- Something feels "off"

## The Five Passes

### Pass 1: Content

Read every word on the site.

```markdown
## Content Checklist

### Copy
- [ ] No typos or grammar errors
- [ ] No placeholder text (Lorem ipsum)
- [ ] Consistent capitalization
- [ ] Consistent punctuation style
- [ ] Phone/email correct
- [ ] Address correct
- [ ] Business name spelled correctly
- [ ] Credentials accurate

### Tone
- [ ] Consistent voice throughout
- [ ] Appropriate for audience
- [ ] Not too salesy
- [ ] Not too formal/stiff

### CTAs
- [ ] Clear and specific
- [ ] Consistent wording
- [ ] Compelling (not generic)
```text

### Pass 2: Visual

Step back and look at overall visual balance.

```markdown
## Visual Checklist

### Spacing
- [ ] Consistent section padding
- [ ] No cramped areas
- [ ] No overly empty areas
- [ ] Balanced white space

### Typography
- [ ] Heading hierarchy clear
- [ ] No awkward line breaks
- [ ] No widows/orphans in important text
- [ ] Readable line lengths

### Alignment
- [ ] Grid alignment consistent
- [ ] No rogue elements
- [ ] Images aligned with text

### Balance
- [ ] Pages don't feel top/bottom heavy
- [ ] Visual weight distributed
- [ ] Colors balanced

### Polish
- [ ] Buttons have consistent styles
- [ ] Hover states feel good
- [ ] Transitions smooth (not jarring)
- [ ] Icons consistent size/style
```text

### Pass 3: Technical

Test every interactive element.

```markdown
## Technical Checklist

### Links
- [ ] All internal links work
- [ ] All external links work
- [ ] Links open in appropriate tab
- [ ] No broken images

### Forms
- [ ] Form submits successfully
- [ ] Validation works
- [ ] Error messages clear
- [ ] Success state shows
- [ ] Email actually received

### Navigation
- [ ] All nav links work
- [ ] Mobile menu works
- [ ] Current page indicated
- [ ] Logo links to home

### Performance
- [ ] Lighthouse 90+ (all categories)
- [ ] No console errors
- [ ] No slow-loading elements

### SEO
- [ ] All pages have titles
- [ ] All pages have descriptions
- [ ] OG images set
- [ ] Schema valid
```text

### Pass 4: Device Testing

Test on real devices if possible.

```markdown
## Device Checklist

### Mobile (Real Phone)
- [ ] Touch targets adequate
- [ ] Text readable without zoom
- [ ] Forms usable
- [ ] Menu works
- [ ] No horizontal scroll

### Tablet
- [ ] Layout appropriate
- [ ] Images scale well
- [ ] Navigation works

### Desktop
- [ ] Content not too wide
- [ ] Comfortable reading
- [ ] Hover states work

### Browsers
- [ ] Chrome
- [ ] Safari
- [ ] Firefox
- [ ] Edge (if needed)
```text

### Pass 5: Fresh Eyes

Look at site as if seeing it for first time.

```markdown
## Fresh Eyes Checklist

### First Impression (5 seconds)
- [ ] Clear what site is about?
- [ ] Looks professional?
- [ ] CTA visible?

### User Journey
- [ ] Can easily find services?
- [ ] Can easily contact?
- [ ] Questions answered?

### Trust
- [ ] Credentials visible?
- [ ] Social proof present?
- [ ] Feels legitimate?

### Overall
- [ ] Would you trust this business?
- [ ] Would you contact them?
- [ ] Anything feel "off"?
```text

## Common Polish Items

### Spacing Fixes

```css
/* Tighten section that feels loose */
.section { padding: 4rem 0; } /* was 6rem */

/* Add breathing room to cramped area */
.card { padding: 1.5rem; } /* was 1rem */

/* Fix awkward gap */
.heading + .text { margin-top: 0.5rem; } /* was 1rem */
```text

### Typography Fixes

```css
/* Prevent widows in headings */
h1, h2 {
  text-wrap: balance; /* Modern CSS */
}

/* Or manual fix */
<h2>Find your calm.<br />Rebuild your confidence.</h2>

/* Tighten loose heading */
h1 { letter-spacing: -0.02em; }
```text

### Button Hierarchy

```html
<!-- Clear primary/secondary distinction -->
<Button variant="primary">Book Now</Button>
<Button variant="outline">Learn More</Button>

<!-- Not two competing primaries -->
❌ <Button variant="primary">Book Now</Button>
❌ <Button variant="primary">Contact Us</Button>
```text

### Image Polish

```html
<!-- Ensure consistent aspect ratios -->
<div class="aspect-[4/3]">
  <img src="..." class="object-cover w-full h-full" />
</div>

<!-- Add subtle shadow to lift images -->
<img class="shadow-lg rounded-lg" ... />
```text

## Pre-Launch Final Check

```markdown
## Launch Readiness

### Essentials
- [ ] Site loads on production URL
- [ ] SSL working (https)
- [ ] No console errors
- [ ] Forms tested with real submission
- [ ] Analytics confirmed receiving data

### Client Approval
- [ ] Client has reviewed
- [ ] Content approved
- [ ] Design approved
- [ ] Written sign-off received

### Backup
- [ ] Code in version control
- [ ] Know how to rollback if needed

### Launch
- [ ] DNS propagated (can take 24-48h)
- [ ] Old site redirected (if applicable)
- [ ] Team notified
- [ ] Monitoring in place
```text

## Common Mistakes

| Mistake | Impact | Fix |
|---------|--------|-----|
| Rushing the polish | Unprofessional feel | Budget time for finishing |
| Only checking desktop | Mobile users suffer | Test real devices |
| Not testing forms | Leads lost | Submit real test |
| Skipping fresh eyes | Miss obvious issues | Take a break, look again |
| No written sign-off | Disputes later | Get client approval |

## Example

**Project:** Psychology practice - Finishing Pass Notes

```markdown
## Finishing Pass: Jacqui Howles

### Content Pass ✓
- [x] Fixed typo: "councelling" → "counselling"
- [x] Updated phone number
- [x] Verified HPCSA number correct
- [x] Tightened hero subheadline

### Visual Pass ✓
- [x] Reduced hero section padding (was too much whitespace)
- [x] Tightened testimonial card spacing
- [x] Fixed FAQ accordion alignment
- [x] Added subtle shadow to service cards

### Technical Pass ✓
- [x] All links working
- [x] Form tested - email received
- [x] Lighthouse: 94/100/100/100
- [x] No console errors

### Device Pass ✓
- [x] iPhone 14 - good
- [x] iPad - good
- [x] Desktop 1440px - good
- [x] Mobile nav tested

### Fresh Eyes Pass ✓
- [x] Clear value proposition
- [x] Trust elements visible
- [x] CTA prominent
- [x] Professional feel

### Issues Fixed
1. Hero CTA was too small on mobile → increased size
2. About photo was slightly pixelated → replaced with higher res
3. Footer links had wrong color → fixed to match design system
4. Contact form success message was generic → personalized

### Ready for Launch ✓
```text

## Related Skills

- `qa/acceptance-criteria.md` - Full QA checklist
- `qa/visual-qa.md` - Detailed visual checks
- `deployment.md` - Actual launch steps
- `design/spacing-layout.md` - Spacing reference
