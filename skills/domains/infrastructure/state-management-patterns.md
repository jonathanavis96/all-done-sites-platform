# State Management Patterns

## Why This Exists

State management is one of the most challenging aspects of frontend development. Poor state management leads to prop drilling, unnecessary re-renders, difficult debugging, stale data, race conditions, and unmaintainable code. This knowledge base documents proven state management patterns across different state types (local, global, server, form, URL) and tools (React Context, Zustand, Redux Toolkit, React Query, SWR), helping teams choose the right solution for each use case and avoid common pitfalls.

**Problem solved:** Without clear state management patterns, teams either over-engineer with Redux for simple cases, or under-engineer with prop drilling and lift-state-up anti-patterns. They struggle with server state synchronization, form validation, optimistic updates, and choosing between controlled vs uncontrolled components.

## When to Use It

Reference this KB file when:

- Choosing a state management solution for a new feature or project
- Refactoring components with excessive prop drilling or lift-state-up
- Implementing data fetching, caching, or synchronization with server state
- Optimizing re-render performance caused by state changes
- Designing form state management with validation
- Debugging state-related bugs (stale closures, race conditions, inconsistent state)

**Specific triggers:**

- Component tree more than 3 levels deep passing the same props
- Multiple components need access to the same state
- State changes cause performance issues (excessive re-renders)
- Need to persist state across page navigation or refreshes
- Implementing real-time features or polling
- Form with complex validation rules or multi-step flows
- Need to sync client state with server state

## Quick Reference

### State Types and Solutions

| State Type | Examples | Recommended Tool |
| ------------ | ---------- | ------------------ |
| **Local UI** | Modal open, input value | `useState` |
| **Shared UI** | Theme, sidebar open | Context or Zustand |
| **Server/Cache** | API data, user profile | React Query / SWR |
| **Form** | Input values, validation | React Hook Form |
| **URL** | Filters, pagination | `useSearchParams` |
| **Global App** | Auth, cart, notifications | Zustand or Redux Toolkit |

### Tool Decision Matrix

| Need | useState | Context | Zustand | Redux | React Query |
| ------ | ---------- | --------- | --------- | ------- | ------------- |
| Simple local state | ✅ | ❌ | ❌ | ❌ | ❌ |
| Avoid prop drilling | ❌ | ✅ | ✅ | ✅ | ❌ |
| Frequent updates | ✅ | ⚠️ | ✅ | ✅ | ❌ |
| Server data + cache | ❌ | ❌ | ❌ | ⚠️ | ✅ |
| Time-travel debug | ❌ | ❌ | ✅ | ✅ | ❌ |
| Minimal boilerplate | ✅ | ✅ | ✅ | ❌ | ✅ |
| DevTools | ❌ | ❌ | ✅ | ✅ | ✅ |

### Common Mistakes

| ❌ Don't | ✅ Do |
| --------- | ------ |
| Redux for everything | Match tool to state type |
| Prop drill 4+ levels | Use Context or state library |
| Store server data in Redux | Use React Query/SWR |
| Derive state in render | `useMemo` or compute once |
| Update state in loops | Batch updates |
| Context for frequent updates | Zustand or split contexts |
| Controlled inputs always | Uncontrolled for simple forms |
| Forget cleanup in useEffect | Return cleanup function |

### Performance Patterns

| Problem | Solution |
| --------- | ---------- |
| Unnecessary re-renders | `React.memo`, selector functions |
| Slow context updates | Split into multiple contexts |
| Stale closures | `useRef` for latest value |
| Race conditions | Cancel previous requests |
| Large state object updates | Immer for immutable updates |

## Details

### State Classification

Before choosing a solution, identify what type of state you're managing:

| State Type | Scope | Examples | Best Solution |
| ------------ | ------- | ---------- | --------------- |
| **Local Component** | Single component | Form inputs, toggles, hover state | `useState`, `useReducer` |
| **Local Shared** | Component + children | Modal open/close, theme toggle | `useState` + props or Context |
| **Global Client** | Entire application | User preferences, UI state, cart | Context, Zustand, Redux |
| **Server State** | Synced with backend | User data, posts, comments | React Query, SWR |
| **Form State** | Form-specific | Validation, touched fields, submission | React Hook Form, Formik |
| **URL State** | Browser URL | Filters, pagination, tabs | URL search params, router |

**Golden Rule:** Start with the simplest solution. Only reach for global state when prop drilling becomes painful (3+ levels deep).

### Pattern 1: Local Component State (useState)

Use `useState` for state that only affects a single component.

```tsx
// ✅ Good: Local state for local UI
function Accordion({ title, children }: Props) {
  const [isOpen, setIsOpen] = useState(false)
  
  return (
    <div>
      <button onClick={() => setIsOpen(!isOpen)}>
        {title}
      </button>
      {isOpen && <div>{children}</div>}
    </div>
  )
}

// ✅ Good: Lazy initialization for expensive initial values
function SearchIndex({ items }: Props) {
  const [index, setIndex] = useState(() => buildSearchIndex(items))
  const [query, setQuery] = useState('')
  
  return <SearchResults index={index} query={query} />
}
```text

**When to use:**

- State only affects one component
- No need to share with siblings or ancestors
- Simple state transitions (toggles, counters, input values)

**Avoid:**

- Passing state through 3+ component levels
- Duplicating state across multiple components
- Complex state logic (use `useReducer` instead)

### Pattern 2: Local Complex State (useReducer)

Use `useReducer` for complex state logic with multiple sub-values or when next state depends on previous state.

```tsx
// ✅ Good: Complex state transitions with useReducer
type State = {
  status: 'idle' | 'loading' | 'success' | 'error'
  data: User | null
  error: Error | null
}

type Action =
  | { type: 'FETCH_START' }
  | { type: 'FETCH_SUCCESS'; payload: User }
  | { type: 'FETCH_ERROR'; error: Error }

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'FETCH_START':
      return { status: 'loading', data: null, error: null }
    case 'FETCH_SUCCESS':
      return { status: 'success', data: action.payload, error: null }
    case 'FETCH_ERROR':
      return { status: 'error', data: null, error: action.error }
    default:
      return state
  }
}

function UserProfile({ userId }: Props) {
  const [state, dispatch] = useReducer(reducer, {
    status: 'idle',
    data: null,
    error: null,
  })
  
  useEffect(() => {
    dispatch({ type: 'FETCH_START' })
    fetchUser(userId)
      .then(user => dispatch({ type: 'FETCH_SUCCESS', payload: user }))
      .catch(error => dispatch({ type: 'FETCH_ERROR', error }))
  }, [userId])
  
  if (state.status === 'loading') return <Spinner />
  if (state.status === 'error') return <Error error={state.error} />
  if (state.status === 'success') return <div>{state.data.name}</div>
  return null
}
```text

**When to use:**

- State has multiple related sub-values
- Next state depends on previous state
- Complex state transitions (e.g., state machines)
- Need to test state logic in isolation

**Note:** For data fetching, prefer React Query or SWR instead (see Pattern 6).

### Pattern 3: Shared State (React Context)

Use Context for state that needs to be shared across many components without prop drilling.

```tsx
// ✅ Good: Context for theme across entire app
type Theme = 'light' | 'dark'

const ThemeContext = createContext<{
  theme: Theme
  setTheme: (theme: Theme) => void
} | null>(null)

// Provider at app root
function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>('light')
  
  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

// Custom hook for convenience
function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) throw new Error('useTheme must be used within ThemeProvider')
  return context
}

// Usage in any component
function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  return (
    <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
      {theme} mode
    </button>
  )
}
```text

#### Performance optimization

Split contexts to prevent unnecessary re-renders:

```tsx
// ❌ Bad: Everything re-renders when anything changes
const AppContext = createContext({ user, theme, cart, notifications })

// ✅ Good: Split contexts by update frequency
const UserContext = createContext(user)        // Rarely changes
const ThemeContext = createContext(theme)      // Rarely changes
const CartContext = createContext(cart)        // Changes often
const NotificationsContext = createContext(notifications) // Changes often

// Or use separate providers
<UserProvider>
  <ThemeProvider>
    <CartProvider>
      <App />
    </CartProvider>
  </ThemeProvider>
</UserProvider>
```text

**When to use:**

- Data needed by many components at different nesting levels
- Data changes infrequently (theme, locale, user auth status)
- Want to avoid prop drilling through 3+ levels

**Avoid:**

- Rapidly changing data (causes re-renders of all consumers)
- Data that only 1-2 components need (use props instead)
- Server state (use React Query/SWR instead)

### Pattern 4: Global Client State (Zustand)

Use Zustand for global client state with better performance than Context.

```tsx
// ✅ Good: Zustand store for shopping cart
import { create } from 'zustand'

type CartItem = { id: string; quantity: number }

type CartStore = {
  items: CartItem[]
  addItem: (item: CartItem) => void
  removeItem: (id: string) => void
  clearCart: () => void
}

export const useCartStore = create<CartStore>((set) => ({
  items: [],
  
  addItem: (item) => set((state) => ({
    items: [...state.items, item]
  })),
  
  removeItem: (id) => set((state) => ({
    items: state.items.filter(i => i.id !== id)
  })),
  
  clearCart: () => set({ items: [] }),
}))

// Usage: Only re-renders when selected state changes
function CartBadge() {
  const itemCount = useCartStore(state => state.items.length)
  return <Badge>{itemCount}</Badge>
}

function CartButton() {
  const clearCart = useCartStore(state => state.clearCart)
  return <button onClick={clearCart}>Clear Cart</button>
}
```text

**Persist to localStorage:**

```tsx
import { persist } from 'zustand/middleware'

export const useCartStore = create(
  persist<CartStore>(
    (set) => ({
      items: [],
      addItem: (item) => set((state) => ({ items: [...state.items, item] })),
      removeItem: (id) => set((state) => ({ items: state.items.filter(i => i.id !== id) })),
      clearCart: () => set({ items: [] }),
    }),
    {
      name: 'cart-storage', // localStorage key
    }
  )
)
```text

**When to use:**

- Global state that changes frequently (shopping cart, notifications)
- Need better performance than Context (selector-based subscriptions)
- Want simple API without boilerplate (vs Redux)
- Need to persist state to localStorage

**Advantages over Context:**

- No Provider wrapper needed
- Automatic selector optimization (only re-render when selected state changes)
- Built-in persistence middleware
- Smaller bundle size than Redux

### Pattern 5: Global Client State (Redux Toolkit)

Use Redux Toolkit for complex global state with middleware requirements.

```tsx
// ✅ Good: Redux Toolkit for complex state with middleware
import { configureStore, createSlice, PayloadAction } from '@reduxjs/toolkit'

type User = { id: string; name: string; role: string }

const userSlice = createSlice({
  name: 'user',
  initialState: { current: null as User | null, status: 'idle' },
  reducers: {
    setUser: (state, action: PayloadAction<User>) => {
      state.current = action.payload
      state.status = 'authenticated'
    },
    clearUser: (state) => {
      state.current = null
      state.status = 'unauthenticated'
    },
  },
})

export const { setUser, clearUser } = userSlice.actions

export const store = configureStore({
  reducer: {
    user: userSlice.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(loggerMiddleware),
})

// Usage
import { useSelector, useDispatch } from 'react-redux'

function UserProfile() {
  const user = useSelector((state: RootState) => state.user.current)
  const dispatch = useDispatch()
  
  if (!user) return <LoginButton />
  
  return (
    <div>
      {user.name}
      <button onClick={() => dispatch(clearUser())}>Logout</button>
    </div>
  )
}
```text

**When to use:**

- Very large applications with complex state requirements
- Need advanced middleware (sagas, observables, custom logging)
- Team already familiar with Redux patterns
- Need Redux DevTools time-travel debugging

**Modern recommendation:** Prefer Zustand for most use cases. Use Redux Toolkit only when you specifically need its middleware ecosystem.

### Pattern 6: Server State (React Query / TanStack Query)

Use React Query for server state management (fetching, caching, synchronization).

```tsx
// ✅ Good: React Query for server state
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

// Fetching data
function UserProfile({ userId }: Props) {
  const { data: user, isLoading, error } = useQuery({
    queryKey: ['user', userId],
    queryFn: () => fetchUser(userId),
    staleTime: 5 * 60 * 1000, // Consider fresh for 5 minutes
    cacheTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
  })
  
  if (isLoading) return <Spinner />
  if (error) return <Error error={error} />
  
  return <div>{user.name}</div>
}

// Mutations with optimistic updates
function UpdateUserButton({ userId }: Props) {
  const queryClient = useQueryClient()
  
  const mutation = useMutation({
    mutationFn: (newName: string) => updateUser(userId, { name: newName }),
    
    // Optimistic update
    onMutate: async (newName) => {
      await queryClient.cancelQueries({ queryKey: ['user', userId] })
      
      const previousUser = queryClient.getQueryData(['user', userId])
      
      queryClient.setQueryData(['user', userId], (old: User) => ({
        ...old,
        name: newName,
      }))
      
      return { previousUser }
    },
    
    // Rollback on error
    onError: (err, newName, context) => {
      queryClient.setQueryData(['user', userId], context.previousUser)
    },
    
    // Refetch on success
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['user', userId] })
    },
  })
  
  return (
    <button onClick={() => mutation.mutate('New Name')}>
      Update Name
    </button>
  )
}

// Dependent queries
function UserPosts({ userId }: Props) {
  const { data: user } = useQuery({
    queryKey: ['user', userId],
    queryFn: () => fetchUser(userId),
  })
  
  const { data: posts } = useQuery({
    queryKey: ['posts', userId],
    queryFn: () => fetchUserPosts(userId),
    enabled: !!user, // Only fetch posts after user is loaded
  })
  
  return <PostList posts={posts} />
}
```text

**When to use:**

- Any data fetched from a server/API
- Need automatic caching and background refetching
- Need optimistic updates or mutations
- Want to deduplicate requests across components
- Need to handle loading/error states consistently

**Advantages:**

- Automatic caching and deduplication
- Background refetching and synchronization
- Optimistic updates and rollback
- Request cancellation and retry logic
- Built-in loading/error states
- Eliminates need for useState/useEffect for data fetching

### Pattern 7: Server State (SWR)

Use SWR as a lighter alternative to React Query.

```tsx
// ✅ Good: SWR for simpler server state needs
import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then(r => r.json())

function UserProfile({ userId }: Props) {
  const { data: user, error, isLoading } = useSWR(
    `/api/users/${userId}`,
    fetcher,
    {
      revalidateOnFocus: true,    // Refresh when window gains focus
      revalidateOnReconnect: true, // Refresh when network reconnects
      dedupingInterval: 2000,      // Dedupe requests within 2s
    }
  )
  
  if (isLoading) return <Spinner />
  if (error) return <Error error={error} />
  
  return <div>{user.name}</div>
}

// Mutations with SWR
import { useSWRConfig } from 'swr'

function UpdateButton({ userId }: Props) {
  const { mutate } = useSWRConfig()
  
  async function handleUpdate() {
    // Optimistic update
    mutate(`/api/users/${userId}`, { name: 'New Name' }, false)
    
    // Send request
    await updateUser(userId, { name: 'New Name' })
    
    // Revalidate
    mutate(`/api/users/${userId}`)
  }
  
  return <button onClick={handleUpdate}>Update</button>
}

// Immutable data (never refetch)
import { useImmutableSWR } from 'swr/immutable'

function StaticConfig() {
  const { data } = useImmutableSWR('/api/config', fetcher)
  return <div>{data.appName}</div>
}
```text

**When to use:**

- Similar needs to React Query but prefer simpler API
- Smaller bundle size is important (SWR is ~4KB, React Query is ~13KB)
- Next.js projects (SWR made by Vercel, first-class Next.js support)

**React Query vs SWR:**

- React Query: More features, better TypeScript, more powerful devtools
- SWR: Simpler API, smaller bundle, sufficient for most use cases

### Pattern 8: Form State (React Hook Form)

Use React Hook Form for performant form state management.

```tsx
// ✅ Good: React Hook Form for forms
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const schema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
})

type FormData = z.infer<typeof schema>

function SignupForm() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  })
  
  async function onSubmit(data: FormData) {
    await createUser(data)
  }
  
  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register('email')} />
      {errors.email && <span>{errors.email.message}</span>}
      
      <input type="password" {...register('password')} />
      {errors.password && <span>{errors.password.message}</span>}
      
      <input type="password" {...register('confirmPassword')} />
      {errors.confirmPassword && <span>{errors.confirmPassword.message}</span>}
      
      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Creating...' : 'Sign Up'}
      </button>
    </form>
  )
}
```text

**When to use:**

- Forms with validation
- Need to minimize re-renders (React Hook Form uses uncontrolled inputs)
- Multi-step forms or complex form logic
- Need to integrate with validation libraries (Zod, Yup)

**Advantages over controlled inputs:**

- Fewer re-renders (doesn't re-render on every keystroke)
- Better performance for large forms
- Built-in validation and error handling
- Works with uncontrolled inputs (less state to manage)

### Pattern 9: URL State (Search Params)

Use URL search params for state that should be shareable via URL.

```tsx
// ✅ Good: URL state for filters and pagination
import { useSearchParams } from 'next/navigation'

function ProductList() {
  const searchParams = useSearchParams()
  const [params, setParams] = useSearchParams()
  
  const category = searchParams.get('category') |  | 'all'
  const page = parseInt(searchParams.get('page') |  | '1')
  const sortBy = searchParams.get('sort') |  | 'name'
  
  function updateFilter(key: string, value: string) {
    const newParams = new URLSearchParams(searchParams)
    newParams.set(key, value)
    setParams(newParams)
  }
  
  return (
    <div>
      <select
        value={category}
        onChange={(e) => updateFilter('category', e.target.value)}
      >
        <option value="all">All</option>
        <option value="electronics">Electronics</option>
      </select>
      
      <ProductGrid
        category={category}
        page={page}
        sortBy={sortBy}
      />
      
      <Pagination
        page={page}
        onPageChange={(p) => updateFilter('page', String(p))}
      />
    </div>
  )
}
```text

**When to use:**

- Filters, search queries, pagination, tabs
- State that should be shareable (copy URL to share state)
- State that should persist across page refreshes
- State that should be in browser history (back/forward buttons)

**Best practices:**

- Use search params for UI state, not sensitive data
- Validate and sanitize params (users can modify URLs)
- Provide sensible defaults for missing params
- Keep URLs human-readable

### Pattern 10: Derived State (Don't Store It)

Don't store state that can be computed from other state.

```tsx
// ❌ Bad: Storing derived state (can get out of sync)
function ShoppingCart() {
  const [items, setItems] = useState<CartItem[]>([])
  const [total, setTotal] = useState(0)
  
  function addItem(item: CartItem) {
    setItems([...items, item])
    setTotal(total + item.price) // Can get out of sync!
  }
  
  return <div>Total: ${total}</div>
}

// ✅ Good: Compute derived state on render
function ShoppingCart() {
  const [items, setItems] = useState<CartItem[]>([])
  
  // Derived state: computed from items
  const total = items.reduce((sum, item) => sum + item.price, 0)
  
  function addItem(item: CartItem) {
    setItems([...items, item])
  }
  
  return <div>Total: ${total}</div>
}

// ✅ Good: Use useMemo for expensive computations
function ProductList({ products }: Props) {
  const [searchQuery, setSearchQuery] = useState('')
  
  // Expensive computation: only re-run when dependencies change
  const filteredProducts = useMemo(() => {
    return products.filter(p =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [products, searchQuery])
  
  return <List items={filteredProducts} />
}
```text

**When to use:**

- Total can be computed from items
- Filtered list can be computed from list + filter
- Validation state can be computed from input values

**Use useMemo when:**

- Computation is expensive (filtering large lists, complex calculations)
- Derived state is passed to memoized components
- Profiling shows performance issues

### Pattern 11: Controlled vs Uncontrolled Components

Understand when to use controlled vs uncontrolled inputs.

```tsx
// Controlled: React state is source of truth
function ControlledInput() {
  const [value, setValue] = useState('')
  
  return (
    <input
      value={value}
      onChange={(e) => setValue(e.target.value)}
    />
  )
}

// Uncontrolled: DOM is source of truth
function UncontrolledInput() {
  const inputRef = useRef<HTMLInputElement>(null)
  
  function handleSubmit() {
    console.log(inputRef.current?.value)
  }
  
  return <input ref={inputRef} defaultValue="" />
}
```text

**Use controlled when:**

- Need to validate input on every keystroke
- Need to disable submit button based on input
- Multiple inputs depend on each other
- Need to format input as user types

**Use uncontrolled when:**

- Simple forms without complex validation
- Need better performance (fewer re-renders)
- Integrating with non-React code
- Using React Hook Form (it handles the ref management)

## Decision Tree

```text
Need to manage state?
├─ Is it server data? (from API/database)
│  ├─ Yes → Use React Query or SWR (Pattern 6/7)
│  └─ No ↓
├─ Is it a form?
│  ├─ Yes → Use React Hook Form (Pattern 8)
│  └─ No ↓
├─ Should it be in the URL? (shareable, persist on refresh)
│  ├─ Yes → Use URL search params (Pattern 9)
│  └─ No ↓
├─ Can it be derived from other state?
│  ├─ Yes → Compute it, don't store it (Pattern 10)
│  └─ No ↓
├─ Does only one component need it?
│  ├─ Yes → useState or useReducer (Pattern 1/2)
│  └─ No ↓
├─ Do 2-3 components need it (parent + children)?
│  ├─ Yes → useState + props or Context (Pattern 3)
│  └─ No ↓
├─ Do many components need it? (global state)
│  ├─ Changes rarely → Context (Pattern 3)
│  ├─ Changes frequently → Zustand (Pattern 4)
│  └─ Very complex + need middleware → Redux Toolkit (Pattern 5)
```text

## Common Pitfalls

### Pitfall 1: Using Global State Too Early

**Problem:** Reaching for Redux/Zustand when props would suffice.

```tsx
// ❌ Bad: Global state for data used in 2 components
const useUserStore = create((set) => ({
  user: null,
  setUser: (user) => set({ user }),
}))

function App() {
  const user = useUserStore(state => state.user)
  return <Dashboard user={user} />
}

// ✅ Good: Props for nearby components
function App() {
  const [user, setUser] = useState(null)
  return <Dashboard user={user} />
}
```text

**Solution:** Start with local state and props. Only introduce global state when prop drilling becomes painful (3+ levels).

### Pitfall 2: Storing Server State in Client State

**Problem:** Using useState/Redux for data that should be managed by React Query/SWR.

```tsx
// ❌ Bad: Manual server state management
function UserProfile({ userId }: Props) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  
  useEffect(() => {
    setLoading(true)
    fetchUser(userId)
      .then(setUser)
      .catch(setError)
      .finally(() => setLoading(false))
  }, [userId])
  
  // No caching, no deduplication, no refetching
}

// ✅ Good: React Query handles everything
function UserProfile({ userId }: Props) {
  const { data: user, isLoading, error } = useQuery({
    queryKey: ['user', userId],
    queryFn: () => fetchUser(userId),
  })
  // Automatic caching, deduplication, refetching, error handling
}
```text

**Solution:** Use React Query or SWR for all server state. Save useState/Redux for client-only state.

### Pitfall 3: Stale Closures

**Problem:** Event handlers or callbacks capture old state values.

```tsx
// ❌ Bad: Stale closure captures old count
function Counter() {
  const [count, setCount] = useState(0)
  
  useEffect(() => {
    const interval = setInterval(() => {
      console.log(count) // Always logs 0 (stale)
      setCount(count + 1) // Always sets to 1
    }, 1000)
    
    return () => clearInterval(interval)
  }, []) // Empty deps = stale closure
}

// ✅ Good: Use functional update
function Counter() {
  const [count, setCount] = useState(0)
  
  useEffect(() => {
    const interval = setInterval(() => {
      setCount(c => c + 1) // Gets current count
    }, 1000)
    
    return () => clearInterval(interval)
  }, [])
}
```text

**Solution:** Use functional updates (`setState(prev => ...)`) when new state depends on old state.

### Pitfall 4: Unnecessary Re-renders from Context

**Problem:** Context value changes cause all consumers to re-render.

```tsx
// ❌ Bad: Context value changes on every render
function AppProvider({ children }: Props) {
  const [user, setUser] = useState(null)
  
  // New object on every render → all consumers re-render
  return (
    <AppContext.Provider value={{ user, setUser }}>
      {children}
    </AppContext.Provider>
  )
}

// ✅ Good: Memoize context value
function AppProvider({ children }: Props) {
  const [user, setUser] = useState(null)
  
  const value = useMemo(() => ({ user, setUser }), [user])
  
  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  )
}

// ✅ Better: Split contexts by update frequency
const UserContext = createContext(user)
const UserActionsContext = createContext({ setUser })
```text

**Solution:** Memoize context values, or split contexts to isolate frequently changing data.

## Related Patterns

- See `caching-patterns.md` for client-side caching strategies (SWR, React Query)
- See `error-handling-patterns.md` for handling errors in async state updates
- See `testing-patterns.md` for testing components with state management
- See `references/react-best-practices/` for re-render optimization patterns

## References

- [React Docs: Managing State](https://react.dev/learn/managing-state)
- [TanStack Query (React Query)](https://tanstack.com/query/latest)
- [SWR Documentation](https://swr.vercel.app/)
- [Zustand](https://docs.pmnd.rs/zustand/getting-started/introduction)
- [Redux Toolkit](https://redux-toolkit.js.org/)
- [React Hook Form](https://react-hook-form.com/)
- [State Machines with XState](https://xstate.js.org/)
