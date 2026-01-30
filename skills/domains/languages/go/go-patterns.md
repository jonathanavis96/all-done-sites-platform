# Go Patterns

## Quick Reference

| Pattern | Use Case | Example |
|---------|----------|---------|
| Error handling | All functions that can fail | `if err != nil { return err }` |
| Defer cleanup | Resource cleanup (files, connections) | `defer file.Close()` |
| Goroutines | Concurrent operations | `go doWork()` |
| Channels | Communication between goroutines | `ch := make(chan string)` |
| Context | Cancellation and timeouts | `ctx, cancel := context.WithTimeout()` |
| Interfaces | Polymorphism and testability | `type Reader interface { Read([]byte) (int, error) }` |

## Error Handling

Go uses explicit error returns rather than exceptions. Every error must be checked.

### Basic Pattern

```go
func readFile(path string) ([]byte, error) {
    data, err := os.ReadFile(path)
    if err != nil {
        return nil, fmt.Errorf("failed to read %s: %w", path, err)
    }
    return data, nil
}
```

### Error Wrapping

Use `%w` verb with `fmt.Errorf()` to wrap errors (Go 1.13+):

```go
if err := processData(data); err != nil {
    return fmt.Errorf("processing failed: %w", err)
}
```

### Error Checking

```go
// Check for specific error
if errors.Is(err, os.ErrNotExist) {
    // handle file not found
}

// Check for error type
var pathErr *os.PathError
if errors.As(err, &pathErr) {
    fmt.Println("Failed at path:", pathErr.Path)
}
```

## Goroutines and Concurrency

### Basic Goroutine

```go
// Start concurrent work
go func() {
    result := doWork()
    fmt.Println(result)
}()
```

### WaitGroup for Synchronization

```go
var wg sync.WaitGroup

for i := 0; i < 5; i++ {
    wg.Add(1)
    go func(id int) {
        defer wg.Done()
        doWork(id)
    }(i)
}

wg.Wait() // Wait for all goroutines
```

### Channels for Communication

```go
// Unbuffered channel
ch := make(chan string)

// Buffered channel
ch := make(chan string, 10)

// Send and receive
go func() {
    ch <- "hello"
}()
msg := <-ch

// Close channel
close(ch)

// Range over channel
for msg := range ch {
    fmt.Println(msg)
}
```

## Context Usage

Context carries deadlines, cancellation signals, and request-scoped values.

### Timeout Context

```go
ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
defer cancel()

result, err := doWorkWithContext(ctx)
if err != nil {
    if errors.Is(err, context.DeadlineExceeded) {
        // handle timeout
    }
}
```

### Cancellation

```go
ctx, cancel := context.WithCancel(context.Background())

go func() {
    time.Sleep(2 * time.Second)
    cancel() // Cancel after 2 seconds
}()

select {
case <-ctx.Done():
    fmt.Println("cancelled:", ctx.Err())
case result := <-ch:
    fmt.Println("result:", result)
}
```

## Defer, Panic, Recover

### Defer for Cleanup

Defer executes after function returns (LIFO order):

```go
func processFile(path string) error {
    f, err := os.Open(path)
    if err != nil {
        return err
    }
    defer f.Close() // Always runs before return
    
    // Process file
    return nil
}
```

### Multiple Defers

```go
func example() {
    defer fmt.Println("third")
    defer fmt.Println("second")
    defer fmt.Println("first")
    // Prints: first, second, third
}
```

### Panic and Recover

```go
func safeDivide(a, b int) (result int, err error) {
    defer func() {
        if r := recover(); r != nil {
            err = fmt.Errorf("panic: %v", r)
        }
    }()
    
    result = a / b // May panic on divide by zero
    return result, nil
}
```

## Interfaces

Interfaces define behavior, not data.

### Small Interfaces

```go
// Standard library example
type Reader interface {
    Read(p []byte) (n int, err error)
}

type Writer interface {
    Write(p []byte) (n int, err error)
}
```

### Interface Composition

```go
type ReadWriter interface {
    Reader
    Writer
}
```

### Implementing Interfaces

```go
type MyReader struct {
    data []byte
    pos  int
}

func (r *MyReader) Read(p []byte) (n int, err error) {
    if r.pos >= len(r.data) {
        return 0, io.EOF
    }
    n = copy(p, r.data[r.pos:])
    r.pos += n
    return n, nil
}

// MyReader now implements io.Reader
var _ io.Reader = (*MyReader)(nil)
```

## Common Idioms

### Check and Return Early

```go
func process(data []byte) error {
    if len(data) == 0 {
        return errors.New("empty data")
    }
    if !isValid(data) {
        return errors.New("invalid data")
    }
    // Main logic here
    return nil
}
```

### Table-Driven Tests

```go
func TestAdd(t *testing.T) {
    tests := []struct {
        name string
        a, b int
        want int
    }{
        {"positive", 2, 3, 5},
        {"negative", -1, -2, -3},
        {"zero", 0, 0, 0},
    }
    
    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            got := add(tt.a, tt.b)
            if got != tt.want {
                t.Errorf("add(%d, %d) = %d, want %d", tt.a, tt.b, got, tt.want)
            }
        })
    }
}
```

### Struct Embedding

```go
type Engine struct {
    Power int
}

func (e Engine) Start() {
    fmt.Println("Engine started")
}

type Car struct {
    Engine  // Embedded - Car inherits Engine methods
    Model string
}

car := Car{
    Engine: Engine{Power: 200},
    Model:  "Sedan",
}
car.Start() // Calls Engine.Start()
```

## Common Mistakes

| ❌ Don't | ✅ Do | Why |
|----------|-------|-----|
| `if err != nil { panic(err) }` | `if err != nil { return err }` | Panics should be rare; errors are expected |
| `var wg sync.WaitGroup` (shared) | Pass `*sync.WaitGroup` to goroutines | WaitGroup must not be copied |
| `defer mu.Unlock()` after lock failed | Check error before defer | Unlocking without lock causes panic |
| Ignore goroutine leaks | Use context or done channel | Leaking goroutines waste resources |
| `time.Sleep()` for sync | Use channels or WaitGroup | Sleep is fragile and slow |
| Catching all panics | Let panics crash unless you can recover | Most panics indicate bugs |

## Error Wrapping Best Practices

```go
// ✅ Good - provides context and wraps
func loadConfig(path string) (*Config, error) {
    data, err := os.ReadFile(path)
    if err != nil {
        return nil, fmt.Errorf("load config from %s: %w", path, err)
    }
    
    var cfg Config
    if err := json.Unmarshal(data, &cfg); err != nil {
        return nil, fmt.Errorf("parse config: %w", err)
    }
    
    return &cfg, nil
}

// ❌ Bad - loses error chain
func loadConfig(path string) (*Config, error) {
    data, err := os.ReadFile(path)
    if err != nil {
        return nil, fmt.Errorf("failed to read file") // No %w
    }
    // ...
}
```

## Gotchas

| Issue | Description | Fix |
|-------|-------------|-----|
| Goroutine closure captures loop variable | `go func() { use(i) }()` uses final value of i | Pass as parameter: `go func(i int) { use(i) }(i)` |
| Slice append reallocates | Appending may change underlying array | Don't rely on shared backing array |
| Map iteration is random | Order not guaranteed | Use sorted keys if order matters |
| nil slices vs empty slices | Both have length 0 but differ semantically | Use `len(s) == 0` to check emptiness |
| Mutex copy | Copying mutex is undefined behavior | Always pass `*sync.Mutex` |

## Related

- [Shell Patterns](../shell/README.md) - Shell scripting patterns
- [Python Patterns](../python/python-patterns.md) - Python best practices
- [Error Handling Patterns](../../backend/error-handling-patterns.md) - General error handling
- [Testing Patterns](../../code-quality/testing-patterns.md) - Testing best practices
