# Component Architecture Patterns

Framework-agnostic patterns for structuring scalable, maintainable component hierarchies in modern frontend applications.

## When to Use This Skill

| If you're... | Start with |
|--------------|------------|
| Starting a new project | Atomic Design methodology |
| Building a design system | Atoms → Molecules → Organisms hierarchy |
| Refactoring spaghetti components | Container/Presentational separation |
| Sharing logic across components | Composition over inheritance |
| Managing component complexity | Single Responsibility Principle |

## Core Patterns

### Atomic Design

**Pattern:** Organize components into five hierarchical levels for maximum reusability.

```text
Atoms → Molecules → Organisms → Templates → Pages
```

**Atoms** - Smallest building blocks (buttons, inputs, labels):

```javascript
// Button.jsx
export function Button({ variant = 'primary', children, ...props }) {
  return (
    <button className={`btn btn-${variant}`} {...props}>
      {children}
    </button>
  )
}
```

**Molecules** - Simple groups of atoms (search bar, form field):

```javascript
// SearchBar.jsx
import { Input } from './atoms/Input'
import { Button } from './atoms/Button'

export function SearchBar({ onSearch, placeholder }) {
  const [query, setQuery] = useState('')
  
  return (
    <div className="search-bar">
      <Input 
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
      />
      <Button onClick={() => onSearch(query)}>Search</Button>
    </div>
  )
}
```

**Organisms** - Complex components (navigation bar, card grid):

```javascript
// ProductCard.jsx
import { Image } from './atoms/Image'
import { Heading } from './atoms/Heading'
import { Button } from './atoms/Button'
import { PriceTag } from './molecules/PriceTag'

export function ProductCard({ product, onAddToCart }) {
  return (
    <article className="product-card">
      <Image src={product.image} alt={product.name} />
      <Heading level={3}>{product.name}</Heading>
      <PriceTag price={product.price} discount={product.discount} />
      <Button onClick={() => onAddToCart(product)}>Add to Cart</Button>
    </article>
  )
}
```

**Templates** - Page layouts without real data:

```javascript
// ProductPageTemplate.jsx
export function ProductPageTemplate({ header, sidebar, content, footer }) {
  return (
    <div className="page-layout">
      <header>{header}</header>
      <div className="main-content">
        <aside>{sidebar}</aside>
        <main>{content}</main>
      </div>
      <footer>{footer}</footer>
    </div>
  )
}
```

**Pages** - Templates with real data:

```javascript
// ProductPage.jsx
import { ProductPageTemplate } from './templates/ProductPageTemplate'
import { Navigation } from './organisms/Navigation'
import { ProductGrid } from './organisms/ProductGrid'

export function ProductPage() {
  const { products } = useProducts()
  
  return (
    <ProductPageTemplate
      header={<Navigation />}
      sidebar={<FilterPanel />}
      content={<ProductGrid products={products} />}
      footer={<Footer />}
    />
  )
}
```

**Benefits:**

- Clear naming and organization
- Reusability increases at lower levels
- Easy to identify where new components belong
- Designers and developers share vocabulary

### Container/Presentational Pattern

**Pattern:** Separate data logic (containers) from UI rendering (presentational).

**Presentational Component** - Pure UI, no business logic:

```javascript
// UserList.jsx (Presentational)
export function UserList({ users, onUserClick, loading }) {
  if (loading) return <Spinner />
  
  return (
    <ul className="user-list">
      {users.map(user => (
        <li key={user.id} onClick={() => onUserClick(user)}>
          <Avatar src={user.avatar} />
          <span>{user.name}</span>
        </li>
      ))}
    </ul>
  )
}
```

**Container Component** - Data fetching and state management:

```javascript
// UserListContainer.jsx (Container)
import { useEffect, useState } from 'react'
import { UserList } from './UserList'

export function UserListContainer() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    fetch('/api/users')
      .then(res => res.json())
      .then(data => {
        setUsers(data)
        setLoading(false)
      })
  }, [])
  
  const handleUserClick = (user) => {
    console.log('User clicked:', user)
  }
  
  return <UserList users={users} onUserClick={handleUserClick} loading={loading} />
}
```

**Benefits:**

- Presentational components are highly reusable
- Easy to test (presentational = pure functions)
- Clear separation of concerns
- Presentational components work with Storybook

**Modern Alternative:** Custom hooks can replace containers:

```javascript
// useUsers.js (Hook replaces container)
export function useUsers() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    fetch('/api/users')
      .then(res => res.json())
      .then(data => {
        setUsers(data)
        setLoading(false)
      })
  }, [])
  
  return { users, loading }
}

// Component uses hook directly
export function UserList() {
  const { users, loading } = useUsers()
  
  if (loading) return <Spinner />
  
  return (
    <ul>
      {users.map(user => <li key={user.id}>{user.name}</li>)}
    </ul>
  )
}
```

### Composition Over Inheritance

**Pattern:** Build complex components by combining simpler ones, not through class hierarchies.

**Bad (Inheritance):**

```javascript
// ❌ Avoid inheritance - rigid and hard to modify
class BaseButton extends React.Component {
  render() {
    return <button className="btn">{this.props.children}</button>
  }
}

class PrimaryButton extends BaseButton {
  render() {
    return <button className="btn btn-primary">{this.props.children}</button>
  }
}

class IconButton extends PrimaryButton {
  render() {
    return (
      <button className="btn btn-primary btn-icon">
        {this.props.icon}
        {this.props.children}
      </button>
    )
  }
}
```

**Good (Composition):**

```javascript
// ✅ Use composition - flexible and composable
function Button({ variant = 'default', icon, children, ...props }) {
  return (
    <button className={`btn btn-${variant}`} {...props}>
      {icon && <Icon name={icon} />}
      {children}
    </button>
  )
}

// Compose for specific use cases
function PrimaryButton(props) {
  return <Button variant="primary" {...props} />
}

function IconButton({ icon, children, ...props }) {
  return <Button icon={icon} {...props}>{children}</Button>
}

// Or use directly with props
<Button variant="primary" icon="check">Submit</Button>
```

**Compound Components** - Parent coordinates state for children:

```javascript
// Tabs.jsx
const TabsContext = createContext()

export function Tabs({ defaultValue, children }) {
  const [activeTab, setActiveTab] = useState(defaultValue)
  
  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab }}>
      <div className="tabs">{children}</div>
    </TabsContext.Provider>
  )
}

Tabs.List = function TabsList({ children }) {
  return <div className="tabs-list">{children}</div>
}

Tabs.Tab = function Tab({ value, children }) {
  const { activeTab, setActiveTab } = useContext(TabsContext)
  const isActive = activeTab === value
  
  return (
    <button
      className={`tab ${isActive ? 'active' : ''}`}
      onClick={() => setActiveTab(value)}
    >
      {children}
    </button>
  )
}

Tabs.Panel = function TabPanel({ value, children }) {
  const { activeTab } = useContext(TabsContext)
  if (activeTab !== value) return null
  
  return <div className="tab-panel">{children}</div>
}

// Usage
<Tabs defaultValue="profile">
  <Tabs.List>
    <Tabs.Tab value="profile">Profile</Tabs.Tab>
    <Tabs.Tab value="settings">Settings</Tabs.Tab>
  </Tabs.List>
  
  <Tabs.Panel value="profile">
    <ProfileContent />
  </Tabs.Panel>
  <Tabs.Panel value="settings">
    <SettingsContent />
  </Tabs.Panel>
</Tabs>
```

### Render Props Pattern

**Pattern:** Share code using a prop whose value is a function.

```javascript
// DataFetcher.jsx
export function DataFetcher({ url, render }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    fetch(url)
      .then(res => res.json())
      .then(data => {
        setData(data)
        setLoading(false)
      })
  }, [url])
  
  return render({ data, loading })
}

// Usage
<DataFetcher
  url="/api/users"
  render={({ data, loading }) => (
    loading ? <Spinner /> : <UserList users={data} />
  )}
/>
```

**Modern Alternative:** Custom hooks often cleaner than render props:

```javascript
// useDataFetcher.js
export function useDataFetcher(url) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    fetch(url)
      .then(res => res.json())
      .then(data => {
        setData(data)
        setLoading(false)
      })
  }, [url])
  
  return { data, loading }
}

// Usage
function UserPage() {
  const { data, loading } = useDataFetcher('/api/users')
  return loading ? <Spinner /> : <UserList users={data} />
}
```

## Design Principles

### Single Responsibility Principle

**Rule:** Each component should do one thing well.

```javascript
// ❌ BAD - component does too much
function UserDashboard() {
  const [users, setUsers] = useState([])
  const [products, setProducts] = useState([])
  const [orders, setOrders] = useState([])
  
  // Fetching logic for all three...
  // Rendering logic for all three...
  
  return (
    <div>
      {/* 300 lines of mixed UI */}
    </div>
  )
}

// ✅ GOOD - split into focused components
function UserDashboard() {
  return (
    <div className="dashboard">
      <UserSection />
      <ProductSection />
      <OrderSection />
    </div>
  )
}

function UserSection() {
  const { users, loading } = useUsers()
  return <UserList users={users} loading={loading} />
}

function ProductSection() {
  const { products, loading } = useProducts()
  return <ProductGrid products={products} loading={loading} />
}
```

### Open/Closed Principle

**Rule:** Components should be open for extension, closed for modification.

```javascript
// ✅ GOOD - extensible through props
function Card({ header, children, footer, variant = 'default' }) {
  return (
    <div className={`card card-${variant}`}>
      {header && <div className="card-header">{header}</div>}
      <div className="card-body">{children}</div>
      {footer && <div className="card-footer">{footer}</div>}
    </div>
  )
}

// Extend through composition, not modification
function ProfileCard({ user }) {
  return (
    <Card
      header={<Avatar src={user.avatar} />}
      footer={<Button>View Profile</Button>}
      variant="profile"
    >
      <h3>{user.name}</h3>
      <p>{user.bio}</p>
    </Card>
  )
}
```

### Props Drilling Solution

**Problem:** Passing props through many intermediate components.

```javascript
// ❌ BAD - prop drilling
<App>
  <Dashboard user={user} theme={theme}>
    <Sidebar user={user} theme={theme}>
      <Menu user={user} theme={theme}>
        <MenuItem user={user} theme={theme} />
      </Menu>
    </Sidebar>
  </Dashboard>
</App>
```

**Solution 1:** Context API

```javascript
// ✅ GOOD - use Context
const AppContext = createContext()

function App() {
  const [user, setUser] = useState(null)
  const [theme, setTheme] = useState('light')
  
  return (
    <AppContext.Provider value={{ user, theme }}>
      <Dashboard />
    </AppContext.Provider>
  )
}

function MenuItem() {
  const { user, theme } = useContext(AppContext)
  return <li className={theme}>{user.name}</li>
}
```

**Solution 2:** Composition (pass components, not data)

```javascript
// ✅ GOOD - composition avoids drilling
function App() {
  const [user, setUser] = useState(null)
  
  return (
    <Dashboard sidebar={<Sidebar menu={<Menu items={getMenuItems(user)} />} />}>
      <Content user={user} />
    </Dashboard>
  )
}
```

## Component Organization

### File Structure (Feature-Based)

```text
src/
├── features/
│   ├── auth/
│   │   ├── components/
│   │   │   ├── LoginForm.jsx
│   │   │   └── SignupForm.jsx
│   │   ├── hooks/
│   │   │   └── useAuth.js
│   │   ├── services/
│   │   │   └── authService.js
│   │   └── index.js
│   ├── products/
│   │   ├── components/
│   │   │   ├── ProductCard.jsx
│   │   │   └── ProductGrid.jsx
│   │   ├── hooks/
│   │   │   └── useProducts.js
│   │   └── index.js
├── shared/
│   ├── components/
│   │   ├── Button.jsx
│   │   ├── Input.jsx
│   │   └── Modal.jsx
│   ├── hooks/
│   │   └── useFetch.js
│   └── utils/
│       └── formatters.js
└── App.jsx
```

### Co-location

**Rule:** Keep related files close together.

```text
UserProfile/
├── UserProfile.jsx          # Main component
├── UserProfile.module.css   # Styles
├── UserProfile.test.jsx     # Tests
├── useUserProfile.js        # Custom hook
└── index.js                 # Public exports
```

## Testing Strategies

### Component Testing

**Test behavior, not implementation:**

```javascript
import { render, screen, fireEvent } from '@testing-library/react'
import { Counter } from './Counter'

describe('Counter', () => {
  it('increments count when button is clicked', () => {
    render(<Counter />)
    
    const button = screen.getByRole('button', { name: /increment/i })
    const count = screen.getByText(/count: 0/i)
    
    expect(count).toBeInTheDocument()
    
    fireEvent.click(button)
    
    expect(screen.getByText(/count: 1/i)).toBeInTheDocument()
  })
})
```

### Test Presentational Components in Isolation

```javascript
import { render, screen } from '@testing-library/react'
import { UserList } from './UserList'

const mockUsers = [
  { id: 1, name: 'Alice' },
  { id: 2, name: 'Bob' }
]

describe('UserList', () => {
  it('renders list of users', () => {
    render(<UserList users={mockUsers} loading={false} />)
    
    expect(screen.getByText('Alice')).toBeInTheDocument()
    expect(screen.getByText('Bob')).toBeInTheDocument()
  })
  
  it('shows loading spinner when loading', () => {
    render(<UserList users={[]} loading={true} />)
    
    expect(screen.getByRole('status')).toBeInTheDocument()
  })
})
```

## Common Pitfalls

### Over-Abstraction

**Problem:** Creating too many layers of abstraction too early.

```javascript
// ❌ BAD - premature abstraction
<GenericContainer>
  <FlexWrapper direction="column">
    <ResponsiveBox breakpoint="md">
      <ConditionalRenderer condition={true}>
        <TextElement variant="heading" size="large">
          Hello
        </TextElement>
      </ConditionalRenderer>
    </ResponsiveBox>
  </FlexWrapper>
</GenericContainer>

// ✅ GOOD - start simple
<div className="container">
  <h1>Hello</h1>
</div>
```

**Rule:** Wait until you have 3 use cases before abstracting.

### God Components

**Problem:** Components that do everything.

```javascript
// ❌ BAD - 800-line component doing everything
function DashboardPage() {
  // 50 lines of state
  // 100 lines of useEffect hooks
  // 200 lines of event handlers
  // 450 lines of JSX
}

// ✅ GOOD - split into logical sections
function DashboardPage() {
  return (
    <Layout>
      <DashboardHeader />
      <DashboardStats />
      <DashboardCharts />
      <DashboardActivity />
    </Layout>
  )
}
```

### Inconsistent Naming

**Problem:** Mixed naming conventions confuse team members.

```javascript
// ❌ BAD - inconsistent
<user-card />        // kebab-case
<UserProfile />      // PascalCase
<button_group />     // snake_case
<DIVWrapper />       // Acronym uppercase
```

```javascript
// ✅ GOOD - consistent PascalCase for components
<UserCard />
<UserProfile />
<ButtonGroup />
<DivWrapper />
```

## Quick Reference

### When to Split a Component

Split when:

- Component exceeds 200-300 lines
- Component has multiple responsibilities
- Parts are reusable elsewhere
- Logic is complex and testable separately
- Team member says "what does this component do?"

### Component Checklist

- [ ] Single responsibility (does one thing well)
- [ ] Props have TypeScript/PropTypes definitions
- [ ] No prop drilling (use Context if needed)
- [ ] Presentational components are pure/stateless
- [ ] Has meaningful name (not Generic*, Base*, Common*)
- [ ] Co-located with related files (styles, tests)
- [ ] Tested in isolation

## See Also

- **[React Patterns](react-patterns.md)** - React-specific component patterns
- **[Vue Patterns](vue-patterns.md)** - Vue-specific component patterns
- **[Frontend README](README.md)** - Framework comparison
- **[Testing Patterns](../code-quality/testing-patterns.md)** - Component testing strategies
- **[Code Consistency](../code-quality/code-consistency.md)** - Naming and structure standards
