# Accessibility Patterns for Frontend Development

Patterns and best practices for building accessible web applications that work for all users, including those using assistive technologies.

## When to Use This Skill

| If you're... | Use this pattern |
|--------------|------------------|
| Building interactive components | ARIA roles and states |
| Implementing keyboard navigation | Focus management patterns |
| Creating forms | Accessible form patterns |
| Building modals/dialogs | Focus trap and ARIA dialog |
| Displaying dynamic content | Live regions and announcements |
| Using icons/images | Alternative text patterns |
| Creating navigation menus | Keyboard-accessible menus |

## Core Principles

### Semantic HTML First

Use native HTML elements before reaching for ARIA. Browsers and assistive technologies understand semantic HTML best.

**Pattern: Prefer semantic elements**

```html
<!-- ❌ Bad: Divs with ARIA -->
<div role="button" tabindex="0" onclick="submit()">Submit</div>

<!-- ✅ Good: Native button -->
<button type="submit">Submit</button>
```

**Pattern: Semantic landmarks**

```html
<!-- ✅ Use semantic landmarks -->
<header>
  <nav aria-label="Main navigation">
    <!-- navigation links -->
  </nav>
</header>

<main>
  <article>
    <!-- main content -->
  </article>
  <aside>
    <!-- complementary content -->
  </aside>
</main>

<footer>
  <!-- footer content -->
</footer>
```

### Keyboard Navigation

All interactive elements must be keyboard accessible. Users should be able to navigate using Tab, Enter, Space, Arrow keys, and Escape.

**Pattern: Tab order and focus**

```javascript
// ✅ Ensure logical tab order
function AccessibleTabs() {
  const [activeTab, setActiveTab] = useState(0);
  const tabRefs = useRef([]);

  const handleKeyDown = (e, index) => {
    switch (e.key) {
      case 'ArrowRight':
        e.preventDefault();
        const nextIndex = (index + 1) % tabRefs.current.length;
        tabRefs.current[nextIndex].focus();
        setActiveTab(nextIndex);
        break;
      case 'ArrowLeft':
        e.preventDefault();
        const prevIndex = (index - 1 + tabRefs.current.length) % tabRefs.current.length;
        tabRefs.current[prevIndex].focus();
        setActiveTab(prevIndex);
        break;
      case 'Home':
        e.preventDefault();
        tabRefs.current[0].focus();
        setActiveTab(0);
        break;
      case 'End':
        e.preventDefault();
        const lastIndex = tabRefs.current.length - 1;
        tabRefs.current[lastIndex].focus();
        setActiveTab(lastIndex);
        break;
    }
  };

  return (
    <div>
      <div role="tablist" aria-label="Content sections">
        {tabs.map((tab, index) => (
          <button
            key={tab.id}
            ref={el => tabRefs.current[index] = el}
            role="tab"
            id={`tab-${index}`}
            aria-selected={activeTab === index}
            aria-controls={`panel-${index}`}
            tabIndex={activeTab === index ? 0 : -1}
            onClick={() => setActiveTab(index)}
            onKeyDown={(e) => handleKeyDown(e, index)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {tabs.map((tab, index) => (
        <div
          key={tab.id}
          role="tabpanel"
          id={`panel-${index}`}
          aria-labelledby={`tab-${index}`}
          hidden={activeTab !== index}
          tabIndex={0}
        >
          {tab.content}
        </div>
      ))}
    </div>
  );
}
```

### Screen Reader Support

Provide context and state information for screen reader users through proper labeling and ARIA attributes.

## ARIA Patterns

### ARIA Roles

Use ARIA roles to define the purpose of elements when semantic HTML isn't sufficient.

**Pattern: Common roles**

```html
<!-- Navigation landmark -->
<nav role="navigation" aria-label="Main">
  <!-- links -->
</nav>

<!-- Search landmark -->
<form role="search">
  <input type="search" aria-label="Search articles" />
</form>

<!-- Alert for important messages -->
<div role="alert" aria-live="assertive">
  Form submission failed. Please check errors below.
</div>

<!-- Status for non-critical updates -->
<div role="status" aria-live="polite">
  5 items in cart
</div>
```

### ARIA States and Properties

Communicate dynamic state changes to assistive technologies.

**Pattern: Toggle button states**

```javascript
function ToggleButton() {
  const [isPressed, setIsPressed] = useState(false);

  return (
    <button
      aria-pressed={isPressed}
      onClick={() => setIsPressed(!isPressed)}
    >
      {isPressed ? 'On' : 'Off'}
    </button>
  );
}
```

**Pattern: Expandable sections**

```javascript
function Accordion({ items }) {
  const [expandedId, setExpandedId] = useState(null);

  return (
    <div>
      {items.map(item => (
        <div key={item.id}>
          <button
            aria-expanded={expandedId === item.id}
            aria-controls={`content-${item.id}`}
            onClick={() => setExpandedId(
              expandedId === item.id ? null : item.id
            )}
          >
            {item.title}
          </button>
          <div
            id={`content-${item.id}`}
            hidden={expandedId !== item.id}
            role="region"
            aria-labelledby={`heading-${item.id}`}
          >
            {item.content}
          </div>
        </div>
      ))}
    </div>
  );
}
```

### ARIA Labels and Descriptions

Provide accessible names and descriptions for elements.

**Pattern: Label vs description**

```html
<!-- aria-label: Replaces visible text -->
<button aria-label="Close dialog">
  <svg><!-- X icon --></svg>
</button>

<!-- aria-labelledby: References another element -->
<div role="dialog" aria-labelledby="dialog-title">
  <h2 id="dialog-title">Confirm deletion</h2>
  <!-- dialog content -->
</div>

<!-- aria-describedby: Adds supplementary info -->
<input
  type="password"
  aria-describedby="password-requirements"
/>
<div id="password-requirements">
  Must be at least 8 characters with 1 number
</div>
```

## Focus Management

### Focus Trap

Contain focus within modal dialogs and prevent keyboard users from tabbing out.

**Pattern: Focus trap with hooks**

```javascript
function useFocusTrap(ref, isActive) {
  useEffect(() => {
    if (!isActive) return;

    const element = ref.current;
    if (!element) return;

    const focusableElements = element.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const handleKeyDown = (e) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        // Shift+Tab on first element -> focus last
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        // Tab on last element -> focus first
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    element.addEventListener('keydown', handleKeyDown);
    firstElement?.focus();

    return () => {
      element.removeEventListener('keydown', handleKeyDown);
    };
  }, [ref, isActive]);
}

function Modal({ isOpen, onClose, children }) {
  const modalRef = useRef(null);
  const previousFocusRef = useRef(null);

  useFocusTrap(modalRef, isOpen);

  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement;
    } else if (previousFocusRef.current) {
      previousFocusRef.current.focus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      ref={modalRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <h2 id="modal-title">Modal Title</h2>
      {children}
      <button onClick={onClose}>Close</button>
    </div>
  );
}
```

### Focus Indicators

Ensure visible focus indicators for keyboard navigation.

**Pattern: Custom focus styles**

```css
/* ❌ Bad: Removing focus outline */
button:focus {
  outline: none;
}

/* ✅ Good: Custom accessible focus style */
button:focus-visible {
  outline: 2px solid #0066cc;
  outline-offset: 2px;
}

/* ✅ Better: High contrast focus ring */
button:focus-visible {
  outline: 3px solid currentColor;
  outline-offset: 3px;
}
```

## Form Accessibility

### Labels and Instructions

Every form input needs a proper label and clear instructions.

**Pattern: Accessible form fields**

```javascript
function FormField({ label, id, error, required, hint }) {
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;

  return (
    <div>
      <label htmlFor={id}>
        {label}
        {required && <span aria-label="required"> *</span>}
      </label>
      
      {hint && (
        <div id={hintId} className="hint">
          {hint}
        </div>
      )}
      
      <input
        id={id}
        aria-required={required}
        aria-invalid={!!error}
        aria-describedby={
          [hint && hintId, error && errorId]
            .filter(Boolean)
            .join(' ') || undefined
        }
      />
      
      {error && (
        <div id={errorId} role="alert" className="error">
          {error}
        </div>
      )}
    </div>
  );
}
```

### Error Handling

Communicate errors clearly and provide guidance for resolution.

**Pattern: Form validation with announcements**

```javascript
function Form() {
  const [errors, setErrors] = useState({});
  const [submitStatus, setSubmitStatus] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = validateForm(formData);
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setSubmitStatus(`Form has ${Object.keys(newErrors).length} errors. Please fix them and resubmit.`);
      
      // Focus first error field
      const firstErrorField = document.querySelector('[aria-invalid="true"]');
      firstErrorField?.focus();
      
      return;
    }

    // Submit form...
    setSubmitStatus('Form submitted successfully!');
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields */}
      
      {/* Screen reader announcements */}
      <div role="status" aria-live="polite" className="sr-only">
        {submitStatus}
      </div>
      
      <button type="submit">Submit</button>
    </form>
  );
}
```

## Live Regions

Use ARIA live regions to announce dynamic content changes to screen readers.

**Pattern: Live region announcements**

```javascript
function useAnnounce() {
  const [announcement, setAnnouncement] = useState('');

  const announce = (message, priority = 'polite') => {
    setAnnouncement(''); // Clear first to ensure re-announcement
    setTimeout(() => setAnnouncement(message), 100);
  };

  return { announcement, announce };
}

function ShoppingCart() {
  const { announcement, announce } = useAnnounce();
  const [items, setItems] = useState([]);

  const addItem = (item) => {
    setItems([...items, item]);
    announce(`${item.name} added to cart. ${items.length + 1} items total.`);
  };

  return (
    <>
      {/* Visually hidden live region */}
      <div role="status" aria-live="polite" className="sr-only">
        {announcement}
      </div>
      
      {/* Cart UI */}
      <div>
        {/* ... */}
      </div>
    </>
  );
}
```

**Pattern: Live region priorities**

```html
<!-- Polite: Non-urgent updates (status messages, cart updates) -->
<div role="status" aria-live="polite">
  Item added to cart
</div>

<!-- Assertive: Urgent updates (errors, warnings) -->
<div role="alert" aria-live="assertive">
  Payment processing failed
</div>

<!-- Off: No announcements (default) -->
<div aria-live="off">
  This won't be announced
</div>
```

## Alternative Text

### Images

Provide meaningful alternative text for images.

**Pattern: Image alt text guidelines**

```html
<!-- Informative image: Describe the content -->
<img
  src="chart.png"
  alt="Bar chart showing 50% increase in sales from Q1 to Q2"
/>

<!-- Functional image (link/button): Describe the action -->
<a href="/search">
  <img src="search-icon.png" alt="Search" />
</a>

<!-- Decorative image: Empty alt (don't use "decorative image") -->
<img src="divider.png" alt="" role="presentation" />

<!-- Complex image: Use aria-describedby for details -->
<figure>
  <img
    src="complex-diagram.png"
    alt="System architecture diagram"
    aria-describedby="diagram-description"
  />
  <figcaption id="diagram-description">
    Detailed description of the architecture...
  </figcaption>
</figure>
```

### Icons

Handle icon accessibility correctly.

**Pattern: Icon buttons**

```javascript
// ✅ Icon with visible text
function Button({ children, icon: Icon }) {
  return (
    <button>
      <Icon aria-hidden="true" />
      <span>{children}</span>
    </button>
  );
}

// ✅ Icon-only button with aria-label
function IconButton({ icon: Icon, label, onClick }) {
  return (
    <button aria-label={label} onClick={onClick}>
      <Icon aria-hidden="true" />
    </button>
  );
}

// ❌ Bad: No accessible text
function BadButton({ icon: Icon }) {
  return (
    <button>
      <Icon />
    </button>
  );
}
```

## Skip Links

Allow keyboard users to skip repetitive content.

**Pattern: Skip to main content**

```html
<style>
  .skip-link {
    position: absolute;
    top: -40px;
    left: 0;
    background: #000;
    color: #fff;
    padding: 8px;
    text-decoration: none;
    z-index: 100;
  }
  
  .skip-link:focus {
    top: 0;
  }
</style>

<a href="#main-content" class="skip-link">
  Skip to main content
</a>

<header>
  <nav><!-- navigation --></nav>
</header>

<main id="main-content" tabindex="-1">
  <!-- main content -->
</main>
```

## Color and Contrast

### Contrast Ratios

Ensure sufficient contrast for text readability.

**Guidelines:**

- Normal text (< 18pt): 4.5:1 minimum
- Large text (≥ 18pt or 14pt bold): 3:1 minimum
- UI components and graphics: 3:1 minimum

**Tools:**

- WebAIM Contrast Checker
- Chrome DevTools Accessibility panel
- axe DevTools browser extension

**Pattern: High contrast mode support**

```css
/* Respect user's preference for high contrast */
@media (prefers-contrast: high) {
  button {
    border: 2px solid currentColor;
  }
}

/* Don't rely on color alone */
.error {
  color: #d32f2f;
  border-left: 4px solid currentColor; /* Visual indicator beyond color */
}
.error::before {
  content: '⚠ '; /* Additional visual cue */
}
```

### Color Blindness

Don't rely solely on color to convey information.

**Pattern: Multiple visual cues**

```javascript
// ✅ Status indicators with icon + color
function StatusBadge({ status }) {
  const variants = {
    success: { icon: '✓', color: 'green', label: 'Success' },
    error: { icon: '✕', color: 'red', label: 'Error' },
    warning: { icon: '⚠', color: 'orange', label: 'Warning' },
  };

  const { icon, color, label } = variants[status];

  return (
    <span
      className={`badge badge-${color}`}
      role="status"
      aria-label={label}
    >
      <span aria-hidden="true">{icon}</span>
      {label}
    </span>
  );
}
```

## Testing Accessibility

### Automated Testing

Use tools to catch common issues.

**Pattern: Jest + Testing Library**

```javascript
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

test('button is accessible', async () => {
  const { container } = render(<Button>Click me</Button>);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});

test('form field has proper labels', () => {
  const { getByLabelText } = render(
    <FormField label="Email" id="email" />
  );
  expect(getByLabelText('Email')).toBeInTheDocument();
});
```

### Manual Testing

Automated tools catch ~30-40% of issues. Manual testing is essential.

**Checklist:**

1. **Keyboard navigation**
   - Tab through all interactive elements
   - Verify focus indicators are visible
   - Test keyboard shortcuts (Escape, Enter, Arrow keys)

2. **Screen reader testing**
   - NVDA (Windows) / JAWS (Windows) / VoiceOver (Mac/iOS)
   - Navigate by headings, landmarks, forms
   - Verify announcements for dynamic content

3. **Zoom and reflow**
   - Test at 200% zoom (content should not overflow)
   - Verify responsive design doesn't break accessibility

4. **Color and contrast**
   - Use browser DevTools to check contrast ratios
   - Test with grayscale filter (no info should be lost)

## Common Pitfalls

### ARIA Misuse

**Problem:** Adding ARIA without understanding its purpose.

```html
<!-- ❌ Bad: Conflicting semantics -->
<button role="heading">Click me</button>

<!-- ✅ Good: Use semantic HTML or appropriate role -->
<button>Click me</button>
```

**Solution:** First rule of ARIA: Don't use ARIA if native HTML works.

### Keyboard Traps

**Problem:** Users can't escape from components (modals, menus).

**Solution:** Always provide Escape key handler and manage focus properly.

### Missing Focus Management

**Problem:** Opening a modal or changing views doesn't move focus appropriately.

**Solution:** Use `useEffect` to focus the appropriate element on mount/change.

### Inaccessible Custom Components

**Problem:** Building custom controls (dropdowns, sliders) without accessibility.

**Solution:** Follow ARIA Authoring Practices Guide patterns for each widget type.

## Resources

### Standards and Guidelines

- **WCAG 2.1** (Web Content Accessibility Guidelines): <https://www.w3.org/WAI/WCAG21/quickref/>
- **ARIA Authoring Practices**: <https://www.w3.org/WAI/ARIA/apg/>
- **Section 508**: U.S. federal accessibility requirements

### Tools

- **axe DevTools**: Browser extension for accessibility testing
- **Lighthouse**: Built into Chrome DevTools
- **WAVE**: Web accessibility evaluation tool
- **pa11y**: Command-line accessibility testing

### Testing

- **Screen readers**: NVDA (free), JAWS (paid), VoiceOver (Mac/iOS built-in)
- **jest-axe**: Automated testing in Jest
- **cypress-axe**: Automated testing in Cypress
- **Testing Library**: Encourages accessible queries

## Integration with Ralph

When working on accessibility in Ralph's PLAN/BUILD cycle:

```text
PLAN mode:
  → Identify WCAG level required (A, AA, AAA)
  → Map out keyboard interaction patterns
  → Plan focus management for modals/routes
  → Define ARIA labels and live regions

BUILD mode:
  → Implement semantic HTML structure
  → Add ARIA roles/states/properties
  → Implement keyboard navigation
  → Test with screen readers and automated tools
  → Run axe-core validation
```

## See Also

- **[React Patterns](react-patterns.md)** - React-specific component patterns
- **[Frontend README](README.md)** - Frontend development overview
- **[Testing Patterns](../code-quality/testing-patterns.md)** - Testing strategies including accessibility tests
- **[Website QA/Accessibility](../websites/qa/accessibility.md)** - Website-specific accessibility patterns
