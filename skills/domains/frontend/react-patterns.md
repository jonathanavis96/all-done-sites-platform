# React Patterns and Best Practices

Patterns, best practices, and common solutions for building React applications with hooks, composition, state management, and performance optimization.

## When to Use This Skill

| If you're... | Look here |
|--------------|-----------|
| Using React hooks | Hooks Best Practices section |
| Managing component state | State Management section |
| Building reusable components | Component Composition section |
| Optimizing performance | Performance Optimization section |
| Handling side effects | useEffect Patterns section |
| Creating custom logic | Custom Hooks section |

## Hooks Best Practices

### useState - Managing Local State

**Pattern: State initialization**

```javascript
// ✅ GOOD: Simple initial value
const [count, setCount] = useState(0);

// ✅ GOOD: Lazy initialization for expensive computation
const [data, setData] = useState(() => {
  return expensiveComputation();
});

// ❌ BAD: Running expensive computation on every render
const [data, setData] = useState(expensiveComputation());
```

**Pattern: Functional updates**

```javascript
// ✅ GOOD: Functional update when new state depends on old state
const increment = () => setCount(prev => prev + 1);

// ❌ BAD: Direct state reference (can be stale in async contexts)
const increment = () => setCount(count + 1);
```

**Pattern: Multiple related state values**

```javascript
// ❌ BAD: Multiple useState for related data
const [firstName, setFirstName] = useState('');
const [lastName, setLastName] = useState('');
const [email, setEmail] = useState('');

// ✅ GOOD: Single useState with object for related data
const [user, setUser] = useState({
  firstName: '',
  lastName: '',
  email: ''
});

// Update specific field
setUser(prev => ({ ...prev, email: 'new@example.com' }));
```

### useEffect - Managing Side Effects

**Pattern: Effect dependencies**

```javascript
// ✅ GOOD: All dependencies listed
useEffect(() => {
  fetchUser(userId);
}, [userId]);

// ❌ BAD: Missing dependencies (can cause stale closures)
useEffect(() => {
  fetchUser(userId);
}, []); // userId not listed

// ✅ GOOD: No dependencies for one-time effects
useEffect(() => {
  initializeAnalytics();
}, []);
```

**Pattern: Cleanup functions**

```javascript
// ✅ GOOD: Cleanup subscriptions and timers
useEffect(() => {
  const timer = setInterval(() => {
    console.log('tick');
  }, 1000);

  return () => clearInterval(timer);
}, []);

// ✅ GOOD: Cleanup event listeners
useEffect(() => {
  const handleResize = () => setWidth(window.innerWidth);
  window.addEventListener('resize', handleResize);

  return () => window.removeEventListener('resize', handleResize);
}, []);
```

**Pattern: Avoid effect waterfalls**

```javascript
// ❌ BAD: Cascading effects (slow, multiple re-renders)
useEffect(() => {
  setA(value);
}, [value]);

useEffect(() => {
  setB(a * 2);
}, [a]);

useEffect(() => {
  setC(b + 10);
}, [b]);

// ✅ GOOD: Single effect or derived state
useEffect(() => {
  const newA = value;
  const newB = newA * 2;
  const newC = newB + 10;
  
  setA(newA);
  setB(newB);
  setC(newC);
}, [value]);

// ✅ BETTER: Use derived state (no effects needed)
const a = value;
const b = a * 2;
const c = b + 10;
```

### useContext - Sharing State

**Pattern: Context creation and usage**

```javascript
// ✅ GOOD: Create context with default value
const ThemeContext = createContext('light');

// Provider component
function ThemeProvider({ children }) {
  const [theme, setTheme] = useState('light');
  
  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

// Consumer component
function ThemedButton() {
  const { theme, setTheme } = useContext(ThemeContext);
  
  return (
    <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
      Current theme: {theme}
    </button>
  );
}
```

**Pattern: Separate contexts for different concerns**

```javascript
// ✅ GOOD: Split contexts to avoid unnecessary re-renders
const UserContext = createContext(null);
const ThemeContext = createContext('light');

// Components only re-render when their specific context changes
function UserProfile() {
  const user = useContext(UserContext); // Only re-renders on user changes
  return <div>{user.name}</div>;
}

function ThemedButton() {
  const theme = useContext(ThemeContext); // Only re-renders on theme changes
  return <button className={theme}>Click me</button>;
}

// ❌ BAD: Single context with everything (causes unnecessary re-renders)
const AppContext = createContext({ user: null, theme: 'light', settings: {} });
```

### useMemo and useCallback - Performance Optimization

**Pattern: Memoize expensive computations**

```javascript
// ✅ GOOD: Memoize expensive computation
const expensiveValue = useMemo(() => {
  return computeExpensiveValue(a, b);
}, [a, b]);

// ❌ BAD: No memoization (recomputes every render)
const expensiveValue = computeExpensiveValue(a, b);

// ❌ BAD: Memoizing cheap computation (overhead not worth it)
const sum = useMemo(() => a + b, [a, b]); // Just do: const sum = a + b;
```

**Pattern: Memoize callbacks for child components**

```javascript
// ✅ GOOD: Memoize callback passed to memoized child
const MemoizedChild = memo(Child);

function Parent() {
  const [count, setCount] = useState(0);
  
  const handleClick = useCallback(() => {
    setCount(c => c + 1);
  }, []); // No dependencies needed with functional update
  
  return <MemoizedChild onClick={handleClick} />;
}

// ❌ BAD: New function instance every render (breaks memo)
function Parent() {
  const [count, setCount] = useState(0);
  
  return <MemoizedChild onClick={() => setCount(count + 1)} />;
}
```

### Custom Hooks

**Pattern: Extract reusable logic**

```javascript
// ✅ GOOD: Custom hook for form input handling
function useInput(initialValue) {
  const [value, setValue] = useState(initialValue);
  
  const handleChange = useCallback((e) => {
    setValue(e.target.value);
  }, []);
  
  const reset = useCallback(() => {
    setValue(initialValue);
  }, [initialValue]);
  
  return {
    value,
    onChange: handleChange,
    reset
  };
}

// Usage
function LoginForm() {
  const email = useInput('');
  const password = useInput('');
  
  return (
    <form>
      <input type="email" {...email} />
      <input type="password" {...password} />
    </form>
  );
}
```

**Pattern: Custom hook for data fetching**

```javascript
// ✅ GOOD: Reusable fetch hook
function useFetch(url) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    let cancelled = false;
    
    async function fetchData() {
      try {
        setLoading(true);
        const response = await fetch(url);
        const json = await response.json();
        
        if (!cancelled) {
          setData(json);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }
    
    fetchData();
    
    return () => {
      cancelled = true;
    };
  }, [url]);
  
  return { data, loading, error };
}

// Usage
function UserProfile({ userId }) {
  const { data, loading, error } = useFetch(`/api/users/${userId}`);
  
  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  return <div>{data.name}</div>;
}
```

## Component Composition

### Pattern: Compound Components

```javascript
// ✅ GOOD: Compound components for flexible composition
function Tabs({ children }) {
  const [activeTab, setActiveTab] = useState(0);
  
  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab }}>
      {children}
    </TabsContext.Provider>
  );
}

function TabList({ children }) {
  return <div role="tablist">{children}</div>;
}

function Tab({ index, children }) {
  const { activeTab, setActiveTab } = useContext(TabsContext);
  
  return (
    <button
      role="tab"
      aria-selected={activeTab === index}
      onClick={() => setActiveTab(index)}
    >
      {children}
    </button>
  );
}

function TabPanel({ index, children }) {
  const { activeTab } = useContext(TabsContext);
  
  return activeTab === index ? <div role="tabpanel">{children}</div> : null;
}

// Attach components
Tabs.List = TabList;
Tabs.Tab = Tab;
Tabs.Panel = TabPanel;

// Usage
<Tabs>
  <Tabs.List>
    <Tabs.Tab index={0}>Tab 1</Tabs.Tab>
    <Tabs.Tab index={1}>Tab 2</Tabs.Tab>
  </Tabs.List>
  <Tabs.Panel index={0}>Content 1</Tabs.Panel>
  <Tabs.Panel index={1}>Content 2</Tabs.Panel>
</Tabs>
```

### Pattern: Render Props

```javascript
// ✅ GOOD: Render prop for flexible rendering
function MouseTracker({ render }) {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  
  useEffect(() => {
    const handleMouseMove = (e) => {
      setPosition({ x: e.clientX, y: e.clientY });
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);
  
  return render(position);
}

// Usage
<MouseTracker
  render={({ x, y }) => (
    <div>Mouse position: {x}, {y}</div>
  )}
/>
```

### Pattern: Higher-Order Components (HOC)

```javascript
// ✅ GOOD: HOC for cross-cutting concerns
function withAuth(Component) {
  return function AuthenticatedComponent(props) {
    const { user, loading } = useAuth();
    
    if (loading) return <div>Loading...</div>;
    if (!user) return <div>Please log in</div>;
    
    return <Component {...props} user={user} />;
  };
}

// Usage
const ProtectedProfile = withAuth(UserProfile);
```

## State Management

### Local State (useState)

**When to use:** UI-only state (toggles, form inputs, modals)

```javascript
function SearchBox() {
  const [query, setQuery] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  
  return (
    <div>
      <button onClick={() => setIsExpanded(!isExpanded)}>
        Search
      </button>
      {isExpanded && (
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      )}
    </div>
  );
}
```

### Context API

**When to use:** Shared state across component tree (theme, auth, locale)

```javascript
// ✅ GOOD: Context for shared app state
const AuthContext = createContext(null);

function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  
  const login = async (credentials) => {
    const user = await api.login(credentials);
    setUser(user);
  };
  
  const logout = () => setUser(null);
  
  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook for convenience
function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
```

### Redux / Zustand

**When to use:** Complex state with many actions (shopping cart, complex forms, real-time data)

```javascript
// Zustand example (simpler than Redux)
import create from 'zustand';

const useStore = create((set) => ({
  cart: [],
  addItem: (item) => set((state) => ({
    cart: [...state.cart, item]
  })),
  removeItem: (id) => set((state) => ({
    cart: state.cart.filter(item => item.id !== id)
  })),
  clearCart: () => set({ cart: [] })
}));

// Usage in component
function Cart() {
  const { cart, addItem, removeItem } = useStore();
  
  return (
    <div>
      {cart.map(item => (
        <div key={item.id}>
          {item.name}
          <button onClick={() => removeItem(item.id)}>Remove</button>
        </div>
      ))}
    </div>
  );
}
```

### React Query / SWR (Server State)

**When to use:** Remote data (API calls, caching, synchronization)

```javascript
// React Query example
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

function UserProfile({ userId }) {
  const queryClient = useQueryClient();
  
  // Fetch user data
  const { data, isLoading, error } = useQuery({
    queryKey: ['user', userId],
    queryFn: () => fetch(`/api/users/${userId}`).then(res => res.json())
  });
  
  // Update user mutation
  const updateUser = useMutation({
    mutationFn: (updates) => fetch(`/api/users/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates)
    }),
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries(['user', userId]);
    }
  });
  
  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  
  return (
    <div>
      <h1>{data.name}</h1>
      <button onClick={() => updateUser.mutate({ name: 'New Name' })}>
        Update Name
      </button>
    </div>
  );
}
```

## Performance Optimization

### React.memo - Prevent Unnecessary Re-renders

```javascript
// ✅ GOOD: Memoize expensive component
const ExpensiveChild = memo(function ExpensiveChild({ data }) {
  // Expensive rendering logic
  return <div>{processData(data)}</div>;
});

// ❌ BAD: Memoizing simple component (overhead not worth it)
const SimpleChild = memo(function SimpleChild({ text }) {
  return <div>{text}</div>; // Too simple to benefit from memo
});
```

### Code Splitting with React.lazy

```javascript
// ✅ GOOD: Lazy load route components
import { lazy, Suspense } from 'react';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Profile = lazy(() => import('./pages/Profile'));

function App() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <Routes>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/profile" element={<Profile />} />
      </Routes>
    </Suspense>
  );
}
```

### Virtualization for Long Lists

```javascript
// ✅ GOOD: Use react-window for long lists
import { FixedSizeList } from 'react-window';

function LargeList({ items }) {
  const Row = ({ index, style }) => (
    <div style={style}>
      {items[index].name}
    </div>
  );
  
  return (
    <FixedSizeList
      height={600}
      itemCount={items.length}
      itemSize={50}
      width="100%"
    >
      {Row}
    </FixedSizeList>
  );
}
```

### Debounce Input Handlers

```javascript
// ✅ GOOD: Debounce expensive operations
import { useDeferredValue } from 'react';

function SearchResults() {
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  
  // Only filters when deferredQuery changes (debounced)
  const results = useMemo(() => {
    return filterResults(deferredQuery);
  }, [deferredQuery]);
  
  return (
    <div>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <Results data={results} />
    </div>
  );
}
```

## Common Pitfalls

### Anti-pattern: Derived State in useState

```javascript
// ❌ BAD: Storing derived state
function Component({ items }) {
  const [count, setCount] = useState(items.length);
  
  useEffect(() => {
    setCount(items.length);
  }, [items]);
  
  return <div>Count: {count}</div>;
}

// ✅ GOOD: Just compute it
function Component({ items }) {
  const count = items.length;
  return <div>Count: {count}</div>;
}
```

### Anti-pattern: useEffect for Data Transformation

```javascript
// ❌ BAD: useEffect for synchronous transformation
function Component({ data }) {
  const [processed, setProcessed] = useState([]);
  
  useEffect(() => {
    setProcessed(data.map(item => item.value));
  }, [data]);
  
  return <div>{processed.join(', ')}</div>;
}

// ✅ GOOD: Compute during render
function Component({ data }) {
  const processed = data.map(item => item.value);
  return <div>{processed.join(', ')}</div>;
}
```

### Anti-pattern: Creating Functions in JSX

```javascript
// ❌ BAD: Inline function breaks memo
const MemoChild = memo(Child);

function Parent() {
  return <MemoChild onClick={() => console.log('clicked')} />;
}

// ✅ GOOD: Stable function reference
function Parent() {
  const handleClick = useCallback(() => {
    console.log('clicked');
  }, []);
  
  return <MemoChild onClick={handleClick} />;
}
```

## Testing Patterns

### Pattern: Test user interactions

```javascript
import { render, screen, fireEvent } from '@testing-library/react';

test('increments counter on button click', () => {
  render(<Counter />);
  
  const button = screen.getByRole('button', { name: /increment/i });
  const count = screen.getByText(/count: 0/i);
  
  fireEvent.click(button);
  
  expect(screen.getByText(/count: 1/i)).toBeInTheDocument();
});
```

### Pattern: Test async behavior

```javascript
import { render, screen, waitFor } from '@testing-library/react';

test('loads and displays user data', async () => {
  render(<UserProfile userId="123" />);
  
  expect(screen.getByText(/loading/i)).toBeInTheDocument();
  
  await waitFor(() => {
    expect(screen.getByText(/john doe/i)).toBeInTheDocument();
  });
});
```

## See Also

- **[Frontend README](README.md)** - Overview of all frontend skills
- **[Accessibility Patterns](accessibility-patterns.md)** - Building accessible React apps
- **[Testing Patterns](../code-quality/testing-patterns.md)** - Testing strategies and best practices
- **[TypeScript Patterns](../languages/typescript/README.md)** - TypeScript with React
- **[Performance Optimization](../websites/build/performance.md)** - Web performance metrics
