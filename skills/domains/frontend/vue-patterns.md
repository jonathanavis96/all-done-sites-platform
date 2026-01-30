# Vue Patterns and Best Practices

Practical patterns for building Vue 3 applications using the Composition API, reactivity system, and modern tooling.

## When to Use This Skill

| If you're... | Use this pattern |
|--------------|------------------|
| Starting a Vue 3 project | Composition API + `<script setup>` |
| Managing reactive state | `ref()` for primitives, `reactive()` for objects |
| Sharing logic across components | Composables (Vue's hooks) |
| Building forms | `v-model` with computed setters |
| Fetching data | `onMounted` + composables |
| Optimizing renders | `computed()` for derived state |

## Core Patterns

### Composition API with `<script setup>`

**Modern Vue 3 pattern** - Use `<script setup>` for cleaner, more concise components.

```vue
<script setup>
import { ref, computed } from 'vue'

const count = ref(0)
const doubled = computed(() => count.value * 2)

function increment() {
  count.value++
}
</script>

<template>
  <div>
    <p>Count: {{ count }}</p>
    <p>Doubled: {{ doubled }}</p>
    <button @click="increment">Increment</button>
  </div>
</template>
```

**Why `<script setup>`:**

- No need to return variables/functions
- Better TypeScript inference
- Less boilerplate
- Cleaner imports and definitions

### Reactivity System

**Rule:** Use `ref()` for primitives, `reactive()` for objects.

```javascript
import { ref, reactive } from 'vue'

// Primitives: use ref()
const count = ref(0)
const message = ref('Hello')

// Objects: use reactive()
const user = reactive({
  name: 'Alice',
  age: 30,
  preferences: {
    theme: 'dark'
  }
})

// Access: .value for refs, direct for reactive
console.log(count.value) // 0
console.log(user.name)   // 'Alice'
```

**Avoid:** Destructuring reactive objects (breaks reactivity).

```javascript
// ❌ BAD - loses reactivity
const { name, age } = reactive({ name: 'Alice', age: 30 })

// ✅ GOOD - use toRefs
import { toRefs } from 'vue'
const user = reactive({ name: 'Alice', age: 30 })
const { name, age } = toRefs(user)
```

### Composables (Reusable Logic)

**Pattern:** Extract reusable logic into composables (Vue's version of React hooks).

```javascript
// composables/useFetch.js
import { ref } from 'vue'

export function useFetch(url) {
  const data = ref(null)
  const error = ref(null)
  const loading = ref(false)

  async function fetchData() {
    loading.value = true
    try {
      const response = await fetch(url)
      data.value = await response.json()
    } catch (err) {
      error.value = err
    } finally {
      loading.value = false
    }
  }

  return { data, error, loading, fetchData }
}
```

**Usage:**

```vue
<script setup>
import { onMounted } from 'vue'
import { useFetch } from './composables/useFetch'

const { data, error, loading, fetchData } = useFetch('/api/users')

onMounted(() => {
  fetchData()
})
</script>

<template>
  <div v-if="loading">Loading...</div>
  <div v-else-if="error">Error: {{ error.message }}</div>
  <ul v-else>
    <li v-for="user in data" :key="user.id">{{ user.name }}</li>
  </ul>
</template>
```

### Computed Properties

**Pattern:** Use `computed()` for derived state that depends on reactive data.

```vue
<script setup>
import { ref, computed } from 'vue'

const firstName = ref('John')
const lastName = ref('Doe')

// Computed property auto-updates when dependencies change
const fullName = computed(() => `${firstName.value} ${lastName.value}`)

// Computed with getter/setter for two-way binding
const searchQuery = ref('hello world')
const normalizedQuery = computed({
  get: () => searchQuery.value.toLowerCase(),
  set: (val) => searchQuery.value = val
})
</script>
```

**Why computed over methods:**

- Cached based on dependencies
- Only re-evaluates when dependencies change
- Better performance for expensive operations

### Watchers

**Pattern:** Use `watch()` for side effects, `watchEffect()` for auto-tracking.

```javascript
import { ref, watch, watchEffect } from 'vue'

const count = ref(0)
const multiplier = ref(2)

// watch: explicit dependencies
watch(count, (newVal, oldVal) => {
  console.log(`Count changed from ${oldVal} to ${newVal}`)
})

// watch multiple sources
watch([count, multiplier], ([newCount, newMultiplier]) => {
  console.log(`Product: ${newCount * newMultiplier}`)
})

// watchEffect: auto-tracks dependencies
watchEffect(() => {
  // Automatically re-runs when count or multiplier changes
  console.log(`Product: ${count.value * multiplier.value}`)
})
```

**When to use:**

- `watch`: Side effects with explicit control (API calls, localStorage)
- `watchEffect`: Auto-tracking for simple reactive effects
- `computed`: Derived state (not side effects)

## Component Patterns

### Props and Emits

**Pattern:** Define props with validation, emit events for parent communication.

```vue
<script setup>
import { computed } from 'vue'

// Props with TypeScript-style definition
const props = defineProps({
  modelValue: {
    type: String,
    required: true
  },
  placeholder: {
    type: String,
    default: 'Enter text...'
  },
  maxLength: {
    type: Number,
    default: 100
  }
})

// Emits definition
const emit = defineEmits(['update:modelValue', 'submit'])

// Computed for v-model
const value = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

function handleSubmit() {
  emit('submit', value.value)
}
</script>

<template>
  <div>
    <input 
      v-model="value" 
      :placeholder="placeholder"
      :maxlength="maxLength"
      @keyup.enter="handleSubmit"
    />
  </div>
</template>
```

### Slots for Composition

**Pattern:** Use slots for flexible, composable components.

```vue
<!-- BaseCard.vue -->
<template>
  <div class="card">
    <header v-if="$slots.header">
      <slot name="header"></slot>
    </header>
    <main>
      <slot></slot>
    </main>
    <footer v-if="$slots.footer">
      <slot name="footer"></slot>
    </footer>
  </div>
</template>

<!-- Usage -->
<BaseCard>
  <template #header>
    <h2>Card Title</h2>
  </template>
  
  <p>Card content goes here</p>
  
  <template #footer>
    <button>Action</button>
  </template>
</BaseCard>
```

**Scoped slots** for passing data to parent:

```vue
<!-- List.vue -->
<script setup>
defineProps({
  items: Array
})
</script>

<template>
  <ul>
    <li v-for="item in items" :key="item.id">
      <slot :item="item"></slot>
    </li>
  </ul>
</template>

<!-- Usage -->
<List :items="users">
  <template #default="{ item }">
    <span>{{ item.name }} - {{ item.email }}</span>
  </template>
</List>
```

### Provide/Inject for Deep Props

**Pattern:** Use provide/inject to avoid prop drilling.

```vue
<!-- ParentComponent.vue -->
<script setup>
import { provide, ref } from 'vue'

const theme = ref('dark')
provide('theme', theme)

function toggleTheme() {
  theme.value = theme.value === 'dark' ? 'light' : 'dark'
}
provide('toggleTheme', toggleTheme)
</script>

<!-- DeepChildComponent.vue -->
<script setup>
import { inject } from 'vue'

const theme = inject('theme')
const toggleTheme = inject('toggleTheme')
</script>

<template>
  <div :class="theme">
    <button @click="toggleTheme">Toggle Theme</button>
  </div>
</template>
```

## State Management with Pinia

**Pattern:** Use Pinia (Vue's official state management) for global state.

```javascript
// stores/user.js
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useUserStore = defineStore('user', () => {
  // State
  const user = ref(null)
  const isLoading = ref(false)
  
  // Getters (computed)
  const isAuthenticated = computed(() => user.value !== null)
  const userName = computed(() => user.value?.name || 'Guest')
  
  // Actions
  async function login(credentials) {
    isLoading.value = true
    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        body: JSON.stringify(credentials)
      })
      user.value = await response.json()
    } finally {
      isLoading.value = false
    }
  }
  
  function logout() {
    user.value = null
  }
  
  return { user, isLoading, isAuthenticated, userName, login, logout }
})
```

**Usage in component:**

```vue
<script setup>
import { useUserStore } from '@/stores/user'

const userStore = useUserStore()

async function handleLogin() {
  await userStore.login({ email: 'user@example.com', password: 'pass' })
}
</script>

<template>
  <div v-if="userStore.isAuthenticated">
    Welcome, {{ userStore.userName }}!
    <button @click="userStore.logout">Logout</button>
  </div>
  <div v-else>
    <button @click="handleLogin">Login</button>
  </div>
</template>
```

## Performance Optimization

### Use `v-show` vs `v-if` Strategically

**Rule:** `v-if` for rare toggles, `v-show` for frequent toggles.

```vue
<template>
  <!-- v-if: removes from DOM (better for rarely shown content) -->
  <HeavyComponent v-if="showHeavy" />
  
  <!-- v-show: toggles CSS display (better for frequent toggles) -->
  <Modal v-show="isModalOpen" />
</template>
```

### Lazy Load Components

**Pattern:** Use `defineAsyncComponent` for code splitting.

```javascript
import { defineAsyncComponent } from 'vue'

const HeavyChart = defineAsyncComponent(() =>
  import('./components/HeavyChart.vue')
)
```

### Use `v-once` for Static Content

**Pattern:** Render once and never update.

```vue
<template>
  <div v-once>
    <h1>{{ staticTitle }}</h1>
    <p>This content never changes</p>
  </div>
</template>
```

### Optimize Lists with `key`

**Always use unique keys** for `v-for`:

```vue
<template>
  <!-- ✅ GOOD: unique key -->
  <div v-for="item in items" :key="item.id">
    {{ item.name }}
  </div>
  
  <!-- ❌ BAD: index as key (can cause bugs) -->
  <div v-for="(item, index) in items" :key="index">
    {{ item.name }}
  </div>
</template>
```

## Form Handling

### Two-Way Binding with `v-model`

```vue
<script setup>
import { ref, reactive } from 'vue'

const email = ref('')
const form = reactive({
  username: '',
  password: '',
  remember: false,
  role: 'user'
})
</script>

<template>
  <form @submit.prevent="handleSubmit">
    <!-- Text input -->
    <input v-model="form.username" type="text" />
    
    <!-- Password -->
    <input v-model="form.password" type="password" />
    
    <!-- Checkbox -->
    <input v-model="form.remember" type="checkbox" />
    
    <!-- Select -->
    <select v-model="form.role">
      <option value="user">User</option>
      <option value="admin">Admin</option>
    </select>
    
    <button type="submit">Submit</button>
  </form>
</template>
```

### Form Validation with Composable

```javascript
// composables/useForm.js
import { ref, computed } from 'vue'

export function useForm(initialValues, validationRules) {
  const values = ref(initialValues)
  const errors = ref({})
  const touched = ref({})
  
  const isValid = computed(() => Object.keys(errors.value).length === 0)
  
  function validate(field) {
    const rule = validationRules[field]
    if (!rule) return
    
    const error = rule(values.value[field])
    if (error) {
      errors.value[field] = error
    } else {
      delete errors.value[field]
    }
  }
  
  function handleBlur(field) {
    touched.value[field] = true
    validate(field)
  }
  
  function handleSubmit(callback) {
    return () => {
      Object.keys(validationRules).forEach(validate)
      if (isValid.value) {
        callback(values.value)
      }
    }
  }
  
  return { values, errors, touched, isValid, handleBlur, handleSubmit }
}
```

## Testing Patterns

### Component Testing with Vitest

```javascript
import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import Counter from './Counter.vue'

describe('Counter', () => {
  it('increments count when button is clicked', async () => {
    const wrapper = mount(Counter)
    const button = wrapper.find('button')
    
    await button.trigger('click')
    
    expect(wrapper.text()).toContain('Count: 1')
  })
  
  it('emits event when threshold is reached', async () => {
    const wrapper = mount(Counter, {
      props: { threshold: 3 }
    })
    
    const button = wrapper.find('button')
    await button.trigger('click')
    await button.trigger('click')
    await button.trigger('click')
    
    expect(wrapper.emitted('threshold-reached')).toBeTruthy()
  })
})
```

## Common Pitfalls

### Mutating Props Directly

**Problem:** Modifying props in child component.

```vue
<!-- ❌ BAD -->
<script setup>
const props = defineProps(['count'])

function increment() {
  props.count++ // ERROR: props are readonly
}
</script>
```

**Solution:** Emit event to parent or use `v-model`.

```vue
<!-- ✅ GOOD -->
<script setup>
const props = defineProps(['count'])
const emit = defineEmits(['update:count'])

function increment() {
  emit('update:count', props.count + 1)
}
</script>
```

### Forgetting `.value` for Refs

**Problem:** Accessing ref without `.value`.

```javascript
// ❌ BAD
const count = ref(0)
console.log(count) // Ref object, not 0

// ✅ GOOD
console.log(count.value) // 0
```

**Exception:** In templates, `.value` is auto-unwrapped:

```vue
<template>
  <!-- No .value needed in templates -->
  <p>{{ count }}</p>
</template>
```

### Side Effects in Computed

**Problem:** Causing side effects in computed properties.

```javascript
// ❌ BAD - computed should be pure
const doubled = computed(() => {
  console.log('Calculating...') // Side effect
  apiCall() // Side effect
  return count.value * 2
})

// ✅ GOOD - use watch/watchEffect for side effects
const doubled = computed(() => count.value * 2)
watch(doubled, (val) => {
  console.log('Doubled:', val)
})
```

## Quick Reference

### Reactivity APIs

| API | Use Case |
|-----|----------|
| `ref()` | Primitive values (numbers, strings, booleans) |
| `reactive()` | Objects and arrays |
| `computed()` | Derived state (cached) |
| `watch()` | Side effects with explicit sources |
| `watchEffect()` | Side effects with auto-tracking |
| `toRefs()` | Destructure reactive objects |

### Lifecycle Hooks

| Hook | When to Use |
|------|-------------|
| `onMounted()` | After component is mounted (DOM available) |
| `onUpdated()` | After reactive state changes and DOM updates |
| `onUnmounted()` | Cleanup (remove listeners, cancel requests) |
| `onBeforeMount()` | Before mount (rarely needed) |
| `onBeforeUpdate()` | Before DOM update (rarely needed) |

### Template Directives

| Directive | Purpose |
|-----------|---------|
| `v-if` / `v-else` | Conditional rendering (removes from DOM) |
| `v-show` | Toggle visibility (CSS display) |
| `v-for` | List rendering |
| `v-model` | Two-way binding |
| `v-bind` / `:` | Bind attributes/props |
| `v-on` / `@` | Event listeners |
| `v-slot` / `#` | Named slots |

## See Also

- **[React Patterns](react-patterns.md)** - Compare with React approach
- **[Frontend README](README.md)** - Framework comparison and overview
- **[Accessibility Patterns](accessibility-patterns.md)** - Accessible Vue components
- **[Testing Patterns](../code-quality/testing-patterns.md)** - Unit and integration testing
- **[TypeScript Patterns](../languages/typescript/README.md)** - Vue + TypeScript
