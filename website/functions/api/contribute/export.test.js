import { describe, expect, it } from "vitest";
import { onRequestGet } from "./export";
import { CONTRIB_ID, OTHER_ID, fakeKv, validBody } from "./_fixtures";

const SECRET = "token-secret";

function get({ secret = SECRET, cursor, kv = fakeKv(), env = {} } = {}) {
  const url = new URL("https://alldonesites.com/api/contribute/export");
  if (cursor) url.searchParams.set("cursor", cursor);
  const headers = secret === null ? {} : { authorization: `Bearer ${secret}` };
  return onRequestGet({ request: new Request(url, { headers }), env: { NOTIFY_KV: kv, NOTIFY_TOKEN_SECRET: SECRET, ...env } });
}

function seed(kv, id, tsList) {
  for (const ts of tsList) {
    const body = validBody(Date.parse(ts), { contributor_id: id, ts });
    kv.store.set(`contrib:s:${id}:${ts}`, JSON.stringify({ ...body, received_at: ts }));
  }
}

async function lines(res) {
  const text = await res.text();
  return text.split("\n").filter(Boolean).map((l) => JSON.parse(l));
}

describe("GET /api/contribute/export", () => {
  it("is refused without the bearer secret", async () => {
    expect((await get({ secret: null })).status).toBe(401);
    expect((await get({ secret: "wrong" })).status).toBe(401);
    expect((await get({ secret: "" })).status).toBe(401);
  });

  it("streams every stored sample as JSON lines, with rate-limit keys left out", async () => {
    const kv = fakeKv();
    seed(kv, CONTRIB_ID, ["2026-09-08T10:00:00Z", "2026-09-09T10:00:00Z"]);
    seed(kv, OTHER_ID, ["2026-09-09T11:00:00Z"]);
    kv.store.set(`contrib:rl:id:${CONTRIB_ID}`, "2");
    kv.store.set("sub:someone@example.com", JSON.stringify({ status: "confirmed" }));
    const res = await get({ kv });
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("application/x-ndjson");
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(res.headers.get("x-next-cursor")).toBe("");
    const rows = await lines(res);
    expect(rows.length).toBe(3);
    expect(rows.map((r) => r.contributor_id).sort()).toEqual([CONTRIB_ID, CONTRIB_ID, OTHER_ID].sort());
    expect(rows.every((r) => typeof r.received_at === "string" && r.five_hour && r.tokens_since_five_hour_reset)).toBe(true);
  });

  it("paginates by KV cursor", async () => {
    const kv = fakeKv();
    const tsList = Array.from({ length: 1005 }, (_, i) => new Date(Date.UTC(2026, 0, 1) + i * 3600e3).toISOString());
    seed(kv, CONTRIB_ID, tsList);
    const first = await get({ kv });
    const cursor = first.headers.get("x-next-cursor");
    expect(cursor).not.toBe("");
    const rows = await lines(first);
    expect(rows.length).toBe(1001);
    expect(rows[1000]).toEqual({ next_cursor: cursor });

    const second = await get({ kv, cursor });
    expect(second.headers.get("x-next-cursor")).toBe("");
    const rest = await lines(second);
    expect(rest.length).toBe(5);
    expect(rest.map((r) => r.ts)).toEqual(tsList.slice(1000));
  });

  it("answers 503 when the secret or the KV binding is missing", async () => {
    expect((await get({ env: { NOTIFY_TOKEN_SECRET: "" } })).status).toBe(503);
    expect((await get({ env: { NOTIFY_KV: undefined } })).status).toBe(503);
  });
});
