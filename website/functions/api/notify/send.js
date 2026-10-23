/**
 * POST /api/notify/send — fan one change out to every confirmed subscriber, or,
 * with a `to` field, mail one address instead of the list.
 *
 * Called by the tracker's jobs on gs, not by a browser. Authenticated with a
 * bearer secret. The list send is idempotent per change date: a `sent:<date>`
 * marker is written before the first send, so a retried or duplicated cron
 * run never mails the same change twice.
 *
 * The `to` form is the tracker's alert channel: `{to, subject, text}` sends
 * that one email and touches neither the subscriber list nor the date marker.
 * It is guarded by the same bearer secret; setting `NOTIFY_ADMIN_TO` (a
 * comma-separated list of addresses) on the Pages project restricts which
 * addresses it will send to.
 */
import {
  PAGE,
  SITE,
  emailHtml,
  escapeHtml,
  isValidEmail,
  json,
  normalizeEmail,
  sendEmails,
  sentKey,
  signToken,
} from "./_lib";
// The same labels the tracker page shows, so an email never names a model
// differently from the chart it links to.
import { getManyJson, listAllKeys, secretsMatch } from "../_shared";
import { MODEL_LABELS } from "../../../src/lib/claudeUsage";

const BATCH_SIZE = 100; // Resend's per-request cap on /emails/batch.
const ADMIN_SUBJECT_MAX = 200;
const ADMIN_TEXT_MAX = 20000;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function fmtDate(iso) {
  const d = new Date(`${iso}T00:00:00Z`);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
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
  if (body?.to !== undefined) return sendToOne(body, env);

  const { date, direction, percent, model, scope } = body ?? {};
  // Round-trip the date: Date.parse rolls 2026-02-31 over to 3 March instead of refusing it.
  const day = typeof date === "string" && DATE_RE.test(date) ? new Date(`${date}T00:00:00Z`) : null;
  if (!day || Number.isNaN(day.getTime()) || day.toISOString().slice(0, 10) !== date) {
    return json({ error: "date must be YYYY-MM-DD" }, 400);
  }
  if (direction !== "increased" && direction !== "decreased") {
    return json({ error: "direction must be increased or decreased" }, 400);
  }
  if (typeof percent !== "number" || !Number.isFinite(percent)) {
    return json({ error: "percent must be a number" }, 400);
  }
  if (model !== undefined && typeof model !== "string") return json({ error: "model must be a string" }, 400);
  if (scope !== undefined && scope !== "window" && scope !== "weekly") {
    return json({ error: "scope must be window or weekly" }, 400);
  }
  const lead = heroLead(body);
  if (lead.error) return json({ error: lead.error }, 400);

  // Claim the date before sending anything. A concurrent second call finds the
  // marker and returns "already sent" rather than mailing everyone twice.
  if (await kv.get(sentKey(date))) return json({ ok: true, already_sent: true, date, sent: 0 });
  await kv.put(sentKey(date), new Date().toISOString());

  // Read the subscriber records a batch at a time rather than one round trip each.
  const subKeys = await listAllKeys(kv, "sub:");
  const records = await getManyJson(kv, subKeys);
  const recipients = subKeys.filter((_, i) => records[i]?.status === "confirmed").map((k) => k.slice("sub:".length));

  const modelLabel = model ? MODEL_LABELS[model] ?? model : null;
  let subject, headingText, intro, introText;
  if (lead.limit) {
    // The tracker names the limit (`limit`): the email leads with the hero's sentence for this
    // change, its limit, direction and whole percent (Jonathan's decision, 2026-10-23), and
    // explains the figures below it.
    const limitWords = HERO_LIMITS[lead.limit];
    subject = `Anthropic ${direction} Claude's ${limitWords} by ${percent}%`;
    headingText = `Anthropic ${direction} Claude's ${limitWords} by ${percent}% on ${fmtDate(date)}.`;
    // The text part ends on the link to the full history below it, as the older email does.
    introText = lead.lines.join("\n");
    intro = [...lead.lines, "The tracker has the full history."].map(escapeHtml).join("<br><br>");
  } else {
    // A change the tracker cannot state as a limit: the older words, a change observed on the
    // watched account (audit finding 4).
    const metric = scope === "weekly" ? "weekly-to-window ratio" : "5-hour window budget";
    subject = `Claude's observed ${metric} ${direction} by ${percent}%`;
    headingText = `Claude's observed ${metric} ${direction} by ${percent}% on ${fmtDate(date)}.`;
    intro = modelLabel
      ? `Measured on ${escapeHtml(modelLabel)} from a real account. The tracker has the full history.`
      : "Measured daily from a real account. The tracker has the full history.";
  }
  const heading = escapeHtml(headingText);
  const text = introText ? `${headingText}\n\n${introText}` : headingText;

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
          text: `${text}\n\nSee the full history: ${PAGE}\n\nUnsubscribe: ${unsubUrl}`,
          html: emailHtml({
            heading,
            body: intro,
            ctaLabel: "See the tracker",
            ctaUrl: PAGE,
            footerHtml: `You asked to hear about changes observed by the Claude usage tracker. <a href="${unsubUrl}" style="color:#8a8f99">Unsubscribe</a>.`,
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

  // Nobody was mailed, so release the claim: a retry should send rather than report "already sent".
  // After a partial send the marker stays, since a retry would mail the delivered half twice.
  if (sent === 0 && failures.length > 0) await kv.delete(sentKey(date));

  return json({ ok: failures.length === 0, date, subscribers: recipients.length, sent, failures });
}

const HERO_LIMITS = { five_hour_limit: "5-hour limit", weekly_limit: "weekly limit" };
const COUNT_WORDS = ["no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"];

const isFigure = (x) => typeof x === "number" && Number.isFinite(x);
const isRange = (x) => Array.isArray(x) && x.length === 2 && x.every(isFigure);
// A published one-decimal figure as the email writes it: no sign, "0" for -0.
const fmtPct = (x) => `${Number(Math.abs(x).toFixed(1))}%`;
const article = (x) => {
  const whole = Math.floor(Math.abs(x));
  return whole === 11 || whole === 18 || String(whole).startsWith("8") ? "an" : "a";
};

// "very likely between X% and Y%" for a size's interval: both ends as amounts when they lie on one
// side of no change, or "a X% decrease and a Y% increase" when the interval spans it.
function rangeWords([lo, hi], down = "decrease", up = "increase") {
  if (lo >= 0 || hi <= 0) {
    const [a, b] = [Math.abs(lo), Math.abs(hi)].sort((x, y) => x - y);
    return `very likely between ${fmtPct(a)} and ${fmtPct(b)}`;
  }
  return `very likely between ${article(lo)} ${fmtPct(lo)} ${down} and ${article(hi)} ${fmtPct(hi)} ${up}`;
}

function limitLine(words, pct, range) {
  const verb = pct > 0 ? "increased" : pct < 0 ? "decreased" : "did not change";
  const figure = pct === 0 ? "" : ` ${fmtPct(pct)}`;
  return `The ${words} ${verb}${figure}${range ? `, ${rangeWords(range)}` : ""}.`;
}

function windowsLine(pct, range) {
  const whole = Math.round(Math.abs(pct));
  const said = whole === 0
    ? "So a week now holds about the same number of full 5-hour windows"
    : `So a week now holds about ${whole}% ${pct > 0 ? "more" : "fewer"} full 5-hour windows`;
  if (!range) return `${said}.`;
  const [lo, hi] = range;
  if (lo >= 0 || hi <= 0) {
    const [a, b] = [Math.abs(lo), Math.abs(hi)].sort((x, y) => x - y);
    return `${said}, very likely between ${fmtPct(a)} and ${fmtPct(b)} ${hi <= 0 ? "fewer" : "more"}.`;
  }
  return `${said}, very likely between ${fmtPct(lo)} fewer and ${fmtPct(hi)} more.`;
}

/**
 * The hero's sentence and the figures that explain it, when the tracker names the limit the
 * change is stated as (`limit`, with `direction`/`percent` already that limit's). `{}` without a
 * `limit`: the email keeps its older words. `{error}` for a malformed figure.
 */
function heroLead(body) {
  const { limit } = body ?? {};
  if (limit === undefined) return {};
  if (typeof limit !== "string" || !Object.hasOwn(HERO_LIMITS, limit)) return { error: "limit must be five_hour_limit or weekly_limit" };
  const pairs = [
    ["five_hour_limit_change_pct", "five_hour_limit_change_interval_pct"],
    ["weekly_limit_change_pct", "weekly_limit_change_interval_pct"],
    ["windows_per_week_change_pct", "windows_per_week_change_interval_pct"],
  ];
  for (const [pct, range] of pairs) {
    if (body[pct] !== undefined && !isFigure(body[pct])) return { error: `${pct} must be a number` };
    if (body[range] !== undefined && !isRange(body[range])) return { error: `${range} must be two numbers` };
  }
  const { accounts } = body;
  if (accounts !== undefined && !(Number.isInteger(accounts) && accounts > 0)) {
    return { error: "accounts must be a positive whole number" };
  }
  const lines = [];
  if (isFigure(body.five_hour_limit_change_pct)) {
    lines.push(limitLine("5-hour limit", body.five_hour_limit_change_pct, body.five_hour_limit_change_interval_pct));
  }
  if (isFigure(body.weekly_limit_change_pct)) {
    lines.push(limitLine("weekly limit", body.weekly_limit_change_pct, body.weekly_limit_change_interval_pct));
  }
  if (isFigure(body.windows_per_week_change_pct)) {
    lines.push(windowsLine(body.windows_per_week_change_pct, body.windows_per_week_change_interval_pct));
  }
  if (accounts === 4) lines.push("Measured on all four Max accounts the tracker watches.");
  else if (accounts) lines.push(`Measured on ${COUNT_WORDS[accounts] ?? accounts} of the Max accounts the tracker watches.`);
  return { limit, lines };
}

/**
 * The admin form: one plain email to `to`, for the tracker's alerts to its
 * owner (an outlier, a confirmed change, a refused weight). No list, no date
 * marker, no unsubscribe link, because this is not a subscriber mail.
 */
async function sendToOne(body, env) {
  const { to, subject, text } = body;
  if (typeof to !== "string" || !isValidEmail(to)) return json({ error: "to must be an email address" }, 400);
  const address = normalizeEmail(to);
  const allowed = adminAllowlist(env.NOTIFY_ADMIN_TO);
  if (allowed && !allowed.includes(address)) return json({ error: "to is not an allowed address" }, 403);
  if (typeof subject !== "string" || subject.trim().length === 0 || subject.length > ADMIN_SUBJECT_MAX) {
    return json({ error: `subject must be 1 to ${ADMIN_SUBJECT_MAX} characters` }, 400);
  }
  if (typeof text !== "string" || text.trim().length === 0 || text.length > ADMIN_TEXT_MAX) {
    return json({ error: `text must be 1 to ${ADMIN_TEXT_MAX} characters` }, 400);
  }

  const message = {
    to: [address],
    subject: subject.trim(),
    text,
    html: emailHtml({
      heading: escapeHtml(subject.trim()),
      body: escapeHtml(text).replace(/\r?\n/g, "<br>"),
      ctaLabel: "See the tracker",
      ctaUrl: PAGE,
      footerHtml: `Sent by the tracker's own jobs to ${escapeHtml(address)}. Not a subscriber mail; there is nothing to unsubscribe from.`,
    }),
  };
  try {
    await sendEmails(env.RESEND_API_KEY, env.NOTIFY_FROM || "All Done Sites <hello@alldonesites.com>", [message]);
  } catch (err) {
    return json({ error: String(err).slice(0, 200) }, 502);
  }
  return json({ ok: true, to: address, sent: 1 });
}

/** `NOTIFY_ADMIN_TO` as a list of normalised addresses, or null when unset. */
function adminAllowlist(raw) {
  if (typeof raw !== "string" || raw.trim() === "") return null;
  return raw.split(",").map(normalizeEmail).filter((a) => a.length > 0);
}
