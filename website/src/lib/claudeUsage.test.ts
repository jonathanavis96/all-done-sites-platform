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

describe("compute", () => {
  it("scales by plan and derives tasks and value", () => {
    const r = compute(J, "max20", "claude-sonnet-5", "high");
    expect(r.tokensPerWindow).toBe(42_000_000);
    expect(r.split.cache_read).toBeCloseTo(38_094_000, -3);
    expect(r.tasksPerWindow).toBeCloseTo(16.67, 1);
    // Weekly figures scale by the measured windows-per-week (11.2 here), not a theoretical 28.
    expect(r.tasksPerWeek).toBeCloseTo(16.67 * 11.2, 0);
    // value = 2.604M*3 + 0.882M*15 + 38.094M*0.3 + 0.42M*3.75  (per Mtok)
    expect(r.apiValueUsd).toBeCloseTo(7.812 + 13.23 + 11.428 + 1.575, 1);
    expect(r.apiValueUsdPerWeek).toBeCloseTo(r.apiValueUsd * 11.2, 6);
    expect(r.windowsPerWeek).toBe(11.2);
  });
  it("returns null for every per-week figure when weekly_windows is absent", () => {
    const { weekly_windows: _weekly_windows, ...withoutWeekly } = J;
    const r = compute(withoutWeekly as UsageJson, "max20", "claude-sonnet-5", "high");
    expect(r.windowsPerWeek).toBeNull();
    expect(r.tasksPerWeek).toBeNull();
    expect(r.apiValueUsdPerWeek).toBeNull();
  });
  it("returns null for every per-week figure when the selected plan's weekly_windows entry is null", () => {
    const withNullPro: UsageJson = { ...J, weekly_windows: { ...J.weekly_windows!, pro: null } };
    const r = compute(withNullPro, "pro", "claude-sonnet-5", "high");
    expect(r.windowsPerWeek).toBeNull();
    expect(r.tasksPerWeek).toBeNull();
    expect(r.apiValueUsdPerWeek).toBeNull();
  });
  it("pro carries max5's assumed windows-per-week until it is measured directly", () => {
    const r = compute(J, "pro", "claude-sonnet-5", "high");
    expect(r.windowsPerWeek).toBe(9.4);
  });
  it("uses the selected plan's own windows-per-week, not another plan's", () => {
    const r = compute(J, "max5", "claude-sonnet-5", "high");
    expect(r.windowsPerWeek).toBe(9.4);
  });
  it("pro is 5% of max20", () => {
    expect(compute(J, "pro", "claude-sonnet-5", "low").tokensPerWindow).toBe(2_100_000);
  });
  it("shows the publisher's dollars per window when the JSON carries it, scaled by plan", () => {
    const withUsd: UsageJson = {
      ...J,
      rates: { "claude-sonnet-5": { ...J.rates["claude-sonnet-5"], api_value_per_window: 100.42 } },
    };
    expect(compute(withUsd, "max20", "claude-sonnet-5", "high").apiValueUsd).toBe(100.42);
    expect(compute(withUsd, "max5", "claude-sonnet-5", "high").apiValueUsd).toBeCloseTo(25.105, 6);
    expect(compute(withUsd, "pro", "claude-sonnet-5", "high").apiValueUsd).toBeCloseTo(5.021, 6);
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
  it("dates a passive figure by its own reading, never by the model's probe", () => {
    expect(fmtSource({ source: "passive", probed_at: "2026-09-14T13:16:00Z", measured_at: "2026-09-15T22:58:00Z" })).toBe(
      "passive, 15 Sep",
    );
    expect(fmtSource({ source: "passive", probed_at: "2026-09-14T13:16:00Z" })).toBe("passive");
  });
  it("falls back to the plain source when probed_at is absent", () => {
    expect(fmtSource({ source: "derived" })).toBe("derived");
    expect(fmtSource({ source: "derived", probed_at: null })).toBe("derived");
  });
  it("returns null when there is no rate at all", () => {
    expect(fmtSource(undefined)).toBeNull();
  });
});

describe("headline", () => {
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
  it("falls back to the earliest date when every row is held", () => {
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
  it("uses the earliest history entry when the week ending predates all of them", () => {
    const s = weeklyTokenSeriesFor(WJ, "claude-sonnet-5");
    const max20 = s.find((x) => x.plan === "max20")!; // ratio 1
    // 2026-07-04 predates the earliest history entry (2026-05-01), which is itself <=
    // 2026-07-04, so that entry (38M) is used either way.
    const jul4 = max20.points.find((p) => p.date === "2026-07-04")!;
    expect(jul4.tokens).toBeCloseTo(10 * 38_000_000, 5);
  });
  it("falls back to the current rate when the model has no history", () => {
    const noHistory: UsageJson = { ...WJ, history: {} };
    const s = weeklyTokenSeriesFor(noHistory, "claude-sonnet-5");
    const max20 = s.find((x) => x.plan === "max20")!;
    const point = max20.points.find((p) => p.date === "2026-09-05")!;
    expect(point.tokens).toBeCloseTo(11.2 * 42_000_000 * 1, 5);
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

describe("compute effort scaling", () => {
  const priced: UsageJson = {
    ...J,
    session_tokens: { "claude-sonnet-5": 500_000 },
    // The shape that broke the page: the token totals put low ABOVE medium because that cell
    // happened to run cold-cache, while the priced figures rise with effort as they should.
    effort: { "claude-sonnet-5": { low: 2_000_000, medium: 1_400_000, high: 2_520_000, xhigh: 3_900_000, max: 5_600_000 } },
    effort_usd: { "claude-sonnet-5": { low: 0.017, medium: 0.027, high: 0.058, xhigh: 0.075, max: 0.28 } },
  };
  it("gives more sessions at lower effort, scaling by the priced series not the token totals", () => {
    const low = compute(priced, "max20", "claude-sonnet-5", "low")!;
    const medium = compute(priced, "max20", "claude-sonnet-5", "medium")!;
    const high = compute(priced, "max20", "claude-sonnet-5", "high")!;
    expect(low.sessionsPerWindow!).toBeGreaterThan(medium.sessionsPerWindow!);
    expect(medium.sessionsPerWindow!).toBeGreaterThan(high.sessionsPerWindow!);
    expect(medium.sessionsPerWindow!).toBeCloseTo(42_000_000 / 500_000, 5);
    expect(low.sessionsPerWindow!).toBeCloseTo(42_000_000 / (500_000 * (0.017 / 0.027)), 5);
  });
  it("falls back to the token ratio when the JSON has no priced effort figures", () => {
    const unpriced: UsageJson = { ...priced, effort_usd: undefined };
    const low = compute(unpriced, "max20", "claude-sonnet-5", "low")!;
    expect(low.sessionsPerWindow!).toBeCloseTo(42_000_000 / (500_000 * (2_000_000 / 1_400_000)), 5);
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
