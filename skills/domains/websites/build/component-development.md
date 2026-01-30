# Component Development

Builds reusable, consistent components with clean structure and maintainable code.

## Quick Reference

| Component Type | Examples | Reusability |
|----------------|----------|-------------|
| Primitives | Button, Input, Badge | Highly reusable |
| Composites | Card, Form, Modal | Reusable with variants |
| Sections | Hero, Testimonials, FAQ | Page-specific, templated |
| Layouts | Container, Grid, Stack | Structural, very reusable |

## Trigger Conditions

Use this skill when:

- Building any website UI
- Components are inconsistent
- Code is duplicated across pages
- Need maintainable, scalable structure

## Component Architecture

### File Structure (Astro/React)

```text
src/
├── components/
│   ├── ui/           # Primitives
│   │   ├── Button.astro
│   │   ├── Input.astro
│   │   └── Badge.astro
│   │
│   ├── common/       # Composites
│   │   ├── Card.astro
│   │   ├── TestimonialCard.astro
│   │   └── ServiceCard.astro
│   │
│   └── sections/     # Page sections
│       ├── Hero.astro
│       ├── Services.astro
│       ├── Testimonials.astro
│       └── FAQ.astro
│
├── layouts/
│   ├── BaseLayout.astro
│   └── PageLayout.astro
│
└── pages/
    ├── index.astro
    ├── about.astro
    └── contact.astro
```text

## Component Patterns

### Pattern 1: Props Interface

Define clear, typed props.

```astro
---
// Button.astro
interface Props {
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  href?: string;
  class?: string;
}

const { 
  variant = 'primary', 
  size = 'md', 
  href,
  class: className 
} = Astro.props;
---

{href ? (
  <a href={href} class:list={['btn', `btn-${variant}`, `btn-${size}`, className]}>
    <slot />
  </a>
) : (
  <button class:list={['btn', `btn-${variant}`, `btn-${size}`, className]}>
    <slot />
  </button>
)}
```text

### Pattern 2: Slots for Flexibility

Use slots for customizable content.

```astro
---
// Card.astro
interface Props {
  class?: string;
}
const { class: className } = Astro.props;
---

<div class:list={['card', className]}>
  <slot name="image" />
  <div class="card-content">
    <slot name="title" />
    <slot />
    <slot name="footer" />
  </div>
</div>
```text

Usage:

```astro
<Card>
  <img slot="image" src="/photo.jpg" alt="" />
  <h3 slot="title">Service Name</h3>
  <p>Description here</p>
  <Button slot="footer">Learn More</Button>
</Card>
```text

### Pattern 3: Section Components

Self-contained page sections.

```astro
---
// sections/Hero.astro
interface Props {
  headline: string;
  subheadline: string;
  ctaText: string;
  ctaHref: string;
  trustLine?: string;
  image?: string;
}

const { headline, subheadline, ctaText, ctaHref, trustLine, image } = Astro.props;
---

<section class="hero">
  <div class="container">
    <div class="hero-content">
      <h1>{headline}</h1>
      <p class="subheadline">{subheadline}</p>
      {trustLine && <p class="trust-line">{trustLine}</p>}
      <Button href={ctaHref} variant="primary" size="lg">
        {ctaText}
      </Button>
    </div>
    {image && (
      <div class="hero-image">
        <img src={image} alt="" />
      </div>
    )}
  </div>
</section>
```text

## Using shadcn/ui Pattern

If using React + Tailwind, follow shadcn/ui conventions:

```tsx
// components/ui/button.tsx
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md font-medium transition-colors",
  {
    variants: {
      variant: {
        primary: "bg-primary text-white hover:bg-primary/90",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        outline: "border border-input bg-background hover:bg-accent",
      },
      size: {
        sm: "h-9 px-3 text-sm",
        md: "h-10 px-4",
        lg: "h-11 px-8 text-lg",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return (
    <button className={cn(buttonVariants({ variant, size }), className)} {...props} />
  );
}
```text

## CSS Organization

### Option 1: Tailwind Classes

```astro
<button class="bg-primary text-white px-6 py-3 rounded-lg hover:bg-primary/90 transition-colors">
  Click Me
</button>
```text

### Option 2: CSS Modules / Scoped

```astro
<button class="btn">Click Me</button>

<style>
  .btn {
    background: var(--color-primary);
    color: white;
    padding: var(--space-3) var(--space-6);
    border-radius: var(--radius-lg);
  }
  .btn:hover {
    background: var(--color-primary-600);
  }
</style>
```text

### Option 3: Hybrid (Tailwind + CSS Variables)

```astro
<button class="bg-[var(--primary)] text-white px-6 py-3 rounded-lg">
  Click Me
</button>
```text

## Common Mistakes

| Mistake | Why It's Wrong | Do This Instead |
|---------|----------------|-----------------|
| Inline styles everywhere | Unmaintainable | Use components + CSS |
| No props/variants | Copy-paste code | Build flexible components |
| Giant components | Hard to maintain | Split into smaller pieces |
| Inconsistent naming | Confusing | Follow naming convention |
| No default values | Errors, verbose usage | Set sensible defaults |
| Hardcoded content | Not reusable | Pass as props |

## Example

**Project:** Psychology practice website (Astro)

```text
src/
├── components/
│   ├── ui/
│   │   ├── Button.astro
│   │   ├── Badge.astro
│   │   └── Icon.astro
│   │
│   ├── common/
│   │   ├── ServiceCard.astro
│   │   ├── TestimonialCard.astro
│   │   └── FAQItem.astro
│   │
│   └── sections/
│       ├── Hero.astro
│       ├── ServicesGrid.astro
│       ├── HowItWorks.astro
│       ├── AboutSnippet.astro
│       ├── Testimonials.astro
│       ├── FAQ.astro
│       └── FinalCTA.astro
│
├── layouts/
│   └── BaseLayout.astro
│
└── pages/
    ├── index.astro
    ├── about.astro
    ├── services.astro
    └── contact.astro
```text

## Related Skills

- `architecture/tech-stack-chooser.md` - Picking framework
- `design/spacing-layout.md` - Component spacing
- `mobile-first.md` - Responsive components
- `performance.md` - Component optimization
