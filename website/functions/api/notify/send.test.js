import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { onRequestPost } from "./send";

const SECRET = "send-secret";

/** An in-memory stand-in for the NOTIFY_KV binding. */
function fakeKv(initial = {}) {
  const store = new Map(Object.entries(initial));
  return {
    store,
    async get(key, opts) {
      const v = store.get(key);
      if (v === undefined) return null;
      return opts?.type === "json" ? JSON.parse(v) : v;
    },
    async put(key, value) {
      store.set(key, value);
    },
    async list({ prefix }) {
      const keys = [...store.keys()].filter((k) => k.startsWith(prefix)).map((name) => ({ name }));
      return { keys, list_complete: true };
    },
  };
}

function env(overrides = {}) {
  return {
    NOTIFY_KV: fakeKv(),
    RESEND_API_KEY: "re_test",
    NOTIFY_SEND_SECRET: SECRET,
    NOTIFY_TOKEN_SECRET: "token-secret",
    NOTIFY_FROM: "All Done Sites <hello@alldonesites.com>",
    ...overrides,
  };
}

function post(body, { secret = SECRET } = {}) {
  return new Request("https://alldonesites.com/api/notify/send", {
    method: "POST",
    headers: { authorization: `Bearer ${secret}`, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

const ALERT = { to: "jonathan@example.com", subject: "Claude usage tracker: Test alert", text: "line one\nline two" };

describe("POST /api/notify/send with a `to` field", () => {
  let fetchMock;
  beforeEach(() => {
    fetchMock = vi.fn(async () => new Response('{"id":"msg_1"}', { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  it("mails that one address and leaves the list and the date marker alone", async () => {
    const e = env();
    e.NOTIFY_KV.store.set("sub:someone@example.com", JSON.stringify({ status: "confirmed" }));
    const res = await onRequestPost({ request: post(ALERT), env: e });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, to: "jonathan@example.com", sent: 1 });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.resend.com/emails");
    expect(init.headers.authorization).toBe("Bearer re_test");
    const sent = JSON.parse(init.body);
    expect(sent.from).toBe("All Done Sites <hello@alldonesites.com>");
    expect(sent.to).toEqual(["jonathan@example.com"]);
    expect(sent.subject).toBe("Claude usage tracker: Test alert");
    expect(sent.text).toBe("line one\nline two");
    expect(sent.html).toContain("line one<br>line two");
    expect(sent.html).not.toContain("unsubscribe?token");

    // The subscriber was not mailed and no `sent:<date>` marker was written.
    expect([...e.NOTIFY_KV.store.keys()]).toEqual(["sub:someone@example.com"]);
  });

  it("normalises the address", async () => {
    const res = await onRequestPost({ request: post({ ...ALERT, to: "  Jonathan@Example.COM " }), env: env() });
    expect(res.status).toBe(200);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).to).toEqual(["jonathan@example.com"]);
  });

  it("escapes the subject and text in the HTML part", async () => {
    await onRequestPost({ request: post({ ...ALERT, subject: "<b>x</b>", text: "a < b & c" }), env: env() });
    const sent = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(sent.html).toContain("&lt;b&gt;x&lt;/b&gt;");
    expect(sent.html).toContain("a &lt; b &amp; c");
    expect(sent.subject).toBe("<b>x</b>");
  });

  it("is refused without the bearer secret", async () => {
    const res = await onRequestPost({ request: post(ALERT, { secret: "wrong" }), env: env() });
    expect(res.status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    ["a bad address", { ...ALERT, to: "not-an-address" }],
    ["a non-string address", { ...ALERT, to: ["jonathan@example.com"] }],
    ["a missing subject", { to: ALERT.to, text: ALERT.text }],
    ["a blank subject", { ...ALERT, subject: "   " }],
    ["an over-long subject", { ...ALERT, subject: "s".repeat(201) }],
    ["a missing text", { to: ALERT.to, subject: ALERT.subject }],
    ["an over-long text", { ...ALERT, text: "t".repeat(20001) }],
  ])("answers 400 for %s", async (_label, body) => {
    const res = await onRequestPost({ request: post(body), env: env() });
    expect(res.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("honours NOTIFY_ADMIN_TO when it is set", async () => {
    const e = env({ NOTIFY_ADMIN_TO: "Owner@Example.com, other@example.com" });
    const refused = await onRequestPost({ request: post(ALERT), env: e });
    expect(refused.status).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();

    const allowed = await onRequestPost({ request: post({ ...ALERT, to: "owner@example.com" }), env: e });
    expect(allowed.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("treats a blank NOTIFY_ADMIN_TO as unset", async () => {
    const res = await onRequestPost({ request: post(ALERT), env: env({ NOTIFY_ADMIN_TO: "  " }) });
    expect(res.status).toBe(200);
  });

  it("answers 502 when Resend refuses the mail", async () => {
    fetchMock.mockResolvedValueOnce(new Response("nope", { status: 422 }));
    const res = await onRequestPost({ request: post(ALERT), env: env() });
    expect(res.status).toBe(502);
    expect((await res.json()).error).toContain("resend 422");
  });

  it("answers 503 when the function is not configured", async () => {
    const res = await onRequestPost({ request: post(ALERT), env: env({ RESEND_API_KEY: "" }) });
    expect(res.status).toBe(503);
  });
});

describe("POST /api/notify/send without `to` (the list send)", () => {
  let fetchMock;
  beforeEach(() => {
    fetchMock = vi.fn(async () => new Response('{"id":"msg_1"}', { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  it("still fans a change out to confirmed subscribers and marks the date", async () => {
    const e = env();
    e.NOTIFY_KV.store.set("sub:a@example.com", JSON.stringify({ status: "confirmed" }));
    e.NOTIFY_KV.store.set("sub:b@example.com", JSON.stringify({ status: "pending" }));
    const change = { date: "2026-09-11", direction: "increased", percent: 7, model: "claude-opus-5" };
    const res = await onRequestPost({ request: post(change), env: e });
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true, date: "2026-09-11", subscribers: 1, sent: 1 });
    expect(e.NOTIFY_KV.store.has("sent:2026-09-11")).toBe(true);
    const sent = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(sent.to).toEqual(["a@example.com"]);
    expect(sent.subject).toBe("Anthropic increased Claude's limits by 7%");
    expect(sent.html).toContain("unsubscribe?token=");
  });
});
