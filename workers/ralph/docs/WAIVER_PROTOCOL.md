# Waiver Protocol

When a hygiene gate fails but the failure is a **false positive** (legitimate exception), you may request a waiver. You CANNOT approve waivers - only Jono can.

## CRITICAL: Notify Human After Creating Waiver

After creating ANY waiver request, you MUST notify the human:

```bash
bash .verify/notify_human.sh "Waiver Request" "RULE_ID: Brief reason\n\nFile: path/to/file" "../.verify/waiver_requests/WVR-XXXX-XX-XX-XXX.json"
```text

This triggers a sound + popup. If user clicks OK, the waiver is auto-approved.

## Step 1: Create Waiver Request

```bash
./.verify/request_waiver.sh <RULE_ID> <FILE_PATH> "<REASON>"
```text

Example:

```bash
./.verify/request_waiver.sh Hygiene.MarkdownFenceLang docs/snippets.md \
  "File intentionally uses plain fences for copy/paste UX"
```text

## Step 2: Prompt Jono to Approve

Output a clear message:

```text
⚠️ WAIVER REQUIRED

A hygiene gate failed with a legitimate exception.

Rule:   Hygiene.MarkdownFenceLang
File:   docs/snippets.md
Reason: File intentionally uses plain fences for copy/paste UX

Request created: .verify/waiver_requests/WVR-2026-01-19-001.json

To approve, Jono must run:
  source .venv/bin/activate
  python .verify/approve_waiver_totp.py .verify/waiver_requests/WVR-2026-01-19-001.json

Then enter the 6-digit OTP from Google Authenticator.
```text

## Step 3: Wait for Approval

Do NOT continue until `.verify/waivers/<WAIVER_ID>.approved` exists.

## Rules for Waivers

- **Explicit paths only** - No wildcards (`*`) or repo-wide (`.`)
- **Short expiry** - Default 30 days, max 60 days
- **Clear reason** - Document WHY the rule doesn't apply
- **Prefer fixing** - Only waive if fixing is not feasible
- **Max 10 active** - Keep waivers exceptional, not routine

## What You CANNOT Do

- Create `.approved` files (requires TOTP)
- Modify approved waivers (hash verification)
- Use wildcards in scope
- Approve your own requests
