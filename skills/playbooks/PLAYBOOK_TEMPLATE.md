# [Playbook Title]

## Goal

What this playbook helps you accomplish. Be specific and action-oriented.

Example: "Systematically resolve ShellCheck warnings by identifying error codes, applying appropriate fixes, and verifying the resolution."

## When to Use

Symptoms or scenarios that indicate you should use this playbook:

- Symptom 1: Describe observable condition (e.g., "Verifier reports Hygiene.Shellcheck.X failures")
- Symptom 2: Another trigger condition (e.g., "Multiple SC2XXX errors blocking commit")
- Symptom 3: Context where this applies (e.g., "New shell script needs validation")

## Prerequisites

Before starting, ensure you have:

- **Tools:** List required commands/software (e.g., shellcheck, markdownlint, git)
- **Files:** Files that must exist (e.g., `.verify/latest.txt`, `rules/AC.rules`)
- **Permissions:** Access requirements (e.g., write access to repository)
- **Knowledge:** Background you should have (e.g., "Basic shell scripting concepts")

## Steps

### Step 1: [Orient/Gather Context]

**Action:** Describe the first action to take.

- Sub-action or detail about this step
- What to look for or verify
- **Command example:**

  ```bash
  # Example command with expected output
  shellcheck file.sh
  ```

**Decision Point:** If condition X, then do Y; otherwise do Z.

- **Link to skill:** [Related Skill Name](../domains/category/skill.md) - When to consult for details

### Step 2: [Analyze/Diagnose]

**Action:** Next step in the workflow.

- Break down the analysis process
- How to categorize the issue
- **Example output:**

  ```text
  Expected output or pattern to recognize
  ```

**Checkpoint:** ✓ You should now have [specific artifact or understanding]

### Step 3: [Execute Fix]

**Action:** Implementation step.

- Concrete actions to take
- Code patterns to apply
- **Link to skill:** [Skill Name](../path/to/skill.md)

**Anti-pattern:** ❌ Don't do [common mistake]. Instead: ✅ Do [correct approach].

### Step 4: [Verify]

**Action:** Validation step.

- How to confirm the fix worked
- Commands to run
- Expected results

**Command:**

```bash
# Verification command
command-to-verify
```

### Step 5: [Commit/Complete]

**Action:** Finalization step.

- How to document the change
- Commit message format
- Cleanup tasks if any

**Example commit:**

```bash
git add -A && git commit -m "fix(scope): resolve issue-description"
```

## Checkpoints

Use these to verify you're on track throughout the process:

- [ ] **Checkpoint 1:** [Specific measurable condition - e.g., "Identified all SC2XXX error codes"]
- [ ] **Checkpoint 2:** [Next verification point - e.g., "Applied fixes to target files"]
- [ ] **Checkpoint 3:** [Validation check - e.g., "shellcheck reports 0 errors"]
- [ ] **Checkpoint 4:** [Completion criteria - e.g., "Changes committed with proper message"]

## Troubleshooting

Common issues and solutions:

| Problem | Cause | Solution |
| ------- | ----- | -------- |
| Issue description (e.g., "Fix doesn't resolve warning") | Why it happens (e.g., "Wrong error code identified") | How to fix (e.g., "Re-read shellcheck output, verify SC code") |
| Another common problem | Root cause | Resolution steps |
| Third issue type | What causes it | How to address it |

## Related Skills

Core skills referenced by this playbook:

- [Skill 1](../domains/category/skill.md) - When you need [specific knowledge]
- [Skill 2](../domains/category/skill.md) - For [particular situation]
- [Skill 3](../domains/category/skill.md) - Deep dive into [topic]

## Related Playbooks

Other playbooks that connect to this workflow:

- [Other Playbook](./other-playbook.md) - Use when [condition]
- [Alternative Playbook](./alternative-playbook.md) - Consider if [scenario]

## Notes

Additional context or guidance:

- **Iteration efficiency:** Tips for completing this in minimal tool calls
- **Common variations:** Different paths through this workflow
- **When to escalate:** Conditions that require human intervention

---

**Last Updated:** YYYY-MM-DD

**Covers:** [List relevant error codes, tools, or concepts this playbook addresses]
