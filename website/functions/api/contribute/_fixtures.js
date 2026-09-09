/**
 * Test doubles for the contribute endpoints. Underscore-prefixed so Pages never
 * routes it; only the sibling *.test.js files import it.
 */

/** An in-memory stand-in for the NOTIFY_KV binding, with cursor pagination. */
export function fakeKv(initial = {}) {
  const store = new Map(Object.entries(initial));
  const ttls = new Map();
  return {
    store,
    ttls,
    async get(key, opts) {
      const v = store.get(key);
      if (v === undefined) return null;
      return opts?.type === "json" ? JSON.parse(v) : v;
    },
    async put(key, value, opts) {
      store.set(key, value);
      ttls.set(key, opts?.expirationTtl);
    },
    async delete(key) {
      store.delete(key);
      ttls.delete(key);
    },
    async list({ prefix = "", cursor, limit = 1000 } = {}) {
      const all = [...store.keys()].filter((k) => k.startsWith(prefix)).sort();
      const start = cursor ? Number(cursor) : 0;
      const keys = all.slice(start, start + limit).map((name) => ({ name }));
      const end = start + keys.length;
      return end < all.length ? { keys, list_complete: false, cursor: String(end) } : { keys, list_complete: true };
    },
  };
}

export const CONTRIB_ID = "3f7a2b1c-9d4e-4f60-8a1b-2c3d4e5f6a7b";
export const OTHER_ID = "9b8c7d6e-5f4a-4b3c-9d2e-1f0a9b8c7d6e";

/** A body exactly like `sample.py` posts, timestamped relative to `now`. */
export function validBody(now = Date.now(), overrides = {}) {
  const iso = (ms) => new Date(ms).toISOString().replace(/\.\d{3}Z$/, "Z");
  return {
    client_version: "contrib-sample/0.1.0",
    contributor_id: CONTRIB_ID,
    plan: "max5",
    plan_source: "stored",
    ts: iso(now),
    five_hour: { utilization: 37.5, resets_at: iso(now + 2 * 3600e3) },
    seven_day: { utilization: 12, resets_at: iso(now + 3 * 86400e3) },
    tokens_since_five_hour_reset: {
      "claude-sonnet-5": { input: 1200, output: 340, cache_read: 480000, cache_write: 9000 },
      "claude-opus-5": { input: 10, output: 5, cache_read: 2000, cache_write: 0 },
    },
    tokens_since_seven_day_reset: {
      "claude-sonnet-5": { input: 9000, output: 2100, cache_read: 3200000, cache_write: 61000 },
      "claude-opus-5": { input: 10, output: 5, cache_read: 2000, cache_write: 0 },
    },
    ...overrides,
  };
}

/** The record the endpoint stores for a body, minus received_at. */
export function storedRecord(kv, id, ts) {
  const raw = kv.store.get(`contrib:s:${id}:${ts}`);
  return raw ? JSON.parse(raw) : null;
}
