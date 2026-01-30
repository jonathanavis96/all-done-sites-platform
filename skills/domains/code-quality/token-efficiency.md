# Token Efficiency Skill

## Purpose

Minimize tool calls per iteration to save tokens and time. Target: <20 tool calls per iteration.

---

## Quick Reference

| Category | Anti-Pattern (DON'T) | Best Practice (DO) |
| -------- | -------------------- | ----------------- |
| **Duplicate Commands** | Running `cat .verify/latest.txt` 3 times | Read ONCE at start, cache result mentally |
| **Known Values** | Running `pwd`, `git branch` repeatedly | Known from header - never run |
| **File Content** | Opening same file multiple times | Read ONCE, remember content |
| **Multi-File Search** | `grep pattern file1`, `grep pattern file2`, `grep pattern file3` (3 calls) | `grep pattern file1 file2 file3` (1 call) |
| **Sequential Checks** | `shellcheck file1.sh`, `shellcheck file2.sh` (2 calls) | `shellcheck file1.sh file2.sh` (1 call) |
| **Git Operations** | `git add file`, `git status`, `git add file`, `git commit` | `git add -A && git commit -m "msg"` (1 call) |
| **Context Gathering** | Running `tail workers/ralph/THUNK.md` multiple times | Get next number ONCE |
| **Formatting** | Running `shfmt -i 2`, `shfmt -w`, `shfmt -ci` variants | Run ONCE with correct flags |

**Rule:** If you ran a command and got the result, you HAVE that information. Don't run it again.

---

## Common Traps (from actual Ralph logs)

| Trap | Seen | Fix |
| ------ | ------ | ----- |
| Reading `.verify/latest.txt` multiple times | 64x | Verifier status injected in header - never read file |
| Running `pwd`/`git branch` repeatedly | 38x | Known from header - never run |
| Checking `tail workers/ralph/THUNK.md` multiple times | 22x | Get next number ONCE |
| Same grep pattern on different calls | 100+ | Combine: `grep pattern file1 file2 file3` |
| Checking same file repeatedly | 80+ | Read ONCE, remember content |
| Opening large plan files at startup | 45+ | Use grep then slice, never open full file |

---

## DO

- **Batch independent calls** - If you need to check 3 files, do it in ONE bash call:

  ```bash
  cat file1 && cat file2 && cat file3
  ```

- **Cache results mentally** - If you ran `ls templates/ralph/`, don't run it again in the same iteration
- **Use grep -l for multi-file search** - One call instead of checking each file
- **Combine checks** - `shellcheck file1.sh file2.sh file3.sh` not 3 separate calls

---

## DON'T

- Run the same command twice (you already have the result!)
- Check the same file multiple times
- Run `pwd` repeatedly (you know where you are)
- Use multiple `sed -n 'Xp'` calls - use one range: `sed -n '23,49p'`

---

## Examples

**BAD (6 calls):**

```bash
grep -c pattern file1
grep -c pattern file2  
grep -c pattern file3
diff file1 template1
diff file2 template2
diff file3 template3
```text

**GOOD (2 calls):**

```bash
grep -c pattern file1 file2 file3
diff file1 template1 && diff file2 template2 && diff file3 template3
```

## See Also

- **[Ralph Patterns](../ralph/ralph-patterns.md)** - Ralph loop architecture and subagent execution flow
- **[Bulk Edit Patterns](bulk-edit-patterns.md)** - Efficient bulk editing strategies to minimize tool calls
- **[Cache Debugging](../ralph/cache-debugging.md)** - Cache troubleshooting and optimization
- **[Code Hygiene](code-hygiene.md)** - Definition of Done checklist and quality gatestext
