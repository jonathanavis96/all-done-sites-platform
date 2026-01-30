# Go Patterns and Best Practices

**Purpose:** Idiomatic Go patterns, concurrency primitives, error handling, and best practices for writing clean, performant Go code.

**When to use:** Go projects, microservices, CLI tools, concurrent systems, backend services.

**Related skills:**

- [backend/api-design-patterns.md](../../backend/api-design-patterns.md) - REST API design
- [backend/error-handling-patterns.md](../../backend/error-handling-patterns.md) - Error handling strategies
- [infrastructure/observability-patterns.md](../../infrastructure/observability-patterns.md) - Logging and metrics

## Quick Reference

| Pattern | Use Case | Example |
| ------- | -------- | ------- |
| Goroutines | Concurrent execution | `go func() { ... }()` |
| Channels | Communication between goroutines | `ch := make(chan int)` |
| Select | Multiplex channel operations | `select { case <-ch1: ... }` |
| Context | Cancellation and timeouts | `ctx, cancel := context.WithTimeout(...)` |
| Defer | Cleanup resources | `defer file.Close()` |
| Interface embedding | Composition over inheritance | `type ReadWriter interface { Reader; Writer }` |
| Error wrapping | Add context to errors | `fmt.Errorf("failed to parse: %w", err)` |
| Table-driven tests | Comprehensive test coverage | `tests := []struct{ input, want }` |

## Go Idioms and Conventions

### Package Organization

```go
// Package structure follows directory hierarchy
// myapp/
//   cmd/myapp/main.go        - Entry point
//   internal/handler/         - Private packages
//   pkg/client/              - Public libraries
//   api/                     - API definitions (protobuf, OpenAPI)

package handler

import (
    "context"
    "fmt"
    
    "github.com/user/myapp/internal/service"  // Internal imports
    "github.com/external/pkg"                 // External imports
)
```

### Naming Conventions

```go
// ✅ GOOD: Short, descriptive names
var users []User
var ctx context.Context
var db *sql.DB

// ✅ GOOD: MixedCaps for exported names
type UserService struct {}
func (s *UserService) GetUser(id int) {}

// ✅ GOOD: Single-letter receivers
func (u *User) Save() error {}
func (s *Server) Start() error {}

// ❌ BAD: Underscores, except in test files
var user_count int      // Bad
var userCount int       // Good

// ✅ GOOD: Interface names end in -er for single-method
type Reader interface {
    Read(p []byte) (n int, err error)
}

type Stringer interface {
    String() string
}

// ✅ GOOD: Getters don't use Get prefix
func (u *User) Name() string { return u.name }  // Not GetName()
func (u *User) SetName(name string) { u.name = name }
```

### Variable Declaration

```go
// ✅ GOOD: Short declaration inside functions
name := "Alice"
count := 42

// ✅ GOOD: var for package-level or zero values
var globalConfig Config
var mu sync.Mutex

// ✅ GOOD: Group related declarations
var (
    maxRetries = 3
    timeout    = 30 * time.Second
    baseURL    = "https://api.example.com"
)

// ✅ GOOD: Explicit type when zero value needed
var count int     // 0
var ready bool    // false
var items []Item  // nil slice
```

## Concurrency Patterns

### Goroutines and Channels

**Basic goroutine launch:**

```go
package main

import (
    "fmt"
    "time"
)

func worker(id int, jobs <-chan int, results chan<- int) {
    for job := range jobs {
        fmt.Printf("Worker %d processing job %d\n", id, job)
        time.Sleep(time.Second)
        results <- job * 2
    }
}

func main() {
    jobs := make(chan int, 100)
    results := make(chan int, 100)
    
    // Start 3 workers
    for w := 1; w <= 3; w++ {
        go worker(w, jobs, results)
    }
    
    // Send 5 jobs
    for j := 1; j <= 5; j++ {
        jobs <- j
    }
    close(jobs)
    
    // Collect results
    for a := 1; a <= 5; a++ {
        <-results
    }
}
```

**Channel directions (enforce send/receive only):**

```go
// Read-only channel
func consumer(ch <-chan int) {
    for val := range ch {
        fmt.Println(val)
    }
}

// Write-only channel
func producer(ch chan<- int) {
    for i := 0; i < 10; i++ {
        ch <- i
    }
    close(ch)
}

func main() {
    ch := make(chan int, 10)
    go producer(ch)
    consumer(ch)
}
```

### Select Statement

**Multiplex multiple channels:**

```go
package main

import (
    "fmt"
    "time"
)

func main() {
    ch1 := make(chan string)
    ch2 := make(chan string)
    
    go func() {
        time.Sleep(1 * time.Second)
        ch1 <- "one"
    }()
    
    go func() {
        time.Sleep(2 * time.Second)
        ch2 <- "two"
    }()
    
    for i := 0; i < 2; i++ {
        select {
        case msg1 := <-ch1:
            fmt.Println("Received", msg1)
        case msg2 := <-ch2:
            fmt.Println("Received", msg2)
        case <-time.After(3 * time.Second):
            fmt.Println("Timeout")
            return
        }
    }
}
```

**Non-blocking channel operations:**

```go
func tryReceive(ch <-chan int) {
    select {
    case val := <-ch:
        fmt.Println("Received:", val)
    default:
        fmt.Println("No value available")
    }
}

func trySend(ch chan<- int, val int) bool {
    select {
    case ch <- val:
        return true
    default:
        return false
    }
}
```

### Context for Cancellation

**Pass context through call chain:**

```go
package main

import (
    "context"
    "fmt"
    "time"
)

func doWork(ctx context.Context, name string) error {
    for i := 0; i < 5; i++ {
        select {
        case <-ctx.Done():
            return ctx.Err()  // context.Canceled or context.DeadlineExceeded
        case <-time.After(1 * time.Second):
            fmt.Printf("%s: working... %d\n", name, i)
        }
    }
    return nil
}

func main() {
    // Timeout after 3 seconds
    ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
    defer cancel()
    
    if err := doWork(ctx, "worker"); err != nil {
        fmt.Println("Error:", err)
    }
}
```

**Context patterns:**

```go
// WithCancel - manual cancellation
ctx, cancel := context.WithCancel(context.Background())
defer cancel()  // Always defer cancel to prevent leak

// WithTimeout - deadline from now
ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
defer cancel()

// WithDeadline - absolute deadline
deadline := time.Now().Add(5 * time.Minute)
ctx, cancel := context.WithDeadline(context.Background(), deadline)
defer cancel()

// WithValue - pass request-scoped values (use sparingly)
ctx = context.WithValue(ctx, "userID", 42)
if userID, ok := ctx.Value("userID").(int); ok {
    fmt.Println("User ID:", userID)
}
```

### WaitGroup for Synchronization

```go
package main

import (
    "fmt"
    "sync"
    "time"
)

func worker(id int, wg *sync.WaitGroup) {
    defer wg.Done()  // Decrement counter when done
    
    fmt.Printf("Worker %d starting\n", id)
    time.Sleep(time.Second)
    fmt.Printf("Worker %d done\n", id)
}

func main() {
    var wg sync.WaitGroup
    
    for i := 1; i <= 5; i++ {
        wg.Add(1)  // Increment counter
        go worker(i, &wg)
    }
    
    wg.Wait()  // Block until counter is 0
    fmt.Println("All workers done")
}
```

### Mutex for Shared State

```go
package main

import (
    "fmt"
    "sync"
)

type SafeCounter struct {
    mu    sync.Mutex
    value map[string]int
}

func (c *SafeCounter) Inc(key string) {
    c.mu.Lock()
    defer c.mu.Unlock()
    c.value[key]++
}

func (c *SafeCounter) Value(key string) int {
    c.mu.Lock()
    defer c.mu.Unlock()
    return c.value[key]
}

// RWMutex for read-heavy workloads
type SafeCache struct {
    mu    sync.RWMutex
    items map[string]string
}

func (c *SafeCache) Get(key string) (string, bool) {
    c.mu.RLock()  // Multiple readers allowed
    defer c.mu.RUnlock()
    val, ok := c.items[key]
    return val, ok
}

func (c *SafeCache) Set(key, val string) {
    c.mu.Lock()  // Exclusive writer lock
    defer c.mu.Unlock()
    c.items[key] = val
}
```

### Worker Pool Pattern

```go
package main

import (
    "fmt"
    "sync"
    "time"
)

type Job struct {
    ID     int
    Data   string
}

type Result struct {
    Job    Job
    Output string
}

func worker(id int, jobs <-chan Job, results chan<- Result, wg *sync.WaitGroup) {
    defer wg.Done()
    for job := range jobs {
        fmt.Printf("Worker %d processing job %d\n", id, job.ID)
        time.Sleep(time.Second)
        
        results <- Result{
            Job:    job,
            Output: fmt.Sprintf("Processed: %s", job.Data),
        }
    }
}

func main() {
    const numWorkers = 3
    jobs := make(chan Job, 100)
    results := make(chan Result, 100)
    
    var wg sync.WaitGroup
    
    // Start workers
    for w := 1; w <= numWorkers; w++ {
        wg.Add(1)
        go worker(w, jobs, results, &wg)
    }
    
    // Send jobs
    go func() {
        for j := 1; j <= 10; j++ {
            jobs <- Job{ID: j, Data: fmt.Sprintf("task-%d", j)}
        }
        close(jobs)
    }()
    
    // Close results when all workers done
    go func() {
        wg.Wait()
        close(results)
    }()
    
    // Collect results
    for result := range results {
        fmt.Printf("Job %d: %s\n", result.Job.ID, result.Output)
    }
}
```

## Error Handling Best Practices

### Idiomatic Error Handling

```go
// ✅ GOOD: Check errors immediately
func readFile(path string) ([]byte, error) {
    data, err := os.ReadFile(path)
    if err != nil {
        return nil, fmt.Errorf("failed to read %s: %w", path, err)
    }
    return data, nil
}

// ✅ GOOD: Return early on error
func processUser(id int) error {
    user, err := getUser(id)
    if err != nil {
        return err
    }
    
    if err := user.Validate(); err != nil {
        return fmt.Errorf("validation failed: %w", err)
    }
    
    if err := user.Save(); err != nil {
        return fmt.Errorf("save failed: %w", err)
    }
    
    return nil
}

// ❌ BAD: Ignoring errors
data, _ := os.ReadFile("config.json")  // Don't ignore errors!

// ❌ BAD: Panic for expected errors
if err != nil {
    panic(err)  // Only panic for programmer errors
}
```

### Error Wrapping (Go 1.13+)

```go
package main

import (
    "errors"
    "fmt"
)

var ErrNotFound = errors.New("not found")
var ErrUnauthorized = errors.New("unauthorized")

func getUser(id int) error {
    // Wrap error with context
    return fmt.Errorf("failed to get user %d: %w", id, ErrNotFound)
}

func main() {
    err := getUser(42)
    
    // Check for specific error
    if errors.Is(err, ErrNotFound) {
        fmt.Println("User not found")
    }
    
    // Unwrap to get root cause
    fmt.Println("Error:", err)
    fmt.Println("Root cause:", errors.Unwrap(err))
}
```

### Custom Error Types

```go
package main

import (
    "errors"
    "fmt"
)

type ValidationError struct {
    Field   string
    Message string
}

func (e *ValidationError) Error() string {
    return fmt.Sprintf("validation error on field %s: %s", e.Field, e.Message)
}

func validateAge(age int) error {
    if age < 0 {
        return &ValidationError{
            Field:   "age",
            Message: "must be non-negative",
        }
    }
    return nil
}

func main() {
    err := validateAge(-5)
    
    // Type assertion to access custom fields
    var validationErr *ValidationError
    if errors.As(err, &validationErr) {
        fmt.Printf("Field: %s, Message: %s\n", 
            validationErr.Field, validationErr.Message)
    }
}
```

### Defer for Cleanup

```go
package main

import (
    "fmt"
    "os"
)

// ✅ GOOD: Defer cleanup immediately after acquisition
func readConfig() error {
    file, err := os.Open("config.json")
    if err != nil {
        return err
    }
    defer file.Close()  // Guaranteed to run
    
    // ... process file ...
    return nil
}

// ✅ GOOD: Multiple defers execute in LIFO order
func complexOperation() error {
    mu.Lock()
    defer mu.Unlock()
    
    tx, err := db.Begin()
    if err != nil {
        return err
    }
    defer tx.Rollback()  // Rollback if commit not called
    
    // ... do work ...
    
    if err := tx.Commit(); err != nil {
        return err
    }
    return nil
}

// ✅ GOOD: Defer with error handling
func writeFile(path string, data []byte) (err error) {
    file, err := os.Create(path)
    if err != nil {
        return err
    }
    defer func() {
        if cerr := file.Close(); cerr != nil && err == nil {
            err = cerr  // Return close error if no other error
        }
    }()
    
    _, err = file.Write(data)
    return err
}
```

## Interfaces and Composition

### Interface Design

```go
// ✅ GOOD: Small, focused interfaces
type Reader interface {
    Read(p []byte) (n int, err error)
}

type Writer interface {
    Write(p []byte) (n int, err error)
}

type Closer interface {
    Close() error
}

// ✅ GOOD: Compose interfaces
type ReadWriter interface {
    Reader
    Writer
}

type ReadWriteCloser interface {
    Reader
    Writer
    Closer
}

// ✅ GOOD: Accept interfaces, return structs
func ProcessData(r io.Reader) (*Result, error) {
    // ... implementation ...
    return &Result{}, nil
}
```

### Struct Embedding

```go
package main

import "fmt"

type Engine struct {
    Power int
}

func (e *Engine) Start() {
    fmt.Println("Engine starting with", e.Power, "HP")
}

type Car struct {
    Engine  // Embedded struct - promotes Engine methods to Car
    Brand   string
}

func main() {
    car := Car{
        Engine: Engine{Power: 200},
        Brand:  "Tesla",
    }
    
    car.Start()  // Calls car.Engine.Start()
    fmt.Println("Brand:", car.Brand)
    fmt.Println("Power:", car.Power)  // Accesses car.Engine.Power
}
```

### Interface Satisfaction

```go
package main

import "fmt"

// Interface definition
type Shape interface {
    Area() float64
}

// Rectangle satisfies Shape implicitly
type Rectangle struct {
    Width, Height float64
}

func (r Rectangle) Area() float64 {
    return r.Width * r.Height
}

// Circle also satisfies Shape
type Circle struct {
    Radius float64
}

func (c Circle) Area() float64 {
    return 3.14159 * c.Radius * c.Radius
}

// Function accepting any Shape
func PrintArea(s Shape) {
    fmt.Printf("Area: %.2f\n", s.Area())
}

func main() {
    rect := Rectangle{Width: 10, Height: 5}
    circle := Circle{Radius: 7}
    
    PrintArea(rect)
    PrintArea(circle)
}
```

## Testing Patterns

### Table-Driven Tests

```go
package main

import "testing"

func Add(a, b int) int {
    return a + b
}

func TestAdd(t *testing.T) {
    tests := []struct {
        name string
        a    int
        b    int
        want int
    }{
        {"positive numbers", 2, 3, 5},
        {"negative numbers", -1, -1, -2},
        {"mixed signs", -5, 10, 5},
        {"zeros", 0, 0, 0},
    }
    
    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            got := Add(tt.a, tt.b)
            if got != tt.want {
                t.Errorf("Add(%d, %d) = %d; want %d", 
                    tt.a, tt.b, got, tt.want)
            }
        })
    }
}
```

### Testing with Testify

```go
package main

import (
    "testing"
    
    "github.com/stretchr/testify/assert"
    "github.com/stretchr/testify/require"
)

func TestDivide(t *testing.T) {
    result, err := Divide(10, 2)
    require.NoError(t, err)  // Stop if error
    assert.Equal(t, 5.0, result)
    
    _, err = Divide(10, 0)
    assert.Error(t, err)  // Continue even if fails
    assert.Contains(t, err.Error(), "division by zero")
}
```

### Mock Interfaces

```go
package main

import (
    "testing"
)

type UserStore interface {
    GetUser(id int) (*User, error)
}

type MockUserStore struct {
    GetUserFunc func(id int) (*User, error)
}

func (m *MockUserStore) GetUser(id int) (*User, error) {
    return m.GetUserFunc(id)
}

func TestUserService(t *testing.T) {
    mock := &MockUserStore{
        GetUserFunc: func(id int) (*User, error) {
            return &User{ID: id, Name: "Alice"}, nil
        },
    }
    
    service := NewUserService(mock)
    user, err := service.FetchUser(42)
    
    if err != nil {
        t.Fatal(err)
    }
    if user.Name != "Alice" {
        t.Errorf("got %s, want Alice", user.Name)
    }
}
```

## Performance and Best Practices

### Slices and Arrays

```go
// ✅ GOOD: Preallocate slices when size known
items := make([]Item, 0, 100)  // length 0, capacity 100

// ✅ GOOD: Append efficiently
for i := 0; i < 100; i++ {
    items = append(items, Item{ID: i})
}

// ❌ BAD: Growing slice repeatedly (many allocations)
var items []Item  // capacity 0
for i := 0; i < 10000; i++ {
    items = append(items, Item{ID: i})  // Reallocates multiple times
}

// ✅ GOOD: Copy slices properly
src := []int{1, 2, 3}
dst := make([]int, len(src))
copy(dst, src)  // Not dst = src (shares backing array)
```

### String Building

```go
package main

import (
    "fmt"
    "strings"
)

// ❌ BAD: Concatenating in loop (creates many strings)
func badConcat(items []string) string {
    result := ""
    for _, item := range items {
        result += item + ","  // Creates new string each iteration
    }
    return result
}

// ✅ GOOD: Use strings.Builder for efficient concatenation
func goodConcat(items []string) string {
    var sb strings.Builder
    for _, item := range items {
        sb.WriteString(item)
        sb.WriteString(",")
    }
    return sb.String()
}

// ✅ GOOD: Use strings.Join when appropriate
func bestConcat(items []string) string {
    return strings.Join(items, ",")
}
```

### Avoiding Allocations

```go
// ✅ GOOD: Reuse buffers
var bufPool = sync.Pool{
    New: func() interface{} {
        return make([]byte, 4096)
    },
}

func processData(data []byte) {
    buf := bufPool.Get().([]byte)
    defer bufPool.Put(buf)
    
    // Use buf for processing
}

// ✅ GOOD: Use pointer receivers for large structs
type LargeStruct struct {
    data [1000]int
}

func (l *LargeStruct) Process() {  // Pointer receiver avoids copy
    // ... implementation ...
}
```

## Common Pitfalls

### Range Loop Variables

```go
// ❌ BAD: Capturing loop variable in goroutine
for _, item := range items {
    go func() {
        fmt.Println(item)  // All goroutines see last item!
    }()
}

// ✅ GOOD: Pass variable to goroutine
for _, item := range items {
    go func(i Item) {
        fmt.Println(i)
    }(item)
}

// ✅ GOOD: Create local copy
for _, item := range items {
    item := item  // Shadow variable
    go func() {
        fmt.Println(item)
    }()
}
```

### Nil Slices vs Empty Slices

```go
var nilSlice []int        // nil slice
emptySlice := []int{}     // empty slice (not nil)
madeSlice := make([]int, 0)  // empty slice (not nil)

// Both behave identically for most operations
len(nilSlice) == 0        // true
len(emptySlice) == 0      // true
append(nilSlice, 1)       // works fine
append(emptySlice, 1)     // works fine

// Only difference: nil check
nilSlice == nil           // true
emptySlice == nil         // false

// ✅ GOOD: Check length, not nil
if len(slice) == 0 {
    // handle empty
}
```

### Map Concurrency

```go
// ❌ BAD: Concurrent map access causes panic
m := make(map[string]int)
go func() { m["key"] = 1 }()
go func() { m["key"] = 2 }()  // PANIC: concurrent map writes

// ✅ GOOD: Use sync.Map for concurrent access
var m sync.Map
m.Store("key", 1)
value, ok := m.Load("key")

// ✅ GOOD: Or protect with mutex
var (
    mu sync.Mutex
    m  = make(map[string]int)
)

func set(key string, val int) {
    mu.Lock()
    defer mu.Unlock()
    m[key] = val
}
```

## References

- [Effective Go](https://golang.org/doc/effective_go) - Official style guide
- [Go Code Review Comments](https://github.com/golang/go/wiki/CodeReviewComments) - Common review feedback
- [Uber Go Style Guide](https://github.com/uber-go/guide/blob/master/style.md) - Production patterns
- [Standard Library](https://pkg.go.dev/std) - Go standard packages

## See Also

- **[Go Patterns](go-patterns.md)** - Detailed Go patterns (error handling, goroutines, interfaces)
- **[API Design Patterns](../../backend/api-design-patterns.md)** - REST/GraphQL API design
- **[Error Handling Patterns](../../backend/error-handling-patterns.md)** - General error handling strategies
- **[Testing Patterns](../../code-quality/testing-patterns.md)** - Testing best practices across languages
- **[Deployment Patterns](../../infrastructure/deployment-patterns.md)** - CI/CD and deployment strategies
- **[Observability Patterns](../../infrastructure/observability-patterns.md)** - Logging, metrics, and tracing
