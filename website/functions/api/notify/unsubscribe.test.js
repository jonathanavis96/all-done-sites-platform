import { describe, expect, it, vi } from "vitest";
import { onRequestGet, onRequestPost } from "./unsubscribe";
import { signToken, subKey } from "./_lib";

const SECRET = "token-secret";
const EMAIL = "someone@example.com";

function env() {
  const store = new Map([[subKey(EMAIL), JSON.stringify({ status: "confirmed" })]]);
  return {
    NOTIFY_TOKEN_SECRET: SECRET,
    NOTIFY_KV: {
      store,
      delete: vi.fn(async (key) => {
        store.delete(key);
      }),
    },
  };
}

const url = (token) => `https://alldonesites.com/api/notify/unsubscribe?token=${encodeURIComponent(token)}`;

describe("GET /api/notify/unsubscribe (a person, or a mail scanner following the link)", () => {
  it("shows a confirm page and deletes nothing", async () => {
    const e = env();
    const token = await signToken(SECRET, "unsub", EMAIL);
    const res = await onRequestGet({ request: new Request(url(token)), env: e });
    const html = await res.text();
    expect(res.status).toBe(200);
    expect(e.NOTIFY_KV.delete).not.toHaveBeenCalled();
    expect(e.NOTIFY_KV.store.has(subKey(EMAIL))).toBe(true);
    expect(html).toContain('<form method="post"');
    expect(html).toContain(`action="/api/notify/unsubscribe?token=${encodeURIComponent(token)}"`);
    expect(html).toContain("<button");
  });

  it("does not offer the button on a bad token", async () => {
    const res = await onRequestGet({ request: new Request(url("nonsense.token")), env: env() });
    expect(res.status).toBe(400);
    expect(await res.text()).not.toContain("<form");
  });

  it("does not accept a token signed for a different action", async () => {
    const token = await signToken(SECRET, "confirm", EMAIL);
    const res = await onRequestGet({ request: new Request(url(token)), env: env() });
    expect(res.status).toBe(400);
  });
});

describe("POST /api/notify/unsubscribe", () => {
  it("deletes the subscription for the confirm page's form", async () => {
    const e = env();
    const token = await signToken(SECRET, "unsub", EMAIL);
    const res = await onRequestPost({ request: new Request(url(token), { method: "POST" }), env: e });
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("unsubscribed</h1>");
    expect(e.NOTIFY_KV.store.has(subKey(EMAIL))).toBe(false);
  });

  it("deletes the subscription for a mail provider's one-click call (RFC 8058)", async () => {
    const e = env();
    const token = await signToken(SECRET, "unsub", EMAIL);
    const request = new Request(url(token), {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: "List-Unsubscribe=One-Click",
    });
    const res = await onRequestPost({ request, env: e });
    expect(res.status).toBe(200);
    expect(e.NOTIFY_KV.store.has(subKey(EMAIL))).toBe(false);
  });

  it("refuses a bad token and deletes nothing", async () => {
    const e = env();
    const res = await onRequestPost({ request: new Request(url("nonsense.token"), { method: "POST" }), env: e });
    expect(res.status).toBe(400);
    expect(e.NOTIFY_KV.delete).not.toHaveBeenCalled();
  });
});
