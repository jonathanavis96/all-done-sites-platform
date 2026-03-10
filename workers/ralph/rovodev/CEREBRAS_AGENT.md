# Cerebras Agent for Ralph

## Quick Start

```bash
# Set your API key
export CEREBRAS_API_KEY='your-key-here'  # pragma: allowlist secret

# Using ralph.sh shortcut
ralph --runner cerebras --model zai-glm-4.7 -i20 -p5

# Using loop.sh directly
bash loop.sh --runner cerebras --model glm --iterations 5 --plan-every 99
```text

## Models

| Shortcut | Model ID | Notes |
|----------|----------|-------|
| `glm` | `zai-glm-4.7` | **Default** - Strong coding model |
| `llama4` | `llama-4-scout-17b` | Fast, good for most tasks |
| `qwen` | `qwen-3-32b` | Good reasoning |
| `llama3` | `llama3.1-8b` | Fastest, simple tasks |

## 17 Tools

**Discovery** - Find before you read

| Tool | Use For |
|------|---------|
| `glob` | Find files by pattern (`**/*.py`) |
| `symbols` | List functions/classes (quick overview) |
| `grep` | Search content in files |
| `list_dir` | Directory structure |

**Reading** - Most → least specific

| Tool | Use For |
|------|---------|
| `read_lines` | Specific line range (after grep/symbols) |
| `head_file` | First N lines |
| `tail_file` | Last N lines (logs, THUNK.md) |
| `read_file` | Entire file (small files only) |

**Writing** - Most → least efficient

| Tool | Use For |
|------|---------|
| `patch_file` | Find/replace (best for edits) |
| `append_file` | Add to end (logs, THUNK.md) |
| `write_file` | Full rewrite (new files) |

**Git** - Combined operations

| Tool | Use For |
|------|---------|
| `git_status` | Branch + status + log in ONE call |
| `git_commit` | Stage + commit in ONE call |
| `diff` | Preview changes before commit |
| `undo_change` | Discard mistakes |

### Meta

| Tool | Use For |
|------|---------|
| `think` | Scratchpad for planning (free!) |
| `bash` | Everything else |

## Token-Efficient Workflow

```text
think → glob → symbols → grep → read_lines → patch_file → diff → git_commit
```text

1. **Plan** what you need to do
2. **Find** files with glob
3. **Overview** with symbols (don't read whole file)
4. **Search** for exact lines with grep
5. **Read** only those lines
6. **Patch** minimal changes
7. **Verify** with diff
8. **Commit**

## Output Format

```text
──────────────────────────────── Cerebras Agent ────────────────────────────────
  Model:    zai-glm-4.7
  Max turns: 25
────────────────────────────────────────────────────────────────────────────────

─── Turn 1/25 ──────────────────────────────────────────────────────────────────

──────────────────────────────── Tool Calls (2) ────────────────────────────────
  ⬢ Called grep:
      • pattern: 'def main'
      • path: '.'

  [3 matches]
  cerebras_agent.py:450:def main():

───────────────────────────────── Token Usage ──────────────────────────────────
  Prompt tokens:     12,345
  Completion tokens: 2,456
  Total tokens:      14,801
────────────────────────────────────────────────────────────────────────────────
```text

## Rate Limits

The agent handles 429 errors automatically with exponential backoff (5s → 10s → 20s → 40s → 60s max).

## Files

- `cerebras_agent.py` - The agent implementation
- `loop.sh` - Calls the agent with `--runner cerebras`
