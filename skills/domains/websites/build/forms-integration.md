# Forms Integration

Implements contact forms with validation, spam protection, and reliable delivery.

## Quick Reference

| Form Service | Best For | Pricing |
|--------------|----------|---------|
| **Formspree** | Simple contact forms | Free tier, then $8/mo |
| **Netlify Forms** | Netlify-hosted sites | 100 free/mo |
| **Formspark** | Privacy-focused | Free tier |
| **Basin** | Simple, no signup | Free tier |
| **Custom** | Full control | Your server |

## Trigger Conditions

Use this skill when:

- Building contact page
- Need lead capture form
- Booking/inquiry forms
- Newsletter signup

## Form UX Principles

### Minimize Fields

```markdown
❌ Too many fields:
- First Name
- Last Name
- Email
- Phone
- Address
- City
- How did you hear about us?
- Message

✅ Essential only:
- Name
- Email
- Message
```text

### Clear Labels

```html
<!-- ✅ Good: Label above input -->
<label for="email">Email address</label>
<input type="email" id="email" name="email" required />

<!-- ❌ Bad: Placeholder only -->
<input type="email" placeholder="Email" />
```text

### Helpful Validation

```html
<!-- Built-in validation -->
<input 
  type="email" 
  required 
  pattern="[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$"
/>

<!-- Custom error messages -->
<input 
  type="email" 
  required
  oninvalid="this.setCustomValidity('Please enter a valid email')"
  oninput="this.setCustomValidity('')"
/>
```text

## Implementation Options

### Option 1: Formspree (Recommended)

```html
<form action="https://formspree.io/f/YOUR_FORM_ID" method="POST">
  <label for="name">Name</label>
  <input type="text" id="name" name="name" required />
  
  <label for="email">Email</label>
  <input type="email" id="email" name="email" required />
  
  <label for="message">Message</label>
  <textarea id="message" name="message" rows="5" required></textarea>
  
  <button type="submit">Send Message</button>
</form>
```text

### Option 2: Netlify Forms

```html
<form name="contact" method="POST" data-netlify="true" netlify-honeypot="bot-field">
  <!-- Honeypot for spam -->
  <p class="hidden">
    <label>Don't fill this out: <input name="bot-field" /></label>
  </p>
  
  <label for="name">Name</label>
  <input type="text" id="name" name="name" required />
  
  <label for="email">Email</label>
  <input type="email" id="email" name="email" required />
  
  <label for="message">Message</label>
  <textarea id="message" name="message" required></textarea>
  
  <button type="submit">Send</button>
</form>
```text

### Option 3: Astro + API Route

```astro
---
// contact.astro
---
<form id="contact-form">
  <input type="text" name="name" required />
  <input type="email" name="email" required />
  <textarea name="message" required></textarea>
  <button type="submit">Send</button>
</form>

<script>
  const form = document.getElementById('contact-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = new FormData(form);
    
    const response = await fetch('/api/contact', {
      method: 'POST',
      body: JSON.stringify(Object.fromEntries(data)),
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (response.ok) {
      window.location.href = '/thank-you';
    }
  });
</script>
```text

## Spam Protection

### Honeypot Field

```html
<!-- Hidden field that bots fill out -->
<div style="display: none;">
  <input type="text" name="website" tabindex="-1" autocomplete="off" />
</div>
```text

Server-side: Reject if `website` field has value.

### Cloudflare Turnstile

```html
<script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>

<form action="/submit" method="POST">
  <!-- Your form fields -->
  
  <div class="cf-turnstile" data-sitekey="YOUR_SITE_KEY"></div>
  
  <button type="submit">Submit</button>
</form>
```text

### Rate Limiting

Implement server-side to prevent abuse.

## Form States

### Loading State

```html
<button type="submit" id="submit-btn">
  <span class="default">Send Message</span>
  <span class="loading hidden">Sending...</span>
</button>

<script>
  form.addEventListener('submit', () => {
    btn.querySelector('.default').classList.add('hidden');
    btn.querySelector('.loading').classList.remove('hidden');
    btn.disabled = true;
  });
</script>
```text

### Success State

```html
<!-- Option 1: Redirect to thank-you page -->
<form action="https://formspree.io/f/xxx" method="POST">
  <input type="hidden" name="_next" value="https://yoursite.com/thank-you" />
  <!-- fields -->
</form>

<!-- Option 2: Inline success message -->
<div id="form-success" class="hidden">
  <h3>Thank you!</h3>
  <p>We'll be in touch within 24 hours.</p>
</div>
```text

### Error State

```html
<div id="form-error" class="hidden text-red-600">
  <p>Something went wrong. Please try again or email us directly at hello@example.com</p>
</div>
```text

## Accessible Forms

```html
<form>
  <!-- Associate labels with inputs -->
  <div class="field">
    <label for="name">Name <span class="required">*</span></label>
    <input 
      type="text" 
      id="name" 
      name="name" 
      required
      aria-required="true"
    />
  </div>
  
  <!-- Error messaging -->
  <div class="field">
    <label for="email">Email <span class="required">*</span></label>
    <input 
      type="email" 
      id="email" 
      name="email" 
      required
      aria-describedby="email-error"
    />
    <p id="email-error" class="error hidden" role="alert">
      Please enter a valid email address
    </p>
  </div>
  
  <!-- Clear submit button -->
  <button type="submit">Send Message</button>
</form>
```text

## Common Mistakes

| Mistake | Why It's Wrong | Do This Instead |
|---------|----------------|-----------------|
| No validation | Bad data, frustration | Use HTML5 + JS validation |
| Placeholder-only labels | Accessibility issue | Use real labels |
| No success feedback | User unsure if sent | Show confirmation |
| No spam protection | Inbox flooded | Add honeypot or CAPTCHA |
| Too many fields | Abandonment | Ask only essentials |
| No fallback email | Form fails silently | Show email alternative |

## Example

**Project:** Psychology practice contact form

```astro
---
// components/ContactForm.astro
---
<form 
  action="https://formspree.io/f/YOUR_ID" 
  method="POST"
  class="space-y-6"
>
  <!-- Honeypot -->
  <div class="hidden">
    <input type="text" name="_gotcha" tabindex="-1" autocomplete="off" />
  </div>
  
  <!-- Redirect after submit -->
  <input type="hidden" name="_next" value="https://jacquihowles.com/thank-you" />
  
  <!-- Name -->
  <div>
    <label for="name" class="block text-sm font-medium mb-2">
      Your name <span class="text-red-500">*</span>
    </label>
    <input 
      type="text" 
      id="name" 
      name="name" 
      required
      class="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
    />
  </div>
  
  <!-- Email -->
  <div>
    <label for="email" class="block text-sm font-medium mb-2">
      Email address <span class="text-red-500">*</span>
    </label>
    <input 
      type="email" 
      id="email" 
      name="email" 
      required
      class="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
    />
  </div>
  
  <!-- Phone (optional) -->
  <div>
    <label for="phone" class="block text-sm font-medium mb-2">
      Phone number <span class="text-gray-400">(optional)</span>
    </label>
    <input 
      type="tel" 
      id="phone" 
      name="phone"
      class="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
    />
  </div>
  
  <!-- Message -->
  <div>
    <label for="message" class="block text-sm font-medium mb-2">
      How can I help? <span class="text-red-500">*</span>
    </label>
    <textarea 
      id="message" 
      name="message" 
      rows="5"
      required
      class="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
      placeholder="Tell me a bit about what you're experiencing and what you're looking for..."
    ></textarea>
  </div>
  
  <!-- Submit -->
  <button 
    type="submit"
    class="w-full bg-primary-500 text-white py-3 px-6 rounded-lg hover:bg-primary-600 transition-colors font-medium"
  >
    Send Message
  </button>
  
  <p class="text-sm text-gray-500 text-center">
    Or email directly: <a href="mailto:hello@jacquihowles.com" class="text-primary-600 underline">hello@jacquihowles.com</a>
  </p>
</form>
```text

## Related Skills

- `copywriting/cta-optimizer.md` - Form CTA text
- `design/spacing-layout.md` - Form layout
- `qa/accessibility.md` - Accessible forms
- `analytics-tracking.md` - Track form submissions
