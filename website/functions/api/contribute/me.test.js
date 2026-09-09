import { describe, expect, it } from "vitest";
import { onRequestGet } from "./me";
import { CONTRIB_ID, OTHER_ID, fakeKv, validBody } from "./_fixtures";

function get(id, e) {
  const url = new URL("https://alldonesites.com/api/contribute/me");
  if (id !== undefined) url.searchParams.set("id", id);
  return onRequestGet({ request: new Request(url), env: e ?? { NOTIFY_KV: fakeKv() } });
}

function seed(kv, id, tsList) {
  for (const ts of tsList) {
    const body = validBody(Date.parse(ts), { contributor_id: id, ts });
    kv.store.set(`contrib:s:${id}:${ts}`, JSON.stringify({ ...body, received_at: ts }));
  }
}

describe("GET /api/contribute/me", () => {
  it("answers 400 for a missing or malformed id", async () => {
    expect((await get(undefined)).status).toBe(400);
    expect((await get("nope")).status).toBe(400);
    expect((await get("3f7a2b1c-9d4e-1f60-8a1b-2c3d4e5f6a7b")).status).toBe(400);
  });

  it("answers 404 for an id with no samples", async () => {
    const res = await get(CONTRIB_ID);
    expect(res.status).toBe(404);
  });

  it("returns only the reduced fields, newest first, and is never cached", async () => {
    const kv = fakeKv();
    seed(kv, CONTRIB_ID, ["2026-09-08T10:00:00Z", "2026-09-09T10:00:00Z", "2026-09-07T10:00:00Z"]);
    seed(kv, OTHER_ID, ["2026-09-09T11:00:00Z"]);
    const res = await get(CONTRIB_ID, { NOTIFY_KV: kv });
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");
    const data = await res.json();
    expect(data.id).toBe(CONTRIB_ID);
    expect(data.samples.map((s) => s.ts)).toEqual(["2026-09-09T10:00:00Z", "2026-09-08T10:00:00Z", "2026-09-07T10:00:00Z"]);
    for (const s of data.samples) {
      expect(Object.keys(s).sort()).toEqual(
        ["ts", "plan", "five_hour", "seven_day", "tokens_since_five_hour_reset", "tokens_since_seven_day_reset"].sort(),
      );
      expect(s).not.toHaveProperty("contributor_id");
      expect(s).not.toHaveProperty("client_version");
      expect(s).not.toHaveProperty("plan_source");
      expect(s).not.toHaveProperty("received_at");
    }
    expect(data.samples[0].five_hour).toEqual({ utilization: 37.5, resets_at: "2026-09-09T12:00:00Z" });
  });

  it("accepts an upper-case id and answers with the canonical one", async () => {
    const kv = fakeKv();
    seed(kv, CONTRIB_ID, ["2026-09-09T10:00:00Z"]);
    const res = await get(CONTRIB_ID.toUpperCase(), { NOTIFY_KV: kv });
    expect(res.status).toBe(200);
    expect((await res.json()).id).toBe(CONTRIB_ID);
  });

  it("caps the answer at the newest 200 samples, following the KV cursor", async () => {
    const kv = fakeKv();
    const tsList = Array.from({ length: 1250 }, (_, i) => new Date(Date.UTC(2026, 0, 1) + i * 3600e3).toISOString());
    seed(kv, CONTRIB_ID, tsList);
    const res = await get(CONTRIB_ID, { NOTIFY_KV: kv });
    const data = await res.json();
    expect(data.samples.length).toBe(200);
    expect(data.samples[0].ts).toBe(tsList[tsList.length - 1]);
    expect(data.samples[199].ts).toBe(tsList[tsList.length - 200]);
  });

  it("answers 503 when the KV binding is missing", async () => {
    const res = await get(CONTRIB_ID, {});
    expect(res.status).toBe(503);
  });
});
