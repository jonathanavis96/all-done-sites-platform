# Claude usage tracker — change alerts

Lets a reader of `/claude-usage-tracker/` leave an email address and hear from us
once, the next time Anthropic moves Claude's usage limits.

The tracker already measures the limit daily and records the move in
`last_change` inside `website/public/data/claude-usage.json`. This feature turns
that field into an email. Nothing else is ever sent to the list.

## Flow

1. **Sign up.** The form under the headline posts to `/api/notify/subscribe`.
   The address is stored as `pending` and a confirmation email goes out.
2. **Confirm.** The link in that email hits `/api/notify/confirm?token=…` and
   flips the record to `confirmed`. Nothing is ever mailed to an unconfirmed
   address except its own confirmation link — double opt-in, so the list cannot
   be used to mail someone who did not ask.
3. **Alert.** The tracker's daily job on `gs` notices a new `last_change` date
   and posts it to `/api/notify/send` with a bearer secret. That fans one email
   out to every confirmed subscriber.
4. **Leave.** Every alert carries a one-click unsubscribe link (and a
   `List-Unsubscribe` header) pointing at `/api/notify/unsubscribe?token=…`,
   which deletes the record.

## Endpoints

All four are Cloudflare Pages Functions under `website/functions/api/notify/`.
Shared code lives in `_lib.js`, which Pages does not route because of the leading
underscore.

| Route | Method | Body / query | Answers |
|---|---|---|---|
| `/api/notify/subscribe` | POST | `{"email":"…"}` | `200 {ok,message}`, `400` bad address or body, `429` rate-limited, `502` Resend refused, `503` unconfigured |
| `/api/notify/confirm` | GET | `?token=…` | HTML page: `200` confirmed, `400` bad token, `404` no pending record |
| `/api/notify/unsubscribe` | GET | `?token=…` | HTML page: `200` removed, `400` bad token |
| `/api/notify/send` | POST | `{date,direction,percent,model?}` + `Authorization: Bearer $NOTIFY_SEND_SECRET` | `200 {ok,date,subscribers,sent,failures}`, `401`, `400` bad payload, `503` unconfigured |

`confirm` and `unsubscribe` return a rendered HTML page rather than JSON,
because a person clicks them straight from their inbox.

### Decisions worth knowing

- **Stateless link tokens.** A token is
  `base64url(email) "." base64url(HMAC-SHA256(NOTIFY_TOKEN_SECRET, "<action>:<email>"))`.
  Stateless because an unsubscribe link in a two-year-old email has to keep
  working; a stored nonce would either expire or have to be kept forever. The
  action is inside the signed message, so a confirm token cannot be replayed as
  an unsubscribe. Signatures are compared in constant time, as is the bearer
  secret.
- **Subscribe does not disclose membership.** An already-confirmed address gets
  the same `200` and the same wording as a new one, and no email. The endpoint
  therefore cannot be used to test whether a given address is on the list.
- **`send` is idempotent per change date.** It writes `sent:<date>` before it
  mails anything, so a retried or duplicated cron run returns
  `{already_sent:true}` instead of mailing the list twice. The trade-off is
  deliberate: a crash midway through a fan-out drops the rest of that send rather
  than risking duplicates, and the failure is visible in the job's log.
- **Validation lives in one place.** `website/src/lib/notify.ts` holds
  `normalizeEmail`/`isValidEmail`; `_lib.js` re-exports them and the React form
  imports them directly, so the client and the server can never drift. It is
  covered by `website/src/lib/notify.test.ts` (vitest).
- **Addresses are normalised** (trimmed, lower-cased) before they become a key,
  so one person cannot hold two subscriptions.
- **No third-party libraries.** Resend is called over `fetch`; signing uses Web
  Crypto. Sends over one recipient use Resend's `/emails/batch` endpoint, 100 at
  a time, so each recipient still gets their own unsubscribe link.

## KV schema

Namespace `alldonesites-notify` (`7021f196a8f54c08968d1a5ee2eb7700`), bound to
the `alldonesites` Pages project as **`NOTIFY_KV`** on both production and
preview.

| Key | Value | TTL |
|---|---|---|
| `sub:<email>` | `{"status":"pending"\|"confirmed","created_at":ISO,"updated_at":ISO,"confirmed_at":ISO?}` | none |
| `sent:<YYYY-MM-DD>` | ISO timestamp the fan-out for that change date started | none |
| `rl:<ip>` | subscribe count for that IP | 3600s |

Rate limit: 5 subscribe calls per IP per hour. KV is eventually consistent, so
this is a speed bump against casual abuse rather than an exact counter, which is
all a single-purpose sign-up form needs.

Unsubscribing deletes `sub:<email>` outright — there is nothing we want to
remember about someone who has left.

## Secrets and where they are set

Set on the `alldonesites` Pages project (production **and** preview) via the
Cloudflare API, so they are available to Functions with no repo change:

| Name | Kind | What it is |
|---|---|---|
| `RESEND_API_KEY` | secret | The existing personal-store Resend key ("Resend API key (coachpaul contact form)"), send-only, account `alldonesites@gmail.com` |
| `NOTIFY_TOKEN_SECRET` | secret | 32 random bytes, hex. Signs confirm/unsubscribe links. Rotating it invalidates every outstanding link |
| `NOTIFY_SEND_SECRET` | secret | 32 random bytes, hex. Bearer secret for `/api/notify/send` |
| `NOTIFY_FROM` | plain text | `All Done Sites <hello@alldonesites.com>` |

`NOTIFY_SEND_SECRET` is mirrored to `~/.claude-usage-notify.env` (mode 600) on
`gs`, which is where `bin/daily.sh` reads it from. The same file exists on
masterrig as a backup copy. Neither is in any repo.

For local development, `website/.dev.vars` carries the same four names;
`.dev.vars` and `.wrangler/` are gitignored.

## DNS and Resend state

`alldonesites.com` was **already verified in Resend** before this work — the zone
carries `resend._domainkey` (DKIM), `send.alldonesites.com` SPF
(`include:amazonses.com`) and its `feedback-smtp.eu-west-1.amazonses.com` MX, plus
a `p=quarantine` DMARC record at the apex. Apex MX stays on Zoho for inbound
mail; Resend sends from the `send.` subdomain, so the two do not collide.

No DNS records were changed. A live send from `hello@alldonesites.com` was
accepted by Resend and the full subscribe → confirm → alert loop was exercised
against the real API from a local `wrangler pages dev` run.

The personal-store Resend key is **send-only**, so it cannot read or manage
domains through the API. Domain state above was confirmed from public DNS and a
successful send.

## Tracker side

`bin/daily.sh` in `claude-usage-tracker` (branch `build`, cron 05:30 UTC on `gs`)
already writes `claude-usage.json` into the site checkout and pushes it. After
that push it now:

1. reads `last_change.date` from the JSON it just wrote;
2. compares it with `.notified-change` in the tracker checkout (gitignored);
3. if it is new, POSTs `{date,direction,percent,model}` to
   `https://alldonesites.com/api/notify/send` with the bearer secret from
   `~/.claude-usage-notify.env`;
4. records the date only on a `2xx`, so a failed call retries tomorrow.

Every step is guarded: a missing env file, a missing `jq`, a network failure or a
non-2xx response logs a warning and leaves the publish's exit status alone. The
notify call must never be able to fail the publish.

## Open items

- **The endpoints are not live until this PR merges to `main`.** Pages only
  deploys from `main`, so `curl -X POST https://alldonesites.com/api/notify/subscribe`
  will 404 until then. Everything above was verified against `wrangler pages dev`
  with the real Resend key and the real secrets.
- **`NOTIFY_TOKEN_SECRET` and `NOTIFY_SEND_SECRET` are not in the personal
  secrets store.** The `secrets` CLI has no non-interactive write path (`secrets
  edit` opens Notepad). They live in the Pages project and, for the send secret,
  in `~/.claude-usage-notify.env` on both hosts. Worth pasting into the store by
  hand.
- **No admin view of the list.** Counting subscribers means
  `wrangler kv key list --namespace-id 7021f196a8f54c08968d1a5ee2eb7700`.
- **Resend free tier is 3,000 emails/month**, shared with the coachpaul contact
  form. Fine at this list size; worth watching if the tracker gets traction.
- **KV `list` reads every subscriber record one key at a time.** Fine into the
  low thousands, slow beyond that. If the list grows, hold the confirmed
  addresses in a single chunked KV value instead.
