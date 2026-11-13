/**
 * /api/notify/confirm?token=… — the link from the confirmation email.
 * Returns a full HTML page, because a person clicks this from their inbox.
 *
 * GET never confirms. Mail scanners and link previews fetch every URL in a
 * message, so a GET that confirmed would put an address on the list that nobody
 * confirmed, which defeats the double opt-in. GET checks the link and shows a
 * page with one button; POST, from that button, confirms. Unsubscribe works the
 * same way.
 */
import { pageResponse, pendingKey, subKey, verifyToken } from "./_lib";

/** The address in a valid confirmation link and its record, or the error page to show instead. */
async function readLink({ request, env }) {
  const kv = env.NOTIFY_KV;
  if (!kv || !env.NOTIFY_TOKEN_SECRET) {
    return { error: pageResponse("Something went wrong", "Confirmation is unavailable right now. Please try the link again later.", 503) };
  }

  const token = new URL(request.url).searchParams.get("token");
  const email = await verifyToken(env.NOTIFY_TOKEN_SECRET, "confirm", token);
  if (!email) {
    return { error: pageResponse("That link isn't valid", "The confirmation link was incomplete or has been altered. Sign up again from the tracker page.", 400) };
  }

  // The confirmed record, else the pending sign-up (a `sub:` record may also be a pending one
  // written before sign-ups had their own key).
  const existing = (await kv.get(subKey(email), { type: "json" })) ?? (await kv.get(pendingKey(email), { type: "json" }));
  if (!existing) {
    return { error: pageResponse("Sign up again", "We have no pending sign-up for that address. Enter it on the tracker page and we'll send a fresh link.", 404) };
  }
  return { email, existing };
}

const ON_THE_LIST = [
  "You're on the list",
  "We'll email you the next time Anthropic changes Claude's usage limits. Every email carries a one-click unsubscribe link.",
];

export async function onRequestGet(context) {
  const { existing, error } = await readLink(context);
  if (error) return error;
  if (existing.status === "confirmed") return pageResponse(...ON_THE_LIST);
  const { pathname, search } = new URL(context.request.url);
  return pageResponse("Confirm your alert", "Press the button and we'll email you the next time Anthropic changes Claude's usage limits.", 200, {
    action: `${pathname}${search}`,
    label: "Confirm subscription",
  });
}

export async function onRequestPost(context) {
  const { email, existing, error } = await readLink(context);
  if (error) return error;
  if (existing.status !== "confirmed") {
    const now = new Date().toISOString();
    // Written without a TTL: a confirmed subscription lasts until its owner unsubscribes.
    await context.env.NOTIFY_KV.put(
      subKey(email),
      JSON.stringify({ ...existing, status: "confirmed", confirmed_at: now, updated_at: now }),
    );
    await context.env.NOTIFY_KV.delete(pendingKey(email));
  }
  return pageResponse(...ON_THE_LIST);
}
