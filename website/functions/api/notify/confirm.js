/**
 * GET /api/notify/confirm?token=… — the link from the confirmation email.
 * Returns a full HTML page, because a person clicks this from their inbox.
 */
import { pageResponse, subKey, verifyToken } from "./_lib";

export async function onRequestGet({ request, env }) {
  const kv = env.NOTIFY_KV;
  if (!kv || !env.NOTIFY_TOKEN_SECRET) {
    return pageResponse("Something went wrong", "Confirmation is unavailable right now. Please try the link again later.", 503);
  }

  const token = new URL(request.url).searchParams.get("token");
  const email = await verifyToken(env.NOTIFY_TOKEN_SECRET, "confirm", token);
  if (!email) {
    return pageResponse("That link isn't valid", "The confirmation link was incomplete or has been altered. Sign up again from the tracker page.", 400);
  }

  const existing = await kv.get(subKey(email), { type: "json" });
  if (!existing) {
    return pageResponse("Sign up again", "We have no pending sign-up for that address. Enter it on the tracker page and we'll send a fresh link.", 404);
  }
  if (existing.status !== "confirmed") {
    const now = new Date().toISOString();
    await kv.put(
      subKey(email),
      JSON.stringify({ ...existing, status: "confirmed", confirmed_at: now, updated_at: now }),
    );
  }

  return pageResponse(
    "You're on the list",
    "We'll email you the next time Anthropic changes Claude's usage limits. Every email carries a one-click unsubscribe link.",
  );
}
