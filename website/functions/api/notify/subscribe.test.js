import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { onRequestPost } from "./subscribe";
import { PENDING_TTL_SECONDS, pendingKey, subKey } from "./_lib";

function fakeKv() {
  const store = new Map();
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
  };
}

const env = () => ({ NOTIFY_KV: fakeKv(), RESEND_API_KEY: "re_test", NOTIFY_TOKEN_SECRET: "token-secret" });
const post = (email) =>
  new Request("https://alldonesites.com/api/notify/subscribe", {
    method: "POST",
    headers: { "content-type": "application/json", "cf-connecting-ip": "203.0.113.7" },
    body: JSON.stringify({ email }),
  });

describe("POST /api/notify/subscribe", () => {
  beforeEach(() => vi.stubGlobal("fetch", vi.fn(async () => new Response('{"data":[]}', { status: 200 }))));
  afterEach(() => vi.unstubAllGlobals());

  it("stores a new sign-up as pending with an expiry, so unconfirmed ones do not pile up", async () => {
    const e = env();
    const res = await onRequestPost({ request: post("someone@example.com"), env: e });
    expect(res.status).toBe(200);
    const key = pendingKey("someone@example.com");
    expect(JSON.parse(e.NOTIFY_KV.store.get(key)).status).toBe("pending");
    expect(e.NOTIFY_KV.ttls.get(key)).toBe(PENDING_TTL_SECONDS);
  });

  it("never writes the subscriber record, so a stale read cannot put a confirmed subscriber back to pending", async () => {
    const e = env();
    // KV reads can lag a write by up to a minute: the record was just confirmed elsewhere, but
    // this read still sees nothing.
    e.NOTIFY_KV.store.set(subKey("someone@example.com"), JSON.stringify({ status: "confirmed" }));
    const get = e.NOTIFY_KV.get;
    e.NOTIFY_KV.get = async (key, opts) => (key.startsWith("sub:") ? null : get.call(e.NOTIFY_KV, key, opts));
    const res = await onRequestPost({ request: post("someone@example.com"), env: e });
    expect(res.status).toBe(200);
    expect(JSON.parse(e.NOTIFY_KV.store.get(subKey("someone@example.com"))).status).toBe("confirmed");
    expect(e.NOTIFY_KV.ttls.has(subKey("someone@example.com"))).toBe(false);
  });
});
