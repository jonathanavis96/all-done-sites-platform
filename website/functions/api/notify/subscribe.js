/**
 * POST /api/notify/subscribe — start a subscription to the "Anthropic changed
 * Claude's limits" alert.
 *
 * Always answers 200 with the same body for any deliverable-looking address,
 * confirmed or not, so the endpoint cannot be used to test whether a given
 * address is on the list. Nothing is mailed to a confirmed subscriber.
 */
import {
  PENDING_TTL_SECONDS,
  SUBSCRIBE_MAX_PER_WINDOW,
  SUBSCRIBE_WINDOW_SECONDS,
  emailHtml,
  isValidEmail,
  json,
  normalizeEmail,
  pendingKey,
  rateKey,
  sendEmails,
  signToken,
  subKey,
  SITE,
} from "./_lib";

export async function onRequestPost(context) {
  const { request, env } = context;
  const kv = env.NOTIFY_KV;
  if (!kv || !env.RESEND_API_KEY || !env.NOTIFY_TOKEN_SECRET) {
    return json({ error: "Sign-up is not available right now." }, 503);
  }

  let payload;
  try {
    payload = await request.json();
  } catch {
    return json({ error: "Send a JSON body." }, 400);
  }
  const raw = typeof payload?.email === "string" ? payload.email : "";
  if (!isValidEmail(raw)) return json({ error: "That doesn't look like an email address." }, 400);
  const email = normalizeEmail(raw);

  // Per-IP throttle. KV is eventually consistent, so this is a speed bump
  // against casual abuse rather than an exact counter — which is all a
  // single-purpose sign-up form needs.
  const ip = request.headers.get("cf-connecting-ip") || "unknown";
  const seen = Number((await kv.get(rateKey(ip))) || 0);
  if (seen >= SUBSCRIBE_MAX_PER_WINDOW) {
    return json({ error: "Too many sign-ups from here. Try again in an hour." }, 429);
  }
  await kv.put(rateKey(ip), String(seen + 1), { expirationTtl: SUBSCRIBE_WINDOW_SECONDS });

  const existing = await kv.get(subKey(email), { type: "json" });
  if (existing?.status === "confirmed") {
    return json({ ok: true, message: "Check your inbox for the confirmation link." });
  }

  // The pending record has its own key and expires unless confirmed. This never writes `sub:`,
  // so a stale read above cannot put a just-confirmed subscriber back to pending.
  const now = new Date().toISOString();
  const pending = await kv.get(pendingKey(email), { type: "json" });
  await kv.put(
    pendingKey(email),
    JSON.stringify({ status: "pending", created_at: pending?.created_at ?? existing?.created_at ?? now, updated_at: now }),
    { expirationTtl: PENDING_TTL_SECONDS },
  );

  const token = await signToken(env.NOTIFY_TOKEN_SECRET, "confirm", email);
  const confirmUrl = `${SITE}/api/notify/confirm?token=${encodeURIComponent(token)}`;
  try {
    await sendEmails(env.RESEND_API_KEY, env.NOTIFY_FROM || "All Done Sites <hello@alldonesites.com>", [
      {
        to: [email],
        subject: "Confirm your Claude limits alert",
        text: `Open this link and press the button to confirm your subscription: ${confirmUrl}\n\nIf you didn't sign up, ignore this email.`,
        html: emailHtml({
          heading: "Confirm your alert",
          body: "We'll email you when Anthropic changes Claude's usage limits — nothing else, and no more than one email per change.",
          ctaLabel: "Confirm subscription",
          ctaUrl: confirmUrl,
          footerHtml: "If you didn't sign up, ignore this email and you'll hear nothing more.",
        }),
      },
    ]);
  } catch {
    return json({ error: "We couldn't send the confirmation email. Try again shortly." }, 502);
  }

  return json({ ok: true, message: "Check your inbox for the confirmation link." });
}
