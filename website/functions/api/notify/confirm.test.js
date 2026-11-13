import { describe, expect, it } from "vitest";
import { onRequestGet } from "./confirm";
import { pendingKey, signToken, subKey } from "./_lib";

const SECRET = "token-secret";
const EMAIL = "someone@example.com";

function env(status = "pending", key = status === "pending" ? pendingKey(EMAIL) : subKey(EMAIL)) {
  const store = new Map([[key, JSON.stringify({ status, created_at: "2026-11-01T00:00:00.000Z" })]]);
  return {
    NOTIFY_TOKEN_SECRET: SECRET,
    NOTIFY_KV: {
      store,
      puts: [],
      async get(key, opts) {
        const v = store.get(key);
        if (v === undefined) return null;
        return opts?.type === "json" ? JSON.parse(v) : v;
      },
      async put(key, value, opts) {
        this.puts.push({ key, opts });
        store.set(key, value);
      },
      async delete(key) {
        store.delete(key);
      },
    },
  };
}

const url = (token) => `https://alldonesites.com/api/notify/confirm?token=${encodeURIComponent(token)}`;

describe("GET /api/notify/confirm (the link in the email)", () => {
  it("confirms the sign-up, keeping created_at, and writes it without a TTL", async () => {
    const e = env();
    const token = await signToken(SECRET, "confirm", EMAIL);
    const res = await onRequestGet({ request: new Request(url(token)), env: e });
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("on the list");
    const rec = JSON.parse(e.NOTIFY_KV.store.get(subKey(EMAIL)));
    expect(rec).toMatchObject({ status: "confirmed", created_at: "2026-11-01T00:00:00.000Z" });
    expect(e.NOTIFY_KV.puts).toEqual([{ key: subKey(EMAIL), opts: undefined }]);
    expect(e.NOTIFY_KV.store.has(pendingKey(EMAIL))).toBe(false);
  });

  it("confirms a pending sign-up stored under sub: before sign-ups had their own key", async () => {
    const e = env("pending", subKey(EMAIL));
    const token = await signToken(SECRET, "confirm", EMAIL);
    const res = await onRequestGet({ request: new Request(url(token)), env: e });
    expect(res.status).toBe(200);
    expect(JSON.parse(e.NOTIFY_KV.store.get(subKey(EMAIL))).status).toBe("confirmed");
  });

  it("leaves an already confirmed subscriber as they are", async () => {
    const e = env("confirmed");
    const token = await signToken(SECRET, "confirm", EMAIL);
    const res = await onRequestGet({ request: new Request(url(token)), env: e });
    expect(await res.text()).toContain("on the list");
    expect(e.NOTIFY_KV.puts).toEqual([]);
  });

  it("refuses a bad token and an unsubscribe token", async () => {
    const bad = await onRequestGet({ request: new Request(url("nonsense.token")), env: env() });
    expect(bad.status).toBe(400);
    const unsub = await signToken(SECRET, "unsub", EMAIL);
    const wrong = await onRequestGet({ request: new Request(url(unsub)), env: env() });
    expect(wrong.status).toBe(400);
  });

  it("answers 404 when there is no sign-up, e.g. after a pending one expired", async () => {
    const e = env();
    e.NOTIFY_KV.store.clear();
    const token = await signToken(SECRET, "confirm", EMAIL);
    const res = await onRequestGet({ request: new Request(url(token)), env: e });
    expect(res.status).toBe(404);
  });
});

