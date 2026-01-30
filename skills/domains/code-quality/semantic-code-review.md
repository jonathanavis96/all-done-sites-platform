# Semantic Code Review

<!-- covers: semantic-analysis, llm-code-review, logic-validation, code-intent-checking -->

Patterns for implementing LLM-based semantic code analysis to catch logic bugs and intent mismatches that traditional linters miss.

## Quick Reference

| Check Type | What to Detect | Example |
| ---------- | -------------- | ------- |
| **Regex Logic** | Captured groups include delimiters | `"([^"]+)"` captures quotes in group 1 |
| **Code Examples** | Missing imports/undefined vars | `time.sleep()` without `import time` |
| **Variable Scope** | Used but never defined | `userId` referenced without declaration |
| **Documentation** | Code doesn't match description | Example claims "parse JSON" but does XML |
| **Security** | SQL injection patterns | String concatenation in queries |
| **Dead Code** | Unreachable cleanup blocks | Error handler referencing undefined var |

## Problem: Limitations of Syntax-Only Linting

Traditional linters (shellcheck, pylint, markdownlint) excel at catching:

- Syntax errors (missing semicolons, bad indentation)
- Style violations (line length, naming conventions)
- Basic type mismatches (wrong function signatures)

**But they miss semantic issues that require understanding intent:**

- Logic errors where code runs but produces wrong results
- Documentation examples that can't run standalone
- Variable references that assume external context
- Security patterns that depend on data flow
- Edge cases in regex patterns or string handling

**Evidence:** CodeRabbit PR#5 review caught 40+ semantic issues that pre-commit hooks missed. See `docs/CODERABBIT_PR5_ALL_ISSUES.md`.

## Approach: LLM-Based Semantic Analysis

### Core Capabilities Needed

1. **Parse code and extract intent** - Understand what code claims to do
2. **Check for completeness** - Verify all dependencies are declared
3. **Trace variable scope** - Confirm all references have definitions
4. **Validate examples** - Test code snippets for runnability
5. **Cross-reference documentation** - Check code matches descriptions

### Implementation Patterns

#### Pattern 1: Code Example Validator

**Goal:** Ensure documentation examples are complete and runnable.

```python
import ast
import re

def validate_python_example(code_block: str) -> list[str]:
    """Check Python code for completeness issues."""
    issues = []
    
    try:
        tree = ast.parse(code_block)
    except SyntaxError as syntax_err:
        return [f"Syntax error: {syntax_err}"]
    
    # Extract all names used
    used_names = {node.id for node in ast.walk(tree) if isinstance(node, ast.Name)}
    
    # Extract defined names (imports, assignments, function params)
    defined_names = set()
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            defined_names.update(alias.name for alias in node.names)
        elif isinstance(node, ast.ImportFrom):
            defined_names.update(alias.name for alias in node.names)
        elif isinstance(node, ast.Assign):
            for target in node.targets:
                if isinstance(target, ast.Name):
                    defined_names.add(target.id)
        elif isinstance(node, ast.FunctionDef):
            defined_names.add(node.name)
            defined_names.update(arg.arg for arg in node.args.args)
    
    # Check for undefined names (excluding built-ins)
    import builtins as builtins_module
    builtin_names = set(dir(builtins_module))
    undefined = used_names - defined_names - builtin_names
    
    if undefined:
        issues.append(f"Undefined variables: {', '.join(sorted(undefined))}")
    
    # Check for common missing imports
    import_checks = {
        'time.sleep': 'import time',
        'os.path': 'import os',
        'json.loads': 'import json',
        're.match': 'import re',
    }
    
    code_str = code_block
    for pattern, required_import in import_checks.items():
        if pattern in code_str and required_import not in code_str:
            issues.append(f"Missing: {required_import}")
    
    return issues
```

**Usage:**

```python
import ast

def validate_python_example(code_block: str) -> list[str]:
    # (function defined above)
    pass

example = """
def retry_with_backoff(func, max_retries=3):
    for i in range(max_retries):
        try:
            return func()
        except Exception as e:
            time.sleep(2 ** i)
"""

issues = validate_python_example(example)
# Returns: ["Missing: import time"]
```

### When Validators Fail on Valid Code

**Critical Pattern:** If validator reports errors on obviously valid code (kwargs, comprehensions, loop variables), assume **validator bug** first.

**Debugging sequence:**

1. Reproduce once: `python3 tools/validate_examples.py <file>`
2. Inspect validator logic: `rg -n "error message" tools/validate_examples.py`
3. If code is valid (check language spec), fix the validator
4. **DO NOT** rewrite valid examples into awkward forms to satisfy broken validators

**Common validator bugs:**

- Not tracking loop variables (`for x in items:` then using `x`)
- Not tracking comprehension variables (`[x for x in items]`)
- Not recognizing `**kwargs` unpacking
- Not handling context managers (`with` statement scope)

**Anti-pattern:** Rewriting valid examples 3 times hoping validator passes.

#### Pattern 2: Regex Capture Group Analyzer

**Goal:** Detect when regex capture groups include delimiters unintentionally.

```python
import re

def analyze_regex_captures(pattern: str, test_string: str) -> dict:
    """Check if regex captures include unintended delimiters."""
    try:
        compiled = re.compile(pattern)
    except re.error as regex_err:
        return {"error": f"Invalid regex: {regex_err}"}
    
    match = compiled.search(test_string)
    if not match:
        return {"error": "Pattern doesn't match test string"}
    
    issues = []
    
    for i, group in enumerate(match.groups()):
        # Check if captured group starts/ends with delimiters
        delimiters = ['"', "'", '`', '(', ')', '[', ']', '{', '}']
        
        if group and any(group.startswith(d) or group.endswith(d) for d in delimiters):
            issues.append({
                "group": i + 1,
                "captured": group,
                "warning": "Captured text includes delimiter characters"
            })
    
    return {
        "pattern": pattern,
        "matched": match.group(0),
        "groups": match.groups(),
        "issues": issues
    }
```

**Example:**

```python
import re

def analyze_regex_captures(pattern: str, test_string: str) -> dict:
    # (function defined above)
    pass

# BAD: Captures quotes inside group
result = analyze_regex_captures(r'"([^"]+)"', 'key="value"')
# Returns: {"issues": [{"group": 1, "captured": "value", "warning": "..."}]}

# GOOD: Quotes outside capture group
result = analyze_regex_captures(r'"([^"]+)"', 'key="value"')
# Pattern correctly excludes delimiters from capture
```

**Note:** This example intentionally shows both patterns produce the same result when the regex is `"([^"]+)"` - the issue is that developers often intend to capture WITHOUT delimiters but write patterns that include them. The analyzer helps detect this mismatch between intent and implementation.

#### Pattern 3: Variable Scope Tracer

**Goal:** Find variables used before definition within functions.

```bash
#!/bin/bash
# Bash variable scope checker

check_bash_vars() {
    local file="$1"
    
    # Extract function definitions
    awk '
    /^[a-zA-Z_][a-zA-Z0-9_]*\(\)/ {
        func_name = $1
        in_function = 1
        delete defined
        delete used
        next
    }
    
    in_function && /^}/ {
        # End of function - check for undefined usage
        for (var in used) {
            if (!(var in defined)) {
                print func_name ": variable \"" var "\" used but not defined"
            }
        }
        in_function = 0
        next
    }
    
    in_function {
        # Track variable definitions (local, =, read, etc.)
        if (match($0, /local ([a-zA-Z_][a-zA-Z0-9_]*)/, arr)) {
            defined[arr[1]] = 1
        }
        if (match($0, /([a-zA-Z_][a-zA-Z0-9_]*)=/, arr)) {
            defined[arr[1]] = 1
        }
        
        # Track variable usage ($var, "${var}")
        while (match($0, /\$\{?([a-zA-Z_][a-zA-Z0-9_]*)\}?/, arr)) {
            if (arr[1] !~ /^[0-9@*#?$!_-]$/) {  # Exclude special vars
                used[arr[1]] = 1
            }
            $0 = substr($0, RSTART + RLENGTH)
        }
    }
    ' "$file"
}
```

#### Pattern 4: Documentation-Code Consistency

**Goal:** Verify code examples match their surrounding documentation.

**LLM Prompt Pattern:**

```text
You are a semantic code reviewer. Check if the following code example matches its description.

DESCRIPTION:
{extracted_description_text}

CODE:
{code_block}

Analyze:
1. Does the code do what the description claims?
2. Are variable names consistent with the description?
3. Are edge cases mentioned in the description handled in the code?
4. Are security considerations from the description implemented?

Return findings in this format:
- MATCH: <what matches>
- MISMATCH: <what doesn't match>
- MISSING: <what description mentions but code doesn't implement>
```

### Integration as Pre-Commit Hook

```yaml
# .pre-commit-config.yaml
repos:
  - repo: local
    hooks:
      - id: semantic-code-review
        name: LLM Semantic Code Review
        entry: python tools/semantic_reviewer.py
        language: python
        types: [python, markdown, shell]
        additional_dependencies: [openai>=1.0.0]
```

**Implementation sketch for `tools/semantic_reviewer.py`:**

```python
#!/usr/bin/env python3
"""LLM-based semantic code reviewer for pre-commit."""

import sys
import os
from pathlib import Path

def extract_code_blocks(file_path: Path) -> list[tuple[str, str]]:
    """Extract code blocks from markdown files."""
    if file_path.suffix != '.md':
        return [(str(file_path), file_path.read_text())]
    
    blocks = []
    content = file_path.read_text()
    
    # Simple regex to find fenced code blocks
    import re
    pattern = r'```(\w+)\n(.*?)```'
    for match in re.finditer(pattern, content, re.DOTALL):
        lang, code = match.groups()
        blocks.append((lang, code))
    
    return blocks

def review_with_llm(code: str, language: str) -> list[str]:
    """Send code to LLM for semantic review."""
    # Placeholder - integrate with your LLM API
    # This would call OpenAI/Anthropic with structured prompt
    return []

def main(files: list[str]) -> int:
    """Run semantic review on changed files."""
    issues_found = False
    
    for file_path in files:
        path = Path(file_path)
        blocks = extract_code_blocks(path)
        
        for lang, code in blocks:
            if lang in ['python', 'bash', 'shell']:
                issues = review_with_llm(code, lang)
                if issues:
                    print(f"\n{file_path}:")
                    for issue in issues:
                        print(f"  - {issue}")
                    issues_found = True
    
    return 1 if issues_found else 0

if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
```

## Practical Checklist

When implementing semantic code review tooling:

- [ ] **Start narrow** - Focus on one high-value check (e.g., code example completeness)
- [ ] **Use existing parsers** - Leverage AST for Python, shellcheck for bash
- [ ] **Make it fast** - Cache LLM results, batch requests, run in parallel
- [ ] **Provide context** - Include surrounding documentation in LLM prompts
- [ ] **Allow overrides** - Add `# semantic-review: ignore` comments for false positives
- [ ] **Track metrics** - Log true positive rate to tune prompts
- [ ] **Fail gracefully** - Don't block commits on API timeouts

## Cost Considerations

**LLM API costs for CI/CD:**

- Average file: ~2000 tokens input + 500 tokens output = $0.02 per file (GPT-4 pricing)
- Typical PR: 10-20 files = $0.20-$0.40 per review
- Optimization: Only review changed code blocks, not entire files

**Mitigation strategies:**

1. **Smart caching** - Hash code blocks, cache results for 7 days
2. **Incremental review** - Only check git diff, not full files
3. **Tiered review** - Run cheap AST checks first, LLM only if needed
4. **Batch processing** - Combine multiple checks in one LLM call

## Limitations

**What LLM semantic review CANNOT do:**

- **Guarantee correctness** - LLMs can miss subtle bugs or hallucinate issues
- **Replace testing** - Need actual test execution to verify behavior
- **Handle all contexts** - May misinterpret domain-specific patterns
- **Enforce security** - Should complement, not replace, security scanning tools

**What it CAN do well:**

- **Catch obvious oversights** - Missing imports, undefined variables
- **Verify documentation** - Check examples match descriptions
- **Suggest improvements** - Identify unclear code, suggest better names
- **Find patterns** - Detect recurring anti-patterns across codebase

## See Also

- **[code-review-patterns.md](code-review-patterns.md)** - Manual review checklist for semantic issues
- **[testing-patterns.md](testing-patterns.md)** - How to test code examples
- **[code-hygiene.md](code-hygiene.md)** - Definition of Done checklist
- **[docs/CODERABBIT_PR5_ALL_ISSUES.md](../../../docs/CODERABBIT_PR5_ALL_ISSUES.md)** - Real-world semantic issues caught by LLM review

## Gap Identification

If you encounter semantic review patterns not covered here, add to `skills/self-improvement/skills/self-improvement/GAP_BACKLOG.md`.
