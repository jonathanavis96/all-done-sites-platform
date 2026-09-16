import { describe, it, expect } from "vitest";
import {
  compute,
  headline,
  fmtTokens,
  fmtUsd,
  fmtSource,
  seriesFor,
  eventsFor,
  weeklySeriesFor,
  weeklyEventsFor,
  latestWeeklyChange,
  weeklyTokenSeriesFor,
  weeklyRegimeLevelsFor,
  weeklyTokenRegimeLevelsFor,
  modelPlanLimit,
  currentWeeklyEstimate,
  rateStaleAfter,
  rateEvidenceAt,
  staleEvidenceAt,
  type UsageJson,
} from "./claudeUsage";

const J: UsageJson = {
  generated_at: "2026-09-05T20:15:00+00:00",
  last_sample_at: "2026-09-05T08:00:00+00:00",
  plan_measured: "max20",
  plan_ratios: { pro: 0.05, max5: 0.25, max20: 1 },
  rates: { "claude-sonnet-5": { tokens_per_window: 42_000_000, source: "probe", probe_effort: "low",
           split: { input: 0.062, output: 0.021, cache_read: 0.907, cache_write: 0.01 } } },
  effort: { "claude-sonnet-5": { low: 900_000, medium: 1_400_000, high: 2_520_000, xhigh: 3_900_000, max: 5_600_000 } },
  api_price_per_mtok: { "claude-sonnet-5": { input: 3, output: 15, cache_read: 0.3, cache_write: 3.75 } },
  history: { "claude-sonnet-5": [
    { date: "2026-05-01", tokens_per_window: 38_000_000, source: "passive", interpolated: false },
    { date: "2026-08-01", tokens_per_window: 40_000_000, source: "passive", interpolated: false },
    { date: "2026-09-05", tokens_per_window: 42_000_000, source: "probe", interpolated: false } ] },
  last_change: { date: "2026-09-02", direction: "decreased", percent: 14, model: "claude-sonnet-5" },
  weekly_windows: {
    max20: {
      current: 11.2,
      history: [{ week_ending: "2026-09-05", windows: 11, five_hour_pct: 0.4, seven_day_pct: 0.9 }],
    },
    max5: {
      current: 9.4,
      history: [{ week_ending: "2026-09-05", windows: 9, five_hour_pct: 0.4, seven_day_pct: 0.9 }],
    },
    pro: {
      current: 9.4,
      history: [{ week_ending: "2026-09-05", windows: 9, five_hour_pct: 0.4, seven_day_pct: 0.9 }],
      assumed: true,
    },
  },
  events: [
    { date: "2026-05-15", kind: "plan", label: "Plan started" },
    { date: "2026-08-01", kind: "change", label: "Limit change" },
    { date: "2026-01-01", kind: "plan", label: "Too old" },
  ],
};

// Schema 2, in the shape tracker PR #57 publishes: the rebuilt JSON's rates, and the weekly block
// as it reads once masterrig's passive.json is re-paired (the PR body's figures).
const SONNET = "claude-sonnet-5";
const FABLE = "claude-fable-5-1";
const MIX = { cache_read: 0.971307, cache_write: 0.025173, input: 3.5e-5, output: 0.003485 };
const LIMITS_URL = "https://support.claude.com/en/articles/15424964-claude-fable-models-on-your-plan";
const limit = (included: boolean, weekly_fraction: number) => ({ included, weekly_fraction, source_url: LIMITS_URL, as_of: "2026-09-16" });
const V2: UsageJson = {
  schema_version: 2,
  rate_basis: "meter_budget",
  generated_at: "2026-09-16T18:04:24+00:00",
  last_sample_at: "2026-09-16T15:23:08+00:00",
  meter_read_at: "2026-09-16T16:29:09+00:00",
  plan_measured: "max20",
  plan_ratios: { pro: 0.05, max5: 0.25, max20: 1 },
  weekly_window_ratios: {},
  availability: { rates: "conditional", evidence: "conditional", reason: "legacy_reset_metadata_missing" },
  rates: {
    [SONNET]: {
      tokens_per_window: 1_175_730_564, meter_budget_per_window: 115.05, api_value_per_window: 343.45,
      api_list_value_per_window: 343.45, source: "derived_reference_mix", split: MIX, probe_effort: "low",
      probed_at: "2026-09-14T13:16:57.472646+00:00", measured_at: "2026-09-16T15:23:08+00:00",
      reference_mix: { id: "gs-passive-2026-09-16-v1", kind: "derived_scenario", as_of: "2026-09-16", cache_write_duration: "legacy_assumed_5m" },
      evidence: { source: "passive", account_count: 1, observed_from: "2026-09-09T23:13:14+00:00", observed_to: "2026-09-16T15:23:08+00:00", reset_verified: false },
      quality: { status: "conditional", reasons: ["legacy_reset_metadata_missing", "capture_completeness_not_verified"], capture_complete: null, unpriced_work: false },
      freshness: { as_of: "2026-09-16T15:23:08+00:00", stale_after: "2026-09-26T15:23:08+00:00", stale: false },
    },
    [FABLE]: {
      tokens_per_window: 235_146_113, meter_budget_per_window: 115.05, api_value_per_window: 172.15,
      api_list_value_per_window: 172.15, source: "derived_reference_mix", split: MIX, probe_effort: "low",
      measured_at: "2026-09-16T15:23:08+00:00",
      evidence: { source: "passive", account_count: 1 },
      quality: { status: "conditional" },
      freshness: { as_of: "2026-09-16T15:23:08+00:00", stale_after: "2026-09-26T15:23:08+00:00", stale: false },
    },
  },
  effort: {
    [SONNET]: { low: 41_881, medium: 22_742, high: 25_572, xhigh: 27_259, max: 131_151 },
    [FABLE]: { low: 17_655, medium: 18_668, high: 21_694, xhigh: 33_329, max: 104_285 },
  },
  effort_usd: {
    [SONNET]: { low: 0.017204, medium: 0.026984, high: 0.057684, xhigh: 0.074554, max: 0.280004 },
    [FABLE]: { low: 0.10872, medium: 0.15922, high: 0.31052, xhigh: 0.89227, max: 1.507449 },
  },
  api_price_per_mtok: {
    [SONNET]: { input: 2, output: 10, cache_read: 0.2, cache_write: 2.5, cache_write_1h: 4, meter_weight: 1, class_weight: { input: 1, output: 1, cache_read: 0, cache_write: 1 } },
    [FABLE]: { input: 10, output: 50, cache_read: 0.25, cache_write: 12.5, cache_write_1h: 20, meter_weight: 1, class_weight: { input: 1, output: 1, cache_read: 0, cache_write: 1 } },
  },
  history: {
    [SONNET]: [
      { date: "2026-09-05", meter_budget_per_window: 137.03, tokens_per_window: 1_400_384_480, api_value_per_window: 409.07, api_list_value_per_window: 409.07, source: "passive", quality: "legacy_reset_unverified", readings: 1, interpolated: false },
      { date: "2026-09-16", meter_budget_per_window: 109.69, tokens_per_window: 1_121_014_461, api_value_per_window: 327.46, api_list_value_per_window: 327.46, source: "passive", quality: "legacy_reset_unverified", readings: 1, interpolated: false },
    ],
    [FABLE]: [],
  },
  last_change: null,
  events: [],
  model_plan_limits: {
    [SONNET]: { pro: limit(true, 1), max5: limit(true, 1), max20: limit(true, 1) },
    [FABLE]: { pro: limit(false, 0), max5: limit(true, 0.5), max20: limit(true, 0.5) },
  },
  weekly_windows: {
    max20: {
      current: 6.13,
      current_estimate: {
        value: 6.13, rounding_interval: [5.67, 6.65], five_hour_pct: 1281, seven_day_pct: 209, points: 51, pieces: 51,
        from: "2026-09-02T02:30:00+00:00", as_of: "2026-09-16T02:30:00+00:00", stale: false,
        source: "passive_paired_deltas", assumed: false, quality: "measured", reasons: [],
      },
      history: [
        { week_ending: "2026-08-28", windows: 7.2, five_hour_pct: 274, seven_day_pct: 38, partial: false, source: "passive_paired_deltas", assumed: false, quality: "measured", reasons: [] },
        { week_ending: "2026-09-04", windows: 6.36, five_hour_pct: 324, seven_day_pct: 51, partial: false, source: "passive_paired_deltas", assumed: false, quality: "measured", reasons: [] },
      ],
      regimes: [
        { start: "2026-08-19T17:00:00+00:00", end: "2026-09-16T02:30:00+00:00", windows: 6.34, seven_day_pct: 330, points: 120, pieces: 120, rounding_interval: [6.0, 6.7], quality: "bounded", source: "passive_paired_deltas", assumed: false },
      ],
      assumed: false,
      availability: { status: "measured", reason: null },
    },
    max5: {
      current: null,
      current_estimate: null,
      history: [
        { week_ending: "2026-08-14", windows: 11.0, five_hour_pct: 506, seven_day_pct: 46, partial: false, source: "passive_paired_deltas", assumed: false, quality: "measured", reasons: [] },
      ],
      regimes: [
        { start: "2026-06-13T01:30:00+00:00", end: "2026-08-14T19:19:00+00:00", windows: 10.86, seven_day_pct: 420, points: 170, pieces: 170, rounding_interval: [10.44, 11.32], quality: "bounded", source: "passive_paired_deltas", assumed: false },
        { start: "2026-08-14T19:19:00+00:00", end: "2026-08-18T20:00:00+00:00", windows: 6.61, seven_day_pct: 33, points: 12, pieces: 12, rounding_interval: [5.93, 7.43], quality: "bounded", source: "passive_paired_deltas", assumed: false },
      ],
      assumed: false,
      availability: { status: "historical_only", reason: "no_current_max5_measurement" },
      plan_change: { date: "2026-08-18", source: "account owner's record", independently_verified: false },
    },
    pro: { current: null, current_estimate: null, history: [], regimes: [], assumed: false, availability: { status: "unavailable", reason: "no_pro_measurement" } },
  },
};

describe("compute", () => {
  it("scales by plan and derives tasks and both dollar figures, each in its own unit (finding 1)", () => {
    const r = compute(V2, "max20", SONNET, "high")!;
    expect(r.tokensPerWindow).toBe(1_175_730_564);
    expect(r.split!.cache_read).toBeCloseTo(1_175_730_564 * 0.971307, -3);
    // The meter budget and the API list value of the same tokens are different figures.
    expect(r.meterBudgetUsd).toBe(115.05);
    expect(r.apiListValueUsd).toBe(343.45);
    // Tasks divide meter dollars by meter dollars, never list value by meter cost.
    expect(r.tasksPerWindow).toBeCloseTo(115.05 / 0.057684, 6);
    // Weekly figures scale by the plan's current estimate (6.13 here), not a theoretical 28.
    expect(r.windowsPerWeek).toBe(6.13);
    expect(r.tasksPerWeek).toBeCloseTo((115.05 / 0.057684) * 6.13, 6);
    expect(r.tokensPerWeek).toBeCloseTo(1_175_730_564 * 6.13, 0);
    expect(r.apiListValueUsdPerWeek).toBeCloseTo(343.45 * 6.13, 6);
    // The schema 1 fixture: the same token arithmetic, and no dollar figure it does not publish.
    const legacy = compute(J, "max20", SONNET, "high")!;
    expect(legacy.tokensPerWindow).toBe(42_000_000);
    expect(legacy.split!.cache_read).toBeCloseTo(38_094_000, -3);
    expect(legacy.windowsPerWeek).toBe(11.2);
    expect(legacy.meterBudgetUsd).toBeNull();
    expect(legacy.apiListValueUsd).toBeNull();
    expect(legacy.tasksPerWindow).toBeNull();
  });
  it("returns null for every per-week figure when weekly_windows is absent", () => {
    const { weekly_windows: _weekly_windows, ...withoutWeekly } = J;
    const r = compute(withoutWeekly as UsageJson, "max20", "claude-sonnet-5", "high");
    expect(r.windowsPerWeek).toBeNull();
    expect(r.tasksPerWeek).toBeNull();
    expect(r.tokensPerWeek).toBeNull();
    expect(r.apiListValueUsdPerWeek).toBeNull();
  });
  it("returns null for every per-week figure when the selected plan's weekly_windows entry is null", () => {
    const withNullPro: UsageJson = { ...J, weekly_windows: { ...J.weekly_windows!, pro: null } };
    const r = compute(withNullPro, "pro", "claude-sonnet-5", "high");
    expect(r.windowsPerWeek).toBeNull();
    expect(r.tasksPerWeek).toBeNull();
    expect(r.tokensPerWeek).toBeNull();
    expect(r.apiListValueUsdPerWeek).toBeNull();
  });
  it("gives pro no windows per week while its figure is an assumed copy of max5's (finding 6)", () => {
    const r = compute(J, "pro", "claude-sonnet-5", "high");
    expect(r.planWindowsPerWeek).toBeNull();
    expect(r.windowsPerWeek).toBeNull();
    expect(compute(V2, "pro", SONNET, "high")!.windowsPerWeek).toBeNull();
  });
  it("uses the selected plan's own current estimate, and never another plan's (finding 6)", () => {
    // Schema 1 measured only plan_measured: max5's `current` is a frozen median from before the
    // account moved plans, so it is not a current figure.
    expect(compute(J, "max5", "claude-sonnet-5", "high").windowsPerWeek).toBeNull();
    // Schema 2 publishes max5 as history only.
    expect(compute(V2, "max5", SONNET, "high")!.windowsPerWeek).toBeNull();
    const measuredMax5: UsageJson = {
      ...V2,
      weekly_windows: {
        ...V2.weekly_windows,
        max5: { ...V2.weekly_windows!.max5!, current: 9.4, current_estimate: { value: 9.4, stale: false, assumed: false, quality: "measured" } },
      },
    };
    expect(compute(measuredMax5, "max5", SONNET, "high")!.windowsPerWeek).toBe(9.4);
    expect(compute(measuredMax5, "max20", SONNET, "high")!.windowsPerWeek).toBe(6.13);
  });
  it("pro is 5% of max20", () => {
    expect(compute(J, "pro", "claude-sonnet-5", "low").tokensPerWindow).toBe(2_100_000);
  });
  it("reads a schema 1 dollar figure as the meter budget, scaled by plan, and publishes no API list value for it (finding 1)", () => {
    const withUsd: UsageJson = {
      ...J,
      rates: { "claude-sonnet-5": { ...J.rates["claude-sonnet-5"], api_value_per_window: 100.42 } },
    };
    expect(compute(withUsd, "max20", "claude-sonnet-5", "high").meterBudgetUsd).toBe(100.42);
    expect(compute(withUsd, "max5", "claude-sonnet-5", "high").meterBudgetUsd).toBeCloseTo(25.105, 6);
    expect(compute(withUsd, "pro", "claude-sonnet-5", "high").meterBudgetUsd).toBeCloseTo(5.021, 6);
    for (const plan of ["max20", "max5", "pro"] as const) {
      expect(compute(withUsd, plan, "claude-sonnet-5", "high").apiListValueUsd).toBeNull();
      expect(compute(withUsd, plan, "claude-sonnet-5", "high").apiListValueUsdPerWeek).toBeNull();
    }
  });
  it("gives every figure of an unavailable schema 2 rate as null, with nothing substituted (finding 13)", () => {
    const unavailable: UsageJson = {
      ...V2,
      rates: {
        [SONNET]: { tokens_per_window: null, meter_budget_per_window: null, api_value_per_window: null, api_list_value_per_window: null,
          source: "unavailable", split: MIX, probed_at: "2026-09-14T13:16:57Z", probe_effort: "low" },
      },
    };
    const r = compute(unavailable, "max20", SONNET, "high")!;
    expect(r.tokensPerWindow).toBeNull();
    expect(r.split).toBeNull();
    expect(r.meterBudgetUsd).toBeNull();
    expect(r.apiListValueUsd).toBeNull();
    expect(r.tokensPerWeek).toBeNull();
    expect(r.apiListValueUsdPerWeek).toBeNull();
  });
});

describe("model and plan eligibility (finding 2)", () => {
  it("gives Fable on Pro no included capacity at all", () => {
    const r = compute(V2, "pro", FABLE, "high")!;
    expect(r.included).toBe(false);
    expect(r.tokensPerWindow).toBeNull();
    expect(r.meterBudgetUsd).toBeNull();
    expect(r.apiListValueUsd).toBeNull();
    expect(r.windowsPerWeek).toBeNull();
    expect(seriesFor(V2, "pro", FABLE)).toEqual([]);
    expect(weeklyTokenRegimeLevelsFor(V2, "pro", FABLE)).toEqual([]);
  });
  it("gives Fable on Max half the plan's week, and leaves the plan's own figure whole", () => {
    const r = compute(V2, "max20", FABLE, "high")!;
    expect(r.included).toBe(true);
    expect(r.weeklyFraction).toBe(0.5);
    expect(r.planWindowsPerWeek).toBe(6.13);
    expect(r.windowsPerWeek).toBeCloseTo(3.065, 10);
    expect(r.tokensPerWeek).toBeCloseTo(235_146_113 * 3.065, 0);
    expect(r.apiListValueUsdPerWeek).toBeCloseTo(172.15 * 3.065, 6);
  });
  it("applies the published Fable rule to schema 1 JSON, which carries no model_plan_limits", () => {
    const legacy = structuredClone(J);
    legacy.rates[FABLE] = { ...legacy.rates[SONNET], tokens_per_window: 8_000_000, api_value_per_window: 100 };
    expect(modelPlanLimit(legacy, FABLE, "pro")).toMatchObject({ included: false, weekly_fraction: 0, source_url: LIMITS_URL });
    expect(modelPlanLimit(legacy, FABLE, "max5")).toMatchObject({ included: true, weekly_fraction: 0.5 });
    expect(modelPlanLimit(legacy, SONNET, "pro")).toMatchObject({ included: true, weekly_fraction: 1 });
    expect(compute(legacy, "pro", FABLE, "high")!.tokensPerWindow).toBeNull();
    expect(compute(legacy, "pro", FABLE, "high")!.meterBudgetUsd).toBeNull();
    expect(compute(legacy, "max20", FABLE, "high")!.windowsPerWeek).toBeCloseTo(5.6, 10);
  });
});

describe("one weekly value per plan (finding 6)", () => {
  // The audit's live state: max20's current is its newest regime; max5's is a frozen median of two
  // August weeks; Pro is an assumed copy of max5; and weekly_window_ratios scales between them.
  const LIVE: UsageJson = {
    ...J,
    weekly_window_ratios: { max20: 1.0, max5: 1.668, pro: 1.668 },
    weekly_windows: {
      max20: {
        current: 4.61, assumed: false,
        history: [{ week_ending: "2026-09-11", windows: 6.02, five_hour_pct: 373, seven_day_pct: 62 }],
        regimes: [
          { start: "2026-08-19T17:00:00+00:00", end: "2026-09-14T11:30:00+00:00", windows: 6.2, seven_day_pct: 165, points: 80 },
          { start: "2026-09-14T16:30:00+00:00", end: "2026-09-16T02:30:01+00:00", windows: 4.61, seven_day_pct: 23, points: 5 },
        ],
      },
      max5: {
        current: 11.02, assumed: false,
        history: [{ week_ending: "2026-08-14", windows: 11.0, five_hour_pct: 506, seven_day_pct: 46 }],
        regimes: [{ start: "2026-06-13T01:30:00+00:00", end: "2026-08-14T19:20:00+00:00", windows: 10.34, seven_day_pct: 453, points: 183 }],
      },
      pro: {
        current: 11.02, assumed: true,
        history: [{ week_ending: "2026-08-14", windows: 11.0, five_hour_pct: 506, seven_day_pct: 46 }],
        regimes: [{ start: "2026-06-13T01:30:00+00:00", end: "2026-08-14T19:20:00+00:00", windows: 10.34, seven_day_pct: 453, points: 183 }],
      },
    },
  };

  it("draws the same weekly value in the hero, the table and the chart for a measured plan", () => {
    for (const j of [LIVE, V2]) {
      const r = compute(j, "max20", SONNET, "high")!;
      const chartEnd = weeklyRegimeLevelsFor(j, "max20").at(-1)!.windows;
      expect(chartEnd).toBe(r.planWindowsPerWeek);
      expect(r.tokensPerWeek).toBeCloseTo(r.tokensPerWindow! * chartEnd, 0);
    }
    // V2's regime pools to 6.34 over its whole span; the chart ends on the current estimate.
    expect(weeklyRegimeLevelsFor(V2, "max20").at(-1)!.windows).toBe(6.13);
  });
  it("gives an unmeasured plan no weekly value anywhere, never another plan's number", () => {
    for (const plan of ["max5", "pro"] as const) {
      const r = compute(LIVE, plan, SONNET, "high");
      expect(r.planWindowsPerWeek).toBeNull();
      expect(r.tokensPerWeek).toBeNull();
      // Not 11.02 (the frozen median), and not 4.61 x 1.668 = 7.69 (max20 scaled across the seam).
      for (const level of weeklyRegimeLevelsFor(LIVE, plan)) {
        expect(level.windows).not.toBeCloseTo(4.61 * 1.668, 2);
        expect(level.windows).not.toBe(11.02);
      }
    }
    // Max 5x keeps its own history; Pro has none of its own.
    expect(weeklyRegimeLevelsFor(LIVE, "max5").map((l) => [l.start, l.windows, l.inferred])).toEqual([
      ["2026-06-13T01:30:00+00:00", 10.34, false],
    ]);
    expect(weeklyRegimeLevelsFor(LIVE, "pro")).toEqual([]);
    expect(weeklyRegimeLevelsFor(V2, "max5").map((l) => l.windows)).toEqual([10.86, 6.61]);
  });
  it("treats a stale current estimate as no current value, in the hero and on the chart alike", () => {
    const stale: UsageJson = {
      ...V2,
      weekly_windows: {
        ...V2.weekly_windows,
        max20: { ...V2.weekly_windows!.max20!, current_estimate: { ...V2.weekly_windows!.max20!.current_estimate!, stale: true } },
      },
    };
    expect(currentWeeklyEstimate(stale, "max20")).toBeNull();
    expect(compute(stale, "max20", SONNET, "high")!.windowsPerWeek).toBeNull();
    // The regime is still history, drawn at its own pooled level rather than the stale estimate.
    expect(weeklyRegimeLevelsFor(stale, "max20").map((l) => l.windows)).toEqual([6.34]);
  });
});

describe("compute effort scaling", () => {
  const priced: UsageJson = {
    ...J,
    rates: { "claude-sonnet-5": { ...J.rates["claude-sonnet-5"], api_value_per_window: 100 } },
    session_tokens: { "claude-sonnet-5": 500_000 },
    // The shape that broke the page: the token totals put low ABOVE medium because that cell
    // happened to run cold-cache, while the priced figures rise with effort as they should.
    effort: { "claude-sonnet-5": { low: 2_000_000, medium: 1_400_000, high: 2_520_000, xhigh: 3_900_000, max: 5_600_000 } },
    effort_usd: { "claude-sonnet-5": { low: 0.017, medium: 0.027, high: 0.058, xhigh: 0.075, max: 0.28 } },
  };
  it("gives more calibration tasks at lower effort, scaling by the priced series not the token totals", () => {
    const low = compute(priced, "max20", "claude-sonnet-5", "low")!;
    const medium = compute(priced, "max20", "claude-sonnet-5", "medium")!;
    const high = compute(priced, "max20", "claude-sonnet-5", "high")!;
    expect(low.tasksPerWindow!).toBeGreaterThan(medium.tasksPerWindow!);
    expect(medium.tasksPerWindow!).toBeGreaterThan(high.tasksPerWindow!);
    expect(medium.tasksPerWindow!).toBeCloseTo(100 / 0.027, 5);
    expect(low.tasksPerWindow!).toBeCloseTo(100 / 0.017, 5);
  });
  it("publishes no session count, even when the JSON carries session_tokens (finding 11)", () => {
    // The session figure divided reference-mix tokens by another account's session total and
    // scaled it by a calibration task's effort ratio: incompatible mixes, never a measurement.
    const r = compute(priced, "max20", "claude-sonnet-5", "low")!;
    expect("sessionsPerWindow" in r).toBe(false);
    expect("sessionsPerWeek" in r).toBe(false);
  });
  it("has no task count without priced effort figures, rather than dividing token totals (finding 11)", () => {
    const unpriced: UsageJson = { ...priced, effort_usd: undefined };
    expect(compute(unpriced, "max20", "claude-sonnet-5", "low")!.tasksPerWindow).toBeNull();
  });
});

describe("fmtUsd", () => {
  it("rounds to whole dollars", () => {
    expect(fmtUsd(100.42)).toBe("$100");
    expect(fmtUsd(5.021)).toBe("$5");
    expect(fmtUsd(2811.76)).toBe("$2,812");
  });
});

describe("fmtSource", () => {
  it("appends the probe date when probed_at is present", () => {
    expect(fmtSource({ source: "probe", probed_at: "2026-09-08T12:00:00Z" })).toBe("probe, 8 Sep");
  });
  it("names the meter for a passive figure, dated by its newest reading, never by the model's probe", () => {
    expect(fmtSource({ source: "passive", probed_at: "2026-09-14T13:16:00Z", measured_at: "2026-09-15T22:58:00Z" })).toBe(
      "the account's own meter, newest reading 15 Sep",
    );
    expect(fmtSource({ source: "passive", probed_at: "2026-09-14T13:16:00Z" })).toBe("the account's own meter");
  });
  it("falls back to the plain source when probed_at is absent", () => {
    expect(fmtSource({ source: "derived" })).toBe("derived");
    expect(fmtSource({ source: "derived", probed_at: null })).toBe("derived");
  });
  it("returns null when there is no rate at all", () => {
    expect(fmtSource(undefined)).toBeNull();
  });
  it("names a schema 2 figure's meter, its newest reading and the collector's quality and freshness words (finding 16)", () => {
    const rate = V2.rates[SONNET];
    expect(fmtSource(rate)).toBe("the account's own meter, newest reading 16 Sep, conditional");
    expect(fmtSource({ ...rate, freshness: { ...rate.freshness, stale: true } })).toBe(
      "the account's own meter, newest reading 16 Sep, conditional, stale",
    );
    expect(fmtSource({ ...rate, evidence: { ...rate.evidence, account_count: 2 }, quality: { status: "measured" } })).toBe(
      "2 accounts' own meters, newest reading 16 Sep",
    );
    // A schema 2 rate with no passive evidence is never dated by a probe.
    expect(fmtSource({ source: "unavailable", probed_at: "2026-09-14T13:16:57Z", quality: { status: "unavailable" } })).toBe("unavailable");
  });
});

describe("rateStaleAfter (finding 16)", () => {
  it("dates staleness by the evidence, never by when the file was built", () => {
    expect(rateStaleAfter(V2, SONNET)).toBe("2026-09-26T15:23:08+00:00");
    const rebuilt = { ...V2, generated_at: "2026-10-30T00:00:00+00:00" };
    expect(rateStaleAfter(rebuilt, SONNET)).toBe("2026-09-26T15:23:08+00:00");
    const stale: UsageJson = { ...V2, rates: { [SONNET]: { ...V2.rates[SONNET], freshness: { as_of: "2026-09-01T00:00:00+00:00", stale: true } } } };
    expect(rateStaleAfter(stale, SONNET)).toBe("2026-09-01T00:00:00+00:00");
    // Schema 1 without a per-model date has only last_sample_at, held for three days.
    expect(rateStaleAfter(J, SONNET)).toBe("2026-09-08T08:00:00.000Z");
  });

  it("follows the selected model's own date on schema 1, not a fresher reading on another model", () => {
    // The review's case: the file's newest sample is today, from Sonnet, while Opus's own figure
    // was last measured 11 days ago. Opus is stale and says so with its own date.
    const now = Date.parse("2026-09-16T17:00:00Z");
    const mixed: UsageJson = {
      ...J,
      last_sample_at: "2026-09-16T15:00:00+00:00",
      rates: {
        [SONNET]: { ...J.rates[SONNET], measured_at: "2026-09-16T15:00:00+00:00" },
        "claude-opus-5": { ...J.rates[SONNET], measured_at: "2026-09-05T12:00:00+00:00" },
      },
    };
    expect(rateEvidenceAt(mixed, "claude-opus-5")).toBe("2026-09-05T12:00:00+00:00");
    expect(rateStaleAfter(mixed, "claude-opus-5")).toBe("2026-09-08T12:00:00.000Z");
    expect(staleEvidenceAt(mixed, "claude-opus-5", now)).toBe("2026-09-05T12:00:00+00:00");
    expect(staleEvidenceAt(mixed, SONNET, now)).toBeNull();
  });

  it("never falls back to the file's build or sample time for a schema 2 figure", () => {
    const later = { generated_at: "2026-10-30T00:00:00+00:00", last_sample_at: "2026-10-29T00:00:00+00:00" };
    // Marked stale without as_of: stale since its own measured_at.
    const markedNoAsOf: UsageJson = { ...V2, ...later, rates: { [SONNET]: { ...V2.rates[SONNET], freshness: { stale: true } } } };
    expect(rateStaleAfter(markedNoAsOf, SONNET)).toBe(V2.rates[SONNET].measured_at);
    expect(staleEvidenceAt(markedNoAsOf, SONNET, Date.parse("2026-09-17T00:00:00Z"))).toBe(V2.rates[SONNET].measured_at);
    // No date of its own at all: no evidence date, so no stale line rather than a borrowed date.
    const { measured_at: _m, freshness: _f, ...undated } = V2.rates[SONNET];
    const noDate: UsageJson = { ...V2, ...later, rates: { [SONNET]: { ...undated, freshness: { stale: true } } } };
    expect(rateEvidenceAt(noDate, SONNET)).toBeNull();
    expect(rateStaleAfter(noDate, SONNET)).toBeNull();
    expect(staleEvidenceAt(noDate, SONNET, Date.parse("2027-01-01T00:00:00Z"))).toBeNull();
  });

  it("shows a schema 2 figure's own freshness date once it is past stale_after or marked stale", () => {
    expect(staleEvidenceAt(V2, SONNET, Date.parse("2026-09-20T00:00:00Z"))).toBeNull();
    expect(staleEvidenceAt(V2, SONNET, Date.parse("2026-09-27T00:00:00Z"))).toBe(V2.rates[SONNET].freshness!.as_of);
    const marked: UsageJson = { ...V2, rates: { [SONNET]: { ...V2.rates[SONNET], freshness: { as_of: "2026-09-01T00:00:00+00:00", stale: true } } } };
    expect(staleEvidenceAt(marked, SONNET, Date.parse("2026-09-02T00:00:00Z"))).toBe("2026-09-01T00:00:00+00:00");
  });
});

describe("headline", () => {
  // An observed change in the watched account's metric, not a dated Anthropic policy change:
  // one account cannot establish that, or which cap moved (finding 4).
  it("states the last change", () => {
    expect(headline(J)).toEqual({ text: "Claude's observed 5-hour window budget decreased by 14% on 2 Sep 2026.", tone: "down" });
  });
  it("uses window wording when scope is absent (old JSON)", () => {
    const withoutScope: UsageJson = {
      ...J,
      last_change: { date: "2026-09-02", direction: "decreased", percent: 14, model: "claude-sonnet-5" },
    };
    expect(headline(withoutScope).text).toBe("Claude's observed 5-hour window budget decreased by 14% on 2 Sep 2026.");
  });
  it("states a weekly decrease", () => {
    const weekly: UsageJson = {
      ...J,
      last_change: { date: "2026-08-21", direction: "decreased", percent: 36, model: "all", scope: "weekly" },
    };
    expect(headline(weekly)).toEqual({
      text: "Claude's observed weekly-to-window ratio decreased by 36% on 21 Aug 2026.",
      tone: "down",
    });
  });
  it("states a weekly increase", () => {
    const weekly: UsageJson = {
      ...J,
      last_change: { date: "2026-08-21", direction: "increased", percent: 20, model: "all", scope: "weekly" },
    };
    expect(headline(weekly)).toEqual({
      text: "Claude's observed weekly-to-window ratio increased by 20% on 21 Aug 2026.",
      tone: "up",
    });
  });
  it("bounds a schema 2 change by its onset rather than dating it to one day", () => {
    const certified: UsageJson = {
      ...V2,
      last_change: {
        date: "2026-09-14", direction: "decreased", percent: 31, model: "all", scope: "weekly",
        metric: "weekly_to_five_hour_ratio", observation_scope: "account", attribution: "observed_account_metric_change",
        onset: { earliest: "2026-09-13T22:30:00+00:00", latest: "2026-09-14T22:30:00+00:00" },
        confirmation: { at: "2026-09-16T02:30:00+00:00", evidence_points: 9, seven_day_pct: 23 },
        evidence_quality: "certified", provisional: false, legacy_uncertain: false,
      },
    };
    const text = headline(certified).text;
    expect(text).toBe("Claude's observed weekly-to-window ratio decreased by 31% between 13 Sep 2026 and 14 Sep 2026.");
    expect(text).not.toContain("Anthropic");
    certified.last_change!.onset = { earliest: "2026-09-14T09:00:00+00:00", latest: "2026-09-14T22:30:00+00:00" };
    expect(headline(certified).text).toBe("Claude's observed weekly-to-window ratio decreased by 31% on 14 Sep 2026.");
  });
  it("states no change when none", () => {
    const h = headline({ ...J, last_change: null });
    expect(h.tone).toBe("flat");
    expect(h.text).toBe("No change in Claude's limits detected since 1 May 2026.");
  });
  it("skips held (backfilled) rows and uses the first genuinely measured date", () => {
    const withHeld: UsageJson = {
      ...J,
      last_change: null,
      history: {
        "claude-sonnet-5": [
          { date: "2026-07-01", tokens_per_window: 42_000_000, source: "held", interpolated: false },
          { date: "2026-08-01", tokens_per_window: 40_000_000, source: "passive", interpolated: false },
          { date: "2026-09-05", tokens_per_window: 42_000_000, source: "probe", interpolated: false },
        ],
      },
    };
    expect(headline(withHeld).text).toBe("No change in Claude's limits detected since 1 Aug 2026.");
  });
  it("gives no date when every row is held, since no row was measured on its own day", () => {
    // Main fell back to the earliest held date. A held row is a copy of the first real reading, so
    // that date had no measurement; the since-date follows the page's one dated-row rule.
    const allHeld: UsageJson = {
      ...J,
      last_change: null,
      history: {
        "claude-sonnet-5": [
          { date: "2026-07-01", tokens_per_window: 42_000_000, source: "held", interpolated: false },
          { date: "2026-07-15", tokens_per_window: 42_000_000, source: "held", interpolated: false },
        ],
      },
    };
    expect(allHeld.history["claude-sonnet-5"] && headline(allHeld).text).toBe(
      "No change in Claude's limits detected since we started measuring.",
    );
  });
  it("dates no detection from the first dated window row, never an unpriced or interpolated one", () => {
    // Schema 2 publishes an unpriced day as tokens_per_window null.
    const leading: UsageJson = {
      ...V2,
      last_change: null,
      history: {
        [SONNET]: [
          { date: "2026-01-01", tokens_per_window: null, source: "passive", interpolated: false },
          { date: "2026-02-01", tokens_per_window: 40_000_000, source: "passive", interpolated: true },
          { date: "2026-03-01", tokens_per_window: 42_000_000, source: "passive", quality: "measured", interpolated: false },
        ],
        [FABLE]: [{ date: "2026-01-15", tokens_per_window: null, source: "passive", interpolated: false }],
      },
    };
    expect(headline(leading).text).toBe("No change in Claude's limits detected since 1 Mar 2026.");
  });
});

describe("fmtTokens", () => {
  it("formats", () => {
    expect(fmtTokens(42_000_000)).toBe("42M");
    expect(fmtTokens(2_604_000)).toBe("2.6M");
    expect(fmtTokens(420_000)).toBe("420k");
  });
});

describe("seriesFor", () => {
  it("scales history by plan", () => {
    const s = seriesFor(J, "max5", "claude-sonnet-5");
    expect(s[1]).toEqual({ date: "2026-09-05", value: 10_500_000, interpolated: false, held: false });
  });
  it("defaults to the last 90 days, dropping older points", () => {
    const s = seriesFor(J, "max20", "claude-sonnet-5");
    expect(s.map((p) => p.date)).toEqual(["2026-08-01", "2026-09-05"]);
  });
  it("narrows to a 30-day window", () => {
    const s = seriesFor(J, "max20", "claude-sonnet-5", 30);
    expect(s.map((p) => p.date)).toEqual(["2026-09-05"]);
  });
  it("widens to a 180-day window", () => {
    const s = seriesFor(J, "max20", "claude-sonnet-5", 180);
    expect(s.map((p) => p.date)).toEqual(["2026-05-01", "2026-08-01", "2026-09-05"]);
  });
});

describe("eventsFor", () => {
  it("keeps only events inside the visible range", () => {
    expect(eventsFor(J, "claude-sonnet-5", 90)).toEqual([{ date: "2026-08-01", kind: "change", label: "Limit change" }]);
  });
  it("widens with the range", () => {
    expect(eventsFor(J, "claude-sonnet-5", 180)).toEqual([
      { date: "2026-05-15", kind: "plan", label: "Plan started" },
      { date: "2026-08-01", kind: "change", label: "Limit change" },
    ]);
  });
  it("returns nothing for a model with no history", () => {
    expect(eventsFor(J, "claude-nonexistent", 90)).toEqual([]);
  });
  it("anchors on the same last plotted row as the series when schema 2 ends on unpriced days", () => {
    // Schema 2 publishes a day with no priced reference mix as tokens_per_window null. The chart
    // ends on 5 Sep, so a change on 20 Jun is inside its 90 days, and one on 1 Oct is past its end.
    const trailing: UsageJson = {
      ...J,
      history: { [SONNET]: [
        ...J.history[SONNET],
        { date: "2026-09-20", tokens_per_window: null, source: "passive", interpolated: false },
        { date: "2026-10-10", tokens_per_window: null, source: "passive", interpolated: false },
      ] },
      events: [
        { date: "2026-06-20", kind: "change", label: "Early change" },
        { date: "2026-10-01", kind: "change", label: "After the last plotted day" },
      ],
    };
    const series = seriesFor(trailing, "max20", SONNET, 90);
    expect(series[series.length - 1].date).toBe("2026-09-05");
    expect(eventsFor(trailing, SONNET, 90).map((e) => e.date)).toEqual(["2026-06-20"]);
  });
});

const WJ: UsageJson = {
  ...J,
  weekly_windows: {
    max20: {
      current: 11.2,
      history: [
        { week_ending: "2026-07-04", windows: 10, five_hour_pct: 0.3, seven_day_pct: 0.8 },
        { week_ending: "2026-08-01", windows: 10.5, five_hour_pct: 0.35, seven_day_pct: 0.85 },
        { week_ending: "2026-09-05", windows: 11.2, five_hour_pct: 0.4, seven_day_pct: 0.9 },
      ],
    },
    max5: {
      current: 9.6,
      history: [
        { week_ending: "2026-08-01", windows: 9, five_hour_pct: 0.3, seven_day_pct: 0.8 },
        { week_ending: "2026-09-05", windows: 9.4, five_hour_pct: 0.35, seven_day_pct: 0.85 },
        { week_ending: "2026-09-12", windows: 9.6, five_hour_pct: 0.4, seven_day_pct: 0.9 },
      ],
    },
    pro: {
      current: 9.6,
      assumed: true,
      history: [
        { week_ending: "2026-08-01", windows: 9, five_hour_pct: 0.3, seven_day_pct: 0.8 },
        { week_ending: "2026-09-05", windows: 9.4, five_hour_pct: 0.35, seven_day_pct: 0.85 },
        { week_ending: "2026-09-12", windows: 9.6, five_hour_pct: 0.4, seven_day_pct: 0.9 },
      ],
    },
  },
  events: [
    { date: "2026-05-15", kind: "plan", label: "Plan started" },
    { date: "2026-08-01", kind: "change", label: "Limit change" },
    { date: "2026-01-01", kind: "plan", label: "Too old" },
    { date: "2026-08-21", kind: "change", scope: "weekly", label: "Weekly limit changed" },
    { date: "2026-01-01", kind: "change", scope: "weekly", label: "Too old weekly" },
  ],
};

// Regimes: Max 20x is measured only from August; Max 5x (and Pro, which borrows it verbatim)
// carries one level from January to the day the account moved plans. Max 20x's current is its
// newest level, as the schema 1 collector publishes it.
const RJ: UsageJson = {
  ...WJ,
  weekly_window_ratios: { pro: 1.78, max5: 1.78, max20: 1 },
  weekly_windows: {
    max20: { ...WJ.weekly_windows!.max20!, current: 6, regimes: [{ start: "2026-08-01", end: "2026-09-05", windows: 6, seven_day_pct: 300, points: 5 }] },
    max5: { ...WJ.weekly_windows!.max5!, regimes: [{ start: "2026-01-01", end: "2026-08-01", windows: 10.68, seven_day_pct: 900, points: 12 }] },
    pro: { ...WJ.weekly_windows!.pro!, regimes: [{ start: "2026-01-01", end: "2026-08-01", windows: 10.68, seven_day_pct: 900, points: 12 }] },
  },
};

// Until the audit these levels were filled across plans by weekly_window_ratios, clipped where a
// measured level overlapped. The ratio (10.34/6.20 live) divides two plans' levels measured in
// different periods, so it makes the plan seam continuous by construction and a limit change at
// the seam disappears into it (finding 6). Each plan now draws its own levels only.
describe("weeklyRegimeLevelsFor", () => {
  it("draws only the plan's own level, never another plan's scaled across the boundary it touches", () => {
    const levels = weeklyRegimeLevelsFor(RJ, "max20");
    expect(levels.map((l) => [l.start, l.end, l.inferred, +l.windows.toFixed(2)])).toEqual([
      ["2026-08-01", "2026-09-05", false, 6],
    ]);
  });
  it("keeps each plan's own level whole where another plan's overlaps it, rather than clipping either", () => {
    const overlapping: UsageJson = {
      ...RJ,
      weekly_windows: {
        ...RJ.weekly_windows!,
        max5: { ...RJ.weekly_windows!.max5!, regimes: [{ start: "2026-01-01", end: "2026-09-01", windows: 10.68, seven_day_pct: 900, points: 12 }] },
        pro: { ...RJ.weekly_windows!.pro!, regimes: [] },
      },
    };
    expect(weeklyRegimeLevelsFor(overlapping, "max20").map((l) => [l.start, l.end, l.inferred])).toEqual([
      ["2026-08-01", "2026-09-05", false],
    ]);
    expect(weeklyRegimeLevelsFor(overlapping, "max5").map((l) => [l.start, l.end, l.inferred])).toEqual([
      ["2026-01-01", "2026-09-01", false],
    ]);
  });
  it("leaves the months around a plan's own level empty rather than filling them from another plan", () => {
    const inside: UsageJson = {
      ...RJ,
      weekly_windows: {
        ...RJ.weekly_windows!,
        max20: { ...RJ.weekly_windows!.max20!, regimes: [{ start: "2026-03-01", end: "2026-05-01", windows: 6, seven_day_pct: 300, points: 5 }] },
        pro: { ...RJ.weekly_windows!.pro!, regimes: [] },
      },
    };
    const levels = weeklyRegimeLevelsFor(inside, "max20");
    expect(levels.map((l) => [l.start, l.end, l.inferred])).toEqual([["2026-03-01", "2026-05-01", false]]);
  });
  it("draws Max 5x's own level once, and nothing for Pro's assumed copy of it", () => {
    expect(weeklyRegimeLevelsFor(RJ, "max5").map((l) => [l.start, l.inferred, +l.windows.toFixed(2)])).toEqual([
      ["2026-01-01", false, 10.68],
    ]);
    expect(weeklyRegimeLevelsFor(RJ, "pro")).toEqual([]);
  });
});

describe("weeklyTokenRegimeLevelsFor", () => {
  it("prices each level by what one window bought during it, on the plan's own levels only", () => {
    const levels = weeklyTokenRegimeLevelsFor(RJ, "max20", "claude-sonnet-5");
    // August's own 40M row; no January level borrowed from Max 5x.
    expect(levels.map((l) => [l.start, Math.round(l.tokens)])).toEqual([["2026-08-01", 6 * 40_000_000]]);
  });
  it("steps when the window figure changes inside one flat weekly level (audit finding 12)", () => {
    // audit_checks.cjs: one weekly level of 6 windows, 1-20 September; a window holds 100 tokens on
    // 1 September and 200 from 10 September. The chart used to hold 600 for the whole level.
    const fake: UsageJson = structuredClone(J);
    fake.weekly_windows = {
      max20: { current: 6, history: [], regimes: [{ start: "2026-09-01T00:00:00Z", end: "2026-09-20T00:00:00Z", windows: 6, seven_day_pct: 100, points: 10 }] },
      max5: { current: null, history: [], regimes: [] },
      pro: { current: null, history: [], regimes: [] },
    };
    fake.history[SONNET] = [
      { date: "2026-09-01", tokens_per_window: 100, source: "passive", interpolated: false },
      { date: "2026-09-10", tokens_per_window: 200, source: "passive", interpolated: false },
    ];
    expect(weeklyTokenRegimeLevelsFor(fake, "max20", SONNET).map((l) => [l.start, l.end, l.tokens])).toEqual([
      ["2026-09-01T00:00:00Z", "2026-09-10T00:00:00.000Z", 600],
      ["2026-09-10T00:00:00.000Z", "2026-09-20T00:00:00Z", 1200],
    ]);
  });
  it("leaves out a span before the first dated window figure, and a held day, rather than backfilling them", () => {
    const fake: UsageJson = structuredClone(J);
    fake.weekly_windows = {
      max20: { current: 6, history: [], regimes: [{ start: "2026-06-01T00:00:00Z", end: "2026-09-20T00:00:00Z", windows: 6, seven_day_pct: 100, points: 10 }] },
    };
    fake.history[SONNET] = [
      { date: "2026-08-11", tokens_per_window: 100, source: "held", interpolated: false },
      { date: "2026-09-05", tokens_per_window: 100, source: "passive", interpolated: false },
    ];
    expect(weeklyTokenRegimeLevelsFor(fake, "max20", SONNET).map((l) => [l.start, l.end, l.tokens])).toEqual([
      ["2026-09-05T00:00:00.000Z", "2026-09-20T00:00:00Z", 600],
    ]);
  });
  it("marks a span inferred when its window figure is not marked measured, and applies the model's weekly share", () => {
    const levels = weeklyTokenRegimeLevelsFor(V2, "max20", SONNET);
    expect(levels.map((l) => [l.start, l.end, l.inferred])).toEqual([
      ["2026-09-05T00:00:00.000Z", "2026-09-16T00:00:00.000Z", true],
      ["2026-09-16T00:00:00.000Z", "2026-09-16T02:30:00+00:00", true],
    ]);
    expect(levels[0].tokens).toBeCloseTo(6.13 * 1_400_384_480, 0);
    const fable: UsageJson = { ...V2, history: { ...V2.history, [FABLE]: [{ ...V2.history[SONNET][0], tokens_per_window: 280_076_896, quality: "measured" }] } };
    const fableLevels = weeklyTokenRegimeLevelsFor(fable, "max20", FABLE);
    expect(fableLevels.map((l) => l.inferred)).toEqual([false]);
    expect(fableLevels[0].tokens).toBeCloseTo(6.13 * 280_076_896 * 0.5, 0);
  });
});

describe("weeklySeriesFor", () => {
  it("is not scoped by any range: returns the plan's full weekly history", () => {
    // Unlike seriesFor/eventsFor, the weekly chart never hides months of history behind the
    // 30/90/180-day range picker, since it needs only meter readings, not probes.
    const s = weeklySeriesFor(WJ);
    const max20 = s.find((x) => x.plan === "max20")!;
    // Only its own weeks: max5's 2026-09-12 is no longer copied across (finding 6).
    expect(max20.points.map((p) => p.date)).toEqual(["2026-07-04", "2026-08-01", "2026-09-05"]);
  });
  it("flags a week as partial when its week_ending falls after last_sample_at", () => {
    // last_sample_at is 2026-09-05, so max5's 2026-09-12 week is still in progress.
    const s = weeklySeriesFor(WJ);
    const max5 = s.find((x) => x.plan === "max5")!;
    expect(max5.points.map((p) => p.partial)).toEqual([false, false, true]);
  });
  it("prefers an explicit partial flag over the last_sample_at inference when present", () => {
    const withExplicit: UsageJson = {
      ...WJ,
      last_sample_at: "2026-09-05T08:00:00+00:00",
      weekly_windows: {
        ...WJ.weekly_windows!,
        max20: {
          current: 11.2,
          // week_ending is before last_sample_at (would infer false), but the explicit flag says true.
          history: [{ week_ending: "2026-09-05", windows: 11, five_hour_pct: 0.4, seven_day_pct: 0.9, partial: true }],
        },
      },
    };
    const s = weeklySeriesFor(withExplicit);
    const max20 = s.find((x) => x.plan === "max20")!;
    const point = max20.points.find((p) => p.date === "2026-09-05")!;
    expect(point.partial).toBe(true);
  });
  it("draws no Pro series while Pro is an assumed copy of max5, and labels max5 as itself (finding 6)", () => {
    const s = weeklySeriesFor(WJ);
    expect(s.some((x) => x.plan === "pro")).toBe(false);
    const max5 = s.find((x) => x.plan === "max5")!;
    expect(max5.label).toBe("Max 5x");
    expect(max5.assumed).toBe(false);
  });
  it("draws no Pro series while Pro is assumed, even when its points differ from max5's (finding 6)", () => {
    const withDifferingPro: UsageJson = {
      ...WJ,
      weekly_windows: {
        ...WJ.weekly_windows!,
        pro: {
          current: 8.4,
          assumed: true,
          history: [
            { week_ending: "2026-08-01", windows: 8, five_hour_pct: 0.3, seven_day_pct: 0.8 },
            { week_ending: "2026-09-05", windows: 8.4, five_hour_pct: 0.35, seven_day_pct: 0.85 },
            { week_ending: "2026-09-12", windows: 8.6, five_hour_pct: 0.4, seven_day_pct: 0.9 },
          ],
        },
      },
    };
    const s = weeklySeriesFor(withDifferingPro);
    expect(s.find((x) => x.plan === "pro")).toBeUndefined();
    expect(s.find((x) => x.plan === "max5")!.label).toBe("Max 5x");
    // A measured Pro series is drawn under its own label.
    const measuredPro: UsageJson = { ...withDifferingPro, weekly_windows: { ...withDifferingPro.weekly_windows!, pro: { ...withDifferingPro.weekly_windows!.pro!, assumed: false } } };
    expect(weeklySeriesFor(measuredPro).find((x) => x.plan === "pro")!.label).toBe("Pro");
  });
  it("leaves max20's own points untouched", () => {
    const s = weeklySeriesFor(WJ);
    const max20 = s.find((x) => x.plan === "max20")!;
    expect(max20.label).toBe("Max 20x");
    expect(max20.points.map((p) => p.windows)).toEqual([10, 10.5, 11.2]);
    expect(max20.points.every((p) => !p.inferred)).toBe(true);
  });
  it("fills no gaps: a series missing a date stays missing it rather than borrowing another plan's point (finding 6)", () => {
    const s = weeklySeriesFor(WJ);
    const max20 = s.find((x) => x.plan === "max20")!;
    const max5 = s.find((x) => x.plan === "max5")!;
    expect(max20.points.find((p) => p.date === "2026-09-12")).toBeUndefined();
    expect(max5.points.find((p) => p.date === "2026-07-04")).toBeUndefined();
    // Measured points are untouched and flagged not inferred.
    const measuredMax20 = max20.points.find((p) => p.date === "2026-09-05")!;
    expect(measuredMax20.inferred).toBe(false);
    expect(measuredMax20.windows).toBe(11.2);
    const measuredMax5 = max5.points.find((p) => p.date === "2026-08-01")!;
    expect(measuredMax5.inferred).toBe(false);
    expect(measuredMax5.windows).toBe(9);
    expect(max20.points.map((p) => p.date)).toEqual(["2026-07-04", "2026-08-01", "2026-09-05"]);
    expect(max5.points.map((p) => p.date)).toEqual(["2026-08-01", "2026-09-05", "2026-09-12"]);
  });
  it("fills no gaps from published weekly_window_ratios either (finding 6)", () => {
    const withRatios: UsageJson = {
      ...WJ,
      weekly_window_ratios: { max20: 1.0, max5: 2.0, pro: 2.0 },
    };
    const s = weeklySeriesFor(withRatios);
    expect(s.find((x) => x.plan === "max20")!.points.find((p) => p.date === "2026-09-12")).toBeUndefined();
    expect(s.find((x) => x.plan === "max5")!.points.find((p) => p.date === "2026-07-04")).toBeUndefined();
  });
  it("does not let a limit change on the measured plan inflate the other one, by drawing neither from the other (issue #54)", () => {
    // The shape that produced issue #54: max5 frozen at its last measured August weeks, max20 the
    // live plan whose `current` has been dragged below its own weekly history by a later cut.
    // Scaling by the current quotient (11.02 / 4.61 = 2.39) put inferred max5 at 15.7 windows; the
    // #54 fix scaled by a frozen 1.78 instead, which made the seam continuous by construction. The
    // audit showed that quotient cannot tell the plan move from a limit change at the move, so
    // neither plan's line is drawn from the other's: max5 keeps its measured week and nothing more.
    const seam: UsageJson = {
      ...WJ,
      weekly_window_ratios: { max20: 1.0, max5: 1.78, pro: 1.78 },
      weekly_windows: {
        max20: {
          current: 4.61, // post-cut regime, below every week in this history
          history: [
            { week_ending: "2026-08-28", windows: 6.58, five_hour_pct: 250, seven_day_pct: 38 },
            { week_ending: "2026-09-11", windows: 6.02, five_hour_pct: 373, seven_day_pct: 62 },
          ],
        },
        max5: {
          current: 11.02,
          history: [{ week_ending: "2026-08-14", windows: 11.0, five_hour_pct: 506, seven_day_pct: 46 }],
        },
        pro: {
          current: 11.02,
          assumed: true,
          history: [{ week_ending: "2026-08-14", windows: 11.0, five_hour_pct: 506, seven_day_pct: 46 }],
        },
      },
    };
    const s = weeklySeriesFor(seam);
    const max5 = s.find((x) => x.plan === "max5")!;
    expect(max5.points.filter((p) => p.inferred)).toEqual([]);
    expect(max5.points.map((p) => [p.date, p.windows])).toEqual([["2026-08-14", 11.0]]);
    // No max5 week after the plan seam, so no max5 week inflated by max20's cut.
    expect(max5.points.find((p) => p.date === "2026-08-28")).toBeUndefined();
    expect(s.find((x) => x.plan === "max20")!.points.map((p) => [p.date, p.windows])).toEqual([
      ["2026-08-28", 6.58],
      ["2026-09-11", 6.02],
    ]);
    // The headline figures for both plans come from the same rule: max5's frozen 11.02 is not current.
    expect(compute(seam, "max5", SONNET, "high").windowsPerWeek).toBeNull();
  });
  it("does not infer when either side's current is zero", () => {
    const zeroCurrent: UsageJson = {
      ...WJ,
      weekly_windows: { ...WJ.weekly_windows!, max20: { ...WJ.weekly_windows!.max20!, current: 0 } },
    };
    const s = weeklySeriesFor(zeroCurrent);
    const max20 = s.find((x) => x.plan === "max20")!;
    const max5 = s.find((x) => x.plan === "max5")!;
    expect(max20.points.map((p) => p.date)).toEqual(["2026-07-04", "2026-08-01", "2026-09-05"]);
    expect(max5.points.map((p) => p.date)).toEqual(["2026-08-01", "2026-09-05", "2026-09-12"]);
  });
  it("leaves a lone series unfilled when there is no other series to infer from", () => {
    const withNullMax20: UsageJson = { ...WJ, weekly_windows: { ...WJ.weekly_windows!, max20: null } };
    const s = weeklySeriesFor(withNullMax20);
    const max5 = s.find((x) => x.plan === "max5")!;
    expect(max5.points.every((p) => !p.inferred)).toBe(true);
    expect(max5.points.map((p) => p.date)).toEqual(["2026-08-01", "2026-09-05", "2026-09-12"]);
  });
  it("skips a plan with a null weekly_windows entry", () => {
    const withNullMax20: UsageJson = { ...WJ, weekly_windows: { ...WJ.weekly_windows!, max20: null } };
    const s = weeklySeriesFor(withNullMax20);
    expect(s.some((x) => x.plan === "max20")).toBe(false);
  });
  it("skips a plan with an empty history", () => {
    const withEmpty: UsageJson = {
      ...WJ,
      weekly_windows: { ...WJ.weekly_windows!, max20: { current: 11.2, history: [] } },
    };
    const s = weeklySeriesFor(withEmpty);
    expect(s.some((x) => x.plan === "max20")).toBe(false);
  });
  it("returns nothing when weekly_windows is absent entirely", () => {
    const { weekly_windows: _weekly_windows, ...withoutWeekly } = WJ;
    expect(weeklySeriesFor(withoutWeekly as UsageJson)).toEqual([]);
  });
});

describe("weeklyTokenSeriesFor", () => {
  it("scales windows by the history value at or before the week ending, times the plan ratio", () => {
    // WJ's history for claude-sonnet-5: 2026-05-01 38M, 2026-08-01 40M, 2026-09-05 42M.
    const s = weeklyTokenSeriesFor(WJ, "claude-sonnet-5");
    const max5 = s.find((x) => x.plan === "max5")!; // ratio 0.25
    const aug1 = max5.points.find((p) => p.date === "2026-08-01")!;
    expect(aug1.tokens).toBeCloseTo(9 * 40_000_000 * 0.25, 5);
    const sep5 = max5.points.find((p) => p.date === "2026-09-05")!;
    expect(sep5.tokens).toBeCloseTo(9.4 * 42_000_000 * 0.25, 5);
  });
  it("uses the earliest history entry when it is the only one at or before the week ending", () => {
    const s = weeklyTokenSeriesFor(WJ, "claude-sonnet-5");
    const max20 = s.find((x) => x.plan === "max20")!; // ratio 1
    // 2026-07-04 predates the earliest history entry (2026-05-01), which is itself <=
    // 2026-07-04, so that entry (38M) is used either way.
    const jul4 = max20.points.find((p) => p.date === "2026-07-04")!;
    expect(jul4.tokens).toBeCloseTo(10 * 38_000_000, 5);
  });
  it("leaves tokens undefined without a dated window figure, rather than backdating the current rate (finding 12)", () => {
    const noHistory: UsageJson = { ...WJ, history: {} };
    const s = weeklyTokenSeriesFor(noHistory, "claude-sonnet-5");
    const max20 = s.find((x) => x.plan === "max20")!;
    expect(max20.points.every((p) => p.tokens === undefined)).toBe(true);
    // A week before the first dated row has none either.
    const late: UsageJson = { ...WJ, history: { "claude-sonnet-5": [{ date: "2026-08-15", tokens_per_window: 40_000_000, source: "passive", interpolated: false }] } };
    const lateMax20 = weeklyTokenSeriesFor(late, "claude-sonnet-5").find((x) => x.plan === "max20")!;
    expect(lateMax20.points.map((p) => p.tokens)).toEqual([undefined, undefined, 11.2 * 40_000_000]);
  });
  it("leaves tokens undefined when neither history nor a rate exists for the model", () => {
    const s = weeklyTokenSeriesFor(WJ, "claude-nonexistent");
    const max20 = s.find((x) => x.plan === "max20")!;
    expect(max20.points.every((p) => p.tokens === undefined)).toBe(true);
  });
  it("prices max5's own line by its own plan ratio, and draws no line for an assumed Pro (finding 6)", () => {
    const shared: UsageJson = {
      ...WJ,
      weekly_windows: {
        ...WJ.weekly_windows,
        pro: { ...WJ.weekly_windows!.max5!, assumed: true },
      },
    };
    const s = weeklyTokenSeriesFor(shared, "claude-sonnet-5");
    const max5 = s.find((x) => x.plan === "max5")!;
    expect(max5.label).toBe("Max 5x");
    expect(s.find((x) => x.plan === "pro")).toBeUndefined();
    const max5Aug = max5.points.find((p) => p.date === "2026-08-01")!;
    expect(max5Aug.tokens).toBeCloseTo(9 * 40_000_000 * 0.25, 5);
  });
});

describe("weeklyEventsFor", () => {
  it("keeps only weekly-scoped events, unscoped by any range", () => {
    expect(weeklyEventsFor(WJ)).toEqual([
      { date: "2026-08-21", kind: "change", scope: "weekly", label: "Weekly limit changed" },
      { date: "2026-01-01", kind: "change", scope: "weekly", label: "Too old weekly" },
    ]);
  });
  it("excludes window-scoped events", () => {
    const e = weeklyEventsFor(WJ);
    expect(e.some((ev) => ev.label === "Limit change")).toBe(false);
  });
});

describe("latestWeeklyChange", () => {
  it("takes the newest change by date, not by position", () => {
    expect(latestWeeklyChange(weeklyEventsFor(WJ))?.date).toBe("2026-08-21");
  });
  it("ignores non-change events", () => {
    const events = [
      { date: "2026-09-01", kind: "plan" as const, scope: "weekly" as const, label: "Plan change" },
      { date: "2026-08-21", kind: "change" as const, scope: "weekly" as const, label: "Weekly limit changed" },
    ];
    expect(latestWeeklyChange(events)?.label).toBe("Weekly limit changed");
  });
  it("is null with no changes", () => {
    expect(latestWeeklyChange([])).toBeNull();
  });
});

it("does not throw on a missing model or an empty history", () => {
  expect(compute(J, "max20", "claude-nonexistent", "high")).toBeNull();
  const empty = { ...J, last_change: null, history: {} };
  expect(headline(empty).tone).toBe("flat");
});
