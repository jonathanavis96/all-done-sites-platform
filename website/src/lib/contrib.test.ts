import { describe, expect, it } from "vitest";
import {
  COARSE_BELOW,
  CONTRIB_PALETTE,
  contribColor,
  contribGroups,
  contribPointValue,
  contributorSentences,
  contribXScale,
  contribYMax,
  decodeCut1,
  encodeCut1,
  fleetTokensPerPercent,
  fleetUsdPerPercent,
  isCoarse,
  mainModel,
  meterUsd,
  modelsIn,
  normalizeModelId,
  priceForModel,
  sampleValue,
  shareTokensPerPercent,
  totalTokens,
  usdPerPercent,
  validateSample,
  type PublicSample,
} from "./contrib";
import type { ApiPrice, ContribPoint, PlanContrib, UsageJson } from "./claudeUsage";

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

  it("refuses a reset time the sampled window could not have, and prices an empty sample as no figure (audit_checks.cjs)", () => {
    // The auditor's body: a five-hour reset seven days out and a seven-day reset one day out were
    // both accepted, and empty token maps against a 20% meter gave a personal rate.
    const now = Date.parse("2026-09-16T14:30:22Z");
    const body = {
      ...BODY, client_version: "contrib-sample/0.1.0", plan: "max20", plan_source: "flag", ts: new Date(now).toISOString(),
      five_hour: { utilization: 20, resets_at: new Date(now + 7 * 86400e3).toISOString() },
      seven_day: { utilization: 10, resets_at: new Date(now + 86400e3).toISOString() },
      tokens_since_five_hour_reset: {}, tokens_since_seven_day_reset: {},
    };
    expect(validateSample(body, now)).toEqual({ ok: false, reason: "reset time is inconsistent with the sampled window" });
    const plausible = { ...body, five_hour: { ...body.five_hour, resets_at: new Date(now + 3600e3).toISOString() } };
    expect(validateSample(plausible, now).ok).toBe(true);
    expect(usdPerPercent(plausible as unknown as PublicSample, {})).toBeNull();
  });

  it("keeps a one-hour cache write count within cache_write, and refuses one that exceeds it or is not a count", () => {
    const withOneHour = (n: unknown) => ({
      ...BODY,
      tokens_since_five_hour_reset: {
        ...BODY.tokens_since_five_hour_reset,
        "claude-sonnet-5": { ...BODY.tokens_since_five_hour_reset["claude-sonnet-5"], cache_write_1h: n },
      },
    });
    const kept = validateSample(withOneHour(50), NOW);
    expect(kept.ok).toBe(true);
    if (kept.ok) expect(kept.value.tokens_since_five_hour_reset["claude-sonnet-5"].cache_write_1h).toBe(50);
    const reason = "tokens_since_five_hour_reset.claude-sonnet-5.cache_write_1h must be a subset of cache_write";
    expect(validateSample(withOneHour(51), NOW)).toEqual({ ok: false, reason });
    expect(validateSample(withOneHour(-1), NOW)).toEqual({ ok: false, reason });
    expect(validateSample(withOneHour(1.5), NOW)).toEqual({ ok: false, reason });
    expect(validateSample(withOneHour("50"), NOW)).toEqual({ ok: false, reason });
  });

  it("accepts capture provenance but refuses unknown capture fields", () => {
    // The capture block contrib/sample.py 0.2.0 builds for BODY: each window starts one window
    // length before its reset, and ownership is one of the two values the sampler emits.
    const capture = { collected_at: BODY.ts, five_hour_started_at: "2026-09-09T09:00:00Z", seven_day_started_at: "2026-09-05T00:00:00Z", ownership: "local_transcripts_unverified" };
    expect(validateSample({ ...BODY, capture }, NOW).ok).toBe(true);
    expect(validateSample({ ...BODY, capture: { ...capture, path: "/private" } }, NOW)).toEqual({ ok: false, reason: "capture.path is not a known field" });
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

  it("has no tracker tokens per 1% for a model the plan does not include, or with no published figure (findings 2, 13)", () => {
    const j = {
      plan_ratios: { pro: 0.05, max5: 0.25, max20: 1 },
      rates: { "claude-fable-5-1": { tokens_per_window: 200_000_000 }, "claude-sonnet-5": { tokens_per_window: null } },
    } as unknown as UsageJson;
    expect(fleetTokensPerPercent(j, "pro", "claude-fable-5-1")).toBeNull();
    expect(fleetTokensPerPercent(j, "max5", "claude-fable-5-1")).toBe(500_000);
    expect(fleetTokensPerPercent(j, "max20", "claude-sonnet-5")).toBeNull();
  });
});

describe("pricing a sample", () => {
  // Real contributor sample dfdaaad9-db3d-4fef-90fd-f47211d08f19: five_hour.utilization 3,
  // Fable/Opus/Sonnet token counts below. Priced by hand: Fable $2.7766, Sonnet $2.0760,
  // Opus $0.3949, total $5.2474, so $1.7491/1%; Sonnet's share tokens per 1% ≈ 4.54M.
  const PRICES: Record<string, ApiPrice> = {
    "claude-fable-5-1": { input: 10, output: 50, cache_read: 0.25, cache_write: 12.5, meter_weight: 1, class_weight: { input: 1, output: 1.8, cache_read: 0, cache_write: 1 } },
    "claude-opus-5": { input: 5, output: 25, cache_read: 0.5, cache_write: 6.25, meter_weight: 1, class_weight: { input: 1, output: 1.8, cache_read: 0, cache_write: 1 } },
    "claude-sonnet-5": { input: 2, output: 10, cache_read: 0.2, cache_write: 2.5, meter_weight: 1, class_weight: { input: 1, output: 1.8, cache_read: 0, cache_write: 1 } },
  };
  const REAL_SAMPLE: PublicSample = {
    ts: "2026-09-15T12:00:00Z",
    plan: "max20",
    five_hour: { utilization: 3, resets_at: "2026-09-15T17:00:00Z" },
    seven_day: { utilization: 40, resets_at: "2026-09-20T00:00:00Z" },
    tokens_since_five_hour_reset: {
      "claude-fable-5-1": { input: 8, output: 28350, cache_read: 43047, cache_write: 17998 },
      "claude-opus-5": { input: 18, output: 209, cache_read: 371020, cache_write: 61657 },
      "claude-sonnet-5": { input: 174, output: 32025, cache_read: 4756298, cache_write: 599671 },
    },
    tokens_since_seven_day_reset: {},
  };

  it("prices one model's counts: sum of class tokens times price times class weight, over 1e6, times meter weight", () => {
    expect(meterUsd(REAL_SAMPLE.tokens_since_five_hour_reset["claude-sonnet-5"], PRICES["claude-sonnet-5"])).toBeCloseTo(2.0759755, 5);
    expect(meterUsd(REAL_SAMPLE.tokens_since_five_hour_reset["claude-opus-5"], PRICES["claude-opus-5"])).toBeCloseTo(0.39485125, 5);
    expect(meterUsd(undefined, PRICES["claude-sonnet-5"])).toBe(0);
    expect(meterUsd({ input: 1, output: 0, cache_read: 0, cache_write: 0 }, undefined)).toBeNull();
  });

  it("prices the one-hour cache write as the collector's meter_usd does, weights defaulting alike", () => {
    // Expected values are the collector's tracker/publish.py meter_usd on the same inputs: a million
    // cache writes, 400k of them one-hour, on Sonnet's prices.
    const counts = { input: 0, output: 0, cache_read: 0, cache_write: 1_000_000, cache_write_1h: 400_000 };
    const base = { input: 2, output: 10, cache_read: 0.2, cache_write: 2.5, meter_weight: 1 };
    const full = { input: 1, output: 1.8, cache_read: 0, cache_write: 1 };
    // The published one-hour price, and 2x input when it is absent.
    expect(meterUsd(counts, { ...base, cache_write_1h: 5, class_weight: full })).toBeCloseTo(3.5, 9);
    expect(meterUsd(counts, { ...base, class_weight: full })).toBeCloseTo(3.1, 9);
    // A class_weight without cache_write weighs both the base writes and the one-hour difference at
    // 1, not the base at 0 and the difference at 1 (review finding 3).
    expect(meterUsd(counts, { ...base, cache_write_1h: 4, class_weight: { input: 1, output: 1.8, cache_read: 0 } })).toBeCloseTo(3.1, 9);
    // The one-hour write weighs as cache_write unless it has its own weight.
    expect(meterUsd(counts, { ...base, cache_write_1h: 4, class_weight: { ...full, cache_write: 0.5 } })).toBeCloseTo(1.55, 9);
    expect(meterUsd(counts, { ...base, cache_write_1h: 4, class_weight: { ...full, cache_write: 0.5, cache_write_1h: 1 } })).toBeCloseTo(2.35, 9);
    expect(meterUsd(counts, { ...base, meter_weight: 2, cache_write_1h: 4, class_weight: full })).toBeCloseTo(6.2, 9);
    // A one-hour count larger than the writes it is part of prices as nothing.
    expect(meterUsd({ ...counts, cache_write_1h: 1_000_001 }, { ...base, class_weight: full })).toBeNull();
  });

  it("prices every model in a sample and totals them, null when a used model is unpriced", () => {
    const v = sampleValue(REAL_SAMPLE, PRICES);
    expect(v).not.toBeNull();
    expect(v!.perModel["claude-fable-5-1"]).toBeCloseTo(2.776555, 5);
    expect(v!.perModel["claude-opus-5"]).toBeCloseTo(0.39485125, 5);
    expect(v!.perModel["claude-sonnet-5"]).toBeCloseTo(2.0759755, 5);
    expect(v!.total).toBeCloseTo(5.24738175, 5);
    const { "claude-opus-5": _drop, ...missingOpus } = PRICES;
    expect(sampleValue(REAL_SAMPLE, missingOpus)).toBeNull();
  });

  it("has no figure, never NaN, when the one-hour write needs a cache_write or input price the table lacks", () => {
    const counts = { input: 0, output: 0, cache_read: 0, cache_write: 1_000_000, cache_write_1h: 400_000 };
    const weights = { class_weight: { input: 1, output: 1.8, cache_read: 0, cache_write: 1 }, meter_weight: 1 };
    const noWrite = { input: 2, output: 10, cache_read: 0.2, cache_write_1h: 4, ...weights } as unknown as ApiPrice;
    const noInput = { output: 10, cache_read: 0.2, cache_write: 2.5, ...weights } as unknown as ApiPrice;
    const noInputWithOneHour = { output: 10, cache_read: 0.2, cache_write: 2.5, cache_write_1h: 4, ...weights } as unknown as ApiPrice;
    for (const price of [noWrite, noInput, noInputWithOneHour]) {
      expect(meterUsd(counts, price)).toBeNull();
      const sample = { ...REAL_SAMPLE, tokens_since_five_hour_reset: { "claude-sonnet-5": counts } };
      // The whole sample has no figure, as for any unpriced model, rather than a $NaN total.
      expect(sampleValue(sample, { "claude-sonnet-5": price })).toBeNull();
      expect(usdPerPercent(sample, { "claude-sonnet-5": price })).toBeNull();
    }
  });

  it("normalises a suffixed model id as the collector's sampler does before pricing it, and keeps the raw id", () => {
    // Expected ids are contrib/sample.py normalize_model on the same inputs (codex-audit-collector).
    expect(
      ["claude-opus-5-20260115", "claude-sonnet-5 [1m]", "claude-sonnet-5[1m]", "claude-opus-5-20260115[1m]", "claude-opus-5[1m]-20260115", "claude-fable-5-20260101", "claude-opus-5-2026011", "Claude-Opus-5", "claude-sonnet-5", "<synthetic>"].map(normalizeModelId),
    ).toEqual(["claude-opus-5", "claude-sonnet-5", "claude-sonnet-5", "claude-opus-5", "claude-unknown", "claude-fable-5", "claude-opus-5-2026011", "claude-unknown", "claude-sonnet-5", "claude-unknown"]);
    const t = REAL_SAMPLE.tokens_since_five_hour_reset;
    const suffixed: PublicSample = {
      ...REAL_SAMPLE,
      tokens_since_five_hour_reset: {
        "claude-fable-5-20260101": t["claude-fable-5-1"],
        "claude-opus-5-20260115": t["claude-opus-5"],
        "claude-sonnet-5 [1m]": t["claude-sonnet-5"],
      },
    };
    const v = sampleValue(suffixed, PRICES);
    expect(v).not.toBeNull();
    expect(Object.keys(v!.perModel).sort()).toEqual(["claude-fable-5-20260101", "claude-opus-5-20260115", "claude-sonnet-5 [1m]"]);
    expect(v!.perModel["claude-fable-5-20260101"]).toBeCloseTo(2.776555, 5);
    expect(v!.perModel["claude-opus-5-20260115"]).toBeCloseTo(0.39485125, 5);
    expect(v!.perModel["claude-sonnet-5 [1m]"]).toBeCloseTo(2.0759755, 5);
    expect(usdPerPercent(suffixed, PRICES)).toBeCloseTo(usdPerPercent(REAL_SAMPLE, PRICES)!, 9);
    // No more than the sampler strips: a marker before the date, or a short date, stays unpriced.
    expect(priceForModel("claude-opus-5[1m]-20260115", PRICES)).toBeUndefined();
    expect(priceForModel("claude-opus-5-2026011", PRICES)).toBeUndefined();
  });

  it("prices the old Fable alias without replacing the raw sample ID, and never returns a zero-dollar sample", () => {
    const old = { ...REAL_SAMPLE, tokens_since_five_hour_reset: { "claude-fable-5": REAL_SAMPLE.tokens_since_five_hour_reset["claude-fable-5-1"] } };
    expect(sampleValue(old, PRICES)?.perModel["claude-fable-5"]).toBeCloseTo(2.776555, 5);
    const empty = { ...REAL_SAMPLE, tokens_since_five_hour_reset: {} };
    expect(sampleValue(empty, PRICES)).toBeNull();
    expect(usdPerPercent(empty, PRICES)).toBeNull();
  });

  it("hand-computes the real sample's dollars per 1% and Sonnet's share tokens per 1%", () => {
    // The dollar figure exists at a 3% meter and is marked coarse, as the published contributor
    // points mark it.
    expect(usdPerPercent(REAL_SAMPLE, PRICES)).toBeCloseTo(1.749, 2);
    expect(isCoarse(REAL_SAMPLE)).toBe(true);
    // Sonnet's slice of a 3% meter is 1.19 points: under the 5-point slice floor the collector
    // applies to every published per-model figure, so there is none (audit finding 8).
    expect(shareTokensPerPercent(REAL_SAMPLE, "claude-sonnet-5", PRICES)).toBeNull();
    // At 20% Sonnet's slice is 7.9 points: the same arithmetic as before, 4.54M x 3/20. Opus's
    // slice is 1.5 points and stays without a figure.
    const higher = { ...REAL_SAMPLE, five_hour: { ...REAL_SAMPLE.five_hour, utilization: 20 } };
    const shareSonnet = shareTokensPerPercent(higher, "claude-sonnet-5", PRICES);
    expect(shareSonnet).not.toBeNull();
    expect(Math.abs(shareSonnet! - (4_539_837.5 * 3) / 20) / ((4_539_837.5 * 3) / 20)).toBeLessThan(0.02);
    expect(shareTokensPerPercent(higher, "claude-opus-5", PRICES)).toBeNull();
  });

  it("returns null for usdPerPercent/shareTokensPerPercent when unpriced or the meter reads 0", () => {
    const zeroUtil = { ...REAL_SAMPLE, five_hour: { ...REAL_SAMPLE.five_hour, utilization: 0 } };
    expect(usdPerPercent(zeroUtil, PRICES)).toBeNull();
    expect(shareTokensPerPercent(zeroUtil, "claude-sonnet-5", PRICES)).toBeNull();
    const { "claude-sonnet-5": _drop, ...missingSonnet } = PRICES;
    expect(usdPerPercent(REAL_SAMPLE, missingSonnet)).toBeNull();
    expect(shareTokensPerPercent(REAL_SAMPLE, "claude-does-not-exist", PRICES)).toBeNull();
  });

  it("flags a sample under the coarse threshold", () => {
    expect(COARSE_BELOW).toBe(5);
    expect(isCoarse({ five_hour: { utilization: 3, resets_at: "t" } })).toBe(true);
    expect(isCoarse({ five_hour: { utilization: 5, resets_at: "t" } })).toBe(false);
    expect(isCoarse({ five_hour: { utilization: 40, resets_at: "t" } })).toBe(false);
  });

  it("reads the tracker's meter budget per 1%, never the schema 2 API list value (finding 1)", () => {
    const j = {
      schema_version: 2,
      plan_ratios: { pro: 0.05, max5: 0.25, max20: 1 },
      rates: {
        "claude-sonnet-5": { tokens_per_window: 1, meter_budget_per_window: 115.05, api_value_per_window: 343.45, api_list_value_per_window: 343.45, source: "derived_reference_mix" },
      },
    } as unknown as UsageJson;
    expect(fleetUsdPerPercent(j, "max20")).toBeCloseTo(1.1505, 4);
    const unavailable = {
      ...j,
      rates: { "claude-sonnet-5": { tokens_per_window: null, meter_budget_per_window: null, api_value_per_window: 343.45, source: "unavailable" } },
    } as unknown as UsageJson;
    expect(fleetUsdPerPercent(unavailable, "max20")).toBeNull();
  });

  it("reads the fleet's dollars per 1% from a probed rate, preferring source \"probe\"", () => {
    const j = {
      plan_ratios: { pro: 0.05, max5: 0.25, max20: 1 },
      rates: {
        "claude-derived-5": { tokens_per_window: 1, api_value_per_window: 50, source: "derived" },
        "claude-sonnet-5": { tokens_per_window: 1, api_value_per_window: 97.41, source: "probe" },
      },
    } as unknown as UsageJson;
    expect(fleetUsdPerPercent(j, "max20")).toBeCloseTo(0.9741, 4);
    expect(fleetUsdPerPercent(j, "pro")).toBeCloseTo(0.9741 * 0.05, 4);
    expect(fleetUsdPerPercent({ plan_ratios: {}, rates: {} } as unknown as UsageJson, "max20")).toBeNull();
  });
});

describe("contributorSentences", () => {
  const CONTRIB: PlanContrib = {
    contributors: 1,
    samples: 1,
    usd_per_pct: { median: 1.75, spread: 0.12, contributors: 1, samples: 1 },
    tokens_per_pct: {},
    weekly_windows: { measured: null, reason: "0 contributors with a complete week; 2 needed", contributors: 0, dropped: 0, weeks: 0 },
  };

  it("returns null when there are no contributors on this plan", () => {
    expect(contributorSentences("max20", undefined, 0.97)).toBeNull();
    expect(contributorSentences("max20", { ...CONTRIB, contributors: 0 }, 0.97)).toBeNull();
  });

  // The count is of submitted contributor IDs: one account can submit under two, and nothing
  // verifies that an ID is a person (audit finding 14).
  it("names one contributor ID in the singular", () => {
    const r = contributorSentences("max20", CONTRIB, 0.97);
    expect(r!.intro).toBe("One contributor ID on Max 20x has shared meter readings.");
  });

  it("spells out small counts of contributor IDs", () => {
    const two = { ...CONTRIB, contributors: 2, samples: 2 };
    expect(contributorSentences("max20", two, 0.97)!.intro).toBe("Two contributor IDs on Max 20x have shared meter readings.");
  });

  it("states the median cost and the tracker's own figure, nothing more", () => {
    const two = { ...CONTRIB, contributors: 2, samples: 2, usd_per_pct: { median: 1.3233, spread: null, contributors: 2, samples: 2 } };
    // Meter budget, not list-price work: the figure carries the class and meter weights (finding 1).
    expect(contributorSentences("max20", two, 0.9741)!.cost).toBe(
      "On average their use came to $1.32 of meter budget per 1% of the five-hour meter. The tracker's own figure is $0.97.",
    );
    expect(contributorSentences("max20", two, null)!.cost).toBe(
      "On average their use came to $1.32 of meter budget per 1% of the five-hour meter.",
    );
  });

  it("says there is no figure without claiming why (finding 16)", () => {
    // A null figure also follows an unpriced model or a missing second reading, not only a
    // meter under 5%, so the sentence names no cause.
    const noMedian = { ...CONTRIB, usd_per_pct: null };
    expect(contributorSentences("max20", noMedian, 0.97)!.cost).toBe("There is no cost figure to show yet.");
  });

  it("treats an old per-model usd_per_pct shape as absent (no cost sentence)", () => {
    const oldShape = { ...CONTRIB, usd_per_pct: { "claude-sonnet-5": { median: 1, spread: null, contributors: 1, samples: 1 } } } as unknown as PlanContrib;
    expect(contributorSentences("max20", oldShape, 0.97)!.cost).toBeNull();
  });

  it("never turns a pooled weekly_windows.measured into a sentence, even when schema 1 publishes a number (finding 14)", () => {
    // Schema 1's measured is a weighted median across contributor IDs with outliers dropped; the
    // audit withdrew it as a plan figure and schema 2 never publishes one.
    const measured: PlanContrib = { ...CONTRIB, weekly_windows: { ...CONTRIB.weekly_windows, measured: 9.4 } };
    const out = contributorSentences("max20", measured, null)!;
    expect(out).toEqual(contributorSentences("max20", CONTRIB, null));
    expect(Object.keys(out).sort()).toEqual(["cost", "intro"]);
    expect(Object.values(out).join(" ")).not.toMatch(/window|9\.4/);
  });
});

describe("contrib chart helpers", () => {
  const P = (t: string, c: number, usd: number | null, coarse = false): ContribPoint => ({ t, c, usd_per_pct: usd, coarse });

  it("draws a reading without a per-model figure as missing, never as its combined total (audit finding 8)", () => {
    // The two max20 points in the published JSON at the audit. The second carries a combined
    // weekly figure of 28,716,453 tokens per 1% and no per-model map: the chart used to draw
    // 2,871,645,300 tokens under whichever model the reader picked.
    const withMap: ContribPoint = {
      t: "2026-09-09T13:16:16Z", c: 0, coarse: false, usd_per_pct: 0.8977,
      tokens_per_pct: 2_866_282, tokens_per_pct_by_model: { "claude-fable-5-1": 2_948_230 },
      tokens_per_pct_week: 13_323_833, tokens_per_pct_week_by_model: { "claude-fable-5-1": 11_159_414 },
    };
    const combinedOnly: ContribPoint = {
      t: "2026-09-16T00:11:31Z", c: 1, coarse: true, usd_per_pct: 1.2843, tokens_per_pct: null, tokens_per_pct_week: 28_716_453,
    };
    for (const model of ["claude-sonnet-5", "claude-opus-5", "claude-fable-5-1"]) {
      expect(contribPointValue(combinedOnly, "weekly", model)).toBeNull();
      expect(contribPointValue(combinedOnly, "window", model)).toBeNull();
    }
    // A map without the selected model is missing data for that model too.
    expect(contribPointValue(withMap, "weekly", "claude-sonnet-5")).toBeNull();
    expect(contribPointValue(withMap, "window", "claude-sonnet-5")).toBeNull();
    expect(contribPointValue(withMap, "weekly", "claude-fable-5-1")).toBe(1_115_941_400);
    expect(contribPointValue(withMap, "window", "claude-fable-5-1")).toBe(294_823_000);
    // Dollars per 1% combine every model by design, and compare with a meter budget that does too.
    expect(contribPointValue(combinedOnly, "usd", "claude-sonnet-5")).toBe(1.2843);
  });

  it("contribGroups groups by contributor, sorted by time within each group, groups sorted by c", () => {
    const points = [P("2026-09-10T00:00:00Z", 2, 1), P("2026-09-01T00:00:00Z", 1, 1), P("2026-09-05T00:00:00Z", 1, 2)];
    const groups = contribGroups(points);
    expect(groups.map((g) => g.c)).toEqual([1, 2]);
    expect(groups[0].points.map((p) => p.t)).toEqual(["2026-09-01T00:00:00Z", "2026-09-05T00:00:00Z"]);
  });

  it("contribColor cycles the 6-colour palette", () => {
    expect(contribColor(0)).toBe(CONTRIB_PALETTE[0]);
    expect(contribColor(6)).toBe(CONTRIB_PALETTE[0]);
    expect(contribColor(7)).toBe(CONTRIB_PALETTE[1]);
  });

  it("contribXScale centers a single point at 0.5", () => {
    const now = Date.parse("2026-09-16T00:00:00Z");
    const scale = contribXScale([P("2026-09-10T00:00:00Z", 1, 1)], now);
    expect(scale.frac("2026-09-10T00:00:00Z")).toBe(0.5);
  });

  it("contribXScale spans from the earliest point, or 30 days ago, whichever is later", () => {
    const now = Date.parse("2026-09-16T00:00:00Z");
    const recent = contribXScale([P("2026-09-10T00:00:00Z", 1, 1), P("2026-09-14T00:00:00Z", 1, 2)], now);
    expect(recent.t0).toBe(Date.parse("2026-09-10T00:00:00Z"));
    const old = contribXScale([P("2026-01-01T00:00:00Z", 1, 1), P("2026-09-14T00:00:00Z", 1, 2)], now);
    expect(old.t0).toBe(now - 30 * 86400e3);
  });

  it("contribYMax is 1.15x the max of points and the probe figure, and skips null-usd points", () => {
    expect(contribYMax([P("t", 1, 2), P("t", 1, null)], 0.5)).toBeCloseTo(2.3, 5);
    expect(contribYMax([P("t", 1, 0.5)], 2)).toBeCloseTo(2.3, 5);
  });

  it("contribYMax falls back to a positive default when there is nothing to plot", () => {
    expect(contribYMax([], null)).toBeGreaterThan(0);
  });
});
