#!/usr/bin/env python3
"""
Cerebras Agentic Runner for Ralph

A comprehensive agentic loop optimized for Cerebras's blazing-fast inference.
Features RovoDev-style formatting, streaming, and token-efficient tools.

Usage:
    python3 cerebras_agent.py --prompt <file> --model <model> [--max-turns 20]

Environment:
    CEREBRAS_API_KEY: Required API key from cloud.cerebras.ai
"""

from __future__ import annotations

import argparse
import json
import os
import re
import shutil
import subprocess
import sys
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Iterator

# Try to import requests, fall back to urllib if not available
try:
    import requests

    HAS_REQUESTS = True
except ImportError:
    import urllib.request
    import urllib.error

    HAS_REQUESTS = False


# =============================================================================
# Configuration
# =============================================================================

CEREBRAS_API_URL = "https://api.cerebras.ai/v1/chat/completions"
DEFAULT_MODEL = "zai-glm-4.7"
DEFAULT_MAX_TURNS = 15
DEFAULT_MAX_TOKENS = 16384
DEFAULT_TEMPERATURE = 0.2

# Rate limit handling
MAX_RETRIES = 5
INITIAL_BACKOFF = 5
MAX_BACKOFF = 60

# Context management - prevent unbounded growth
MAX_CONTEXT_CHARS = 50000  # ~12.5K tokens - keep well under 60K token/min limit
MAX_TOOL_RESULT_CHARS = 4000  # Truncate individual tool results
KEEP_RECENT_TURNS = 6  # Always keep last N turns (assistant + tool results)
SUMMARIZE_AFTER_TURN = 3  # Start summarizing tool results after this many turns

# Terminal formatting
TERM_WIDTH = shutil.get_terminal_size().columns


# =============================================================================
# ANSI Colors and Formatting
# =============================================================================


class Style:
    """ANSI escape codes for terminal styling."""

    RESET = "\033[0m"
    BOLD = "\033[1m"
    DIM = "\033[2m"

    # Colors
    RED = "\033[31m"
    GREEN = "\033[32m"
    YELLOW = "\033[33m"
    BLUE = "\033[34m"
    MAGENTA = "\033[35m"
    CYAN = "\033[36m"
    WHITE = "\033[37m"
    GRAY = "\033[90m"

    # Bright colors
    BRIGHT_RED = "\033[91m"
    BRIGHT_GREEN = "\033[92m"
    BRIGHT_YELLOW = "\033[93m"
    BRIGHT_BLUE = "\033[94m"
    BRIGHT_MAGENTA = "\033[95m"
    BRIGHT_CYAN = "\033[96m"


class Box:
    """Box drawing characters."""

    H = "─"  # Horizontal
    V = "│"  # Vertical
    TL = "┌"  # Top left
    TR = "┐"  # Top right
    BL = "└"  # Bottom left
    BR = "┘"  # Bottom right
    LT = "├"  # Left tee
    RT = "┤"  # Right tee

    @classmethod
    def line(cls, width: int = TERM_WIDTH) -> str:
        return cls.H * width

    @classmethod
    def header(cls, title: str, width: int = TERM_WIDTH) -> str:
        """Create a header line: ─── Title ───"""
        title_part = f" {title} "
        remaining = width - len(title_part)
        left = remaining // 2
        right = remaining - left
        return f"{cls.H * left}{title_part}{cls.H * right}"


def fmt(text: str, *styles: str) -> str:
    """Apply styles to text."""
    return f"{''.join(styles)}{text}{Style.RESET}"


def print_header(title: str, style: str = Style.CYAN):
    """Print a styled header."""
    print(f"\n{style}{Box.header(title)}{Style.RESET}")


def print_divider(style: str = Style.GRAY):
    """Print a horizontal divider."""
    print(f"{style}{Box.line()}{Style.RESET}")


def truncate(text: str, max_len: int = 100) -> str:
    """Truncate text with ellipsis."""
    if len(text) <= max_len:
        return text
    return text[: max_len - 3] + "..."


# =============================================================================
# Tool Definitions
# =============================================================================

TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "bash",
            "description": "Execute a bash command. Use for: git, running scripts, system commands. Returns stdout, stderr, exit code.",
            "parameters": {
                "type": "object",
                "properties": {
                    "command": {
                        "type": "string",
                        "description": "The bash command to execute",
                    }
                },
                "required": ["command"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "read_file",
            "description": "Read entire file contents. Use only for small files (<100 lines). For large files, use head_file or grep first.",
            "parameters": {
                "type": "object",
                "properties": {
                    "path": {"type": "string", "description": "Path to the file"}
                },
                "required": ["path"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "head_file",
            "description": "Read first N lines of a file. Use for large files to see structure before deciding what to read.",
            "parameters": {
                "type": "object",
                "properties": {
                    "path": {"type": "string", "description": "Path to the file"},
                    "lines": {
                        "type": "integer",
                        "description": "Number of lines (default: 50)",
                        "default": 50,
                    },
                },
                "required": ["path"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "grep",
            "description": "Search for pattern in files. Returns matching lines with file:line:content format. Use to find relevant code without reading entire files.",
            "parameters": {
                "type": "object",
                "properties": {
                    "pattern": {
                        "type": "string",
                        "description": "Regex pattern to search for",
                    },
                    "path": {
                        "type": "string",
                        "description": "File or directory to search",
                        "default": ".",
                    },
                    "include": {
                        "type": "string",
                        "description": "File glob pattern, e.g. '*.py'",
                        "default": "",
                    },
                    "context": {
                        "type": "integer",
                        "description": "Lines of context around match",
                        "default": 0,
                    },
                },
                "required": ["pattern"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "write_file",
            "description": "Write content to a file. Creates parent directories if needed. Use for creating or overwriting files.",
            "parameters": {
                "type": "object",
                "properties": {
                    "path": {"type": "string", "description": "Path to the file"},
                    "content": {"type": "string", "description": "Content to write"},
                },
                "required": ["path", "content"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "patch_file",
            "description": "Apply a find/replace patch to a file. More token-efficient than write_file for small changes.",
            "parameters": {
                "type": "object",
                "properties": {
                    "path": {"type": "string", "description": "Path to the file"},
                    "find": {"type": "string", "description": "Exact text to find"},
                    "replace": {
                        "type": "string",
                        "description": "Text to replace with",
                    },
                },
                "required": ["path", "find", "replace"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "list_dir",
            "description": "List directory contents with file sizes. Use to explore project structure.",
            "parameters": {
                "type": "object",
                "properties": {
                    "path": {
                        "type": "string",
                        "description": "Directory path",
                        "default": ".",
                    },
                    "recursive": {
                        "type": "boolean",
                        "description": "List recursively",
                        "default": False,
                    },
                    "max_depth": {
                        "type": "integer",
                        "description": "Max depth for recursive listing",
                        "default": 2,
                    },
                },
                "required": [],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "read_lines",
            "description": "Read specific line range from a file. Use after grep to read context around matches, or to read a specific function/section.",
            "parameters": {
                "type": "object",
                "properties": {
                    "path": {"type": "string", "description": "Path to the file"},
                    "start": {
                        "type": "integer",
                        "description": "Start line (1-indexed, or negative for end-relative)",
                    },
                    "end": {
                        "type": "integer",
                        "description": "End line (1-indexed, inclusive, or negative for end-relative)",
                    },
                },
                "required": ["path", "start", "end"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "tail_file",
            "description": "Read last N lines of a file. Efficient for checking recent entries in logs, THUNK.md, etc.",
            "parameters": {
                "type": "object",
                "properties": {
                    "path": {"type": "string", "description": "Path to the file"},
                    "lines": {
                        "type": "integer",
                        "description": "Number of lines from end (default: 20)",
                        "default": 20,
                    },
                },
                "required": ["path"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "append_file",
            "description": "Append content to end of file. More efficient than read+write for adding entries to logs, THUNK.md, etc.",
            "parameters": {
                "type": "object",
                "properties": {
                    "path": {"type": "string", "description": "Path to the file"},
                    "content": {"type": "string", "description": "Content to append"},
                },
                "required": ["path", "content"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "git_status",
            "description": "Get git branch, status, and recent commits in ONE call. Use instead of multiple git commands.",
            "parameters": {"type": "object", "properties": {}, "required": []},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "git_commit",
            "description": "Stage and commit files in ONE call. Equivalent to 'git add <files> && git commit -m <message>'.",
            "parameters": {
                "type": "object",
                "properties": {
                    "message": {"type": "string", "description": "Commit message"},
                    "files": {
                        "type": "string",
                        "description": "Files to stage (space-separated, default: '.' for all)",
                        "default": ".",
                    },
                },
                "required": ["message"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "think",
            "description": "Scratchpad for planning and reasoning. Use BEFORE complex operations to plan your approach. Free in terms of cost - use liberally to think clearly.",
            "parameters": {
                "type": "object",
                "properties": {
                    "thought": {
                        "type": "string",
                        "description": "Your reasoning, plan, or notes",
                    }
                },
                "required": ["thought"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "glob",
            "description": "Find files matching a pattern. Faster than grep when you just need file paths. Supports ** for recursive matching.",
            "parameters": {
                "type": "object",
                "properties": {
                    "pattern": {
                        "type": "string",
                        "description": "Glob pattern, e.g. '**/*.py', 'src/*.ts', '*.md'",
                    }
                },
                "required": ["pattern"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "diff",
            "description": "Show unstaged git changes for a file or all files. Use to review changes before committing.",
            "parameters": {
                "type": "object",
                "properties": {
                    "path": {
                        "type": "string",
                        "description": "File path, or '.' for all changes",
                        "default": ".",
                    }
                },
                "required": [],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "undo_change",
            "description": "Discard unstaged changes to a file. Use if you made a mistake and want to restore to last commit.",
            "parameters": {
                "type": "object",
                "properties": {
                    "path": {"type": "string", "description": "File to restore"}
                },
                "required": ["path"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "symbols",
            "description": "Extract function/class definitions from a file. Quick overview without reading the whole file. Works for Python, JS/TS, Shell.",
            "parameters": {
                "type": "object",
                "properties": {"path": {"type": "string", "description": "File path"}},
                "required": ["path"],
            },
        },
    },
]

# System prompt optimized for LOW REQUESTS (Cerebras limit: 10 req/min, 60k tokens/min)
SYSTEM_PROMPT = """You are Ralph, an expert software engineer.

## CRITICAL: Rate Limit Strategy
Cerebras allows only 10 requests/minute but 60,000 tokens/minute.
DO MORE PER TURN. Call multiple tools at once when possible.

## Pre-loaded Context
The context below already contains: git status, directory tree, verifier status,
IMPLEMENTATION_PLAN.md, recent THUNK.md entries, and AGENTS.md.
DO NOT re-read these files - use the pre-loaded context!

## Tools (17) - Call MULTIPLE per turn when independent

**Discovery:** glob, symbols, grep, list_dir
**Reading:** read_lines, head_file, tail_file, read_file (small files only)
**Writing:** patch_file (best), append_file (logs), write_file (new files)
**Git:** git_status, git_commit, diff, undo_change
**Meta:** think, bash

## Batching Examples
GOOD (1 request):
  - think + grep + read_lines → plan, find, read in ONE turn
  - patch_file + patch_file + git_commit → multiple edits + commit in ONE turn

BAD (3 requests):
  - Turn 1: grep → Turn 2: read_lines → Turn 3: patch_file

## Workflow
1. Context is pre-loaded - find your NEXT UNCHECKED task in Implementation Plan above
2. Plan with think, then execute (grep + read_lines or symbols + read_lines)
3. Make changes (patch_file), verify (diff), commit (git_commit) - ALL IN ONE TURN
4. Update THUNK.md with append_file
5. Output :::BUILD_READY::: or :::PLAN_READY:::

## Output
Start: STATUS | task=<task from plan>
End: :::BUILD_READY::: or :::PLAN_READY:::
"""


# =============================================================================
# Tool Execution
# =============================================================================


@dataclass
class ToolResult:
    """Result of a tool execution."""

    success: bool
    output: str
    error: str = ""
    truncated: bool = False


def execute_bash(
    command: str, cwd: str | None = None, timeout: int = 300
) -> ToolResult:
    """Execute a bash command."""
    try:
        result = subprocess.run(
            ["bash", "-c", command],
            capture_output=True,
            text=True,
            timeout=timeout,
            cwd=cwd,
        )

        stdout = result.stdout
        stderr = result.stderr
        truncated = False

        # Truncate large outputs
        if len(stdout) > 8000:
            stdout = (
                stdout[:8000] + f"\n... (truncated, {len(result.stdout)} total chars)"
            )
            truncated = True
        if len(stderr) > 2000:
            stderr = stderr[:2000] + "\n... (truncated)"
            truncated = True

        output = ""
        if stdout:
            output += stdout
        if stderr:
            output += f"\n[stderr]: {stderr}" if output else f"[stderr]: {stderr}"
        output += f"\n[exit: {result.returncode}]"

        return ToolResult(
            success=result.returncode == 0, output=output.strip(), truncated=truncated
        )

    except subprocess.TimeoutExpired:
        return ToolResult(
            success=False, output="", error=f"Command timed out after {timeout}s"
        )
    except Exception as e:
        return ToolResult(success=False, output="", error=str(e))


def execute_read_file(path: str, cwd: str | None = None) -> ToolResult:
    """Read entire file contents."""
    try:
        full_path = Path(cwd or ".") / path
        if not full_path.exists():
            return ToolResult(success=False, output="", error=f"File not found: {path}")
        if not full_path.is_file():
            return ToolResult(success=False, output="", error=f"Not a file: {path}")

        content = full_path.read_text(encoding="utf-8", errors="replace")
        lines = content.count("\n") + 1
        truncated = False

        # Warn about large files
        if len(content) > 20000:
            content = content[:20000] + f"\n\n... (truncated, {lines} total lines)"
            truncated = True

        return ToolResult(
            success=True, output=f"[{lines} lines]\n{content}", truncated=truncated
        )
    except Exception as e:
        return ToolResult(success=False, output="", error=str(e))


def execute_head_file(path: str, lines: int = 50, cwd: str | None = None) -> ToolResult:
    """Read first N lines of a file."""
    try:
        full_path = Path(cwd or ".") / path
        if not full_path.exists():
            return ToolResult(success=False, output="", error=f"File not found: {path}")

        with open(full_path, "r", encoding="utf-8", errors="replace") as f:
            content_lines = []
            total = 0
            for i, line in enumerate(f):
                total = i + 1
                if i < lines:
                    content_lines.append(line.rstrip("\n"))

        content = "\n".join(content_lines)
        truncated = total > lines

        return ToolResult(
            success=True,
            output=f"[showing {len(content_lines)}/{total} lines]\n{content}",
            truncated=truncated,
        )
    except Exception as e:
        return ToolResult(success=False, output="", error=str(e))


def execute_grep(
    pattern: str,
    path: str = ".",
    include: str = "",
    context: int = 0,
    cwd: str | None = None,
) -> ToolResult:
    """Search for pattern in files."""
    try:
        cmd = ["grep", "-rn", "--color=never"]
        if include:
            cmd.extend(["--include", include])
        if context > 0:
            cmd.extend(["-C", str(context)])
        cmd.extend(["-E", pattern, path])

        result = subprocess.run(
            cmd, capture_output=True, text=True, timeout=30, cwd=cwd
        )

        matches = result.stdout.strip()
        if not matches:
            return ToolResult(success=True, output="[0 matches]")

        lines = matches.split("\n")
        count = len(lines)
        truncated = False

        if count > 50:
            lines = lines[:50]
            matches = "\n".join(lines) + f"\n... ({count - 50} more matches)"
            truncated = True

        return ToolResult(
            success=True, output=f"[{count} matches]\n{matches}", truncated=truncated
        )
    except subprocess.TimeoutExpired:
        return ToolResult(success=False, output="", error="Search timed out")
    except Exception as e:
        return ToolResult(success=False, output="", error=str(e))


def execute_write_file(path: str, content: str, cwd: str | None = None) -> ToolResult:
    """Write content to a file."""
    try:
        full_path = Path(cwd or ".") / path
        full_path.parent.mkdir(parents=True, exist_ok=True)
        full_path.write_text(content, encoding="utf-8")

        lines = content.count("\n") + 1
        return ToolResult(
            success=True,
            output=f"[wrote {lines} lines, {len(content)} bytes to {path}]",
        )
    except Exception as e:
        return ToolResult(success=False, output="", error=str(e))


def execute_patch_file(
    path: str, find: str, replace: str, cwd: str | None = None
) -> ToolResult:
    """Apply find/replace patch to a file."""
    try:
        full_path = Path(cwd or ".") / path
        if not full_path.exists():
            return ToolResult(success=False, output="", error=f"File not found: {path}")

        content = full_path.read_text(encoding="utf-8")

        if find not in content:
            # Show context to help debug
            return ToolResult(
                success=False,
                output="",
                error=f"Pattern not found in {path}. File has {len(content)} chars, {content.count(chr(10))+1} lines.",
            )

        count = content.count(find)
        new_content = content.replace(find, replace)
        full_path.write_text(new_content, encoding="utf-8")

        return ToolResult(
            success=True, output=f"[patched {count} occurrence(s) in {path}]"
        )
    except Exception as e:
        return ToolResult(success=False, output="", error=str(e))


def execute_list_dir(
    path: str = ".", recursive: bool = False, max_depth: int = 2, cwd: str | None = None
) -> ToolResult:
    """List directory contents."""
    try:
        full_path = Path(cwd or ".") / path
        if not full_path.exists():
            return ToolResult(success=False, output="", error=f"Path not found: {path}")

        entries = []

        def list_entries(p: Path, depth: int = 0):
            if depth > max_depth:
                return
            try:
                for entry in sorted(p.iterdir()):
                    prefix = "  " * depth
                    if entry.is_dir():
                        entries.append(f"{prefix}{entry.name}/")
                        if recursive and depth < max_depth:
                            list_entries(entry, depth + 1)
                    else:
                        size = entry.stat().st_size
                        size_str = f"{size:,}B" if size < 1024 else f"{size//1024:,}KB"
                        entries.append(f"{prefix}{entry.name} ({size_str})")
            except PermissionError:
                entries.append(f"{prefix}[permission denied]")

        list_entries(full_path)

        truncated = False
        if len(entries) > 100:
            entries = entries[:100]
            entries.append("... (truncated)")
            truncated = True

        return ToolResult(
            success=True,
            output=f"[{len(entries)} items]\n" + "\n".join(entries),
            truncated=truncated,
        )
    except Exception as e:
        return ToolResult(success=False, output="", error=str(e))


# Additional tool: expand_code_chunks equivalent
def execute_read_lines(
    path: str, start: int, end: int, cwd: str | None = None
) -> ToolResult:
    """Read specific line range from a file."""
    try:
        full_path = Path(cwd or ".") / path
        if not full_path.exists():
            return ToolResult(success=False, output="", error=f"File not found: {path}")

        with open(full_path, "r", encoding="utf-8", errors="replace") as f:
            lines = f.readlines()

        total = len(lines)

        # Handle negative indices like Python
        if start < 0:
            start = max(0, total + start)
        if end < 0:
            end = total + end + 1

        # Clamp to valid range
        start = max(0, min(start, total))
        end = max(start, min(end, total))

        selected = lines[start:end]
        content = "".join(selected)

        return ToolResult(
            success=True,
            output=f"[lines {start+1}-{end} of {total}]\n{content.rstrip()}",
        )
    except Exception as e:
        return ToolResult(success=False, output="", error=str(e))


# =============================================================================
# High-Efficiency Tools (reduce token usage for common operations)
# =============================================================================


def execute_tail_file(path: str, lines: int = 20, cwd: str | None = None) -> ToolResult:
    """Read last N lines of a file."""
    try:
        full_path = Path(cwd or ".") / path
        if not full_path.exists():
            return ToolResult(success=False, output="", error=f"File not found: {path}")

        with open(full_path, "r", encoding="utf-8", errors="replace") as f:
            all_lines = f.readlines()

        total = len(all_lines)
        start = max(0, total - lines)
        selected = all_lines[start:]
        content = "".join(selected)

        return ToolResult(
            success=True,
            output=f"[last {len(selected)} of {total} lines]\n{content.rstrip()}",
        )
    except Exception as e:
        return ToolResult(success=False, output="", error=str(e))


def execute_append_file(path: str, content: str, cwd: str | None = None) -> ToolResult:
    """Append content to a file (creates if doesn't exist)."""
    try:
        full_path = Path(cwd or ".") / path
        full_path.parent.mkdir(parents=True, exist_ok=True)

        with open(full_path, "a", encoding="utf-8") as f:
            f.write(content)

        return ToolResult(
            success=True, output=f"[appended {len(content)} chars to {path}]"
        )
    except Exception as e:
        return ToolResult(success=False, output="", error=str(e))


def execute_git_status(cwd: str | None = None) -> ToolResult:
    """Get git status, branch, and recent changes in one call."""
    try:
        work_dir = cwd or "."

        # Get branch
        branch_result = subprocess.run(
            ["git", "branch", "--show-current"],
            capture_output=True,
            text=True,
            cwd=work_dir,
            timeout=10,
        )
        branch = branch_result.stdout.strip() or "(detached)"

        # Get status (short format)
        status_result = subprocess.run(
            ["git", "status", "--short"],
            capture_output=True,
            text=True,
            cwd=work_dir,
            timeout=10,
        )
        status = status_result.stdout.strip() or "(clean)"

        # Get recent commits (last 3)
        log_result = subprocess.run(
            ["git", "log", "--oneline", "-3"],
            capture_output=True,
            text=True,
            cwd=work_dir,
            timeout=10,
        )
        recent = log_result.stdout.strip()

        output = f"Branch: {branch}\n\nStatus:\n{status}\n\nRecent commits:\n{recent}"
        return ToolResult(success=True, output=output)
    except Exception as e:
        return ToolResult(success=False, output="", error=str(e))


def execute_git_commit(
    message: str, files: str = ".", cwd: str | None = None
) -> ToolResult:
    """Stage files and commit in one operation."""
    try:
        work_dir = cwd or "."

        # Stage files
        add_result = subprocess.run(
            ["git", "add"] + files.split(),
            capture_output=True,
            text=True,
            cwd=work_dir,
            timeout=30,
        )
        if add_result.returncode != 0:
            return ToolResult(
                success=False, output="", error=f"git add failed: {add_result.stderr}"
            )

        # Commit
        commit_result = subprocess.run(
            ["git", "commit", "-m", message],
            capture_output=True,
            text=True,
            cwd=work_dir,
            timeout=30,
        )

        if commit_result.returncode != 0:
            if "nothing to commit" in commit_result.stdout.lower():
                return ToolResult(
                    success=True, output="[nothing to commit, working tree clean]"
                )
            return ToolResult(
                success=False,
                output="",
                error=f"git commit failed: {commit_result.stderr}",
            )

        # Get the commit hash
        output = commit_result.stdout.strip()
        return ToolResult(success=True, output=f"[committed]\n{output}")
    except Exception as e:
        return ToolResult(success=False, output="", error=str(e))


# =============================================================================
# Advanced Tools (Context Management, Code Intelligence, Safety)
# =============================================================================


def execute_think(thought: str, cwd: str | None = None) -> ToolResult:
    """
    Scratchpad for reasoning. Use to:
    - Plan multi-step operations before executing
    - Summarize what you've learned
    - Track decisions and why you made them

    This is FREE in terms of actions - use it to think clearly.
    Content is added to context but costs no tool execution.
    """
    # Simply echo back - this is for the model's benefit
    return ToolResult(success=True, output=f"[thought recorded - {len(thought)} chars]")


def execute_glob(pattern: str, cwd: str | None = None) -> ToolResult:
    """Find files matching a glob pattern (faster than grep for finding files)."""
    try:
        from pathlib import Path
        import fnmatch

        root = Path(cwd or ".")
        matches = []

        # Handle ** patterns
        if "**" in pattern:
            for path in root.rglob("*"):
                if path.is_file() and fnmatch.fnmatch(
                    str(path.relative_to(root)), pattern
                ):
                    matches.append(str(path.relative_to(root)))
        else:
            for path in root.glob(pattern):
                if path.is_file():
                    matches.append(str(path.relative_to(root)))

        matches.sort()

        if not matches:
            return ToolResult(success=True, output="[0 files matched]")

        truncated = False
        if len(matches) > 100:
            matches = matches[:100]
            truncated = True

        output = f"[{len(matches)} files]\n" + "\n".join(matches)
        if truncated:
            output += "\n... (truncated)"

        return ToolResult(success=True, output=output, truncated=truncated)
    except Exception as e:
        return ToolResult(success=False, output="", error=str(e))


def execute_diff(path: str, cwd: str | None = None) -> ToolResult:
    """Show unstaged changes for a file (or all files if path is '.')."""
    try:
        cmd = ["git", "diff"]
        if path and path != ".":
            cmd.append(path)

        result = subprocess.run(
            cmd, capture_output=True, text=True, timeout=30, cwd=cwd
        )

        diff = result.stdout.strip()
        if not diff:
            return ToolResult(success=True, output="[no changes]")

        lines = diff.split("\n")
        truncated = False
        if len(lines) > 100:
            diff = "\n".join(lines[:100]) + f"\n... ({len(lines) - 100} more lines)"
            truncated = True

        return ToolResult(success=True, output=diff, truncated=truncated)
    except Exception as e:
        return ToolResult(success=False, output="", error=str(e))


def execute_undo_change(path: str, cwd: str | None = None) -> ToolResult:
    """Discard unstaged changes to a file. Use if you made a mistake."""
    try:
        result = subprocess.run(
            ["git", "checkout", "--", path],
            capture_output=True,
            text=True,
            timeout=10,
            cwd=cwd,
        )

        if result.returncode != 0:
            return ToolResult(success=False, output="", error=result.stderr)

        return ToolResult(
            success=True, output=f"[restored {path} to last committed state]"
        )
    except Exception as e:
        return ToolResult(success=False, output="", error=str(e))


def execute_symbols(path: str, cwd: str | None = None) -> ToolResult:
    """
    Extract function/class definitions from a file.
    Returns a quick overview without reading the whole file.
    Works for Python, JavaScript, TypeScript, Shell, etc.
    """
    try:
        full_path = Path(cwd or ".") / path
        if not full_path.exists():
            return ToolResult(success=False, output="", error=f"File not found: {path}")

        content = full_path.read_text(encoding="utf-8", errors="replace")
        lines = content.split("\n")

        symbols = []
        ext = full_path.suffix.lower()

        for i, line in enumerate(lines, 1):
            stripped = line.strip()

            # Python
            if ext == ".py":
                if stripped.startswith("def ") or stripped.startswith("async def "):
                    symbols.append(f"L{i}: {stripped.split('(')[0]}()")
                elif stripped.startswith("class "):
                    symbols.append(f"L{i}: {stripped.split('(')[0].split(':')[0]}")

            # JavaScript/TypeScript
            elif ext in [".js", ".ts", ".jsx", ".tsx"]:
                if "function " in stripped or "=>" in stripped:
                    if stripped.startswith("function ") or stripped.startswith(
                        "export function "
                    ):
                        name = stripped.split("function ")[1].split("(")[0]
                        symbols.append(f"L{i}: function {name}()")
                    elif stripped.startswith("const ") and "=>" in stripped:
                        name = stripped.split("const ")[1].split("=")[0].strip()
                        symbols.append(f"L{i}: const {name} = () =>")
                elif stripped.startswith("class "):
                    symbols.append(f"L{i}: {stripped.split('{')[0].strip()}")

            # Shell
            elif ext in [".sh", ".bash"]:
                if "()" in stripped and "{" in stripped:
                    name = stripped.split("(")[0].strip()
                    symbols.append(f"L{i}: {name}()")
                elif stripped.endswith("() {"):
                    name = stripped.replace("() {", "").strip()
                    symbols.append(f"L{i}: {name}()")

        if not symbols:
            return ToolResult(success=True, output=f"[no symbols found in {path}]")

        return ToolResult(
            success=True,
            output=f"[{len(symbols)} symbols in {path}]\n" + "\n".join(symbols),
        )
    except Exception as e:
        return ToolResult(success=False, output="", error=str(e))


def execute_tool(name: str, arguments: dict, cwd: str | None = None) -> ToolResult:
    """Execute a tool by name."""
    if name == "bash":
        return execute_bash(arguments.get("command", ""), cwd=cwd)
    elif name == "read_file":
        return execute_read_file(arguments.get("path", ""), cwd=cwd)
    elif name == "head_file":
        return execute_head_file(
            arguments.get("path", ""), arguments.get("lines", 50), cwd=cwd
        )
    elif name == "read_lines":
        return execute_read_lines(
            arguments.get("path", ""),
            arguments.get("start", 1) - 1,  # Convert to 0-indexed
            arguments.get("end", -1),
            cwd=cwd,
        )
    elif name == "grep":
        return execute_grep(
            arguments.get("pattern", ""),
            arguments.get("path", "."),
            arguments.get("include", ""),
            arguments.get("context", 0),
            cwd=cwd,
        )
    elif name == "write_file":
        return execute_write_file(
            arguments.get("path", ""), arguments.get("content", ""), cwd=cwd
        )
    elif name == "patch_file":
        return execute_patch_file(
            arguments.get("path", ""),
            arguments.get("find", ""),
            arguments.get("replace", ""),
            cwd=cwd,
        )
    elif name == "list_dir":
        return execute_list_dir(
            arguments.get("path", "."),
            arguments.get("recursive", False),
            arguments.get("max_depth", 2),
            cwd=cwd,
        )
    elif name == "tail_file":
        return execute_tail_file(
            arguments.get("path", ""), arguments.get("lines", 20), cwd=cwd
        )
    elif name == "append_file":
        return execute_append_file(
            arguments.get("path", ""), arguments.get("content", ""), cwd=cwd
        )
    elif name == "git_status":
        return execute_git_status(cwd=cwd)
    elif name == "git_commit":
        return execute_git_commit(
            arguments.get("message", ""), arguments.get("files", "."), cwd=cwd
        )
    elif name == "think":
        return execute_think(arguments.get("thought", ""), cwd=cwd)
    elif name == "glob":
        return execute_glob(arguments.get("pattern", ""), cwd=cwd)
    elif name == "diff":
        return execute_diff(arguments.get("path", "."), cwd=cwd)
    elif name == "undo_change":
        return execute_undo_change(arguments.get("path", ""), cwd=cwd)
    elif name == "symbols":
        return execute_symbols(arguments.get("path", ""), cwd=cwd)
    else:
        return ToolResult(success=False, output="", error=f"Unknown tool: {name}")


# =============================================================================
# Context Management (prevent unbounded growth)
# =============================================================================


def summarize_old_tool_results(
    messages: list[dict], keep_recent: int = KEEP_RECENT_TURNS
) -> list[dict]:
    """
    Summarize old tool results to reduce token usage.
    Pattern from SWE-agent: Keep last N observations full, summarize older ones.
    """
    if len(messages) <= keep_recent + 2:  # system + user + recent
        return messages

    result = []
    # Find where recent messages start (from end)
    recent_start = len(messages) - keep_recent

    for i, msg in enumerate(messages):
        # Always keep system (0) and user prompt (1) unchanged
        if i < 2:
            result.append(msg)
            continue

        # Keep recent messages unchanged
        if i >= recent_start:
            result.append(msg)
            continue

        # Summarize old tool results
        if msg.get("role") == "tool":
            content = msg.get("content", "")
            lines = content.count("\n") + 1
            # Create short summary
            first_line = content.split("\n")[0][:80] if content else "(empty)"
            summary = f"[Tool output: {lines} lines] {first_line}..."
            result.append({**msg, "content": summary})
        else:
            result.append(msg)

    return result


def prune_messages(
    messages: list[dict], max_chars: int = MAX_CONTEXT_CHARS
) -> list[dict]:
    """
    Prune message history to stay under token limits.
    Strategy:
    1. First, summarize old tool results (keeps structure, reduces size)
    2. Always keep system message (index 0)
    3. Always keep original user prompt (index 1)
    4. Always keep last KEEP_RECENT_TURNS messages
    5. Drop middle messages only if still over limit
    """
    # First pass: summarize old tool results
    messages = summarize_old_tool_results(messages)
    if len(messages) <= 3:
        return messages

    # Calculate current size
    total_chars = sum(len(json.dumps(m)) for m in messages)

    if total_chars <= max_chars:
        return messages

    # Keep: system (0), user prompt (1), and last N messages
    keep_start = messages[:2]  # System + original prompt
    keep_end = (
        messages[-KEEP_RECENT_TURNS:]
        if len(messages) > KEEP_RECENT_TURNS + 2
        else messages[2:]
    )
    middle = (
        messages[2:-KEEP_RECENT_TURNS] if len(messages) > KEEP_RECENT_TURNS + 2 else []
    )

    # If still over limit, summarize middle section
    if middle:
        # Create a summary of what was done
        tool_calls_summary = []
        for m in middle:
            if m.get("role") == "assistant" and m.get("tool_calls"):
                for tc in m.get("tool_calls", []):
                    name = tc.get("function", {}).get("name", "?")
                    tool_calls_summary.append(name)
            elif m.get("role") == "tool":
                # Just note that a tool was called
                pass

        if tool_calls_summary:
            summary_msg = {
                "role": "assistant",
                "content": f"[Earlier in this session, I called these tools: {', '.join(tool_calls_summary[:20])}. Results were processed. Continuing with current task...]",
            }
            pruned = keep_start + [summary_msg] + keep_end
        else:
            pruned = keep_start + keep_end
    else:
        pruned = keep_start + keep_end

    # Log pruning
    new_chars = sum(len(json.dumps(m)) for m in pruned)
    print(
        f"  {Style.YELLOW}⚠ Pruned context: {total_chars:,} → {new_chars:,} chars ({len(messages)} → {len(pruned)} messages){Style.RESET}"
    )

    return pruned


def truncate_tool_result(result: str, max_chars: int = MAX_TOOL_RESULT_CHARS) -> str:
    """Truncate a tool result to prevent context explosion."""
    if len(result) <= max_chars:
        return result

    # Keep first part and last part
    keep_start = max_chars * 2 // 3
    keep_end = max_chars // 3

    return (
        result[:keep_start]
        + f"\n\n... [truncated {len(result) - max_chars:,} chars] ...\n\n"
        + result[-keep_end:]
    )


# =============================================================================
# Fat Context Loader (minimize API requests by pre-loading context)
# =============================================================================


def load_project_context(cwd: str | None = None) -> str:
    """
    Pre-load common context to reduce tool calls.
    This trades tokens for requests (good for Cerebras rate limits).
    """
    work_dir = Path(cwd or ".")
    context_parts = []

    # 1. Git status + branch + recent commits
    try:
        branch = (
            subprocess.run(
                ["git", "branch", "--show-current"],
                capture_output=True,
                text=True,
                cwd=work_dir,
                timeout=5,
            ).stdout.strip()
            or "(detached)"
        )

        status = (
            subprocess.run(
                ["git", "status", "--short"],
                capture_output=True,
                text=True,
                cwd=work_dir,
                timeout=5,
            ).stdout.strip()
            or "(clean)"
        )

        log = subprocess.run(
            ["git", "log", "--oneline", "-5"],
            capture_output=True,
            text=True,
            cwd=work_dir,
            timeout=5,
        ).stdout.strip()

        context_parts.append(f"""## Git Status
Branch: {branch}
Status:
{status}

Recent commits:
{log}""")
    except Exception:
        pass

    # 2. Directory tree (top level + key directories)
    try:
        tree_lines = []
        for item in sorted(work_dir.iterdir()):
            if item.name.startswith(".") and item.name not in [".verify"]:
                continue
            if item.is_dir():
                tree_lines.append(f"  {item.name}/")
                # Show one level deep for key dirs
                if item.name in ["workers", "skills", "templates", "src", "lib"]:
                    try:
                        for sub in sorted(item.iterdir())[:10]:
                            tree_lines.append(
                                f"    {sub.name}{'/' if sub.is_dir() else ''}"
                            )
                    except Exception:
                        pass
            else:
                size = item.stat().st_size
                tree_lines.append(f"  {item.name} ({size:,}B)")

        context_parts.append(f"""## Directory Structure
{chr(10).join(tree_lines[:50])}""")
    except Exception:
        pass

    # 3. Verifier status
    verify_file = work_dir / ".verify" / "latest.txt"
    if verify_file.exists():
        try:
            content = verify_file.read_text()[:2000]
            context_parts.append(f"""## Verifier Status (.verify/latest.txt)
{content}""")
        except Exception:
            pass

    # 4. IMPLEMENTATION_PLAN.md (first 100 lines or up to current task)
    plan_file = work_dir / "IMPLEMENTATION_PLAN.md"
    if not plan_file.exists():
        plan_file = work_dir / "workers" / "ralph" / "IMPLEMENTATION_PLAN.md"

    if plan_file.exists():
        try:
            content = plan_file.read_text()
            lines = content.split("\n")
            # Find unchecked tasks
            preview_lines = []
            found_unchecked = False
            for i, line in enumerate(lines[:150]):
                preview_lines.append(line)
                if "- [ ]" in line and not found_unchecked:
                    found_unchecked = True
                    # Include a few more lines after first unchecked task
                    preview_lines.extend(lines[i + 1 : i + 10])
                    break

            context_parts.append(f"""## Implementation Plan
{chr(10).join(preview_lines)}""")
        except Exception:
            pass

    # 5. THUNK.md (last 20 lines - recent completions)
    thunk_file = work_dir / "THUNK.md"
    if not thunk_file.exists():
        thunk_file = work_dir / "workers" / "ralph" / "THUNK.md"

    if thunk_file.exists():
        try:
            lines = thunk_file.read_text().split("\n")
            tail = lines[-20:] if len(lines) > 20 else lines
            context_parts.append(f"""## Recent Completions (THUNK.md tail)
{chr(10).join(tail)}""")
        except Exception:
            pass

    # 6. AGENTS.md (if exists, first 50 lines)
    agents_file = work_dir / "AGENTS.md"
    if not agents_file.exists():
        agents_file = work_dir / "workers" / "ralph" / "AGENTS.md"

    if agents_file.exists():
        try:
            lines = agents_file.read_text().split("\n")[:50]
            context_parts.append(f"""## Project Guidelines (AGENTS.md)
{chr(10).join(lines)}""")
        except Exception:
            pass

    if context_parts:
        return "\n\n---\n\n".join(context_parts)
    return ""


# =============================================================================
# Cerebras API Client
# =============================================================================


@dataclass
class TokenUsage:
    """Track token usage across requests."""

    prompt_tokens: int = 0
    completion_tokens: int = 0
    total_requests: int = 0

    def add(self, usage: dict):
        self.prompt_tokens += usage.get("prompt_tokens", 0)
        self.completion_tokens += usage.get("completion_tokens", 0)
        self.total_requests += 1

    @property
    def total(self) -> int:
        return self.prompt_tokens + self.completion_tokens

    def print_summary(self):
        """Print formatted token usage summary."""
        print_header("Token Usage", Style.CYAN)
        print(f"  {Style.DIM}Prompt tokens:{Style.RESET}     {self.prompt_tokens:,}")
        print(
            f"  {Style.DIM}Completion tokens:{Style.RESET} {self.completion_tokens:,}"
        )
        print(
            f"  {Style.DIM}Total tokens:{Style.RESET}      {Style.BOLD}{self.total:,}{Style.RESET}"
        )
        print(f"  {Style.DIM}API requests:{Style.RESET}      {self.total_requests}")
        print_divider()


class CerebrasClient:
    """Cerebras API client with rate limiting and streaming support."""

    def __init__(self, api_key: str):
        self.api_key = api_key
        self.usage = TokenUsage()

    def _make_request(
        self, payload: dict, stream: bool = False
    ) -> dict | Iterator[dict]:
        """Make API request with retry logic."""
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

        if stream:
            payload["stream"] = True

        backoff = INITIAL_BACKOFF

        for attempt in range(MAX_RETRIES):
            try:
                if HAS_REQUESTS:
                    response = requests.post(
                        CEREBRAS_API_URL,
                        headers=headers,
                        json=payload,
                        timeout=180,
                        stream=stream,
                    )

                    if response.status_code == 429:
                        retry_after = int(response.headers.get("Retry-After", backoff))
                        wait_time = min(retry_after, MAX_BACKOFF)
                        print(
                            f"\n  {Style.YELLOW}⏳ Rate limited. Waiting {wait_time}s (attempt {attempt + 1}/{MAX_RETRIES}){Style.RESET}"
                        )
                        time.sleep(wait_time)
                        backoff = min(backoff * 2, MAX_BACKOFF)
                        continue

                    response.raise_for_status()

                    if stream:
                        return self._stream_response(response)
                    return response.json()

                else:
                    # Fallback to urllib (no streaming)
                    req = urllib.request.Request(
                        CEREBRAS_API_URL,
                        data=json.dumps(payload).encode("utf-8"),
                        headers=headers,
                        method="POST",
                    )
                    try:
                        with urllib.request.urlopen(req, timeout=180) as resp:
                            return json.loads(resp.read().decode("utf-8"))
                    except urllib.error.HTTPError as e:
                        if e.code == 429:
                            wait_time = min(backoff, MAX_BACKOFF)
                            print(
                                f"\n  {Style.YELLOW}⏳ Rate limited. Waiting {wait_time}s{Style.RESET}"
                            )
                            time.sleep(wait_time)
                            backoff = min(backoff * 2, MAX_BACKOFF)
                            continue
                        raise

            except Exception as e:
                if attempt < MAX_RETRIES - 1:
                    print(
                        f"\n  {Style.YELLOW}⚠ API error: {e}. Retrying in {backoff}s{Style.RESET}"
                    )
                    time.sleep(backoff)
                    backoff = min(backoff * 2, MAX_BACKOFF)
                else:
                    raise

        raise Exception("Max retries exceeded")

    def _stream_response(self, response) -> Iterator[dict]:
        """Stream SSE response chunks."""
        for line in response.iter_lines():
            if line:
                line = line.decode("utf-8")
                if line.startswith("data: "):
                    data = line[6:]
                    if data == "[DONE]":
                        break
                    try:
                        yield json.loads(data)
                    except json.JSONDecodeError:
                        continue

    def chat(
        self,
        messages: list[dict],
        model: str = DEFAULT_MODEL,
        tools: list[dict] | None = None,
        stream: bool = False,
    ) -> dict:
        """Send chat completion request."""
        payload = {
            "model": model,
            "messages": messages,
            "max_tokens": DEFAULT_MAX_TOKENS,
            "temperature": DEFAULT_TEMPERATURE,
        }

        if tools:
            payload["tools"] = tools
            payload["tool_choice"] = "auto"

        result = self._make_request(payload, stream=stream)

        # Handle streaming
        if stream:
            return self._collect_stream(result)

        # Track usage
        if "usage" in result:
            self.usage.add(result["usage"])

        return result

    def _collect_stream(self, chunks: Iterator[dict]) -> dict:
        """Collect streamed chunks into final response."""
        content = ""
        tool_calls = []
        usage = {}

        for chunk in chunks:
            if "usage" in chunk:
                usage = chunk["usage"]

            delta = chunk.get("choices", [{}])[0].get("delta", {})

            if "content" in delta and delta["content"]:
                content += delta["content"]
                print(delta["content"], end="", flush=True)

            if "tool_calls" in delta:
                for tc in delta["tool_calls"]:
                    idx = tc.get("index", 0)
                    while len(tool_calls) <= idx:
                        tool_calls.append(
                            {"id": "", "function": {"name": "", "arguments": ""}}
                        )

                    if "id" in tc:
                        tool_calls[idx]["id"] = tc["id"]
                    if "function" in tc:
                        if "name" in tc["function"]:
                            tool_calls[idx]["function"]["name"] = tc["function"]["name"]
                        if "arguments" in tc["function"]:
                            tool_calls[idx]["function"]["arguments"] += tc["function"][
                                "arguments"
                            ]

        if content:
            print()  # Newline after streaming

        if usage:
            self.usage.add(usage)

        # Reconstruct response format
        message = {"role": "assistant", "content": content or None}
        if tool_calls:
            message["tool_calls"] = [
                {"id": tc["id"], "type": "function", "function": tc["function"]}
                for tc in tool_calls
                if tc["id"]
            ]

        return {"choices": [{"message": message, "finish_reason": "stop"}]}


# =============================================================================
# Agent Loop
# =============================================================================


class Agent:
    """Cerebras-powered agentic loop with RovoDev-style output."""

    def __init__(
        self,
        client: CerebrasClient,
        model: str = DEFAULT_MODEL,
        cwd: str | None = None,
        stream: bool = True,
    ):
        self.client = client
        self.model = model
        self.cwd = cwd or os.getcwd()
        self.stream = stream
        self.messages: list[dict] = []

    def _print_tool_call(self, name: str, args: dict):
        """Print tool call in RovoDev style."""
        print(f"  {Style.CYAN}⬢{Style.RESET} Called {Style.BOLD}{name}{Style.RESET}:")
        for key, value in args.items():
            if isinstance(value, str) and len(value) > 80:
                value = truncate(value, 80)
            print(
                f"      {Style.DIM}•{Style.RESET} {key}: {Style.DIM}{repr(value)}{Style.RESET}"
            )

    def _print_tool_result(self, name: str, result: ToolResult):
        """Print tool result in RovoDev style."""
        if result.error:
            print(f"\n  {Style.RED}✗ {name} failed:{Style.RESET} {result.error}")
        else:
            # Show abbreviated output
            output = result.output
            lines = output.split("\n")

            # Always show first line (usually the summary like "[50 matches]")
            if lines:
                print(f"\n  {Style.GREEN}{lines[0]}{Style.RESET}")

            # Show preview of content (limited lines)
            if len(lines) > 1:
                preview_lines = lines[1:12]  # Show up to 10 content lines
                for line in preview_lines:
                    # Indent and truncate long lines
                    display = truncate(line, TERM_WIDTH - 4)
                    print(f"  {Style.DIM}{display}{Style.RESET}")

                if len(lines) > 12:
                    remaining = len(lines) - 12
                    print(f"  {Style.DIM}... ({remaining} more lines){Style.RESET}")

    def _execute_tool_calls(self, tool_calls: list[dict]) -> list[dict]:
        """Execute tool calls and return results."""
        results = []

        for tc in tool_calls:
            func = tc.get("function", {})
            name = func.get("name", "")

            try:
                args = json.loads(func.get("arguments", "{}"))
            except json.JSONDecodeError:
                args = {}

            self._print_tool_call(name, args)
            result = execute_tool(name, args, cwd=self.cwd)
            self._print_tool_result(name, result)

            # Format result for API (truncate to prevent context explosion)
            result_content = (
                result.output if result.success else f"ERROR: {result.error}"
            )
            result_content = truncate_tool_result(result_content)

            results.append(
                {
                    "role": "tool",
                    "tool_call_id": tc.get("id", ""),
                    "content": result_content,
                }
            )

        return results

    def run(self, prompt: str, max_turns: int = DEFAULT_MAX_TURNS) -> bool:
        """Run the agent loop."""

        # Load fat context to minimize tool calls (trades tokens for requests)
        print(f"  {Style.DIM}Loading project context...{Style.RESET}")
        project_context = load_project_context(self.cwd)

        # Combine system prompt with pre-loaded context
        full_system_prompt = SYSTEM_PROMPT
        if project_context:
            full_system_prompt += (
                f"\n\n# PRE-LOADED PROJECT CONTEXT\n\n{project_context}"
            )

        # Initialize with system prompt (including context) and user prompt
        self.messages = [
            {"role": "system", "content": full_system_prompt},
            {"role": "user", "content": prompt},
        ]

        # Print startup banner
        print_header("Cerebras Agent", Style.BRIGHT_CYAN)
        print(f"  {Style.DIM}Model:{Style.RESET}    {self.model}")
        print(f"  {Style.DIM}Max turns:{Style.RESET} {max_turns}")
        print(f"  {Style.DIM}Workdir:{Style.RESET}  {self.cwd}")
        print(
            f"  {Style.DIM}Context:{Style.RESET}  {len(project_context):,} chars pre-loaded"
        )
        print_divider()

        for turn in range(1, max_turns + 1):
            # Prune context if it's getting too large (prevent 800K token disasters)
            self.messages = prune_messages(self.messages)

            # Log turn info with context size
            msg_chars = sum(len(json.dumps(m)) for m in self.messages)
            print(
                f"\n{Style.GRAY}{'─' * 3} Turn {turn}/{max_turns} "
                f"(context: {msg_chars:,} chars) {'─' * (TERM_WIDTH - 40)}{Style.RESET}"
            )

            try:
                response = self.client.chat(
                    messages=self.messages,
                    model=self.model,
                    tools=TOOLS,
                    stream=self.stream,
                )
            except Exception as e:
                print(f"\n{Style.RED}✗ API Error: {e}{Style.RESET}")
                self.client.usage.print_summary()
                return False

            message = response.get("choices", [{}])[0].get("message", {})
            content = message.get("content") or ""
            tool_calls = message.get("tool_calls", [])

            # Print response header
            if not self.stream and content:
                print_header("Response", Style.BRIGHT_GREEN)
                # Word wrap content
                words = content.split()
                line = ""
                for word in words:
                    if len(line) + len(word) + 1 > TERM_WIDTH - 2:
                        print(line)
                        line = word
                    else:
                        line = f"{line} {word}" if line else word
                if line:
                    print(line)
                print_divider()

            # Handle tool calls
            if tool_calls:
                if not content:
                    print_header(f"Tool Calls ({len(tool_calls)})", Style.CYAN)

                # Add assistant message to history
                self.messages.append(message)

                # Execute tools and add results
                tool_results = self._execute_tool_calls(tool_calls)
                self.messages.extend(tool_results)

            elif content:
                # No tool calls, just content
                self.messages.append({"role": "assistant", "content": content})

                # Check for completion signal
                if re.search(
                    r":::BUILD_READY:::|:::PLAN_READY:::|:::COMPLETE:::", content
                ):
                    print(
                        f"\n{Style.BRIGHT_GREEN}✓ Agent signaled completion{Style.RESET}"
                    )
                    self.client.usage.print_summary()
                    return True
            else:
                print(f"\n{Style.YELLOW}⚠ Empty response{Style.RESET}")
                self.messages.append({"role": "assistant", "content": "(no response)"})

            # Check if we should stop
            finish_reason = response.get("choices", [{}])[0].get("finish_reason", "")
            if finish_reason == "stop" and not tool_calls and content:
                if not content.strip().endswith("?"):
                    print(f"\n{Style.BRIGHT_GREEN}✓ Agent completed{Style.RESET}")
                    self.client.usage.print_summary()
                    return True

        print(f"\n{Style.YELLOW}⚠ Max turns ({max_turns}) reached{Style.RESET}")
        self.client.usage.print_summary()
        return False


# =============================================================================
# Main Entry Point
# =============================================================================


def main():
    parser = argparse.ArgumentParser(
        description="Cerebras Agentic Runner for Ralph",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python3 cerebras_agent.py -p prompt.md -m zai-glm-4.7
  python3 cerebras_agent.py -p prompt.md -m llama-4-scout-17b -t 30
  python3 cerebras_agent.py -p prompt.md --no-stream

Models (Cerebras-optimized):
  zai-glm-4.7            GLM 4.7 - Strong coding model (default)
  llama-4-scout-17b      Llama 4 Scout - Fast, good for most tasks
  llama-4-maverick-17b   Llama 4 Maverick - More capable
  llama3.1-8b            Llama 3.1 8B - Fastest, simple tasks
  llama3.1-70b           Llama 3.1 70B - Most capable Llama
  qwen-3-32b             Qwen 3 32B - Good reasoning

Environment:
  CEREBRAS_API_KEY       Your API key from cloud.cerebras.ai
        """,
    )

    parser.add_argument("-p", "--prompt", required=True, help="Path to prompt file")
    parser.add_argument(
        "-m", "--model", default=DEFAULT_MODEL, help=f"Model (default: {DEFAULT_MODEL})"
    )
    parser.add_argument(
        "-t",
        "--max-turns",
        type=int,
        default=DEFAULT_MAX_TURNS,
        help=f"Max turns (default: {DEFAULT_MAX_TURNS})",
    )
    parser.add_argument("-c", "--cwd", default=None, help="Working directory")
    parser.add_argument(
        "-o", "--output", default=None, help="Output file for transcript"
    )
    parser.add_argument(
        "--no-stream",
        action="store_true",
        help="Disable streaming (show full responses)",
    )

    args = parser.parse_args()

    # Check API key
    api_key = os.environ.get("CEREBRAS_API_KEY")
    if not api_key:
        print(f"{Style.RED}✗ CEREBRAS_API_KEY not set{Style.RESET}")
        print("  Get your key at: https://cloud.cerebras.ai")
        sys.exit(1)

    # Read prompt
    prompt_path = Path(args.prompt)
    if not prompt_path.exists():
        print(f"{Style.RED}✗ Prompt not found: {args.prompt}{Style.RESET}")
        sys.exit(1)

    prompt = prompt_path.read_text(encoding="utf-8")

    # Setup output tee if requested
    original_stdout = sys.stdout
    output_file = None

    if args.output:

        class TeeWriter:
            def __init__(self, *writers):
                self.writers = writers

            def write(self, data):
                for w in self.writers:
                    w.write(data)
                    w.flush()

            def flush(self):
                for w in self.writers:
                    w.flush()

        output_file = open(args.output, "w", encoding="utf-8")
        sys.stdout = TeeWriter(original_stdout, output_file)

    try:
        # Create client and agent
        client = CerebrasClient(api_key)
        agent = Agent(
            client=client, model=args.model, cwd=args.cwd, stream=not args.no_stream
        )

        # Run agent
        success = agent.run(prompt, max_turns=args.max_turns)
        sys.exit(0 if success else 1)

    finally:
        if output_file:
            sys.stdout = original_stdout
            output_file.close()


if __name__ == "__main__":
    main()
