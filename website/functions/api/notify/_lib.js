/**
 * Shared helpers for the "email me when Claude's limits change" endpoints.
 *
 * Underscore-prefixed, so Pages does not route it; it is bundled into the
 * sibling handlers instead. Email validation is imported from the same module
 * the React form uses, so the client and the server can never drift apart.
 */
export { isValidEmail, normalizeEmail } from "../../../src/lib/notify";

export const SITE = "https://alldonesites.com";
export const PAGE = `${SITE}/claude-usage-tracker/`;

/** KV key for a subscriber record. */
export const subKey = (email) => `sub:${email}`;
/** KV key for the marker that a given change date has already been sent. */
export const sentKey = (date) => `sent:${date}`;
/** KV key for the per-IP subscribe rate limit. */
export const rateKey = (ip) => `rl:${ip}`;

export const SUBSCRIBE_MAX_PER_WINDOW = 5;
export const SUBSCRIBE_WINDOW_SECONDS = 3600;

export function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}

const enc = new TextEncoder();

function b64urlEncode(bytes) {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(str) {
  const padded = str.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (str.length % 4)) % 4);
  const bin = atob(padded);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function hmac(secret, message) {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
  ]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(message)));
}

/**
 * A stateless link token: the address plus an HMAC over `action:email`.
 *
 * Stateless on purpose — an unsubscribe link in a two-year-old email has to keep
 * working, and a KV-stored nonce would either expire or have to be kept forever.
 * The action is inside the signed message so a confirm token cannot be replayed
 * as an unsubscribe, and vice versa.
 */
export async function signToken(secret, action, email) {
  const sig = await hmac(secret, `${action}:${email}`);
  return `${b64urlEncode(enc.encode(email))}.${b64urlEncode(sig)}`;
}

/** Verify a token and return the email it carries, or null. */
export async function verifyToken(secret, action, token) {
  if (typeof token !== "string" || token.length === 0 || token.length > 2048) return null;
  const dot = token.indexOf(".");
  if (dot <= 0 || dot !== token.lastIndexOf(".")) return null;
  let email;
  try {
    email = new TextDecoder().decode(b64urlDecode(token.slice(0, dot)));
  } catch {
    return null;
  }
  let given;
  try {
    given = b64urlDecode(token.slice(dot + 1));
  } catch {
    return null;
  }
  const want = await hmac(secret, `${action}:${email}`);
  if (given.length !== want.length) return null;
  // Constant-time compare so a signature cannot be recovered byte by byte.
  let diff = 0;
  for (let i = 0; i < want.length; i++) diff |= given[i] ^ want[i];
  return diff === 0 ? email : null;
}

export function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

/** Send one or more emails through Resend. Returns the parsed response. */
export async function sendEmails(apiKey, from, messages) {
  const batch = messages.length > 1;
  const res = await fetch(batch ? "https://api.resend.com/emails/batch" : "https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
    body: JSON.stringify(batch ? messages.map((m) => ({ from, ...m })) : { from, ...messages[0] }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`resend ${res.status}: ${text.slice(0, 500)}`);
  return text;
}

/** A minimal, inline-styled HTML shell so the mail renders without a stylesheet. */
export function emailHtml({ heading, body, ctaLabel, ctaUrl, footerHtml }) {
  return `<!doctype html><html><body style="margin:0;padding:24px;background:#f7f7f5;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#1f2328">
<div style="max-width:520px;margin:0 auto;background:#fff;border:1px solid #e6e4df;border-radius:12px;padding:28px">
<p style="margin:0 0 18px;font-size:13px;font-weight:600;color:#D97757;letter-spacing:.02em">CLAUDE USAGE TRACKER</p>
<h1 style="margin:0 0 14px;font-size:20px;line-height:1.35">${heading}</h1>
<p style="margin:0 0 22px;font-size:15px;line-height:1.6;color:#3f4550">${body}</p>
${ctaUrl ? `<p style="margin:0 0 22px"><a href="${ctaUrl}" style="display:inline-block;background:#0EA5E9;color:#fff;text-decoration:none;font-weight:600;font-size:15px;padding:11px 20px;border-radius:8px">${ctaLabel}</a></p>` : ""}
<p style="margin:0;padding-top:18px;border-top:1px solid #eeece7;font-size:12px;line-height:1.6;color:#8a8f99">${footerHtml}</p>
</div></body></html>`;
}

/** A full-page HTML response for the links people click from their inbox. */
export function pageResponse(title, message, status = 200) {
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${escapeHtml(title)} | All Done Sites</title>
<style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#f7f7f5;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#1f2328;padding:24px}
.c{max-width:460px;background:#fff;border:1px solid #e6e4df;border-radius:12px;padding:32px;text-align:center}
h1{font-size:21px;margin:0 0 12px}p{font-size:15px;line-height:1.6;color:#3f4550;margin:0 0 22px}
a{display:inline-block;background:#0EA5E9;color:#fff;text-decoration:none;font-weight:600;padding:10px 18px;border-radius:8px}</style></head>
<body><div class="c"><h1>${escapeHtml(title)}</h1><p>${escapeHtml(message)}</p><a href="${PAGE}">Back to the tracker</a></div></body></html>`;
  return new Response(html, {
    status,
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
  });
}
