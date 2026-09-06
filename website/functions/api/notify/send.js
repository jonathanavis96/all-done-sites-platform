/**
 * POST /api/notify/send — fan one change out to every confirmed subscriber.
 *
 * Called by the tracker's daily job on gs, not by a browser. Authenticated with
 * a bearer secret and idempotent per change date: a `sent:<date>` marker is
 * written before the first send, so a retried or duplicated cron run never
 * mails the same change twice.
 */
import {
  PAGE,
  SITE,
  emailHtml,
  escapeHtml,
  json,
  sendEmails,
  sentKey,
  signToken,
} from "./_lib";

const BATCH_SIZE = 100; // Resend's per-request cap on /emails/batch.
const MODEL_LABELS = {
  "claude-sonnet-5": "Sonnet 5",
  "claude-opus-5": "Opus 5",
  "claude-fable-5-1": "Fable 5.1",
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function fmtDate(iso) {
  const d = new Date(`${iso}T00:00:00Z`);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/** Constant-time string compare, so the bearer secret cannot be probed. */
function secretsMatch(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function onRequestPost({ request, env }) {
  const kv = env.NOTIFY_KV;
  if (!kv || !env.RESEND_API_KEY || !env.NOTIFY_SEND_SECRET || !env.NOTIFY_TOKEN_SECRET) {
    return json({ error: "not configured" }, 503);
  }

  const auth = request.headers.get("authorization") || "";
  const presented = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!secretsMatch(presented, env.NOTIFY_SEND_SECRET)) return json({ error: "unauthorized" }, 401);

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "invalid json" }, 400);
  }
  const { date, direction, percent, model } = body ?? {};
  if (typeof date !== "string" || !DATE_RE.test(date) || Number.isNaN(Date.parse(`${date}T00:00:00Z`))) {
    return json({ error: "date must be YYYY-MM-DD" }, 400);
  }
  if (direction !== "increased" && direction !== "decreased") {
    return json({ error: "direction must be increased or decreased" }, 400);
  }
  if (typeof percent !== "number" || !Number.isFinite(percent)) {
    return json({ error: "percent must be a number" }, 400);
  }
  if (model !== undefined && typeof model !== "string") return json({ error: "model must be a string" }, 400);

  // Claim the date before sending anything. A concurrent second call finds the
  // marker and returns "already sent" rather than mailing everyone twice.
  if (await kv.get(sentKey(date))) return json({ ok: true, already_sent: true, date, sent: 0 });
  await kv.put(sentKey(date), new Date().toISOString());

  const recipients = [];
  let cursor;
  do {
    const page = await kv.list({ prefix: "sub:", cursor });
    for (const k of page.keys) {
      const rec = await kv.get(k.name, { type: "json" });
      if (rec?.status === "confirmed") recipients.push(k.name.slice("sub:".length));
    }
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);

  const modelLabel = model ? MODEL_LABELS[model] ?? model : null;
  const verb = direction === "increased" ? "increased" : "cut";
  const subject = `Anthropic ${verb} Claude's limits by ${percent}%`;
  const headingText = `Anthropic ${direction} Claude's limits by ${percent}% on ${fmtDate(date)}.`;
  const heading = escapeHtml(headingText);
  const intro = modelLabel
    ? `Measured on ${escapeHtml(modelLabel)} from a real account. The tracker has the full history and what it means for your plan.`
    : "Measured daily from a real account. The tracker has the full history and what it means for your plan.";

  let sent = 0;
  const failures = [];
  for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
    const slice = recipients.slice(i, i + BATCH_SIZE);
    const messages = await Promise.all(
      slice.map(async (email) => {
        const token = await signToken(env.NOTIFY_TOKEN_SECRET, "unsub", email);
        const unsubUrl = `${SITE}/api/notify/unsubscribe?token=${encodeURIComponent(token)}`;
        return {
          to: [email],
          subject,
          headers: { "List-Unsubscribe": `<${unsubUrl}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
          text: `${headingText}\n\nSee the full history: ${PAGE}\n\nUnsubscribe: ${unsubUrl}`,
          html: emailHtml({
            heading,
            body: intro,
            ctaLabel: "See the tracker",
            ctaUrl: PAGE,
            footerHtml: `You asked to hear about changes to Claude's limits. <a href="${unsubUrl}" style="color:#8a8f99">Unsubscribe</a>.`,
          }),
        };
      }),
    );
    try {
      await sendEmails(env.RESEND_API_KEY, env.NOTIFY_FROM || "All Done Sites <hello@alldonesites.com>", messages);
      sent += slice.length;
    } catch (err) {
      failures.push(String(err).slice(0, 200));
    }
  }

  return json({ ok: failures.length === 0, date, subscribers: recipients.length, sent, failures });
}
