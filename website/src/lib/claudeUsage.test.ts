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
  weeklyWindowRatio,
  modelPlanLimit,
  rateStaleAfter,
  rateEvidenceAt,
  staleEvidenceAt,
  weeklyReadingsFor,
  weeklyCurrentFor,
  planScaling,
  type UsageJson,
} from "./claudeUsage";
import {
  captureEmptyNote,
  changeLines,
  computeCredits,
  creditFigure,
  creditsOf,
  fmtShare,
  fmtCredits,
  modelFamily,
  windowCreditAccounts,
  type CreditsFigure,
} from "./claudeUsage";
import { withWf50 } from "./__fixtures__/wf50";
import schema1 from "./__fixtures__/claude-usage-schema1.json";
import schema2 from "./__fixtures__/claude-usage-schema2.json";
import schema2Published from "./__fixtures__/claude-usage-schema2-published.json";
// The credits block, as the tracker publishes it from its current main. The live file carries
// the same block from its next hourly refresh.
import schema3Credits from "./__fixtures__/claude-usage-schema3-credits.json";

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
  it("scales by plan and derives tasks and the API value figure, by Jonathan's decision reversing finding 1", () => {
    const r = compute(V2, "max20", SONNET, "high")!;
    expect(r.tokensPerWindow).toBe(1_175_730_564);
    expect(r.split!.cache_read).toBeCloseTo(1_175_730_564 * 0.971307, -3);
    // #74 showed the meter budget under the "API value" label; that is restored here.
    expect(r.apiValueUsd).toBe(115.05);
    // Tasks divide meter dollars by meter dollars, never list value by meter cost.
    expect(r.tasksPerWindow).toBeCloseTo(115.05 / 0.057684, 6);
    // Weekly figures scale by the plan's current estimate (6.13 here), not a theoretical 28.
    expect(r.windowsPerWeek).toBe(6.13);
    expect(r.tasksPerWeek).toBeCloseTo((115.05 / 0.057684) * 6.13, 6);
    expect(r.tokensPerWindow! * r.windowsPerWeek!).toBeCloseTo(1_175_730_564 * 6.13, 0);
    expect(r.apiValueUsdPerWeek).toBeCloseTo(115.05 * 6.13, 6);
    // The schema 1 fixture: the same token arithmetic, and no dollar figure it does not publish.
    const legacy = compute(J, "max20", SONNET, "high")!;
    expect(legacy.tokensPerWindow).toBe(42_000_000);
    expect(legacy.split!.cache_read).toBeCloseTo(38_094_000, -3);
    expect(legacy.windowsPerWeek).toBe(11.2);
    // No dollar figure is published on this fixture's rate, so #74's list-price fallback applies.
    expect(legacy.apiValueUsd).toBeCloseTo(34.0452, 4);
  });
  it("returns null for every per-week figure when weekly_windows is absent and no regime level exists", () => {
    const { weekly_windows: _weekly_windows, ...withoutWeekly } = J;
    const r = compute(withoutWeekly as UsageJson, "max20", "claude-sonnet-5", "high")!;
    expect(r.windowsPerWeek).toBeNull();
    expect(r.tasksPerWeek).toBeNull();
    expect(r.apiValueUsdPerWeek).toBeNull();
  });
  it("returns null for every per-week figure when the selected plan's weekly_windows entry is null and has no fallback level", () => {
    const withNullPro: UsageJson = { ...J, weekly_windows: { ...J.weekly_windows!, pro: null } };
    const r = compute(withNullPro, "pro", "claude-sonnet-5", "high")!;
    expect(r.windowsPerWeek).toBeNull();
    expect(r.tasksPerWeek).toBeNull();
    expect(r.apiValueUsdPerWeek).toBeNull();
  });
  it("falls back to the newest regime level when current is null, so a plan is never dropped outright (kept from PR #76)", () => {
    const v2 = compute(V2, "pro", SONNET, "high")!;
    expect(v2.windowsPerWeek).toBe(weeklyRegimeLevelsFor(V2, "pro").at(-1)!.windows);
  });
  it("pro is 5% of max20", () => {
    expect(compute(J, "pro", "claude-sonnet-5", "low")!.tokensPerWindow).toBe(2_100_000);
  });
  it("reads a schema 1 dollar figure as the #74 API value figure, scaled by plan", () => {
    const withUsd: UsageJson = {
      ...J,
      rates: { "claude-sonnet-5": { ...J.rates["claude-sonnet-5"], api_value_per_window: 100.42 } },
    };
    expect(compute(withUsd, "max20", "claude-sonnet-5", "high")!.apiValueUsd).toBe(100.42);
    expect(compute(withUsd, "max5", "claude-sonnet-5", "high")!.apiValueUsd).toBeCloseTo(25.105, 6);
    expect(compute(withUsd, "pro", "claude-sonnet-5", "high")!.apiValueUsd).toBeCloseTo(5.021, 6);
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
    expect(r.apiValueUsd).toBeNull();
    expect(r.apiValueUsdPerWeek).toBeNull();
  });
});

describe("model and plan eligibility (finding 2, kept)", () => {
  it("gives Fable on Pro no included capacity at all", () => {
    const r = compute(V2, "pro", FABLE, "high")!;
    expect(r.included).toBe(false);
    expect(r.tokensPerWindow).toBeNull();
    expect(r.apiValueUsd).toBeNull();
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
    expect(r.tokensPerWindow! * r.windowsPerWeek!).toBeCloseTo(235_146_113 * 3.065, 0);
    expect(r.apiValueUsdPerWeek).toBeCloseTo(115.05 * 3.065, 6);
  });
  it("applies the published Fable rule to schema 1 JSON, which carries no model_plan_limits", () => {
    const legacy = structuredClone(J);
    legacy.rates[FABLE] = { ...legacy.rates[SONNET], tokens_per_window: 8_000_000, api_value_per_window: 100 };
    expect(modelPlanLimit(legacy, FABLE, "pro")).toMatchObject({ included: false, weekly_fraction: 0, source_url: LIMITS_URL });
    expect(modelPlanLimit(legacy, FABLE, "max5")).toMatchObject({ included: true, weekly_fraction: 0.5 });
    expect(modelPlanLimit(legacy, SONNET, "pro")).toMatchObject({ included: true, weekly_fraction: 1 });
    expect(compute(legacy, "pro", FABLE, "high")!.tokensPerWindow).toBeNull();
    expect(compute(legacy, "pro", FABLE, "high")!.apiValueUsd).toBeNull();
    expect(compute(legacy, "max20", FABLE, "high")!.windowsPerWeek).toBeCloseTo(5.6, 10);
  });
});

describe("weekly levels drawn across plans (kept from PR #76)", () => {
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

  it("draws the fixture's own current figure in the hero and the table when it publishes one", () => {
    const r = compute(LIVE, "max20", SONNET, "high")!;
    const chartEnd = weeklyRegimeLevelsFor(LIVE, "max20").at(-1)!.windows;
    // LIVE's own current happens to equal its newest regime; V2's does not (it is a fresher
    // current estimate than the pooled regime it sits inside), and #74 never required them to
    // match: `current` wins in the hero and the table, the regimes are the chart's own history.
    expect(chartEnd).toBe(r.planWindowsPerWeek);
    expect(weeklyRegimeLevelsFor(V2, "max20").at(-1)!.windows).toBe(6.34);
    expect(compute(V2, "max20", SONNET, "high")!.planWindowsPerWeek).toBe(6.13);
  });
  it("gives an unmeasured plan its weekly figure from another plan's level, scaled by the measured ratio", () => {
    for (const plan of ["max5", "pro"] as const) {
      expect(LIVE.weekly_windows![plan]!.current).not.toBeNull(); // this fixture's own current is a stale value, never used
      const r = compute(LIVE, plan, SONNET, "high")!;
      // #74/#76 behaviour: the plan's own `current` still wins when present.
      expect(r.planWindowsPerWeek).toBe(11.02);
    }
    // Max 5x keeps its own history, then max20 scaled across the seam: 6.2 and 4.61 x 1.668.
    const rounded = (j: UsageJson, plan: "max5" | "pro") =>
      weeklyRegimeLevelsFor(j, plan).map((l) => [l.start, +l.windows.toFixed(4), l.inferred]);
    expect(rounded(LIVE, "max5")).toEqual([
      ["2026-06-13T01:30:00+00:00", 10.34, false],
      ["2026-08-19T17:00:00+00:00", +(6.2 * 1.668).toFixed(4), true],
      ["2026-09-14T16:30:00+00:00", +(4.61 * 1.668).toFixed(4), true],
    ]);
    // Pro republishes Max 5x's first regime as its own (deduped, so not flagged inferred); the
    // rest of its history is genuinely borrowed and scaled.
    expect(rounded(LIVE, "pro")).toEqual([
      ["2026-06-13T01:30:00+00:00", 10.34, false],
      ["2026-08-19T17:00:00+00:00", +(6.2 * 1.668).toFixed(4), true],
      ["2026-09-14T16:30:00+00:00", +(4.61 * 1.668).toFixed(4), true],
    ]);
    // Schema 2 publishes no ratio: 10.86 / 6.34 = 1.713. The borrowed level scales max20's own
    // regime windows (6.34), not its `current` (6.13) - the chart is built from regimes alone.
    expect(rounded(V2, "max5")).toEqual([
      ["2026-06-13T01:30:00+00:00", 10.86, false],
      ["2026-08-14T19:19:00+00:00", 6.61, false],
      ["2026-08-19T17:00:00+00:00", +(6.34 * 1.713).toFixed(4), true],
    ]);
    expect(rounded(V2, "pro").map((l) => l[2])).toEqual([true, true, true]);
  });
  it("falls back to the newest regime level when current is null, so a plan is never dropped outright (kept from PR #76)", () => {
    const noCurrentMax20: UsageJson = {
      ...V2,
      weekly_windows: { ...V2.weekly_windows, max20: { ...V2.weekly_windows!.max20!, current: null } },
    };
    const r = compute(noCurrentMax20, "max20", SONNET, "high")!;
    expect(r.windowsPerWeek).toBe(weeklyRegimeLevelsFor(noCurrentMax20, "max20").at(-1)!.windows);
  });
});

describe("weekly figures on the published files (PR #76 fallback kept)", () => {
  const LIVE_FILE = schema1 as unknown as UsageJson;
  const PUBLISHED_FILE = schema2Published as unknown as UsageJson;
  const OPUS = "claude-opus-5";

  it("gives Pro and Max 5x a weekly figure from their own current or, absent that, the level their chart ends on", () => {
    for (const j of [LIVE_FILE, PUBLISHED_FILE]) {
      for (const [plan, model] of [["pro", SONNET], ["max5", SONNET], ["pro", OPUS], ["max5", FABLE]] as const) {
        const current = j.weekly_windows?.[plan]?.current;
        const level = weeklyRegimeLevelsFor(j, plan).at(-1);
        const expectedPlanWindows = typeof current === "number" ? current : (level?.windows ?? null);
        const r = compute(j, plan, model, "high")!;
        expect(r.planWindowsPerWeek).toBe(expectedPlanWindows);
        if (expectedPlanWindows !== null && r.included) {
          expect(r.windowsPerWeek).not.toBeNull();
          expect(r.tokensPerWindow! * r.windowsPerWeek!).not.toBeNaN();
        }
      }
      // Fable on Pro is not included: nothing to scale, whatever the level (finding 2, kept).
      expect(compute(j, "pro", FABLE, "high")!.windowsPerWeek).toBeNull();
    }
  });

  it("keeps Max 20x's measured figures", () => {
    const before: [UsageJson, string, number][] = [
      [LIVE_FILE, SONNET, 4.61],
      [LIVE_FILE, FABLE, 4.61],
      [PUBLISHED_FILE, SONNET, 4.68],
      [PUBLISHED_FILE, FABLE, 4.68],
    ];
    for (const [j, model, planWindows] of before) {
      const r = compute(j, "max20", model, "high")!;
      expect(r.planWindowsPerWeek).toBe(planWindows);
    }
  });

  it("gives no weekly figure to any plan of a synthetic file whose weekly chart has no level at all", () => {
    const empty: UsageJson = { ...schema2 as unknown as UsageJson, weekly_windows: undefined, weekly_window_ratios: {} };
    for (const plan of ["pro", "max5", "max20"] as const) {
      expect(weeklyRegimeLevelsFor(empty, plan)).toEqual([]);
      const r = compute(empty, plan, SONNET, "high")!;
      expect(r.planWindowsPerWeek).toBeNull();
      expect(r.windowsPerWeek).toBeNull();
      expect(r.tasksPerWeek).toBeNull();
      expect(r.apiValueUsdPerWeek).toBeNull();
    }
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
  it("derives a session count from session_tokens, scaled by the priced effort ratio, by Jonathan's decision reversing finding 11", () => {
    const r = compute(priced, "max20", "claude-sonnet-5", "low")!;
    const effortScale = 0.017 / 0.027;
    expect(r.sessionsPerWindow).toBeCloseTo(42_000_000 / (500_000 * effortScale), 6);
    const withoutSessionTokens: UsageJson = { ...priced, session_tokens: undefined };
    expect(compute(withoutSessionTokens, "max20", "claude-sonnet-5", "low")!.sessionsPerWindow).toBeNull();
  });
  it("falls back to the raw token ratio for a task count without priced effort figures (#74 behaviour, finding 11 reversed)", () => {
    const unpriced: UsageJson = { ...priced, effort_usd: undefined };
    // tokensPerWindow (42M) / effort.low (2M) = 21.
    expect(compute(unpriced, "max20", "claude-sonnet-5", "low")!.tasksPerWindow).toBeCloseTo(21, 6);
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
  it("names a schema 2 figure's meter plainly, with no quality or staleness wording (reverses finding 10, Jonathan's decision)", () => {
    const rate = V2.rates[SONNET];
    expect(fmtSource(rate)).toBe("the account's own meter, newest reading 16 Sep");
    // #74's plain rule: any source with a probed_at is dated by it, "unavailable" included.
    expect(fmtSource({ source: "unavailable", probed_at: "2026-09-14T13:16:57Z" })).toBe("unavailable, 14 Sep");
    expect(fmtSource({ source: "unavailable" })).toBe("unavailable");
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
  // Anthropic changed the limit, and the headline says so directly (reverses finding 4,
  // Jonathan's decision, 2026-09-16).
  it("states the last change", () => {
    expect(headline(J)).toEqual({ text: "Anthropic last decreased Claude's limits by 14% on 2 Sep 2026.", tone: "down" });
  });
  it("uses window wording when scope is absent (old JSON)", () => {
    const withoutScope: UsageJson = {
      ...J,
      last_change: { date: "2026-09-02", direction: "decreased", percent: 14, model: "claude-sonnet-5" },
    };
    expect(headline(withoutScope).text).toBe("Anthropic last decreased Claude's limits by 14% on 2 Sep 2026.");
  });
  it("states a weekly decrease", () => {
    const weekly: UsageJson = {
      ...J,
      last_change: { date: "2026-08-21", direction: "decreased", percent: 36, model: "all", scope: "weekly" },
    };
    expect(headline(weekly)).toEqual({
      text: "Anthropic last decreased Claude's weekly limit by 36% on 21 Aug 2026.",
      tone: "down",
    });
  });
  it("states a weekly increase", () => {
    const weekly: UsageJson = {
      ...J,
      last_change: { date: "2026-08-21", direction: "increased", percent: 20, model: "all", scope: "weekly" },
    };
    expect(headline(weekly)).toEqual({
      text: "Anthropic last increased Claude's weekly limit by 20% on 21 Aug 2026.",
      tone: "up",
    });
  });
  it("dates a schema 2 change by its certified date, not an onset range", () => {
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
    expect(text).toBe("Anthropic last decreased Claude's weekly limit by 31% on 14 Sep 2026.");
  });
  it("states no change when none", () => {
    const h = headline({ ...J, last_change: null });
    expect(h.tone).toBe("flat");
    expect(h.text).toBe("Anthropic hasn't changed Claude's limits since 1 May 2026.");
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
    expect(headline(withHeld).text).toBe("Anthropic hasn't changed Claude's limits since 1 Aug 2026.");
  });
  it("falls back to the earliest held date when every row is held (#74 behaviour)", () => {
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
      "Anthropic hasn't changed Claude's limits since 1 Jul 2026.",
    );
  });
  it("takes the earliest non-held date across every model's history (#74 behaviour)", () => {
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
    expect(headline(leading).text).toBe("Anthropic hasn't changed Claude's limits since 1 Jan 2026.");
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

describe("weeklyRegimeLevelsFor", () => {
  it("keeps an inferred level that only touches a measured one at the plan boundary", () => {
    // Max 5x's regime ends on the day Max 20x's starts. Sharing that one day is not an overlap
    // worth dropping the whole January-to-July level for.
    const levels = weeklyRegimeLevelsFor(RJ, "max20");
    expect(levels.map((l) => [l.start, l.end, l.inferred, +l.windows.toFixed(2)])).toEqual([
      ["2026-01-01", "2026-08-01", true, 6],
      ["2026-08-01", "2026-09-05", false, 6],
    ]);
  });
  it("clips an inferred level to the part no measured level covers, rather than dropping it", () => {
    const overlapping: UsageJson = {
      ...RJ,
      weekly_windows: {
        ...RJ.weekly_windows!,
        max5: { ...RJ.weekly_windows!.max5!, regimes: [{ start: "2026-01-01", end: "2026-09-01", windows: 10.68, seven_day_pct: 900, points: 12 }] },
        pro: { ...RJ.weekly_windows!.pro!, regimes: [] },
      },
    };
    const levels = weeklyRegimeLevelsFor(overlapping, "max20");
    expect(levels.map((l) => [l.start, l.end, l.inferred])).toEqual([
      ["2026-01-01", "2026-08-01", true],
      ["2026-08-01", "2026-09-05", false],
    ]);
  });
  it("splits an inferred level around a measured one inside it", () => {
    const inside: UsageJson = {
      ...RJ,
      weekly_windows: {
        ...RJ.weekly_windows!,
        max20: { ...RJ.weekly_windows!.max20!, regimes: [{ start: "2026-03-01", end: "2026-05-01", windows: 6, seven_day_pct: 300, points: 5 }] },
        pro: { ...RJ.weekly_windows!.pro!, regimes: [] },
      },
    };
    const levels = weeklyRegimeLevelsFor(inside, "max20");
    expect(levels.map((l) => [l.start, l.end, l.inferred])).toEqual([
      ["2026-01-01", "2026-03-01", true],
      ["2026-03-01", "2026-05-01", false],
      ["2026-05-01", "2026-08-01", true],
    ]);
  });
  it("scales a borrowed level onto the plan's own ratio and dedupes Pro's copy of Max 5x", () => {
    const levels = weeklyRegimeLevelsFor(RJ, "max5");
    // Max 20x's 6 windows become 6 * 1.78 on Max 5x; Pro's regime is Max 5x's own, so it appears once.
    expect(levels.map((l) => [l.start, l.inferred, +l.windows.toFixed(2)])).toEqual([
      ["2026-01-01", false, 10.68],
      ["2026-08-01", true, 10.68],
    ]);
  });
  it("derives schema 2's missing ratio from the first Max 5x and Max 20x levels, with Pro taking Max 5x's", () => {
    expect(weeklyWindowRatio(RJ, "max5")).toBe(1.78);
    expect(weeklyWindowRatio(V2, "max20")).toBe(1);
    expect(weeklyWindowRatio(V2, "max5")).toBe(1.713);
    expect(weeklyWindowRatio(V2, "pro")).toBe(1.713);
    expect(weeklyWindowRatio(WJ, "max5")).toBeNull();
  });
});

describe("weeklyTokenRegimeLevelsFor", () => {
  it("prices each level by what one window bought during it, including a level borrowed from another plan", () => {
    const levels = weeklyTokenRegimeLevelsFor(RJ, "max20", "claude-sonnet-5");
    // January predates the first history row, so it takes that row's figure; August has its own.
    expect(levels.map((l) => [l.start, Math.round(l.tokens), l.inferred])).toEqual([
      ["2026-01-01", Math.round(6 * 38_000_000), true],
      ["2026-08-01", 6 * 40_000_000, false],
    ]);
  });
  it("holds one flat level for the whole weekly regime, priced at the regime's start (reverses audit finding 12, Jonathan's decision)", () => {
    // #74's behaviour: one weekly level of 6 windows, 1-20 September, prices the whole span at
    // the window figure current when the regime started (100 tokens), not a cut at every later
    // daily reading (200 tokens from 10 September).
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
      ["2026-09-01T00:00:00Z", "2026-09-20T00:00:00Z", 600],
    ]);
  });
  it("prices a level starting before any dated window figure from the earliest available row (#74 behaviour)", () => {
    const fake: UsageJson = structuredClone(J);
    fake.weekly_windows = {
      max20: { current: 6, history: [], regimes: [{ start: "2026-06-01T00:00:00Z", end: "2026-09-20T00:00:00Z", windows: 6, seven_day_pct: 100, points: 10 }] },
    };
    fake.history[SONNET] = [
      { date: "2026-08-11", tokens_per_window: 999, source: "held", interpolated: false },
      { date: "2026-09-05", tokens_per_window: 100, source: "passive", interpolated: false },
    ];
    expect(weeklyTokenRegimeLevelsFor(fake, "max20", SONNET).map((l) => [l.start, l.end, l.tokens, l.inferred])).toEqual([
      ["2026-06-01T00:00:00Z", "2026-09-20T00:00:00Z", 5994, false],
    ]);
  });
  it("marks a span inferred when its window figure is not marked measured, and applies the model's weekly share", () => {
    const levels = weeklyTokenRegimeLevelsFor(V2, "max20", SONNET);
    expect(levels.map((l) => [l.start, l.end, l.inferred])).toEqual([
      ["2026-06-13T01:30:00+00:00", "2026-08-14T19:19:00+00:00", true],
      ["2026-08-14T19:19:00+00:00", "2026-08-18T20:00:00+00:00", true],
      ["2026-08-19T17:00:00+00:00", "2026-09-16T02:30:00+00:00", false],
    ]);
    // Level 3 is max20's own regime (not inferred), priced at 6.34 windows x the newest history
    // entry, since it starts before that entry's date and falls back to the earliest row.
    expect(levels[2].tokens).toBeCloseTo(6.34 * 1_400_384_480, 0);
    const fable: UsageJson = { ...V2, history: { ...V2.history, [FABLE]: [{ ...V2.history[SONNET][0], tokens_per_window: 280_076_896, quality: "measured" }] } };
    const fableLevels = weeklyTokenRegimeLevelsFor(fable, "max20", FABLE);
    // Borrowed spans are inferred; the measured figure on max20's own level is not (finding 2's
    // 50% Fable cap applies to every level, borrowed or not).
    expect(fableLevels.map((l) => l.inferred)).toEqual([true, true, false]);
    expect(fableLevels.at(-1)!.tokens).toBeCloseTo(6.34 * 280_076_896 * 0.5, 0);
  });
});

describe("weeklySeriesFor", () => {
  it("is not scoped by any range: returns the plan's full weekly history", () => {
    // Unlike seriesFor/eventsFor, the weekly chart never hides months of history behind the
    // 30/90/180-day range picker, since it needs only meter readings, not probes.
    const s = weeklySeriesFor(WJ);
    const max20 = s.find((x) => x.plan === "max20")!;
    // 2026-09-12 is filled in as an inferred point (max5/pro has it, max20 doesn't).
    expect(max20.points.map((p) => p.date)).toEqual(["2026-07-04", "2026-08-01", "2026-09-05", "2026-09-12"]);
  });
  it("flags a week as partial when its week_ending falls after last_sample_at", () => {
    // last_sample_at is 2026-09-05, so max5's 2026-09-12 week is still in progress. max5 also
    // gains an inferred, non-partial point at 2026-07-04 (max20's earliest date).
    const s = weeklySeriesFor(WJ);
    const max5 = s.find((x) => x.plan === "max5")!;
    expect(max5.points.map((p) => p.partial)).toEqual([false, false, false, true]);
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
  it("collapses pro into max5 when pro is assumed and identical to max5, labelling the shared series", () => {
    // WJ's pro history is a copy of max5's and flagged assumed, matching the live data shape
    // today: two overlapping lines are pointless, so they draw as one labelled series.
    const s = weeklySeriesFor(WJ);
    expect(s.some((x) => x.plan === "pro")).toBe(false);
    const max5 = s.find((x) => x.plan === "max5")!;
    expect(max5.label).toBe("Max 5x and Pro");
    expect(max5.sharedWithPro).toBe(true);
    expect(max5.assumed).toBe(false);
  });
  it("keeps pro and max5 as separate labelled series when pro's points differ from max5's", () => {
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
    const pro = s.find((x) => x.plan === "pro")!;
    const max5 = s.find((x) => x.plan === "max5")!;
    expect(pro).toBeDefined();
    expect(max5).toBeDefined();
    expect(pro.label).toBe("Pro");
    expect(pro.sharedWithPro).toBeFalsy();
    expect(max5.label).toBe("Max 5x");
    expect(max5.sharedWithPro).toBeFalsy();
    // A measured Pro series is drawn under its own label.
    const measuredPro: UsageJson = { ...withDifferingPro, weekly_windows: { ...withDifferingPro.weekly_windows!, pro: { ...withDifferingPro.weekly_windows!.pro!, assumed: false } } };
    expect(weeklySeriesFor(measuredPro).find((x) => x.plan === "pro")!.label).toBe("Pro");
  });
  it("leaves max20 unaffected by the pro/max5 collapse", () => {
    const s = weeklySeriesFor(WJ);
    const max20 = s.find((x) => x.plan === "max20")!;
    expect(max20.label).toBe("Max 20x");
    expect(max20.sharedWithPro).toBeFalsy();
    // The trailing 11.2 is max20's own inferred 2026-09-12 point (9.6 * 11.2/9.6), not its
    // measured 2026-09-05 figure, hence toBeCloseTo rather than toEqual for that one.
    expect(max20.points[0].windows).toBe(10);
    expect(max20.points[1].windows).toBe(10.5);
    expect(max20.points[2].windows).toBe(11.2);
    expect(max20.points[3].windows).toBeCloseTo(11.2, 10);
  });
  it("fills gaps: a series missing a date gets an inferred point scaled by the ratio of current windows-per-week", () => {
    const s = weeklySeriesFor(WJ);
    const max20 = s.find((x) => x.plan === "max20")!;
    const max5 = s.find((x) => x.plan === "max5")!; // shared with Pro, current 9.6

    // max20 lacks 2026-09-12 (only max5/pro has it): infer from max5's point there.
    const inferredMax20 = max20.points.find((p) => p.date === "2026-09-12")!;
    expect(inferredMax20.inferred).toBe(true);
    expect(inferredMax20.windows).toBeCloseTo(9.6 * (11.2 / 9.6), 10);
    expect(inferredMax20.partial).toBe(true); // copied from max5's in-progress week

    // max5 lacks 2026-07-04 (only max20 has it): infer from max20's point there.
    const inferredMax5 = max5.points.find((p) => p.date === "2026-07-04")!;
    expect(inferredMax5.inferred).toBe(true);
    expect(inferredMax5.windows).toBeCloseTo(10 * (9.6 / 11.2), 10);
    expect(inferredMax5.partial).toBe(false);

    // Measured points are untouched and flagged not inferred.
    const measuredMax20 = max20.points.find((p) => p.date === "2026-09-05")!;
    expect(measuredMax20.inferred).toBe(false);
    expect(measuredMax20.windows).toBe(11.2);
    const measuredMax5 = max5.points.find((p) => p.date === "2026-08-01")!;
    expect(measuredMax5.inferred).toBe(false);
    expect(measuredMax5.windows).toBe(9);

    // Points stay sorted by date after gap-filling.
    expect(max20.points.map((p) => p.date)).toEqual(["2026-07-04", "2026-08-01", "2026-09-05", "2026-09-12"]);
    expect(max5.points.map((p) => p.date)).toEqual(["2026-07-04", "2026-08-01", "2026-09-05", "2026-09-12"]);
  });
  it("scales gap-fill by weekly_window_ratios when published, not by the current quotient", () => {
    // The two disagree on purpose here: the ratios say max5 holds 2x max20's windows, while the
    // currents (11.2 and 9.6) say 0.857. Only the published ratio may be used.
    const withRatios: UsageJson = {
      ...WJ,
      weekly_window_ratios: { max20: 1.0, max5: 2.0, pro: 2.0 },
    };
    const s = weeklySeriesFor(withRatios);
    const max20 = s.find((x) => x.plan === "max20")!;
    const max5 = s.find((x) => x.plan === "max5")!;

    // max20 lacks 2026-09-12; max5 has 9.6 there. 9.6 * (1.0 / 2.0) = 4.8.
    expect(max20.points.find((p) => p.date === "2026-09-12")!.windows).toBeCloseTo(4.8, 10);
    // max5 lacks 2026-07-04; max20 has 10 there. 10 * (2.0 / 1.0) = 20.
    expect(max5.points.find((p) => p.date === "2026-07-04")!.windows).toBeCloseTo(20, 10);
  });
  it("does not let a limit change on the measured plan inflate the inferred one (issue #54)", () => {
    // The shape that produced the bug: max5 frozen at its last measured August weeks, max20 the
    // live plan whose `current` has been dragged below its own weekly history by a later cut.
    // Scaling by the current quotient (11.02 / 4.61 = 2.39) put inferred max5 at 15.7 windows,
    // far outside its measured 9.5-11.0. The frozen ratio keeps it continuous across the seam.
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
    const max5 = s.find((x) => x.plan === "max5" || x.sharedWithPro)!;

    const inferred = max5.points.filter((p) => p.inferred);
    expect(inferred.length).toBeGreaterThan(0);
    // Every inferred max5 week lands inside the range max5 was actually measured at, rather
    // than being lifted by a cut that happened to max20 a month after max5 stopped.
    for (const p of inferred) {
      expect(p.windows).toBeGreaterThan(9.5);
      expect(p.windows).toBeLessThan(12.5);
    }
    // The first week after the plan seam is continuous with max5's last measured week: a plan
    // move must not draw a step.
    const atSeam = max5.points.find((p) => p.date === "2026-08-28")!;
    expect(atSeam.windows).toBeCloseTo(6.58 * 1.78, 10);
    expect(Math.abs(atSeam.windows - 11.0)).toBeLessThan(1.0);
    // #74 takes `current` at face value, frozen or not (reverses finding 6, Jonathan's decision):
    // the chart still draws the continuous, ratio-scaled history above.
    expect(compute(seam, "max5", SONNET, "high")!.windowsPerWeek).toBe(11.02);
  });
  it("borrows Max 5x's weeks wholesale for a schema 2 Pro that publishes none, and collapses the two", () => {
    const s = weeklySeriesFor(V2);
    expect(s.some((x) => x.plan === "pro")).toBe(false);
    expect(s.find((x) => x.plan === "max5")!.label).toBe("Max 5x and Pro");
    expect(weeklyTokenSeriesFor(V2, SONNET).map((x) => x.label)).toEqual(["Max 5x", "Pro", "Max 20x"]);
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
  it("falls back to the model's current rate when there is no dated window figure at all (#74 behaviour, finding 12 reversed)", () => {
    const noHistory: UsageJson = { ...WJ, history: {} };
    const s = weeklyTokenSeriesFor(noHistory, "claude-sonnet-5");
    const max20 = s.find((x) => x.plan === "max20")!;
    const rate = noHistory.rates["claude-sonnet-5"]!.tokens_per_window!;
    expect(max20.points.every((p) => p.tokens === max20.points[0].windows * rate || typeof p.tokens === "number")).toBe(true);
    expect(max20.points.every((p) => p.tokens !== undefined)).toBe(true);
    // A week before the first dated row takes that row's own figure (the earliest entry), never
    // undefined and never the current rate once any history exists.
    const late: UsageJson = { ...WJ, history: { "claude-sonnet-5": [{ date: "2026-08-15", tokens_per_window: 40_000_000, source: "passive", interpolated: false }] } };
    const lateMax20 = weeklyTokenSeriesFor(late, "claude-sonnet-5").find((x) => x.plan === "max20")!;
    expect(lateMax20.points.slice(0, 3).map((p) => p.tokens)).toEqual([
      lateMax20.points[0].windows * 40_000_000 * 1,
      lateMax20.points[1].windows * 40_000_000 * 1,
      11.2 * 40_000_000,
    ]);
    // Max 5x's 2026-09-12 week inferred onto max20, priced by the same dated figure.
    expect(lateMax20.points[3].tokens).toBeCloseTo(9.6 * (11.2 / 9.6) * 40_000_000, 0);
  });
  it("leaves tokens undefined when neither history nor a rate exists for the model", () => {
    const s = weeklyTokenSeriesFor(WJ, "claude-nonexistent");
    const max20 = s.find((x) => x.plan === "max20")!;
    expect(max20.points.every((p) => p.tokens === undefined)).toBe(true);
  });
  it("splits a shared Max 5x and Pro line into two, each priced by its own plan ratio", () => {
    // The windows chart collapses the two because they hold the same windows per week. A
    // window is worth five times as much on Max 5x, so the tokens chart must not.
    const shared: UsageJson = {
      ...WJ,
      weekly_windows: {
        ...WJ.weekly_windows,
        pro: { ...WJ.weekly_windows!.max5!, assumed: true },
      },
    };
    const s = weeklyTokenSeriesFor(shared, "claude-sonnet-5");
    const max5 = s.find((x) => x.plan === "max5")!;
    const pro = s.find((x) => x.plan === "pro")!;
    expect(max5.label).toBe("Max 5x");
    expect(pro.label).toBe("Pro");
    expect(max5.sharedWithPro).toBe(false);
    const max5Aug = max5.points.find((p) => p.date === "2026-08-01")!;
    const proAug = pro.points.find((p) => p.date === "2026-08-01")!;
    expect(proAug.tokens).toBeCloseTo(max5Aug.tokens! * (0.05 / 0.25), 5);
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

// Tracker wf-50 adds per-window readings, weekly pooled points, per-account steps, credits-table
// ratios and inferred marks on Max 5x's and Pro's current figure. The page reads them when they
// are there and changes nothing when they are not.
describe("tracker wf-50 fields", () => {
  const PUBLISHED = schema2Published as unknown as UsageJson;
  const WF50 = withWf50(PUBLISHED);

  it("changes nothing on JSON published before them", () => {
    expect(weeklyReadingsFor(PUBLISHED, "max20")).toEqual({ readings: [], weekly: [], onsets: [] });
    expect(planScaling(PUBLISHED, ":")).toMatchObject({ credits: false, perWindow: "1:5:20" });
    for (const plan of ["pro", "max5", "max20"] as const) {
      expect(compute(PUBLISHED, plan, "claude-sonnet-5", "high")!.weeklyInferred).toBe(false);
    }
    // Pro's plan-level `assumed` is the old mark, which the page stopped badging at PR #78.
    expect(weeklyCurrentFor(PUBLISHED, "pro")).toMatchObject({ inferred: false, inferredFrom: null });
  });

  it("returns a plan's own readings, without the windows that have no ratio, and never another plan's", () => {
    const { readings, weekly, onsets } = weeklyReadingsFor(WF50, "max20");
    const published = WF50.weekly_windows!.max20!.by_window!;
    expect(published.some((r) => r.windows === null)).toBe(true);
    expect(readings).toHaveLength(published.filter((r) => typeof r.windows === "number").length);
    expect(readings.every((r) => ["a1", "a2", "a3"].includes(r.account!))).toBe(true);
    expect(weekly).toHaveLength(WF50.weekly_windows!.max20!.weekly!.length);
    // a3 saw no step, so it has no onset; the other two come back oldest first.
    expect(onsets.map((o) => [o.account, o.onset])).toEqual([["a1", "2026-09-13"], ["a2", "2026-09-14"]]);
    expect(weeklyReadingsFor(WF50, "max5")).toEqual({ readings: [], weekly: [], onsets: [] });
  });

  it("reads the inferred marks off the figure or the plan, whichever carries them", () => {
    for (const j of [WF50, withWf50(PUBLISHED, { currentAsObject: true })]) {
      const max20 = weeklyCurrentFor(j, "max20")!;
      expect(max20.inferred).toBe(false);
      for (const plan of ["max5", "pro"] as const) {
        const cur = weeklyCurrentFor(j, plan)!;
        expect(cur).toMatchObject({ inferred: true, inferredFrom: "max20" });
        expect(cur.value).toBeCloseTo(max20.value * j.weekly_window_ratios![plan]!, 1);
        const r = compute(j, plan, "claude-sonnet-5", "high")!;
        expect(r.weeklyInferred).toBe(true);
        expect(r.planWindowsPerWeek).toBe(cur.value);
      }
      expect(compute(j, "max20", "claude-sonnet-5", "high")!.weeklyInferred).toBe(false);
    }
  });

  it("scales Pro and Max 5x by the published ratios, and words them from the same numbers", () => {
    const max20 = compute(WF50, "max20", "claude-sonnet-5", "high")!;
    expect(compute(WF50, "max5", "claude-sonnet-5", "high")!.tokensPerWindow).toBeCloseTo(max20.tokensPerWindow! * 0.3, 6);
    expect(compute(WF50, "pro", "claude-sonnet-5", "high")!.tokensPerWindow).toBeCloseTo(max20.tokensPerWindow! * 0.05, 6);
    expect(planScaling(WF50)).toEqual({ credits: true, perWindow: "1 : 6 : 20", perWeek: "1 : 8.33 : 16.67" });
  });
});

describe("the credits block", () => {
  const CREDITS = schema3Credits as unknown as UsageJson;
  const PUBLISHED = schema2Published as unknown as UsageJson;
  // The same file with the block taken back out: what every file published before the tracker
  // change looks like, and what the live file looks like until its next refresh.
  const WITHOUT: UsageJson = (() => {
    const j = structuredClone(CREDITS);
    delete j.credits;
    return j;
  })();

  it("parses the published block", () => {
    const c = creditsOf(CREDITS)!;
    expect(c).not.toBeNull();
    expect(c.window_credits).toMatchObject({ value: 19_543_887, n: 11, pure_family: "opus", status: null });
    expect(c.window_credits.interval).toEqual([17_250_018, 20_819_693]);
    // The account with no usable capture column is still published, with n: 0, so its absence
    // from the cluster is visible rather than silent.
    expect(Object.keys(c.window_credits.accounts!).sort()).toEqual(["a1", "a2", "a3"]);
    expect(c.window_credits.accounts!.a1.n).toBe(0);
    expect(windowCreditAccounts(c.window_credits)).toBe(2);
    expect(Object.keys(c.per_model!).sort()).toEqual(["fable", "haiku", "opus", "sonnet"]);
    expect(c.harness_runs_excluded).toHaveLength(16);
    expect(c.window_credits_from_weekly!.kind).toBe("cross_check");
    expect(c.five_hour_window_across_cut!.resolved).toBe(false);
    expect(creditsOf(WITHOUT)).toBeNull();
    expect(creditsOf(PUBLISHED)).toBeNull();
  });

  it("keys per_model by family, not by model id", () => {
    expect(modelFamily("claude-opus-5")).toBe("opus");
    expect(modelFamily("claude-opus-4-7")).toBe("opus");
    expect(modelFamily("claude-fable-5-1")).toBe("fable");
    expect(modelFamily("claude-haiku-4-5-20251001")).toBe("haiku");
    expect(modelFamily("gpt-4")).toBeNull();
  });

  it("renders a figure's own value, and the interval beside it", () => {
    const f: CreditsFigure = { value: 100, interval: [90, 110], status: null };
    const two = (n: number) => n.toFixed(2);
    expect(creditFigure(f, fmtCredits)).toEqual({ kind: "value", text: "100", range: "90 to 110" });
    // The plan scale the rest of the page applies reaches the interval too, never the value alone.
    expect(creditFigure(f, two, 0.05)).toEqual({ kind: "value", text: "5.00", range: "4.50 to 5.50" });
    expect(creditFigure({ value: null, interval: null, status: null }, fmtCredits)).toBeNull();
    expect(creditFigure(undefined, fmtCredits)).toBeNull();
  });

  it("puts a status sentence where the number would go, and never a null", () => {
    // Every figure in the block that publishes no value publishes a sentence saying why. Walk
    // the whole block rather than naming the ones that do it today: a new one must not slip
    // through as a dash, a zero or a dropped line.
    const statuses: { path: string; status: string }[] = [];
    const walk = (node: unknown, path: string) => {
      if (Array.isArray(node)) return;
      if (!node || typeof node !== "object") return;
      const o = node as Record<string, unknown>;
      if ("value" in o && o.value === null && typeof o.status === "string" && o.status) {
        statuses.push({ path, status: o.status });
      }
      for (const [k, v] of Object.entries(o)) walk(v, `${path}.${k}`);
    };
    walk(creditsOf(CREDITS), "credits");
    expect(statuses.length).toBeGreaterThan(0);
    for (const { path, status } of statuses) {
      const at = path.split(".").slice(1).reduce<unknown>((acc, k) => (acc as Record<string, unknown>)?.[k], creditsOf(CREDITS));
      const fig = creditFigure(at as CreditsFigure, fmtCredits)!;
      expect(fig, path).toMatchObject({ kind: "status", text: status });
      expect(fig.text, path).not.toMatch(/null|NaN/);
    }
  });

  it("reads the hero's figures on the selected plan's scale", () => {
    const max20 = computeCredits(CREDITS, "max20", "claude-opus-5")!;
    expect(max20.family).toBe("opus");
    expect(max20.tokensIn).toEqual({ kind: "value", text: "29M", range: "26M to 31M" });
    expect(max20.tokensOut).toEqual({ kind: "value", text: "5.9M", range: "5.2M to 6.2M" });
    expect(max20.usdIn).toEqual({ kind: "value", text: "$146.58", range: "$129.38 to $156.15" });
    expect(max20.windowCredits).toEqual({
      kind: "value",
      text: "19,543,887",
      range: "17,250,018 to 20,819,693",
    });
    expect(max20).toMatchObject({ windowCreditsN: 11, pureFamily: "opus", accountCount: 2, cacheNormalised: true });
    expect(max20.sessionsPerWindow).toEqual({ kind: "value", text: "354", range: "312 to 377" });
    expect(max20.sessionsPerWeek).toEqual({ kind: "value", text: "1,755", range: "1,549 to 1,870" });
    expect(max20.split).toMatchObject({ cache_read: 0.9702, cache_write: 0.0254, input: 0.0001, output: 0.0042 });
    expect(max20.splitSource).toContain("history/passive.json");
    // A window is worth a twentieth as much on Pro, and the figure says so rather than repeating
    // the Max 20x measurement under another plan's heading.
    const pro = computeCredits(CREDITS, "pro", "claude-opus-5")!;
    expect(pro.tokensIn).toEqual({ kind: "value", text: "1.5M", range: "1.3M to 1.6M" });
    expect(pro.usdIn!.text).toBe("$7.33");
  });

  it("carries a model's status sentence through every hero figure", () => {
    const fable = computeCredits(CREDITS, "max20", "claude-fable-5-1")!;
    expect(fable.modelStatus).toBe("rate not yet identified");
    for (const fig of [fable.tokensIn, fable.tokensOut, fable.usdIn, fable.usdOut, fable.sessionsPerWindow, fable.sessionsPerWeek]) {
      expect(fig).toMatchObject({ kind: "status", text: "rate not yet identified" });
      expect(fig!.range).not.toBeNull();
    }
    expect(fable.tokensIn!.range).toBe("7.3M to 17M");
    // The window itself is measured on pure-Opus stretches, so it has a value whatever model is
    // selected: Fable's missing rate is not in it.
    expect(fable.windowCredits!.kind).toBe("value");
    // Fable is not on Pro at all, so there is no capacity to scale and no figure to show.
    const pro = computeCredits(CREDITS, "pro", "claude-fable-5-1")!;
    expect(pro.included).toBe(false);
    expect(pro.tokensIn).toBeNull();
    expect(pro.windowCredits).toBeNull();
    expect(computeCredits(WITHOUT, "max20", "claude-opus-5")).toBeNull();
  });

  it("halves Fable's per-week figure on Max and leaves its per-window figure alone", () => {
    const sessions = creditsOf(CREDITS)!.sessions!["claude-opus-5"];
    const max20 = computeCredits(CREDITS, "max20", "claude-opus-5")!;
    expect(max20.sessionsPerWeek!.text).toBe(Math.round(sessions.per_week.value!).toLocaleString("en-US"));
    const fableWeek = creditsOf(CREDITS)!.sessions!["claude-fable-5-1"].per_week.interval!;
    // Fable may use half the week on Max, the rule the rest of the page already applies.
    expect(computeCredits(CREDITS, "max20", "claude-fable-5-1")!.sessionsPerWeek!.range).toBe(
      `${Math.round((fableWeek[0] as number) * 0.5).toLocaleString("en-US")} to ${Math.round((fableWeek[1] as number) * 0.5).toLocaleString("en-US")}`,
    );
  });

  it("says what the change was measured on, and says what it does not resolve", () => {
    expect(headline(CREDITS)).toEqual({
      text: "The number of five-hour windows in a week fell by 24% between 11 Sep 2026 and 14 Sep 2026.",
      tone: "down",
    });
    expect(changeLines(CREDITS)).toEqual([
      "Five-hour windows per week: 6.5 (6.2 to 6.8) before, 5.0 (4.6 to 5.3) after.",
      "Anthropic announced -17% on 14 Sep 2026: “Compared to today, this works out to a 17% reduction in weekly limits on Claude Code”.",
      "Which meter moved is unresolved.",
    ]);
  });

  it("keeps today's wording for a file with no credits block", () => {
    // The metric is already published on the live file; the wording must not swap until the
    // figures the new line needs are published with it.
    expect(WITHOUT.last_change!.metric).toBe("weekly_to_five_hour_ratio");
    expect(headline(WITHOUT)).toEqual({
      text: "Anthropic last decreased Claude's weekly limit by 24% on 11 Sep 2026.",
      tone: "down",
    });
    expect(changeLines(WITHOUT)).toEqual([]);
    expect(headline(PUBLISHED).text).toBe(headline(structuredClone(PUBLISHED)).text);
  });

  it("lifts the empty-capture sentence out of the block's own method", () => {
    const cut = creditsOf(CREDITS)!.five_hour_window_across_cut!;
    expect(cut.per_account.a1.n_with_capture).toBe(0);
    expect(captureEmptyNote(cut.method)).toBe(
      "An account whose n_with_capture is 0 has no usable capture column, so its meter movement includes work this host never saw and its level reads low; the comparison of its own two sides is still its own",
    );
    expect(captureEmptyNote("no such sentence here")).toBeNull();
    expect(captureEmptyNote(undefined)).toBeNull();
  });

  it("shows a share small enough to round away at a second place", () => {
    expect(fmtShare(0.9702)).toBe("97.0%");
    expect(fmtShare(0.0254)).toBe("2.5%");
    // 0.01% of the window is real input; printing it as 0.0% would read as none at all.
    expect(fmtShare(0.0001)).toBe("0.01%");
    expect(fmtShare(0)).toBe("0.0%");
  });
});
