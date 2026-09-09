import { describe, expect, it } from "vitest";
import {
  decodeCut1,
  encodeCut1,
  fleetTokensPerPercent,
  mainModel,
  modelsIn,
  tokensPerPercent,
  totalTokens,
  validateSample,
  type PublicSample,
} from "./contrib";
import type { UsageJson } from "./claudeUsage";

const NOW = Date.parse("2026-09-09T12:00:00Z");

const BODY = {
  client_version: "contrib-sample/0.1.0",
  contributor_id: "3f7a2b1c-9d4e-4f60-8a1b-2c3d4e5f6a7b",
  plan: "pro",
  plan_source: "endpoint",
  ts: "2026-09-09T11:30:00Z",
  five_hour: { utilization: 40, resets_at: "2026-09-09T14:00:00Z" },
  seven_day: { utilization: 10, resets_at: "2026-09-12T00:00:00Z" },
  tokens_since_five_hour_reset: {
    "claude-sonnet-5": { input: 100, output: 50, cache_read: 800, cache_write: 50 },
    "claude-opus-5": { input: 10, output: 10, cache_read: 0, cache_write: 0 },
  },
  tokens_since_seven_day_reset: {
    "claude-sonnet-5": { input: 1000, output: 500, cache_read: 8000, cache_write: 500 },
  },
};

describe("CUT1 lines", () => {
  it("round-trip a body through the url-safe base64 form sample.py prints", () => {
    const line = encodeCut1(BODY);
    expect(line.startsWith("CUT1:")).toBe(true);
    expect(line).not.toMatch(/[+/=]/);
    expect(JSON.parse(decodeCut1(line))).toEqual(BODY);
  });

  it("matches the exact line sample.py produces for a known body", () => {
    // json.dumps(separators=(",", ":"), sort_keys=True) then urlsafe_b64encode, for {"b":1,"a":"x"}.
    expect(encodeCut1({ b: 1, a: "x" })).toBe("CUT1:eyJhIjoieCIsImIiOjF9");
  });

  it("accept padding and surrounding whitespace, refuse anything else", () => {
    expect(decodeCut1(" CUT1:eyJhIjoieCIsImIiOjF9== \n")).toBe('{"a":"x","b":1}');
    expect(() => decodeCut1("eyJhIjoieCJ9")).toThrow("not a CUT1 line");
    expect(() => decodeCut1("CUT1:")).toThrow("url-safe base64");
    expect(() => decodeCut1("CUT1:a b")).toThrow("url-safe base64");
    expect(() => decodeCut1(5)).toThrow("must be a string");
  });
});

describe("validateSample", () => {
  it("returns a fresh object holding only the known fields", () => {
    const v = validateSample(BODY, NOW);
    expect(v.ok).toBe(true);
    if (v.ok) {
      expect(v.value).toEqual(BODY);
      expect(v.value).not.toBe(BODY);
    }
  });

  it("gives a one-line reason", () => {
    const v = validateSample({ ...BODY, plan: "enterprise" }, NOW);
    expect(v).toEqual({ ok: false, reason: "plan must be pro, max5 or max20" });
  });
});

describe("derived figures", () => {
  const sample = (ts: string, util: number, sonnet: number, opus = 0): PublicSample => ({
    ts,
    plan: "pro",
    five_hour: { utilization: util, resets_at: "2026-09-09T14:00:00Z" },
    seven_day: { utilization: 10, resets_at: "2026-09-12T00:00:00Z" },
    tokens_since_five_hour_reset: {
      "claude-sonnet-5": { input: sonnet, output: 0, cache_read: 0, cache_write: 0 },
      ...(opus ? { "claude-opus-5": { input: 0, output: opus, cache_read: 0, cache_write: 0 } } : {}),
    },
    tokens_since_seven_day_reset: {},
  });

  it("sums the four classes", () => {
    expect(totalTokens({ input: 1, output: 2, cache_read: 3, cache_write: 4 })).toBe(10);
    expect(totalTokens(undefined)).toBe(0);
  });

  it("divides tokens since reset by the meter percent, blank at zero", () => {
    expect(tokensPerPercent(sample("t", 40, 4000), "claude-sonnet-5")).toBe(100);
    expect(tokensPerPercent(sample("t", 0, 4000), "claude-sonnet-5")).toBeNull();
    expect(tokensPerPercent(sample("t", 40, 4000), "claude-opus-5")).toBe(0);
  });

  it("picks the model with the most tokens across all samples as the main one", () => {
    expect(mainModel([sample("a", 10, 100, 500), sample("b", 20, 100, 0)])).toBe("claude-opus-5");
    expect(mainModel([sample("a", 10, 100, 50)])).toBe("claude-sonnet-5");
    expect(mainModel([])).toBeNull();
    expect(modelsIn([sample("a", 10, 1, 1), sample("b", 10, 1)])).toEqual(["claude-opus-5", "claude-sonnet-5"]);
  });

  it("scales the published Max 20x window by the plan ratio, per percent", () => {
    const j = {
      plan_ratios: { pro: 0.05, max5: 0.25, max20: 1 },
      rates: { "claude-sonnet-5": { tokens_per_window: 40_000_000 } },
    } as unknown as UsageJson;
    expect(fleetTokensPerPercent(j, "max20", "claude-sonnet-5")).toBe(400_000);
    expect(fleetTokensPerPercent(j, "pro", "claude-sonnet-5")).toBe(20_000);
    expect(fleetTokensPerPercent(j, "pro", "claude-opus-5")).toBeNull();
  });
});
