# AGENTS - All Done Sites

## Project-Specific Agent Behaviors

This file defines custom agent behaviors and preferences for the alldonesites project.

### Repository Information
- **Repository:** alldonesites
- **Work Branch:** alldonesites-work
- **Main Branch:** main
- **Workflow:** Development on work branch → PR to main

### Tech Stack Awareness

**Frontend:**
- React 18.3 with TypeScript
- Vite for build tooling
- shadcn-ui component library
- Tailwind CSS for styling
- React Router for navigation
- react-helmet-async for SEO

**Build Process:**
- Custom static page generation script
- Post-build processing for SEO
- Development and production builds

### Code Style Preferences

1. **TypeScript First**
   - Use TypeScript for all new files
   - Prefer interfaces over types for object shapes
   - Use proper type annotations

2. **Component Structure**
   - Functional components with hooks
   - Props interfaces defined above component
   - Export default at the end of file

3. **Styling**
   - Use Tailwind utility classes
   - Follow shadcn-ui patterns for consistency
   - Responsive design with mobile-first approach

4. **SEO Best Practices**
   - Use react-helmet-async for meta tags
   - Semantic HTML structure
   - Alt text for all images
   - Structured data when applicable

### Development Workflow

**Testing:**
- Manual testing in development mode
- Check responsive behavior
- Verify SEO tags and meta data
- Test static page generation

**Building:**
```bash
npm run dev      # Development server
npm run build    # Production build with static pages
npm run preview  # Preview production build
```

**Linting:**
```bash
npm run lint     # Check for issues
```

### Ralph Integration

**Loop Workflow:**
```bash
cd workers/ralph
bash loop.sh --iterations 5
```

**PR Generation:**
```bash
cd workers/ralph
bash pr-batch.sh
```

### Validation Criteria

Before marking tasks complete:
- [ ] TypeScript compiles without errors
- [ ] ESLint passes
- [ ] Components render correctly
- [ ] Responsive design works
- [ ] SEO meta tags present
- [ ] Static pages generate successfully
- [ ] No console errors

### Brain Skills Access

This project has access to the shared brain/skills knowledge base for:
- Best practices and patterns
- Common solutions to problems
- Domain-specific expertise

### Notes

- Portfolio sites need strong SEO
- Visual design is critical
- Performance matters for rankings
- Keep build process maintainable
