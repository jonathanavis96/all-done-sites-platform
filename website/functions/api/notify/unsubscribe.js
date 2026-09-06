/**
 * /api/notify/unsubscribe?token=… — the link at the foot of every alert.
 *
 * GET is the person clicking the link. POST is the same URL arriving from a mail
 * provider acting on the `List-Unsubscribe-Post: List-Unsubscribe=One-Click`
 * header the alert carries; RFC 8058 requires that to be a POST, so handling
 * only GET would answer those 405 and quietly leave the person subscribed.
 *
 * The record is deleted rather than flagged: there is nothing else we want to
 * remember about someone who has left.
 */
import { pageResponse, subKey, verifyToken } from "./_lib";

async function unsubscribe({ request, env }) {
  const kv = env.NOTIFY_KV;
  if (!kv || !env.NOTIFY_TOKEN_SECRET) {
    return pageResponse("Something went wrong", "Unsubscribing is unavailable right now. Please try the link again later.", 503);
  }

  const token = new URL(request.url).searchParams.get("token");
  const email = await verifyToken(env.NOTIFY_TOKEN_SECRET, "unsub", token);
  if (!email) {
    return pageResponse("That link isn't valid", "The unsubscribe link was incomplete or has been altered. Reply to the alert and we'll remove you by hand.", 400);
  }

  await kv.delete(subKey(email));
  // Deleting an absent key is a no-op, so a second click reads as success too.
  return pageResponse("You're unsubscribed", "We won't email you about Claude's limits again. You can sign up again any time from the tracker page.");
}

export const onRequestGet = unsubscribe;
export const onRequestPost = unsubscribe;
