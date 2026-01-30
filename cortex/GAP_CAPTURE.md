# Gap Capture - PROJECT_NAME

Local gap capture for this project. Gaps are synced to brain's `skills/self-improvement/GAP_BACKLOG.md` via marker file protocol.

## How It Works

1. **Capture:** When you discover a knowledge gap, add it below using the format
2. **Mark:** Create `.gap_pending` marker: `touch cortex/.gap_pending`
3. **Sync:** Brain's Cortex detects pending gaps and runs `sync_gaps.sh`
4. **Clear:** After sync, this file is cleared and marker removed

## Format

```markdown
### YYYY-MM-DD HH:MM — <Suggested Skill Name>
- **Type:** Knowledge / Procedure / Tooling / Pattern / Debugging / Reference
- **Why useful:** <1–2 lines>
- **When triggered:** <what you were trying to do>
- **Evidence:** <paths, filenames, snippets, observations>
- **Priority:** P0 / P1 / P2
- **Project:** PROJECT_NAME
```

## Captured Gaps

<!-- Add new gap entries below this line -->
