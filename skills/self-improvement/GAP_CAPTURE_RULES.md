# Gap Capture Rules (Mandatory)

These rules are enforced for all agents operating within the Ralph brain system.

## What Is a Gap?

A **gap** is missing brain capability that would have helped you complete a task more effectively. Types:

| Type | Description |
|------|-------------|
| Knowledge | Facts, concepts, or domain knowledge not documented |
| Procedure | Step-by-step process not captured anywhere |
| Tooling | Tool usage, commands, or integrations not documented |
| Pattern | Reusable solution pattern not in skills/ |
| Debugging | Troubleshooting approach for a specific failure mode |
| Reference | External documentation or specification needed |

## Rule 1: Search First (No Duplicates)

Before logging ANY gap:

1. Search `skills/` for existing matching skill
2. Search `skills/self-improvement/skills/self-improvement/GAP_BACKLOG.md` for existing gap entry
3. If found: **UPDATE existing entry** rather than creating new one

## Rule 2: Always Log Gaps

If you used knowledge/procedure/tooling that isn't documented in `skills/`:

1. Append entry to `skills/self-improvement/GAP_BACKLOG.md`
2. Use the format specified in skills/self-improvement/GAP_BACKLOG.md
3. Include evidence (paths, filenames, observations)

## Rule 3: Promotion Criteria

A gap should be promoted to a skill when ALL of these are true:

- [ ] The gap is **clear** (well-defined, not vague)
- [ ] The gap is **specific** (actionable, not overly broad)
- [ ] The gap is **recurring** (likely to help again)
- [ ] The skill can be expressed as **triggers + steps + outputs** (LLM-executable)

## Rule 4: Promotion Process

When promotion criteria are met:

1. Add entry to `SKILL_BACKLOG.md` with status "Pending"
2. Create skill file using `SKILL_TEMPLATE.md`
3. Place in correct location:
   - Broadly reusable → `skills/domains/<topic>/<skill>.md`
   - Project-specific → `skills/projects/<project>/<skill>.md`
4. Create folder if needed (one file per skill)
5. Update `skills/SUMMARY.md`
6. Mark `SKILL_BACKLOG.md` entry as "Done" with link to new file

## Rule 5: Update Operational Signs

After creating a new skill, check if it affects agent behavior:

- If the skill changes how agents should operate → Update `AGENTS.md`
- If the skill changes prompts → Update `PROMPT.md` or templates
- If the skill affects validation → Update `VALIDATION_CRITERIA.md`

## Rule 6: Cross-Project Gap Capture (Marker Protocol)

Projects capture gaps locally, then sync to brain. This avoids token cost of scanning.

### For Project Agents

1. **Capture gap** in `cortex/GAP_CAPTURE.md` (local to project)
2. **Create marker**: `touch cortex/.gap_pending`
3. Brain's Cortex will detect and sync on next session

### For Brain Cortex

1. `snapshot.sh` checks for `../**/cortex/.gap_pending` markers
2. If found, reports pending gaps count
3. Run `bash cortex/sync_gaps.sh` to:
   - Read each project's `cortex/GAP_CAPTURE.md`
   - Deduplicate by title (skip if already in `skills/self-improvement/GAP_BACKLOG.md`)
   - Append new gaps to `skills/self-improvement/GAP_BACKLOG.md`
   - Clear project's `GAP_CAPTURE.md` and remove marker

### Token Efficiency

- **No pending gaps**: Zero token cost (bash glob only)
- **Gaps pending**: Minimal cost (read only flagged files)

## Rule 7: Conversation Persistence

Before ending any session where substantial knowledge was discussed, write a summary to the appropriate `.md` file.

**Triggers (any of these):**

- Decisions were made about architecture, approach, or strategy
- User explained domain knowledge, requirements, or context
- Multiple options were evaluated and one was chosen
- A problem was diagnosed and root cause identified
- New patterns, conventions, or procedures were established

**Destinations:**

| Content Type | Write To |
|--------------|----------|
| Strategic decisions | `DECISIONS.md` or `cortex/DECISIONS.md` |
| Knowledge gaps | `skills/self-improvement/skills/self-improvement/GAP_BACKLOG.md` |
| Project context/goals | `THOUGHTS.md` |
| Reusable patterns | `skills/domains/<topic>/<skill>.md` |
| Research/meeting notes | `cortex/docs/` or project docs |

**Format:** Date, what was discussed/decided, why (rationale), follow-up actions.
