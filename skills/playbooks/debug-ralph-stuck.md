# Debug Ralph Stuck

## Goal

Systematically diagnose and resolve Ralph loop issues when Ralph is not progressing, experiencing repeated failures, or appears stuck in an infinite loop.

## When to Use

Use this playbook when you observe:

- **Symptom 1:** Ralph loop has been running for >30 minutes without commits
- **Symptom 2:** Same error repeating in consecutive iterations
- **Symptom 3:** Lock file exists but no Ralph process is running
- **Symptom 4:** Ralph outputs `:::BUILD_READY:::` but verifier never runs
- **Symptom 5:** Loop runs but never outputs `:::COMPLETE:::`

## Prerequisites

Before starting, ensure you have:

- **Tools:** `bash`, `ps`, `tail`, `grep`, `git`
- **Files:** Access to `workers/ralph/` directory and `.verify/` folder
- **Permissions:** Read access to log files, write access if cleanup needed
- **Knowledge:** Basic understanding of Ralph loop architecture (see [Ralph Patterns](../domains/ralph/ralph-patterns.md))

## Steps

### Step 1: Check Ralph Process Status

**Action:** Determine if Ralph is actually running or just appears stuck.

- Check for running Ralph processes:

  ```bash
  ps aux | grep "[l]oop.sh"
  ```

- Check for lock file:

  ```bash
  ls -la /tmp/ralph-brain-*.lock
  cat /tmp/ralph-brain-*.lock  # Shows PID and timestamp
  ```

- Verify the PID in lock file matches a running process:

  ```bash
  ps -p <PID_FROM_LOCK_FILE>
  ```

**Decision Point:**

- **If lock file exists but process is dead:** → Go to Step 2 (Stale Lock Cleanup)
- **If process is running:** → Go to Step 3 (Check Progress)
- **If no lock and no process:** → Ralph isn't running, investigate why

**Checkpoint:** ✓ You know whether Ralph is actually running or just has stale artifacts

### Step 2: Clean Up Stale Lock

**Action:** Remove stale lock file to allow new Ralph run.

- Verify the PID in the lock file is truly dead:

  ```bash
  cat /tmp/ralph-brain-*.lock
  ps -p <PID>  # Should show "no such process"
  ```

- Remove the stale lock:

  ```bash
  rm /tmp/ralph-brain-*.lock
  ```

- Restart Ralph:

  ```bash
  cd ~/code/brain/workers/ralph
  bash loop.sh
  ```

**Anti-pattern:** ❌ Don't delete lock file while Ralph is actually running. Instead: ✅ Verify PID is dead first.

**Checkpoint:** ✓ Stale lock removed, new Ralph run started successfully

### Step 3: Check Recent Log Activity

**Action:** Examine the most recent log file to see what Ralph is doing.

- Find the latest log:

  ```bash
  cd ~/code/brain/workers/ralph/logs
  ls -lt iter*.log | head -5
  tail -100 iter_XXX_build.log  # or iter_XXX_plan.log
  ```

- Look for these patterns:

  ```text
  # Good signs (Ralph is working):
  "PROGRESS | phase=build | step=..."
  ":::BUILD_READY:::"
  "Running verifier..."
  
  # Bad signs (Ralph is stuck):
  Same error repeated 3+ times
  No new output in last 5+ minutes
  Traceback or exception at end
  "Rate limit" or "timeout" errors
  ```

**Decision Point:**

- **If log shows repeated errors:** → Go to Step 4 (Categorize Error Type)
- **If log shows fresh activity (< 5 min old):** → Ralph is working, wait longer
- **If log is stale (> 30 min old):** → Ralph crashed, check system resources

**Checkpoint:** ✓ You've identified whether Ralph is progressing or truly stuck

### Step 4: Categorize the Error Type

**Action:** Identify the category of failure to route to the appropriate fix.

Common error patterns:

| Error Pattern | Category | Next Step |
| ------------- | -------- | --------- |
| `Protected.1`, `Protected.2` failures | Hash guard violation | Step 5a (Protected Files) |
| `[FAIL] Hygiene.Shellcheck.X` | Code quality issue | Step 5b (Verifier Failures) |
| `bash: command not found` | Environment/dependency | Step 5c (Environment Issues) |
| `git push` failures | Remote sync issue | Step 5d (Git Issues) |
| `Rate limit exceeded` | API throttling | Step 5e (Rate Limits) |
| Same task repeated 5+ times | Logic loop | Step 5f (Logic Loops) |

**Link to skill:** [Ralph Patterns](../domains/ralph/ralph-patterns.md) - Troubleshooting section has detailed error patterns

**Checkpoint:** ✓ You've categorized the error type

### Step 5a: Handle Protected File Changes

**Action:** Resolve protected file hash mismatches.

- Check verifier output in the log:

  ```bash
  grep "Protected\." logs/iter_*_build.log | tail -10
  ```

- **These CANNOT be fixed by agents:**
  - `Protected.1`, `Protected.2`, `Protected.3`, `Protected.4`
  - These indicate `.verify/*.sha256` files are out of sync

- **Solution:** Output `:::HUMAN_REQUIRED:::` with details and move to next task

**Anti-pattern:** ❌ Don't attempt to modify `.verify/*.sha256` files. Instead: ✅ Mark as human-required and skip.

**Link to skill:** [Resolve Verifier Failures](./resolve-verifier-failures.md) - Protected file handling

### Step 5b: Handle Verifier Failures

**Action:** Fix code quality issues blocking progress.

- Read the verifier status from the injected header (already in context)
- Identify the failing rule (e.g., `Hygiene.Shellcheck.2`)
- Apply the appropriate fix:

  ```bash
  # For ShellCheck issues:
  shellcheck workers/ralph/file.sh
  # Fix reported issues
  
  # For Markdown issues:
  markdownlint skills/path/to/file.md
  # Fix reported issues
  ```

- **Link to playbooks:**
  - [Fix ShellCheck Failures](./fix-shellcheck-failures.md)
  - [Fix Markdown Lint](./fix-markdown-lint.md)
  - [Resolve Verifier Failures](./resolve-verifier-failures.md)

**Checkpoint:** ✓ Verifier failures fixed and committed

### Step 5c: Handle Environment Issues

**Action:** Fix missing dependencies or environment problems.

- Check for missing commands:

  ```bash
  which shellcheck markdownlint git rg
  ```

- Check file permissions:

  ```bash
  ls -la workers/ralph/loop.sh
  # Should be: -rwxr-xr-x (executable)
  ```

- Fix permissions if needed:

  ```bash
  chmod +x workers/ralph/loop.sh
  chmod +x workers/ralph/verifier.sh
  ```

**Decision Point:** If core tools are missing, escalate to human for environment setup.

### Step 5d: Handle Git Issues

**Action:** Resolve git push/pull failures.

- Check git status:

  ```bash
  cd ~/code/brain
  git status
  git log --oneline -5
  ```

- Common issues:

  ```bash
  # Diverged branches:
  git pull --rebase origin brain-work
  
  # Authentication failure:
  git remote -v  # Check remote URL
  
  # Merge conflicts:
  git status  # Shows conflicted files
  # Resolve conflicts, then:
  git add -A && git rebase --continue
  ```

**Anti-pattern:** ❌ Don't use `git push --force` unless explicitly instructed. Instead: ✅ Use `git pull --rebase` to sync.

### Step 5e: Handle Rate Limits

**Action:** Wait for rate limit to reset or reduce frequency.

- Check for rate limit errors in logs:

  ```bash
  grep -i "rate limit" logs/iter_*_build.log
  ```

- **Solutions:**
  - Wait 60 seconds and retry
  - Check if `CACHE_SKIP=1` is set (disables cache, causes more API calls)
  - Verify cache is working: `ls -la artifacts/rollflow_cache/cache.sqlite`

**Link to skill:** [Cache Debugging](../domains/ralph/cache-debugging.md) - Cache troubleshooting patterns

### Step 5f: Handle Logic Loops

**Action:** Break out of infinite task loops.

- Identify the repeating task:

  ```bash
  grep "PROGRESS" logs/iter_*_build.log | tail -20
  ```

- Common causes:
  - Task marked `[ ]` but never marked `[x]` after completion
  - Same error occurring repeatedly without fix
  - Task depends on unavailable resource

- **Solutions:**
  - Manually mark task `[x]` in `workers/workers/IMPLEMENTATION_PLAN.md` if actually complete
  - Add troubleshooting context to `THOUGHTS.md`
  - Request waiver if verifier check is false positive
  - Skip to next task if blocked

**Decision Point:** If same task fails 3+ times with no progress, skip it and note in commit message.

### Step 6: Verify Resolution

**Action:** Confirm Ralph is now progressing normally.

- Check that Ralph advances past the stuck point:

  ```bash
  tail -f logs/iter_*_build.log
  # Should show new PROGRESS lines
  ```

- Verify commits are being created:

  ```bash
  git log --oneline -5
  # Should show new commits with timestamps
  ```

- Check verifier is passing:

  ```bash
  grep "SUMMARY" workers/ralph/.verify/latest.txt
  # Should show PASS count increasing
  ```

**Checkpoint:** ✓ Ralph is making forward progress with new commits

### Step 7: Document and Clean Up

**Action:** Record the issue and resolution for future reference.

- Add entry to `workers/ralph/workers/ralph/THUNK.md` if you manually intervened
- Clean up any temporary debug files
- If this was a novel issue, consider adding to `skills/self-improvement/skills/self-improvement/GAP_BACKLOG.md`

**Example commit (if manual fix was needed):**

```bash
git add -A && git commit -m "fix(ralph): resolve stuck loop - <brief description>

- Issue: <what was stuck>
- Cause: <why it was stuck>
- Fix: <what you did>

Co-authored-by: ralph-brain <ralph-brain@users.noreply.github.com>"
```

## Checkpoints

Use these to verify you're on track throughout the process:

- [ ] **Checkpoint 1:** Determined if Ralph process is actually running or just has stale artifacts
- [ ] **Checkpoint 2:** Examined recent log activity to identify stuck vs. slow progress
- [ ] **Checkpoint 3:** Categorized the error type (protected files, verifier, environment, git, rate limit, logic loop)
- [ ] **Checkpoint 4:** Applied appropriate fix for the error category
- [ ] **Checkpoint 5:** Verified Ralph is now making forward progress with commits

## Troubleshooting

Common issues during debugging:

| Problem | Cause | Solution |
| ------- | ----- | -------- |
| Can't find log files | Wrong directory or logs not created | Navigate to `workers/ralph/logs/`, check if Ralph ever started |
| Lock file keeps reappearing | Ralph is auto-restarting (cron/systemd) | Check for automation scripts, disable before debugging |
| Verifier never runs | Ralph crashes before outputting `:::BUILD_READY:::` | Check for syntax errors or exceptions at end of log |
| Same error after "fix" | Fix didn't actually address root cause | Re-read error message carefully, check related skills |
| Ralph working but very slow | Large files or network issues | Check file sizes in `git status`, verify network connectivity |

## Related Skills

Core skills referenced by this playbook:

- [Ralph Patterns](../domains/ralph/ralph-patterns.md) - Architecture, troubleshooting, and common patterns
- [Cache Debugging](../domains/ralph/cache-debugging.md) - Cache-specific issues and solutions
- [Token Efficiency](../domains/code-quality/token-efficiency.md) - Performance optimization to prevent slowness

## Related Playbooks

Other playbooks that connect to this workflow:

- [Resolve Verifier Failures](./resolve-verifier-failures.md) - When verifier checks are blocking progress
- [Fix ShellCheck Failures](./fix-shellcheck-failures.md) - For Hygiene.Shellcheck.X errors
- [Safe Template Sync](./safe-template-sync.md) - If template sync issues are causing conflicts

## Notes

**Iteration efficiency tips:**

- Check lock file and process status FIRST (fastest diagnosis)
- Use `tail -100` instead of `cat` on large log files
- Batch similar fixes (e.g., all SC2162 errors in one pass)

**When to escalate to human:**

- Protected file hash mismatches (Protected.1-4)
- Missing core tools (shellcheck, git, etc.)
- Persistent authentication failures
- Data corruption or repository integrity issues

**Common false alarms:**

- Ralph running for 10-15 minutes is normal for complex tasks
- Verifier taking 2-3 minutes is expected with 50+ checks
- Log file growing slowly doesn't mean stuck - check timestamps

---

**Last Updated:** 2026-01-25

**Covers:** Ralph loop debugging, stuck process diagnosis, lock file management, verifier failures, environment issues, git problems, rate limits, logic loops
