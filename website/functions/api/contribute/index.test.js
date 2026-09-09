import { describe, expect, it } from "vitest";
import { onRequestOptions, onRequestPost } from "./index";
import { encodeCut1 } from "../../../src/lib/contrib";
import { CONTRIB_ID, OTHER_ID, fakeKv, storedRecord, validBody } from "./_fixtures";

function env(overrides = {}) {
  return { NOTIFY_KV: fakeKv(), NOTIFY_TOKEN_SECRET: "token-secret", ...overrides };
}

function post(body, { origin, ip = "203.0.113.7", raw } = {}) {
  const headers = { "content-type": "application/json", "cf-connecting-ip": ip };
  if (origin) headers.origin = origin;
  return new Request("https://alldonesites.com/api/contribute", {
    method: "POST",
    headers,
    body: raw ?? JSON.stringify(body),
  });
}

const call = (body, e = env(), opts) => onRequestPost({ request: post(body, opts), env: e });

describe("POST /api/contribute with a JSON body", () => {
  it("stores the sample under contrib:s:<id>:<ts> with a 180-day TTL and counts it", async () => {
    const e = env();
    const body = validBody();
    const res = await call(body, e);
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(await res.json()).toEqual({
      ok: true,
      me_url: `https://alldonesites.com/claude-usage-tracker/me/${CONTRIB_ID}`,
      samples: 1,
    });

    const key = `contrib:s:${CONTRIB_ID}:${body.ts}`;
    const stored = storedRecord(e.NOTIFY_KV, CONTRIB_ID, body.ts);
    expect(stored).toMatchObject(body);
    expect(typeof stored.received_at).toBe("string");
    // Exactly the documented fields plus received_at: no IP hash, nothing else.
    expect(Object.keys(stored).sort()).toEqual([...Object.keys(body), "received_at"].sort());
    expect(e.NOTIFY_KV.ttls.get(key)).toBe(180 * 86400);
    // Rate-limit keys were written, and the IP is hashed rather than stored.
    const keys = [...e.NOTIFY_KV.store.keys()];
    expect(keys).toContain(`contrib:rl:id:${CONTRIB_ID}`);
    expect(keys.some((k) => k.startsWith("contrib:rl:ip:") && /^contrib:rl:ip:[0-9a-f]{64}$/.test(k))).toBe(true);
    expect(keys.some((k) => k.includes("203.0.113.7"))).toBe(false);
  });

  it("counts every sample this id has stored", async () => {
    const e = env();
    const now = Date.now();
    await call(validBody(now - 3600e3), e);
    const res = await call(validBody(now), e);
    expect((await res.json()).samples).toBe(2);
  });

  it("stores the same row from the CUT1 wrapper form", async () => {
    const e = env();
    const body = validBody();
    const res = await call({ cut1: encodeCut1(body) }, e);
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true, samples: 1 });
    const stored = storedRecord(e.NOTIFY_KV, CONTRIB_ID, body.ts);
    delete stored.received_at;
    expect(stored).toEqual(body);
  });

  it("tolerates whitespace around the CUT1 line", async () => {
    const res = await call({ cut1: `  ${encodeCut1(validBody())}\n` });
    expect(res.status).toBe(200);
  });

  it.each([
    ["not a CUT1 line", "hello"],
    ["bad base64", "CUT1:@@@"],
    ["a CUT1 line that is not JSON", "CUT1:aGVsbG8"],
    ["a non-string cut1", 42],
  ])("answers 400 for %s in the wrapper", async (_label, cut1) => {
    const res = await call({ cut1 });
    expect(res.status).toBe(400);
    expect(typeof (await res.json()).error).toBe("string");
  });

  it("answers 400 for a body that is not JSON", async () => {
    const res = await call(null, env(), { raw: "{not json" });
    expect(res.status).toBe(400);
  });

  it("answers 400 for a body of 2048 bytes or more", async () => {
    const body = validBody(Date.now(), {
      tokens_since_five_hour_reset: Object.fromEntries(
        Array.from({ length: 12 }, (_, i) => [
          `claude-model-${i}-${"x".repeat(80)}`,
          { input: 1, output: 1, cache_read: 1, cache_write: 1 },
        ]),
      ),
    });
    expect(JSON.stringify(body).length).toBeGreaterThanOrEqual(2048);
    const res = await call(body);
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain("2048");
  });

  it("rejects an unknown top-level key", async () => {
    const res = await call(validBody(Date.now(), { email: "me@example.com" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("email is not a known field");
  });

  it("rejects an unknown nested key", async () => {
    const now = Date.now();
    const base = validBody(now);
    const meter = await call(validBody(now, { five_hour: { ...base.five_hour, note: "x" } }));
    expect(meter.status).toBe(400);
    expect((await meter.json()).error).toContain("five_hour.note");
    const tokens = await call(
      validBody(now, {
        tokens_since_five_hour_reset: {
          "claude-sonnet-5": { ...base.tokens_since_five_hour_reset["claude-sonnet-5"], session: "abc" },
        },
      }),
    );
    expect(tokens.status).toBe(400);
    expect((await tokens.json()).error).toContain("session");
  });

  const now = Date.now();
  const iso = (ms) => new Date(ms).toISOString();
  const b = validBody(now);
  it.each([
    ["a missing field", (() => { const x = { ...b }; delete x.client_version; return x; })(), "client_version is missing"],
    ["a non-string client_version", { ...b, client_version: 1 }, "client_version"],
    ["an over-long client_version", { ...b, client_version: "v".repeat(65) }, "client_version"],
    ["a non-UUID contributor_id", { ...b, contributor_id: "abc" }, "contributor_id"],
    ["a UUID that is not version 4", { ...b, contributor_id: "3f7a2b1c-9d4e-1f60-8a1b-2c3d4e5f6a7b" }, "contributor_id"],
    ["an upper-case contributor_id", { ...b, contributor_id: CONTRIB_ID.toUpperCase() }, "contributor_id"],
    ["an unknown plan", { ...b, plan: "team" }, "plan must be"],
    ["an unknown plan_source", { ...b, plan_source: "guess" }, "plan_source"],
    ["a ts that is not ISO", { ...b, ts: "yesterday" }, "ts must be an ISO"],
    ["a ts more than 24 h old", { ...b, ts: iso(now - 25 * 3600e3) }, "ts must be within 24 hours"],
    ["a ts more than 24 h ahead", { ...b, ts: iso(now + 25 * 3600e3) }, "ts must be within 24 hours"],
    ["a non-object five_hour", { ...b, five_hour: 37 }, "five_hour must be an object"],
    ["a utilization below 0", { ...b, five_hour: { ...b.five_hour, utilization: -1 } }, "five_hour.utilization"],
    ["a utilization above 100", { ...b, seven_day: { ...b.seven_day, utilization: 100.5 } }, "seven_day.utilization"],
    ["a null utilization", { ...b, five_hour: { ...b.five_hour, utilization: null } }, "five_hour.utilization"],
    ["a string utilization", { ...b, five_hour: { ...b.five_hour, utilization: "37" } }, "five_hour.utilization"],
    ["a resets_at that is not ISO", { ...b, five_hour: { ...b.five_hour, resets_at: "soon" } }, "five_hour.resets_at"],
    ["a null resets_at", { ...b, seven_day: { ...b.seven_day, resets_at: null } }, "seven_day.resets_at"],
    ["a resets_at more than 8 days out", { ...b, seven_day: { ...b.seven_day, resets_at: iso(now + 9 * 86400e3) } }, "within 8 days"],
    ["a resets_at more than 8 days back", { ...b, five_hour: { ...b.five_hour, resets_at: iso(now - 9 * 86400e3) } }, "within 8 days"],
    ["a non-object token map", { ...b, tokens_since_five_hour_reset: [] }, "tokens_since_five_hour_reset must be an object"],
    ["a model name outside claude-*", { ...b, tokens_since_five_hour_reset: { "gpt-5": { input: 1, output: 1, cache_read: 1, cache_write: 1 } } }, "not a model name"],
    ["a model name with upper case", { ...b, tokens_since_five_hour_reset: { "claude-Opus-5": { input: 1, output: 1, cache_read: 1, cache_write: 1 } } }, "not a model name"],
    ["more than 12 models", { ...b, tokens_since_seven_day_reset: Object.fromEntries(Array.from({ length: 13 }, (_, i) => [`claude-m${i}`, { input: 0, output: 0, cache_read: 0, cache_write: 0 }])) }, "more than 12 models"],
    ["a missing token class", { ...b, tokens_since_five_hour_reset: { "claude-sonnet-5": { input: 1, output: 1, cache_read: 1 } } }, "cache_write must be a non-negative integer"],
    ["a negative token count", { ...b, tokens_since_five_hour_reset: { "claude-sonnet-5": { input: -1, output: 1, cache_read: 1, cache_write: 1 } } }, "input must be a non-negative integer"],
    ["a fractional token count", { ...b, tokens_since_five_hour_reset: { "claude-sonnet-5": { input: 1.5, output: 1, cache_read: 1, cache_write: 1 } } }, "input must be a non-negative integer"],
    ["a string token count", { ...b, tokens_since_seven_day_reset: { "claude-sonnet-5": { input: "1", output: 1, cache_read: 1, cache_write: 1 } } }, "non-negative integer"],
    ["an array body", [b], "body must be a JSON object"],
  ])("answers 400 for %s", async (_label, body, reason) => {
    const e = env();
    const res = await call(body, e);
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain(reason);
    expect([...e.NOTIFY_KV.store.keys()]).toEqual([]);
  });

  it("accepts an empty token map and a ts with fractional seconds", async () => {
    const res = await call(
      validBody(Date.now(), { ts: new Date().toISOString(), tokens_since_five_hour_reset: {}, tokens_since_seven_day_reset: {} }),
    );
    expect(res.status).toBe(200);
  });

  it("answers 503 when the KV binding is missing", async () => {
    const res = await call(validBody(), env({ NOTIFY_KV: undefined }));
    expect(res.status).toBe(503);
  });
});

describe("POST /api/contribute rate limits", () => {
  it("allows 4 samples per contributor id per hour and refuses the 5th", async () => {
    const e = env();
    const now = Date.now();
    for (let i = 0; i < 4; i++) {
      const res = await call(validBody(now - i * 60e3), e, { ip: `198.51.100.${i}` });
      expect(res.status).toBe(200);
    }
    const fifth = await call(validBody(now - 5 * 60e3), e, { ip: "198.51.100.9" });
    expect(fifth.status).toBe(429);
    expect((await fifth.json()).error).toContain("contributor id");
    expect(e.NOTIFY_KV.ttls.get(`contrib:rl:id:${CONTRIB_ID}`)).toBe(3600);
    // The refused sample was not stored.
    expect([...e.NOTIFY_KV.store.keys()].filter((k) => k.startsWith("contrib:s:")).length).toBe(4);
  });

  it("allows 30 samples per IP per hour and refuses the 31st", async () => {
    const e = env();
    const now = Date.now();
    const idFor = (i) => `${i.toString(16).padStart(8, "0")}-0000-4000-8000-000000000000`;
    for (let i = 0; i < 30; i++) {
      const res = await call(validBody(now, { contributor_id: idFor(i) }), e);
      expect(res.status).toBe(200);
    }
    const res = await call(validBody(now, { contributor_id: idFor(30) }), e);
    expect(res.status).toBe(429);
    expect((await res.json()).error).toContain("from here");
    // A different IP is still fine.
    const other = await call(validBody(now, { contributor_id: idFor(31) }), e, { ip: "198.51.100.200" });
    expect(other.status).toBe(200);
  });
});

describe("CORS on /api/contribute", () => {
  const preflight = (origin) =>
    onRequestOptions({
      request: new Request("https://alldonesites.com/api/contribute", { method: "OPTIONS", headers: { origin } }),
    });

  it("answers the preflight for the site itself", async () => {
    const res = await preflight("https://alldonesites.com");
    expect(res.status).toBe(204);
    expect(res.headers.get("access-control-allow-origin")).toBe("https://alldonesites.com");
    expect(res.headers.get("access-control-allow-methods")).toContain("POST");
  });

  it("refuses the preflight for any other origin", async () => {
    const res = await preflight("https://evil.example");
    expect(res.status).toBe(403);
    expect(res.headers.get("access-control-allow-origin")).toBeNull();
  });

  it("refuses a post from a foreign origin", async () => {
    const e = env();
    const res = await call(validBody(), e, { origin: "https://evil.example" });
    expect(res.status).toBe(403);
    expect([...e.NOTIFY_KV.store.keys()]).toEqual([]);
  });

  it("answers a post from the page with the allow-origin header", async () => {
    const res = await call(validBody(), env(), { origin: "https://alldonesites.com" });
    expect(res.status).toBe(200);
    expect(res.headers.get("access-control-allow-origin")).toBe("https://alldonesites.com");
  });

  it("answers a post with no Origin (the script) without the header", async () => {
    const res = await call(validBody());
    expect(res.status).toBe(200);
    expect(res.headers.get("access-control-allow-origin")).toBeNull();
  });

  it("does not care which contributor the row is from", async () => {
    const res = await call(validBody(Date.now(), { contributor_id: OTHER_ID }));
    expect((await res.json()).me_url).toContain(OTHER_ID);
  });
});
