# Python Patterns

<!-- covers: E0601, E0602, F821, E1101, UnboundLocalError -->

> Best practices for writing robust, modern Python code.

## Quick Reference

| Issue | Problem | Fix |
| ----- | ------- | --- |
| `datetime.utcnow()` | Deprecated, naive datetime | `datetime.now(timezone.utc)` |
| `f"static"` | f-string without placeholders | Use regular `"static"` |
| `json.load()` no try | Crashes on malformed JSON | Wrap in try/except |
| Bare `except:` | Catches everything including Ctrl+C | Use specific exceptions |

## Datetime Best Practices

### Use Timezone-Aware Datetimes

```python
# ❌ Wrong - deprecated in Python 3.12, returns naive datetime
from datetime import datetime
now = datetime.utcnow()

# ✅ Right - timezone-aware (Python 3.9+)
from datetime import datetime, timezone
now = datetime.now(timezone.utc)

# ✅ Right - Python 3.11+ shortcut
from datetime import datetime, UTC
now = datetime.now(UTC)
```text

### ISO 8601 Formatting

```python
# ❌ Wrong - inconsistent format
timestamp = now.strftime("%Y/%m/%d %H:%M")

# ✅ Right - ISO 8601 with Z suffix for UTC
timestamp = now.replace(microsecond=0).isoformat() + "Z"
# Output: "2026-01-20T02:15:00Z"

# ✅ Right - ISO 8601 with timezone
timestamp = now.isoformat()
# Output: "2026-01-20T02:15:00+00:00"
```text

### Parsing Datetimes

```python
# ❌ Wrong - no error handling
dt = datetime.fromisoformat(date_string)

# ✅ Right - with error handling
from datetime import datetime

def parse_datetime(date_string: str) -> datetime | None:
    """Parse ISO 8601 datetime string, return None on failure."""
    try:
        # Handle Z suffix (Python 3.11+ handles this natively)
        if date_string.endswith("Z"):
            date_string = date_string[:-1] + "+00:00"
        return datetime.fromisoformat(date_string)
    except ValueError as e:
        print(f"Invalid datetime format: {date_string} ({e})")
        return None
```text

## f-String Best Practices

### Don't Use f-Strings Without Placeholders

```python
# ❌ Wrong - f-string with no interpolation
message = f"This is a static string"
error = f"Something went wrong"

# ✅ Right - regular strings for static content
message = "This is a static string"
error = "Something went wrong"

# ✅ Right - f-string with actual interpolation
message = f"Hello, {username}!"
error = f"Failed to process {filename}: {reason}"
```text

### Avoid Overly Simple f-Strings

```python
# ❌ Questionable - just converting to string
result = f"{value}"  # Same as str(value)

# ✅ Better - use str() if that's all you need
result = str(value)

# ✅ Right - f-string adds context
result = f"Value: {value}"
result = f"{count} items found"
```text

### f-String Formatting

```python
# Numbers
f"{price:.2f}"           # "19.99" - 2 decimal places
f"{percentage:.1%}"      # "85.5%" - percentage
f"{big_num:,}"           # "1,234,567" - thousands separator
f"{num:08d}"             # "00000042" - zero-padded

# Alignment
f"{name:<20}"            # Left-align in 20 chars
f"{name:>20}"            # Right-align in 20 chars
f"{name:^20}"            # Center in 20 chars

# Debug (Python 3.8+)
f"{variable=}"           # "variable=42" - shows name and value
```text

## JSON Error Handling

### Always Handle JSON Errors

```python
# ❌ Wrong - crashes on malformed JSON
import json

with open("data.json") as f:
    data = json.load(f)

# ✅ Right - proper error handling
import json
from pathlib import Path

def load_json(path: str | Path) -> dict | None:
    """Load JSON file with error handling."""
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except FileNotFoundError:
        print(f"File not found: {path}")
        return None
    except json.JSONDecodeError as e:
        print(f"Invalid JSON in {path}: {e}")
        return None
    except PermissionError:
        print(f"Permission denied: {path}")
        return None
```text

### Validate JSON Structure

```python
# ❌ Wrong - assumes structure exists
data = json.load(f)
value = data["nested"]["key"]["value"]  # KeyError if missing!

# ✅ Right - safe access with .get()
data = json.load(f)
value = data.get("nested", {}).get("key", {}).get("value")

# ✅ Right - explicit validation
def get_config_value(data: dict, *keys, default=None):
    """Safely traverse nested dict."""
    current = data
    for key in keys:
        if not isinstance(current, dict):
            return default
        current = current.get(key)
        if current is None:
            return default
    return current

value = get_config_value(data, "nested", "key", "value", default="fallback")
```text

## Exception Handling

### Use Specific Exceptions

```python
# ❌ Wrong - catches everything including KeyboardInterrupt
try:
    risky_operation()
except:
    print("Error occurred")

# ❌ Wrong - too broad
try:
    risky_operation()
except Exception:
    print("Error occurred")

# ✅ Right - specific exceptions
try:
    risky_operation()
except (ValueError, TypeError) as e:
    print(f"Invalid input: {e}")
except FileNotFoundError as e:
    print(f"File not found: {e}")
except Exception as e:
    # Only as last resort, and re-raise or log properly
    logging.exception("Unexpected error")
    raise
```text

### Context in Error Messages

```python
# ❌ Wrong - no context
except json.JSONDecodeError:
    print("JSON error")

# ✅ Right - helpful context
except json.JSONDecodeError as e:
    print(f"Invalid JSON in {filepath} at line {e.lineno}: {e.msg}")
```text

## Type Hints (Python 3.10+)

### Modern Type Hint Syntax

```python
# ❌ Old style (Python 3.9 and earlier)
from typing import Dict, List, Optional, Union

def process(items: List[str]) -> Optional[Dict[str, int]]:
    pass

def get_value(key: str) -> Union[str, None]:
    pass

# ✅ Modern style (Python 3.10+)
def process(items: list[str]) -> dict[str, int] | None:
    pass

def get_value(key: str) -> str | None:
    pass
```text

### Use `from __future__ import annotations`

```python
# For forward references and cleaner syntax in Python 3.9+
from __future__ import annotations

class Node:
    # Can reference Node before it's fully defined
    def add_child(self, child: Node) -> None:
        pass
```text

## File Handling

### Use Context Managers

```python
# ❌ Wrong - manual file handling
f = open("file.txt")
content = f.read()
f.close()  # May not run if exception occurs!

# ✅ Right - context manager
with open("file.txt", "r", encoding="utf-8") as f:
    content = f.read()
```text

### Always Specify Encoding

```python
# ❌ Wrong - uses system default encoding
with open("file.txt") as f:
    content = f.read()

# ✅ Right - explicit UTF-8
with open("file.txt", "r", encoding="utf-8") as f:
    content = f.read()
```text

## Import Organization

```python
# Standard library
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

# Third-party packages (blank line separator)
import requests
import yaml

# Local imports (blank line separator)
from .utils import helper_function
from .config import settings
```text

## Import Scope Best Practices

### Avoid Importing Inside Try Blocks

```python
# ❌ Wrong - import inside try block creates local variable
def my_function():
    try:
        import time  # Creates local 'time' variable
        time.sleep(1)
    except Exception as e:
        pass
    
    # This will fail with: "cannot access local variable 'time' where it is not associated with a value"
    time.sleep(2)  # 'time' is out of scope here!

# ✅ Right - import at module level or function start
import time

def my_function():
    try:
        time.sleep(1)
    except Exception as e:
        pass
    
    time.sleep(2)  # Works fine, 'time' is in scope

# ✅ Also acceptable - import at function start (before try)
def my_function():
    import time  # Import before try block
    
    try:
        time.sleep(1)
    except Exception as e:
        pass
    
    time.sleep(2)  # Works fine
```text

### Why This Happens

When you import inside a try block:

1. Python creates a local variable in that block's scope
2. After the try block ends, that local variable is out of scope
3. References to that name outside the block fail with "cannot access local variable"

### Best Practice

- **Module-level imports** (top of file) for standard libraries and commonly used modules
- **Function-level imports** (before any control flow) only when needed for circular import resolution or optional dependencies
- **Never import inside try/except/if blocks** unless you handle the scope correctly

## Common Mistakes Summary

| Mistake | Problem | Fix |
| ------- | ------- | --- |
| `datetime.utcnow()` | Deprecated, naive | `datetime.now(timezone.utc)` |
| `f"static"` | Unnecessary f-string | Regular `"static"` |
| `json.load()` bare | Crashes on bad JSON | try/except JSONDecodeError |
| `except:` | Catches Ctrl+C too | Specific exceptions |
| `data["key"]` | KeyError if missing | `data.get("key")` |
| No encoding | Platform-dependent | `encoding="utf-8"` |

## Related

- [error-handling-patterns.md](../../backend/error-handling-patterns.md) - General error handling
- [testing-patterns.md](../../code-quality/testing-patterns.md) - Python testing with pytest
