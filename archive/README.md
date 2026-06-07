# Archive — Frozen Legacy Runtimes

This directory holds **frozen** legacy infrastructure. Nothing here is part of
the active workflow. Do not modify these files — they are kept only for history
and reference.

## Contents

### `workers/`

The former **Ralph** executor runtime (the autonomous BUILD loop, verifier,
task contracts, and supporting shell tooling). Retired on 2026-06-07 when the
project moved to a single-agent model: **Cortex now both plans and executes
directly inside Claude Code**, so the separate Ralph executor is no longer used.

Notable retired pieces:

- `workers/ralph/loop.sh`, `verifier.sh`, `rules/AC.rules` — the execution loop
- `workers/ralph/PROMPT.md` — Ralph's system prompt
- `workers/ralph/THUNK.md`, `IMPLEMENTATION_PLAN.md` — task log / contracts
- `workers/shared/` — shared shell utilities for the loop

If you ever need to revive an autonomous executor loop, this is the reference
implementation. For day-to-day work it can be ignored.
