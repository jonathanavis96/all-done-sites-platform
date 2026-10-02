/**
 * Shared helpers for the contributed-meter endpoints (/api/contribute, /me, /export).
 *
 * Underscore-prefixed, so Pages does not route it. Storage reuses the NOTIFY_KV
 * binding under a `contrib:` prefix, no new Cloudflare resources:
 *
 *   contrib:s:<contributor_id>:<ts>   one sample, the validated body plus received_at, 180-day TTL
 *   contrib:rl:id:<contributor_id>    per-contributor hourly counter
 *   contrib:rl:ip:<sha256 of ip>      per-IP hourly counter (the hash is never stored on a sample)
 *
 * Validation itself lives in src/lib/contrib.ts, shared with the page, so the paste
 * box and the server can never disagree about what a sample is.
 */
export {
  MAX_BODY_BYTES,
  PUBLIC_FIELDS,
  byteLength,
  decodeCut1,
  isContributorId,
  validateSample,
} from "../../../src/lib/contrib";
export { getManyJson, listAllKeys, secretsMatch } from "../_shared";

export const SITE = "https://alldonesites.com";
export const ME_PATH = "/claude-usage-tracker/me/";

export const SAMPLE_TTL_SECONDS = 180 * 86400;
export const RATE_WINDOW_SECONDS = 3600;
export const MAX_PER_ID_PER_HOUR = 4;
export const MAX_PER_IP_PER_HOUR = 30;
/** Longest raw request body read before parsing; a CUT1 wrapper around a 2 KB body fits. */
export const MAX_RAW_BYTES = 4096;

export const SAMPLE_PREFIX = "contrib:s:";
export const samplePrefix = (id) => `${SAMPLE_PREFIX}${id}:`;
export const sampleKey = (id, ts) => `${SAMPLE_PREFIX}${id}:${ts}`;
export const idRateKey = (id) => `contrib:rl:id:${id}`;
export const ipRateKey = (ipHash) => `contrib:rl:ip:${ipHash}`;

/**
 * The request body as text, or null once it passes `max` bytes. Reads chunk by chunk so an
 * oversized or never-ending body is abandoned at the cap rather than buffered whole.
 */
export async function readCappedText(request, max) {
  if (!request.body) return "";
  const reader = request.body.getReader();
  const chunks = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > max) {
      reader.cancel().catch(() => {});
      return null;
    }
    chunks.push(value);
  }
  const all = new Uint8Array(size);
  let at = 0;
  for (const c of chunks) {
    all.set(c, at);
    at += c.byteLength;
  }
  return new TextDecoder().decode(all);
}

export function json(body, status = 200, origin = null) {
  const headers = { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" };
  if (origin) {
    headers["access-control-allow-origin"] = origin;
    headers.vary = "origin";
  }
  return new Response(JSON.stringify(body), { status, headers });
}

export async function sha256Hex(text) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Which origin, if any, a browser request may read the response from.
 *
 * The page's paste box posts from the site itself, so the only browser origin
 * allowed is the site (or the request's own origin, which is the same thing in
 * production and keeps `wrangler pages dev` working locally). The script posts
 * with no Origin header at all. Anything else is a foreign page and is refused.
 */
export function originCheck(request) {
  const origin = request.headers.get("origin");
  if (!origin) return { allow: null, foreign: false };
  let self = "";
  try {
    self = new URL(request.url).origin;
  } catch {
    // leave self empty
  }
  const ok = origin === SITE || (self !== "" && origin === self);
  return { allow: ok ? origin : null, foreign: !ok };
}
