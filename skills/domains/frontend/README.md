# Frontend Development Skills

Patterns and best practices for building modern frontend applications with React, Vue, Angular, and other frameworks.

## When to Use These Skills

| If you're... | Start with |
|--------------|------------|
| Starting a React project | `react-patterns.md` |
| Building accessible interfaces | `accessibility-patterns.md` |
| Managing complex state | `react-patterns.md` (State Management section) |
| Optimizing component performance | `react-patterns.md` (Performance section) |
| Implementing keyboard navigation | `accessibility-patterns.md` |

## Framework Coverage

### React

React is a declarative, component-based library for building user interfaces. Known for its virtual DOM, unidirectional data flow, and rich ecosystem.

**Key concepts:**

- Components (functional vs class)
- Hooks (useState, useEffect, useContext, custom hooks)
- State management (local, Context API, Redux, Zustand)
- Performance optimization (memo, useMemo, useCallback)

**See:** `react-patterns.md`

### Vue

Vue is a progressive framework for building user interfaces with a gentle learning curve and excellent documentation.

**Key concepts:**

- Single File Components (SFC)
- Composition API vs Options API
- Reactivity system (ref, reactive, computed)
- Vue Router and Pinia (state management)

**Status:** Planned - see `skills/self-improvement/SKILL_BACKLOG.md`

### Angular

Angular is a comprehensive framework for building scalable web applications with TypeScript, dependency injection, and RxJS.

**Key concepts:**

- Components, directives, pipes
- Services and dependency injection
- RxJS observables and reactive patterns
- NgModules and standalone components

**Status:** Planned - see `skills/self-improvement/SKILL_BACKLOG.md`

## Cross-Framework Patterns

### Component Architecture

**Atomic Design:** Organize components into atoms, molecules, organisms, templates, and pages for scalability and reusability.

**Container/Presentational:** Separate data-fetching logic (containers) from UI rendering (presentational components).

**Composition over Inheritance:** Build complex components by combining simpler ones rather than using class inheritance.

### State Management

**Local State:** Use component-level state for UI-only concerns (toggles, form inputs).

**Global State:** Use context/stores for shared data (user auth, theme, shopping cart).

**Server State:** Use specialized libraries (React Query, SWR) for remote data caching and synchronization.

### Performance

**Code Splitting:** Load JavaScript on-demand using dynamic imports and route-based chunking.

**Lazy Loading:** Defer loading of components, images, and routes until needed.

**Memoization:** Cache expensive computations and prevent unnecessary re-renders.

## Skill Categories

### Core Patterns (Available)

- [React Patterns](react-patterns.md) - Hooks, composition, state management, performance
- [Accessibility Patterns](accessibility-patterns.md) - ARIA, keyboard navigation, screen readers

### Planned Skills

See `skills/self-improvement/SKILL_BACKLOG.md` for upcoming frontend skills:

- Vue patterns and composition API
- Angular patterns and dependency injection
- Advanced TypeScript patterns for frontend
- Testing patterns (Jest, React Testing Library, Cypress)
- Build tooling (Vite, Webpack, esbuild)

## Related Skills

- **[TypeScript Patterns](../languages/typescript/README.md)** - Type system, generics, advanced types
- **[Testing Patterns](../code-quality/testing-patterns.md)** - Unit, integration, and e2e testing
- **[Website Development](../websites/README.md)** - Website-specific patterns (SEO, performance, copywriting)
- **[Performance Optimization](../websites/build/performance.md)** - Web performance metrics and optimization
- **[API Design Patterns](../backend/api-design-patterns.md)** - REST/GraphQL for frontend integration

## Integration with Ralph

Frontend skills integrate with Ralph's PLAN/BUILD cycle:

```text
PLAN mode:
  → Choose framework (React vs Vue vs Angular)
  → Design component hierarchy
  → Plan state management approach
  → Identify accessibility requirements

BUILD mode:
  → Implement components using framework patterns
  → Add accessibility features (ARIA, keyboard nav)
  → Optimize performance (code splitting, memoization)
  → Validate with testing patterns
```

## Common Pitfalls

### Over-Engineering State

**Problem:** Using Redux/Zustand for everything, even simple local UI state.

**Solution:** Start with local state, elevate only when sharing across components.

### Premature Optimization

**Problem:** Memoizing everything, causing code complexity without measurable gains.

**Solution:** Profile first, optimize bottlenecks, not hunches.

### Accessibility as Afterthought

**Problem:** Adding ARIA labels and keyboard nav at the end of development.

**Solution:** Build accessible by default - semantic HTML, proper labels, keyboard support from day one.

### Prop Drilling

**Problem:** Passing props through many intermediate components.

**Solution:** Use Context API, composition, or state management library to avoid deep prop chains.

## Quick Reference

### When to Use What

| Need | Solution |
|------|----------|
| Simple UI state (toggle, modal) | Local state (useState) |
| Shared state (auth, theme) | Context API or state library |
| Server data (API calls) | React Query, SWR, or TanStack Query |
| Complex forms | Form libraries (React Hook Form, Formik) |
| Routing | React Router, Vue Router, Angular Router |
| Styling | CSS Modules, Tailwind, Styled Components |
| Testing | Jest + Testing Library + Cypress/Playwright |

### Framework Comparison

| Feature | React | Vue | Angular |
|---------|-------|-----|---------|
| Learning Curve | Moderate | Gentle | Steep |
| Bundle Size | Small | Small | Large |
| TypeScript | Optional | Optional | Required |
| Tooling | Extensive | Excellent | Comprehensive |
| Best For | SPAs, complex UIs | Progressive enhancement | Enterprise apps |

## See Also

- **[React Patterns](react-patterns.md)** - React-specific patterns and best practices
- **[Accessibility Patterns](accessibility-patterns.md)** - Building accessible interfaces
- **[Website Development](../websites/README.md)** - Website-specific patterns
- **[Testing Patterns](../code-quality/testing-patterns.md)** - Frontend testing strategies
