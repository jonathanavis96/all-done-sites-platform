import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { onRequestPost } from "./subscribe";
import { PENDING_TTL_SECONDS, subKey } from "./_lib";

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
    const key = subKey("someone@example.com");
    expect(JSON.parse(e.NOTIFY_KV.store.get(key)).status).toBe("pending");
    expect(e.NOTIFY_KV.ttls.get(key)).toBe(PENDING_TTL_SECONDS);
  });
});
