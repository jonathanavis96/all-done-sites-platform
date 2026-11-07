/**
 * /api/notify/unsubscribe?token=… — the link at the foot of every alert.
 *
 * GET never unsubscribes. Mail scanners and link previews fetch every URL in a
 * message, so a GET that deleted the record would unsubscribe people who never
 * clicked anything. GET checks the token and shows a page with one button.
 *
 * POST does the work. It comes from that button, or from a mail provider acting
 * on the `List-Unsubscribe-Post: List-Unsubscribe=One-Click` header the alert
 * carries; RFC 8058 requires that to be a POST.
 *
 * The record is deleted rather than flagged: there is nothing else we want to
 * remember about someone who has left.
 */
import { pageResponse, subKey, verifyToken } from "./_lib";

/** The address in a valid unsubscribe link, or the error page to show instead. */
async function readLink({ request, env }) {
  if (!env.NOTIFY_KV || !env.NOTIFY_TOKEN_SECRET) {
    return { error: pageResponse("Something went wrong", "Unsubscribing is unavailable right now. Please try the link again later.", 503) };
  }
  const token = new URL(request.url).searchParams.get("token");
  const email = await verifyToken(env.NOTIFY_TOKEN_SECRET, "unsub", token);
  if (!email) {
    return { error: pageResponse("That link isn't valid", "The unsubscribe link was incomplete or has been altered. Reply to the alert and we'll remove you by hand.", 400) };
  }
  return { email };
}

export async function onRequestGet(context) {
  const { error } = await readLink(context);
  if (error) return error;
  const { pathname, search } = new URL(context.request.url);
  return pageResponse("Stop these emails?", "Press the button and we won't email you about Claude's limits again.", 200, {
    action: `${pathname}${search}`,
    label: "Unsubscribe",
  });
}

export async function onRequestPost(context) {
  const { email, error } = await readLink(context);
  if (error) return error;
  await context.env.NOTIFY_KV.delete(subKey(email));
  // Deleting an absent key is a no-op, so a second press reads as success too.
  return pageResponse("You're unsubscribed", "We won't email you about Claude's limits again. You can sign up again any time from the tracker page.");
}
