/**
 * Helpers shared by the notify and contribute endpoints. Underscore-prefixed, so
 * Pages does not route it.
 */

/** Constant-time string compare, so a bearer secret cannot be probed byte by byte. */
export function secretsMatch(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length === 0 || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
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
