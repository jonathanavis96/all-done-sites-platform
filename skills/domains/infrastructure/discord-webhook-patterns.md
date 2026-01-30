# Discord Webhook Integration Patterns

## Overview

Patterns for integrating Discord webhooks into automation systems for real-time notifications and build updates.

## Use Cases

- CI/CD pipeline notifications (start, success, failure)
- Long-running automation loops (Ralph, deployment scripts)
- Error alerting and monitoring
- Team coordination for async workflows

## Core Pattern: Non-Blocking Webhook Posts

**Problem:** Webhook failures shouldn't break your automation.

**Solution:** Make webhook calls non-blocking with graceful degradation.

```bash
#!/usr/bin/env bash
set -euo pipefail

# Non-blocking webhook call
if [[ -n "${DISCORD_WEBHOOK_URL:-}" ]]; then
  curl -s -X POST \
    -H "Content-Type: application/json" \
    -d '{"content": "Build started"}' \
    "${DISCORD_WEBHOOK_URL}" >/dev/null 2>&1 || true
fi

# Continue with main logic regardless of webhook success
```

**Key principles:**

- Use `|| true` to prevent exit on webhook failure
- Check environment variable exists before calling
- Redirect output to avoid cluttering logs
- Exit 0 even if webhook fails

## Message Chunking Strategy

**Discord Limits:**

- Maximum message length: 2000 characters
- Rate limit: ~5 messages per second per webhook

**Implementation:**

```bash
CHUNK_SIZE=1900  # Safety margin from 2000 limit
MESSAGE_LEN=${#MESSAGE}

if [[ $MESSAGE_LEN -le $CHUNK_SIZE ]]; then
  # Single message
  send_to_discord "$MESSAGE"
else
  # Split into chunks
  OFFSET=0
  CHUNK_NUM=1
  TOTAL_CHUNKS=$(( (MESSAGE_LEN + CHUNK_SIZE - 1) / CHUNK_SIZE ))
  
  while [[ $OFFSET -lt $MESSAGE_LEN ]]; do
    CHUNK="${MESSAGE:$OFFSET:$CHUNK_SIZE}"
    send_to_discord "[Part $CHUNK_NUM/$TOTAL_CHUNKS]
\`\`\`
$CHUNK
\`\`\`"
    OFFSET=$((OFFSET + CHUNK_SIZE))
    CHUNK_NUM=$((CHUNK_NUM + 1))
    
    # Rate limit protection
    sleep 0.05
  done
fi
```

**Why 1900 chars?**

- Leaves 100 chars for chunk headers and formatting
- Prevents edge cases with multi-byte UTF-8 characters
- Safer than exact 2000 limit

## JSON Payload Formatting

**Basic message:**

```bash
CONTENT="Build completed successfully"
PAYLOAD=$(jq -n --arg content "$CONTENT" '{content: $content}')

curl -X POST \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD" \
  "${DISCORD_WEBHOOK_URL}"
```

**Code block formatting:**

```bash
# Using jq for proper JSON escaping
CONTENT=$(echo -e "```\n${MESSAGE}\n```" | jq -Rs .)
PAYLOAD="{\"content\": ${CONTENT}}"
```

**Rich embeds (optional):**

```json
{
  "embeds": [{
    "title": "Build Status",
    "description": "Ralph loop iteration complete",
    "color": 3066993,
    "fields": [
      {"name": "Status", "value": "Success", "inline": true},
      {"name": "Duration", "value": "45s", "inline": true}
    ],
    "timestamp": "2026-01-27T19:00:00Z"
  }]
}
```

## Rate Limiting

**Discord rate limits:**

- Per-webhook: ~5 requests/second
- Global: ~50 requests/second across all webhooks

**Protection strategies:**

```bash
# Simple delay between messages
sleep 0.05  # 50ms = safe for 20 msg/sec

# Track last send time (advanced)
LAST_SEND_TIME=${LAST_SEND_TIME:-0}
NOW=$(date +%s%3N)  # milliseconds
ELAPSED=$((NOW - LAST_SEND_TIME))

if [[ $ELAPSED -lt 200 ]]; then
  sleep $(bc <<< "scale=3; (200 - $ELAPSED) / 1000")
fi
```

## Error Handling

**Webhook validation:**

```bash
# Check webhook URL is set
if [[ -z "${DISCORD_WEBHOOK_URL:-}" ]]; then
  echo "Warning: DISCORD_WEBHOOK_URL not set, skipping notification" >&2
  exit 0
fi

# Check webhook URL format
if ! [[ "$DISCORD_WEBHOOK_URL" =~ ^https://discord(app)?\.com/api/webhooks/ ]]; then
  echo "Error: Invalid Discord webhook URL format" >&2
  exit 1
fi
```

**Retry logic (optional):**

```bash
MAX_RETRIES=3
RETRY_DELAY=1

for attempt in $(seq 1 $MAX_RETRIES); do
  if curl -s -f -X POST \
    -H "Content-Type: application/json" \
    -d "$PAYLOAD" \
    "${DISCORD_WEBHOOK_URL}" >/dev/null 2>&1; then
    break
  fi
  
  if [[ $attempt -lt $MAX_RETRIES ]]; then
    sleep $RETRY_DELAY
  fi
done
```

## Integration Points

**Script start notification:**

```bash
#!/usr/bin/env bash
source bin/discord-post

notify_discord "**Script Starting** 🚀
Environment: $ENV
Branch: $(git branch --show-current)"

# Main script logic...
```

**Error traps:**

```bash
trap 'notify_discord "**Script Failed** ❌
Exit code: $?
Line: $LINENO"' ERR

# Your code here
```

**Completion notifications:**

```bash
START_TIME=$(date +%s)

# Main work...

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

notify_discord "**Script Complete** ✅
Duration: ${DURATION}s
Status: Success"
```

## Testing & Dry-Run

**Dry-run mode for testing:**

```bash
#!/usr/bin/env bash

DRY_RUN=${DRY_RUN:-false}

if [[ "$DRY_RUN" == "true" ]]; then
  echo "DRY RUN: Would send to Discord:"
  echo "$PAYLOAD" | jq .
else
  curl -X POST -d "$PAYLOAD" "${DISCORD_WEBHOOK_URL}"
fi
```

**Testing checklist:**

1. Test with `DRY_RUN=true` first
2. Verify JSON escaping with special characters
3. Test chunking with messages >2000 chars
4. Verify rate limiting with rapid sends
5. Test error handling (invalid webhook URL)

## Security Considerations

**Webhook URL protection:**

- Store in environment variable, NEVER commit to git
- Use `.env` files or secrets management
- Rotate webhooks if exposed

```bash
# .gitignore
.env
*.env.local
```

```bash
# .env.example (safe to commit)
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/YOUR_WEBHOOK_HERE
```

**Content filtering:**

```bash
# Sanitize sensitive data before sending
MESSAGE=$(echo "$RAW_MESSAGE" | sed 's/password=[^ ]*/password=***/g')
notify_discord "$MESSAGE"
```

## Real-World Example: Ralph Loop Integration

From `workers/ralph/loop.sh`:

```bash
# Start notification
if [[ -x "$ROOT/bin/discord-post" ]]; then
  echo "**Ralph Loop Starting** 🚀
Branch: $BRANCH
Mode: $MODE
Iteration: $ITERATION" | "$ROOT/bin/discord-post" 2>/dev/null || true
fi

# Error notification in cleanup trap
cleanup() {
  if [[ -n "$DISCORD_WEBHOOK_URL" ]] && [[ -x "$ROOT/bin/discord-post" ]]; then
    {
      echo "**Ralph Loop Error** ❌"
      echo "Exit code: $?"
      echo "Branch: $BRANCH"
    } | "$ROOT/bin/discord-post" 2>/dev/null || true
  fi
}
trap cleanup EXIT
```

## Troubleshooting

| Issue | Solution |
| ----- | -------- |
| `DISCORD_WEBHOOK_URL not set` | Set in `.env` or export before running |
| `Invalid webhook URL` | Check format: `https://discord.com/api/webhooks/{id}/{token}` |
| `Rate limit exceeded` | Add `sleep 0.05` between sends |
| `Message truncated` | Implement chunking (see above) |
| `Webhook returns 404` | Regenerate webhook in Discord server settings |
| `Script hangs on webhook` | Use `\|\| true` and redirect stderr |

## References

- [Discord Webhook API Docs](https://discord.com/developers/docs/resources/webhook)
- Brain implementation: `bin/discord-post`
- Integration example: `workers/ralph/loop.sh` (lines 1823-2010)

## See Also

- [observability-patterns.md](observability-patterns.md) - Monitoring and alerting strategies
- [secrets-management.md](secrets-management.md) - Secure webhook URL storage
- [error-handling-patterns.md](../backend/error-handling-patterns.md) - Graceful degradation patterns
