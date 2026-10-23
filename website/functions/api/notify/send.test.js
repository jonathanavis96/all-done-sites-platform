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
    async delete(key) {
      store.delete(key);
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
    expect(sent.subject).toBe("Claude's observed 5-hour window budget increased by 7%");
    expect(sent.text).toContain("Claude's observed 5-hour window budget increased by 7% on 11 Sep 2026.");
    expect(sent.html).toContain("unsubscribe?token=");
    expect(`${sent.subject} ${sent.text} ${sent.html}`).not.toContain("Anthropic");
  });

  it("says the observed weekly-to-window ratio when scope is weekly, without claiming a policy change", async () => {
    const e = env();
    e.NOTIFY_KV.store.set("sub:a@example.com", JSON.stringify({ status: "confirmed" }));
    const change = { date: "2026-08-21", direction: "decreased", percent: 36, scope: "weekly" };
    const res = await onRequestPost({ request: post(change), env: e });
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true, date: "2026-08-21", subscribers: 1, sent: 1 });
    const sent = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(sent.subject).toBe("Claude's observed weekly-to-window ratio decreased by 36%");
    expect(sent.text).toContain("Claude's observed weekly-to-window ratio decreased by 36% on 21 Aug 2026.");
    expect(`${sent.subject} ${sent.text} ${sent.html}`).not.toContain("Anthropic");
  });

  // The 9 October change as the tracker sends it once measured: found on windows per week, stated
  // by the hero as the 5-hour limit (tracker `last_change.hero`), so `direction`/`percent` are the
  // 5-hour limit's and `limit` names it.
  const OCT09 = {
    date: "2026-10-09", direction: "increased", percent: 17, state: "measured", limit: "five_hour_limit",
    metric: "windows_per_week", change_pct: -9.2, interval_pct: [-12.9, -5.2],
    five_hour_limit_change_pct: 17.1, five_hour_limit_change_interval_pct: [9.3, 25.5],
    weekly_limit_change_pct: 5.6, weekly_limit_change_interval_pct: [-0.0, 11.6],
    windows_per_week_change_pct: -9.2, windows_per_week_change_interval_pct: [-12.9, -5.2],
    accounts: 4,
  };

  it("leads with the hero's sentence when the tracker names the limit, and explains the figures", async () => {
    const e = env();
    e.NOTIFY_KV.store.set("sub:a@example.com", JSON.stringify({ status: "confirmed" }));
    const res = await onRequestPost({ request: post(OCT09), env: e });
    expect(await res.json()).toMatchObject({ ok: true, date: "2026-10-09", sent: 1 });
    const sent = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(sent.subject).toBe("Anthropic increased Claude's 5-hour limit by 17%");
    expect(sent.text.split("\n\nSee the full history")[0]).toBe(
      [
        "Anthropic increased Claude's 5-hour limit by 17% on 9 Oct 2026.",
        "",
        "The 5-hour limit increased 17.1% (very likely between 9.3% and 25.5%).",
        "The weekly limit increased 5.6% (very likely between 0% and 11.6%).",
        "So a week now holds about 9% fewer full 5-hour windows (very likely between 5.2% and 12.9% fewer).",
        "Measured on all four Max accounts the tracker watches.",
      ].join("\n"),
    );
    expect(sent.html).toContain("Anthropic increased Claude&#39;s 5-hour limit by 17% on 9 Oct 2026.");
    expect(sent.html).toContain(
      'The 5-hour limit increased 17.1%.<br><span style="font-size:12px;color:#8a8f99">very likely between 9.3% and 25.5%</span><br><br>The weekly limit increased 5.6%.',
    );
    expect(sent.html).toContain("the tracker watches.<br><br>The tracker has the full history.");
    expect(sent.html).toContain("unsubscribe?token=");
    expect(`${sent.subject} ${sent.text}`).not.toMatch(/observed|interval|ratio/i);
  });

  it("states the weekly limit when the tracker names it, and words a range across no change", async () => {
    const e = env();
    e.NOTIFY_KV.store.set("sub:a@example.com", JSON.stringify({ status: "confirmed" }));
    const change = {
      date: "2026-09-23", direction: "increased", percent: 21, limit: "weekly_limit",
      five_hour_limit_change_pct: 19.7, five_hour_limit_change_interval_pct: [3.1, 39.1],
      weekly_limit_change_pct: 20.5, weekly_limit_change_interval_pct: [13.5, 27.9],
      windows_per_week_change_pct: -2.6, windows_per_week_change_interval_pct: [-12.5, 8.4],
      accounts: 3,
    };
    await onRequestPost({ request: post(change), env: e });
    const sent = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(sent.subject).toBe("Anthropic increased Claude's weekly limit by 21%");
    expect(sent.text).toContain("Anthropic increased Claude's weekly limit by 21% on 23 Sep 2026.");
    expect(sent.text).toContain(
      "So a week now holds about 3% fewer full 5-hour windows (very likely between 12.5% fewer and 8.4% more).",
    );
    expect(sent.text).toContain("Measured on three of the Max accounts the tracker watches.");
  });

  it("words a limit range that spans no change as a decrease and an increase", async () => {
    const e = env();
    e.NOTIFY_KV.store.set("sub:a@example.com", JSON.stringify({ status: "confirmed" }));
    const change = { ...OCT09, weekly_limit_change_pct: 5.3, weekly_limit_change_interval_pct: [-0.7, 11.8] };
    await onRequestPost({ request: post(change), env: e });
    const sent = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(sent.text).toContain(
      "The weekly limit increased 5.3% (very likely between a 0.7% decrease and an 11.8% increase).",
    );
  });

  it.each([
    ["an unknown limit", { ...OCT09, limit: "windows_per_week" }],
    ["an inherited property name as the limit", { ...OCT09, limit: "constructor" }],
    ["a prototype key as the limit", { ...OCT09, limit: "__proto__" }],
    ["a non-numeric figure", { ...OCT09, weekly_limit_change_pct: "5.6" }],
    ["a one-ended range", { ...OCT09, five_hour_limit_change_interval_pct: [9.3] }],
    ["a fractional account count", { ...OCT09, accounts: 3.5 }],
  ])("answers 400 for %s and marks nothing sent", async (_label, change) => {
    const e = env();
    const res = await onRequestPost({ request: post(change), env: e });
    expect(res.status).toBe(400);
    expect(e.NOTIFY_KV.store.has("sent:2026-10-09")).toBe(false);
  });

  it("rejects an unrecognised scope", async () => {
    const e = env();
    const change = { date: "2026-08-21", direction: "decreased", percent: 36, scope: "monthly" };
    const res = await onRequestPost({ request: post(change), env: e });
    expect(res.status).toBe(400);
  });

  it("rejects a calendar date that does not exist rather than mailing the day it rolls over to", async () => {
    const e = env();
    const change = { date: "2026-02-31", direction: "increased", percent: 5 };
    const res = await onRequestPost({ request: post(change), env: e });
    expect(res.status).toBe(400);
    expect(e.NOTIFY_KV.store.has("sent:2026-02-31")).toBe(false);
  });

  it("releases the date marker when every batch fails, so a retry can still send", async () => {
    fetchMock.mockImplementation(async () => new Response("down", { status: 500 }));
    const e = env();
    e.NOTIFY_KV.store.set("sub:a@example.com", JSON.stringify({ status: "confirmed" }));
    const change = { date: "2026-09-11", direction: "increased", percent: 7 };
    const res = await onRequestPost({ request: post(change), env: e });
    expect(await res.json()).toMatchObject({ ok: false, sent: 0 });
    expect(e.NOTIFY_KV.store.has("sent:2026-09-11")).toBe(false);

    fetchMock.mockImplementation(async () => new Response('{"id":"msg_1"}', { status: 200 }));
    const retry = await onRequestPost({ request: post(change), env: e });
    expect(await retry.json()).toMatchObject({ ok: true, sent: 1 });
  });
});
