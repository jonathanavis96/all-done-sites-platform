import { describe, expect, it } from "vitest";
import {
  COARSE_BELOW,
  CONTRIB_PALETTE,
  contribColor,
  contribGroups,
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

  it("accepts capture provenance but refuses unknown capture fields", () => {
    const capture = { collected_at: BODY.ts, five_hour_started_at: "2026-09-09T09:00:00Z", seven_day_started_at: "2026-09-05T14:00:00Z", ownership: "configured_profile" };
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

  it("prices the old Fable alias without replacing the raw sample ID, and never returns a zero-dollar sample", () => {
    const old = { ...REAL_SAMPLE, tokens_since_five_hour_reset: { "claude-fable-5": REAL_SAMPLE.tokens_since_five_hour_reset["claude-fable-5-1"] } };
    expect(sampleValue(old, PRICES)?.perModel["claude-fable-5"]).toBeCloseTo(2.776555, 5);
    const empty = { ...REAL_SAMPLE, tokens_since_five_hour_reset: {} };
    expect(sampleValue(empty, PRICES)).toBeNull();
    expect(usdPerPercent(empty, PRICES)).toBeNull();
  });

  it("hand-computes the real sample's dollars per 1% and Sonnet's share tokens per 1%", () => {
    // A 3% whole-number meter cannot support a precise per-percent claim.
    expect(usdPerPercent(REAL_SAMPLE, PRICES)).toBeNull();
    expect(shareTokensPerPercent(REAL_SAMPLE, "claude-sonnet-5", PRICES)).toBeNull();
    const precise = { ...REAL_SAMPLE, five_hour: { ...REAL_SAMPLE.five_hour, utilization: 5 } };
    expect(usdPerPercent(precise, PRICES)).toBeCloseTo(1.049, 2);
    const shareSonnet = shareTokensPerPercent(precise, "claude-sonnet-5", PRICES);
    expect(shareSonnet).not.toBeNull();
    expect(shareSonnet!).toBeCloseTo(2_723_903, -5);
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

  it("names one reader in the singular", () => {
    const r = contributorSentences("max20", CONTRIB, 0.97);
    expect(r!.intro).toBe("One reader on Max 20x has shared their meter so far, measured from their own use of Claude Code.");
  });

  it("spells out small counts of readers", () => {
    const two = { ...CONTRIB, contributors: 2, samples: 2 };
    expect(contributorSentences("max20", two, 0.97)!.intro).toBe(
      "Two readers on Max 20x have shared their meter so far, measured from their own use of Claude Code.",
    );
  });

  it("states the median cost and the tracker's own figure, nothing more", () => {
    const two = { ...CONTRIB, contributors: 2, samples: 2, usd_per_pct: { median: 1.3233, spread: null, contributors: 2, samples: 2 } };
    expect(contributorSentences("max20", two, 0.9741)!.cost).toBe(
      "Their recent, capture-qualified readings median $1.32 of estimated meter work per 1% of the five-hour meter. The tracker's own figure is $0.97.",
    );
    expect(contributorSentences("max20", two, null)!.cost).toBe(
      "Their recent, capture-qualified readings median $1.32 of estimated meter work per 1% of the five-hour meter.",
    );
  });

  it("says plainly when no reading cleared the 5% floor", () => {
    const noMedian = { ...CONTRIB, usd_per_pct: null };
    expect(contributorSentences("max20", noMedian, 0.97)!.cost).toBe(
      "None of their readings had the meter above 5% yet, so there is no figure to show.",
    );
  });

  it("treats an old per-model usd_per_pct shape as absent (no cost sentence)", () => {
    const oldShape = { ...CONTRIB, usd_per_pct: { "claude-sonnet-5": { median: 1, spread: null, contributors: 1, samples: 1 } } } as unknown as PlanContrib;
    expect(contributorSentences("max20", oldShape, 0.97)!.cost).toBeNull();
  });

  it("mentions the weekly figure only once it is measured", () => {
    expect(contributorSentences("max20", CONTRIB, 0.97)!.weekly).toBeNull();
    const measured: PlanContrib = { ...CONTRIB, weekly_windows: { ...CONTRIB.weekly_windows, measured: 9.4 } };
    expect(contributorSentences("max20", measured, null)!.weekly).toBe(
      "Across their weeks that comes to about 9.4 five-hour windows of use per week.",
    );
  });
});

describe("contrib chart helpers", () => {
  const P = (t: string, c: number, usd: number | null, coarse = false): ContribPoint => ({ t, c, usd_per_pct: usd, coarse });

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
