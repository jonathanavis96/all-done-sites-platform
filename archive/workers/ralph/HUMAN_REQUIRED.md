# Human Required Tasks

Manual verification tasks that cannot be automated. Complete these and update `rules/MANUAL_APPROVALS.rules`.

---

## BugB.UI.1 - Terminal Resize Test

**Description:** Verify no visual corruption after terminal resize

**Steps:**

1. Open a terminal and run: `bash workers/ralph/current_ralph_tasks.sh`
   - **Rule:** This is an interactive, continuously-refreshing monitor. **Do not pipe it** (no `| grep`, `| sed`, etc.). For a safe snapshot use: `timeout 2s bash workers/ralph/current_ralph_tasks.sh --hide-completed`
2. Resize the terminal window (drag edges, maximize/restore)
3. Verify the display updates correctly without corruption

**Pass criteria:** Display remains readable, no garbled text or misaligned columns

**To approve:** Add `BugB.UI.1=approved` to `rules/MANUAL_APPROVALS.rules`

---

## BugC.UI.1 - THUNK Monitor Read-Only Test

**Description:** Verify THUNK monitor only displays, never modifies files

**Steps:**

1. Open a terminal and run: `bash workers/ralph/thunk_ralph_tasks.sh`
2. In another terminal, edit `workers/IMPLEMENTATION_PLAN.md`
3. Mark any task as complete: change `- [ ]` to `- [x]`
4. Save the file and wait 5-10 seconds
5. Check `workers/ralph/workers/ralph/THUNK.md` - it should NOT be auto-updated

**Pass criteria:** workers/ralph/THUNK.md remains unchanged (monitor only displays, doesn't sync)

**To approve:** Add `BugC.UI.1=approved` to `rules/MANUAL_APPROVALS.rules`

---

## How to Complete

After passing a test, add approval to `rules/MANUAL_APPROVALS.rules`:

```bash
# Example
echo "BugB.UI.1=approved" >> rules/MANUAL_APPROVALS.rules
echo "BugC.UI.1=approved" >> rules/MANUAL_APPROVALS.rules
```text

Then run verifier to confirm: `cd workers/ralph && bash verifier.sh`

---

Last updated: 2026-01-22
