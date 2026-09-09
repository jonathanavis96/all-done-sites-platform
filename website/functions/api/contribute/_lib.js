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

export function secretsMatch(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length === 0 || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
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

/** Every key name under a prefix, following the KV cursor to the end. */
export async function listAllKeys(kv, prefix) {
  const names = [];
  let cursor;
  for (;;) {
    const page = await kv.list({ prefix, cursor, limit: 1000 });
    for (const k of page.keys) names.push(k.name);
    if (page.list_complete || !page.cursor) break;
    cursor = page.cursor;
  }
  return names;
}

/** Fetch many JSON values a few at a time, keeping the input order. */
export async function getManyJson(kv, keys, batch = 25) {
  const out = [];
  for (let i = 0; i < keys.length; i += batch) {
    const rows = await Promise.all(keys.slice(i, i + batch).map((k) => kv.get(k, { type: "json" })));
    out.push(...rows);
  }
  return out;
}
