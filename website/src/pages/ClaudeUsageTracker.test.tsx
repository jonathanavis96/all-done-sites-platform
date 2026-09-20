import { describe, expect, it } from "vitest";
import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { HelmetProvider, type HelmetServerState } from "react-helmet-async";
import ClaudeUsageTracker from "./ClaudeUsageTracker";
import {
  compute,
  computeCredits,
  computeWindowTokens,
  fmtTokens,
  fmtUsd,
  weeklyTokenRegimeLevelsFor,
  weeklyRegimeLevelsFor,
  type Plan,
  type UsageJson,
} from "@/lib/claudeUsage";
import type { ContribMetric } from "@/lib/contrib";
// Schema 1: the published file as of 4401911 (generated 2026-09-16T16:30Z), what the live page
// renders until the collector change merges. Schema 2: tracker PR #57's offline rebuild from the
// same inputs, in which max20's weekly figure is unavailable until passive.json is re-paired.
// Published schema 2: the file the collector published at 2026-09-16T19:30Z (df10f70), re-paired.
import schema1 from "@/lib/__fixtures__/claude-usage-schema1.json";
import schema2 from "@/lib/__fixtures__/claude-usage-schema2.json";
import schema2Published from "@/lib/__fixtures__/claude-usage-schema2-published.json";
// The credits block, as the tracker publishes it from its current main.
import schema3Credits from "@/lib/__fixtures__/claude-usage-schema3-credits.json";
// The same block once tracker PR #67 lands: measured rates, rate sources and per-effort credits.
import schema3Measured from "@/lib/__fixtures__/claude-usage-schema3-measured-rates.json";
// Tracker PR #68: dated basis blocks, a dated credits block, and reference.shortfall.
import schema3Shortfall from "@/lib/__fixtures__/claude-usage-schema3-shortfall.json";
// Tracker wf-59: the window measured in tokens, per class and per family, under credits.window_tokens.
import schema3WindowTokens from "@/lib/__fixtures__/claude-usage-schema3-window-tokens.json";
import { withWf50 } from "@/lib/__fixtures__/wf50";

function renderHtml(j: UsageJson, plan: Plan = "max20", model = "claude-sonnet-5", now?: number, contribMetric?: ContribMetric): string {
  return renderToString(
    <HelmetProvider context={{}}>
      <MemoryRouter>
        <ClaudeUsageTracker initial={j} initialPlan={plan} initialModel={model} now={now} initialContribMetric={contribMetric} />
      </MemoryRouter>
    </HelmetProvider>,
  );
}

function render(j: UsageJson, plan: Plan = "max20", model = "claude-sonnet-5", now?: number, contribMetric?: ContribMetric): string {
  const html = renderHtml(j, plan, model, now, contribMetric);
  // Text only, one space between elements, so assertions read as the page does.
  return html
    .replace(/<!-- -->/g, "")
    // The headline's highlight spans sit inside words.
    .replace(/<span class="(claude|down|up)">([^<]*)<\/span>/g, "$2")
    // Links sit inside sentences.
    .replace(/<\/?a(\s[^>]*)?>/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&#x27;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ");
}

// The windows-per-week chart alone: its own svg, up to the next section.
function weeklyChart(html: string): string {
  const at = html.indexOf('aria-label="Five-hour windows per week over time');
  return html.slice(html.lastIndexOf("<svg", at), html.indexOf("</svg>", at));
}

// The cells of one plan-comparison row, in Pro, Max 5x, Max 20x order. A cell whose figure is
// inferred reads "<figure> inferred".
function row(text: string, label: string): string[] {
  const table = text.slice(text.indexOf(" Plan comparison "), text.indexOf(" Contribute your own meter "));
  const after = table.split(` ${label} `)[1];
  const cells: string[] = [];
  for (const word of after.trim().split(" ")) {
    if (word === "inferred" && cells.length > 0) cells[cells.length - 1] += " inferred";
    else if (cells.length === 3) break;
    else cells.push(word);
  }
  return cells;
}

const LIVE = schema1 as unknown as UsageJson;
const REBUILT = schema2 as unknown as UsageJson;
const PUBLISHED = schema2Published as unknown as UsageJson;

// Each plan's levels on one level chart, read off its accessible label: "Max 20x: 13 Jun 2026 to
// 14 Aug 2026 6.2 (dashed), 19 Aug 2026 to ...". The label is the only per-level text an SVG carries.
function chartLevels(html: string, title: string): Map<string, { start: string; dashed: boolean }[]> {
  const label = html.match(new RegExp(`aria-label="${title}\\. ([^"]*)"`))?.[1].replace(/&#x27;/g, "'");
  expect(label).toBeDefined();
  const plans = new Map<string, { start: string; dashed: boolean }[]>();
  for (const part of label!.split(/\. (?=[A-Z][^:]*: \d)/)) {
    const m = part.match(/^([A-Za-z0-9 ]+): (\d.*)$/);
    if (!m) continue;
    const levels = m[2].split(", ").map((l) => ({ start: l.split(" to ")[0], dashed: l.endsWith("(dashed)") }));
    plans.set(m[1], levels);
  }
  return plans;
}

// The rebuilt JSON once max20's weekly log is re-paired: the PR body's measured estimate.
const MEASURED: UsageJson = structuredClone(REBUILT);
MEASURED.weekly_windows!.max20 = {
  ...MEASURED.weekly_windows!.max20!,
  current: 6.13,
  current_estimate: {
    value: 6.13, rounding_interval: [5.67, 6.65], points: 51, pieces: 51, seven_day_pct: 209,
    from: "2026-09-02T02:30:00+00:00", as_of: "2026-09-16T02:30:00+00:00", stale: false,
    source: "passive_paired_deltas", assumed: false, quality: "measured", reasons: [],
  },
  regimes: [
    { start: "2026-08-19T17:00:00+00:00", end: "2026-09-16T02:30:00+00:00", windows: 6.34, seven_day_pct: 330, points: 120, source: "passive_paired_deltas", assumed: false },
  ],
  availability: { status: "measured", reason: null },
};

describe("the tracker page renders both schemas", () => {
  it("renders the live schema 1 file with the #74 hero, by Jonathan's decision reversing findings 1, 4, 6, 11", () => {
    const text = render(LIVE);
    expect(text).not.toContain("Data temporarily unavailable");
    // Headline: Anthropic changed the limit, not an "observed ratio" on the account.
    expect(text).toContain("Anthropic last decreased Claude's weekly limit by 29% on 14 Sep 2026.");
    expect(text).not.toContain("observed weekly-to-window ratio");
    // #74's single dollar figure, labelled "API value", sourced from the meter budget.
    expect(text).toContain("of API value per 5-hour window");
    expect(text).not.toContain("meter budget per 5-hour window");
    expect(text).not.toContain("API list value not published");
    // Tokens, with no "on the reference mix" qualifier.
    expect(text).toContain("tokens per 5-hour window");
    expect(text).not.toContain("on the reference mix");
    // Sessions are back (finding 11 reversed).
    expect(text).toMatch(/\d+ sessions/);
    // Max 20x's own weekly figure, the same in the sentence, the chart and the table.
    const r = compute(LIVE, "max20", "claude-sonnet-5", "high")!;
    // LIVE's last_change is a weekly-scoped change, so #74's sentence names it.
    expect(text).toContain(
      `A week currently holds about ${r.planWindowsPerWeek!.toFixed(1)} five-hour windows, measured from a real account since the change on 14 Sep 2026.`,
    );
    expect(text).toContain(`${r.planWindowsPerWeek!.toFixed(1)} five-hour windows per week`);
    // Pro's and Max 5x's weekly cells take the level their chart ends on, with no "inferred" badge
    // (findings 6/12 reversed by Jonathan's decision, 2026-09-16).
    const proRow = row(text, "Tokens per week");
    expect(proRow.every((c) => !c.includes("inferred"))).toBe(true);
    expect(proRow.every((c) => c !== "—")).toBe(true);
    // Pro's assumed copy of Max 5x is drawn with it again, one line on the weekly-limit chart.
    expect(text).toContain("Max 5x and Pro");
    expect(text).toContain("Source: the account's own meter, newest reading 16 Sep");
    expect(text).toContain("Two contributor IDs on Max 20x have shared meter readings.");
  });

  it("draws a measured schema 2 weekly estimate as one value in the sentence, the rate line and the table", () => {
    const text = render(MEASURED);
    const r = compute(MEASURED, "max20", "claude-sonnet-5", "high")!;
    expect(text).toContain(
      `A week currently holds about ${r.planWindowsPerWeek!.toFixed(1)} five-hour windows, measured from a real account.`,
    );
    expect(text).toContain(`${r.planWindowsPerWeek!.toFixed(1)} five-hour windows per week`);
    // No token row: this file publishes no measured window, and the list-price route that used
    // to fill one is gone (wf-60).
    expect(text).not.toContain("Tokens per week Pro");
    expect(row(text, "API value per week")[2]).not.toBe("—");
  });

  it("shows Fable on Pro as not included, with no figures, and keeps the selectors to leave it (finding 2, kept)", () => {
    for (const j of [LIVE, MEASURED]) {
      const text = render(j, "pro", "claude-fable-5-1");
      expect(text).toContain(
        "On Pro Max 5x Max 20x , running Fable 5.1 Opus 5 Sonnet 5 at low medium high xhigh max effort Fable 5.1 is not included with Pro.",
      );
      expect(text).not.toMatch(/\d+[kM] tokens per 5-hour window/);
      expect(row(text, "API value per 5-hour window")[0]).toBe("—");
    }
  });

  it("gives Fable on Max the plan's weekly figure, qualified by the published 50% cap (finding 2, kept)", () => {
    const text = render(MEASURED, "max20", "claude-fable-5-1");
    const r = compute(MEASURED, "max20", "claude-fable-5-1", "high")!;
    // The caveat stays in the hero; the "a week holds about N windows" sentence moved to the
    // "How many windows fit in a week" details block (Jonathan's decision, 2026-09-20).
    const hero = text.slice(0, text.indexOf(" Effective window size "));
    expect(hero).toContain("Fable 5.1 may use 50% of the weekly limit.");
    expect(hero).not.toContain("A week currently holds about");
    expect(text).toContain(
      `A week currently holds about ${r.planWindowsPerWeek!.toFixed(1)} five-hour windows, measured from a real account.`,
    );
  });

  it("marks the selected model stale by its own evidence, and dates the line by that same evidence (finding 16, kept)", () => {
    // Schema 1: the file's newest sample is today, from Sonnet, while Opus was last measured on
    // 5 Sep. The line shows for Opus with Opus's date, and not for Sonnet.
    const now = Date.parse("2026-09-16T17:00:00Z");
    const oldOpus: UsageJson = structuredClone(LIVE);
    oldOpus.rates["claude-opus-5"].measured_at = "2026-09-05T12:00:00+00:00";
    expect(render(oldOpus, "max20", "claude-opus-5", now)).toContain("Last measured 5 Sep 2026.");
    expect(render(oldOpus, "max20", "claude-sonnet-5", now)).not.toContain("Last measured");
    // Schema 2: current until the figure's own stale_after, then dated by its own as_of.
    expect(render(REBUILT, "max20", "claude-sonnet-5", Date.parse("2026-09-20T00:00:00Z"))).not.toContain("Last measured");
    expect(render(REBUILT, "max20", "claude-sonnet-5", Date.parse("2026-09-27T00:00:00Z"))).toContain("Last measured 16 Sep 2026.");
    // Without a fixed clock the prerender never shows it, whatever the evidence's age.
    expect(render(oldOpus, "max20", "claude-opus-5")).not.toContain("Last measured");
  });

  it("says the data is unavailable when schema 2 publishes no eligible measurement, rather than substituting one (finding 13, kept)", () => {
    const none: UsageJson = structuredClone(REBUILT);
    for (const rate of Object.values(none.rates)) {
      Object.assign(rate, { tokens_per_window: null, meter_budget_per_window: null, api_value_per_window: null, api_list_value_per_window: null, source: "unavailable" });
    }
    const text = render(none);
    expect(text).toContain("Data temporarily unavailable.");
    expect(text).not.toContain("of API value per 5-hour window");
  });

  it("draws Pro and Max 5x on the windows chart, and no tokens chart without a measured window", () => {
    for (const j of [LIVE, PUBLISHED]) {
      const html = renderHtml(j);
      const weekly = chartLevels(html, "Five-hour windows per week over time");
      expect([...weekly.keys()]).toEqual(["Max 5x and Pro", "Max 20x"]);
      // Neither file publishes credits.window_tokens, so the tokens chart has nothing to draw
      // and draws nothing: the list-price history is not a second answer (wf-60).
      expect(html).not.toContain("Tokens per week over time");
      expect(html).toContain("Not enough history yet.");
    }
  });

  it("has exactly one level per weekly regime on the tokens-per-week chart, not a cut per daily reading", () => {
    // weeklyRegimeLevelsFor merges every plan's own and borrowed regimes into one series; the
    // tokens chart must draw the same start/end spans, just priced, never split further by a
    // daily history reading landing inside a span (that was audit finding 12's bug, reversed).
    for (const j of [LIVE, PUBLISHED]) {
      for (const plan of ["pro", "max5", "max20"] as Plan[]) {
        const regimeStarts = weeklyRegimeLevelsFor(j, plan).map((l) => l.start);
        const levels = weeklyTokenRegimeLevelsFor(j, plan, "claude-sonnet-5");
        expect(levels.length).toBeLessThanOrEqual(regimeStarts.length);
        expect(levels.every((l) => regimeStarts.includes(l.start))).toBe(true);
      }
    }
  });
});

describe("plan comparison and contributor tabs respect not-included and inferred-free wording", () => {
  it("gives the tokens-per-week and weekly-limit sections the window chart's not-included notice, and no other plan's lines (finding 2, kept)", () => {
    const sections = (text: string) => {
      const window = text.indexOf(" Effective window size ");
      const tokens = text.indexOf(" Tokens per week ", window);
      const weekly = text.indexOf(" Five-hour windows per week ", tokens);
      const table = text.indexOf(" Plan comparison ", weekly);
      expect([window, tokens, weekly, table].every((i) => i >= 0)).toBe(true);
      return [text.slice(window, tokens), text.slice(tokens, weekly), text.slice(weekly, table)];
    };
    for (const j of [LIVE, MEASURED]) {
      for (const section of sections(render(j, "pro", "claude-fable-5-1"))) {
        expect(section).toContain("Fable 5.1 is not included with Pro.");
        expect(section).not.toContain("Max 20x");
        expect(section).not.toContain("Each line");
      }
    }
  });

  it("labels the contributor tracker line plainly, with no inferred badge (reverses finding 6/12, Jonathan's decision)", () => {
    const pooled: UsageJson = structuredClone(LIVE);
    pooled.contributed!.max20!.weekly_windows.measured = 9.4;
    const weeklyTab = render(pooled, "max20", "claude-sonnet-5", undefined, "weekly");
    expect(weeklyTab).not.toMatch(/tracker [^ ]+ inferred/);
    expect(weeklyTab).toContain("Two contributor IDs on Max 20x have shared meter readings.");
    expect(weeklyTab).not.toContain("9.4");
    // The tracker's own line on the token tabs is the measured window, so a file that publishes
    // none draws no line rather than the list-price figure (wf-60).
    expect(weeklyTab).not.toMatch(/tracker \d/);
  });
});

// Tracker wf-50: the weekly chart shows the readings behind its levels, and the plan table and
// copy follow the credits-table ratios and the inferred marks.
describe("the weekly chart and plan table with tracker wf-50's fields", () => {
  const WF50 = withWf50(PUBLISHED);

  it("draws no documented reference beside the levels, before the fields exist or after", () => {
    // The windows-per-week chart drops the documented overlay entirely (Jonathan's decision,
    // 2026-09-20): reference only ever mattered for the cross-check table at the bottom, which
    // reads its own figures off `shortfallRows`, not this chart's overlay.
    const chart = weeklyChart(renderHtml(PUBLISHED));
    expect(chart).not.toContain("documented");
    expect(chart).not.toContain("<title>");
    expect(chart).not.toContain("min-width");
    const text = render(PUBLISHED);
    expect(text).not.toContain("Reading: one five-hour window");
    expect(text).toContain("by Anthropic's published 1:5:20 ratios");
    expect(text).toContain("Pro assumes the Max 5x ratio until it is measured.");
    expect(text).toContain("scaled from Max 20x by Anthropic's published plan ratios.");
    for (const plan of ["max5", "pro"] as Plan[]) {
      expect(weeklyChart(renderHtml(PUBLISHED, plan))).not.toContain("documented");
    }
  });

  // Mission Control review on PR #90: with PUBLISHED's own regime timestamps (not exactly
  // contiguous to the microsecond) `lastRealStep` finds no step on any plan, so this fixture
  // pins Max 20x to two contiguous regimes with a real change, and empties Pro's and Max 5x's own
  // regimes so every one of their recent levels is inferred from Max 20x -- the exact shape that
  // made the marker vanish for those two plans before the fix.
  const CHANGE = (() => {
    const j: UsageJson = structuredClone(PUBLISHED);
    j.weekly_windows!.pro = { ...j.weekly_windows!.pro!, regimes: [] };
    j.weekly_windows!.max5 = { ...j.weekly_windows!.max5!, regimes: [] };
    j.weekly_windows!.max20 = {
      ...j.weekly_windows!.max20!,
      regimes: [
        { start: "2026-08-01T00:00:00+00:00", end: "2026-09-11T00:00:00+00:00", windows: 6.5, seven_day_pct: 200, points: 50, source: "passive_paired_deltas", assumed: false },
        { start: "2026-09-11T00:00:00+00:00", end: "2026-09-16T00:00:00+00:00", windows: 4.68, seven_day_pct: 30, points: 10, source: "passive_paired_deltas", assumed: false },
      ],
    };
    return j;
  })();

  it("draws the change marker and the red step on Max 20x's own real step", () => {
    const chart = weeklyChart(renderHtml(CHANGE, "max20"));
    // The label carries the date and the rounded percent, not the generic announced-event text.
    expect(chart).toMatch(/11 Sep 2026: -28% on 11 Sep/);
    const markerLine = chart.match(/<line x1="([\d.]+)"[^>]*stroke="#B42318"[^>]*>/);
    expect(markerLine).not.toBeNull();
    const redPath = chart.match(/<path d="M ([\d.]+),[\d.]+ L ([\d.]+),[\d.]+ L \2,[\d.]+[^"]*"[^>]*stroke="#B42318"/);
    expect(redPath).not.toBeNull();
    // The dashed marker sits at the same x the red step's vertical jump sits at.
    expect(Number(redPath![2])).toBeCloseTo(Number(markerLine![1]), 5);
  });

  it("falls back to Max 20x's step for Pro and Max 5x, whose own recent levels are all inferred", () => {
    for (const plan of ["pro", "max5"] as Plan[]) {
      const chart = weeklyChart(renderHtml(CHANGE, plan));
      expect(chart).toMatch(/11 Sep 2026: -28% on 11 Sep/);
      expect(chart).toMatch(/<line[^>]*stroke="#B42318"/);
      // Reviewer finding 1 (PR #90): before the fix, Pro and Max 5x drew no marker at all because
      // every one of their recent levels is inferred from Max 20x and `lastRealStep` skipped them.
      const markerLine = chart.match(/<line x1="([\d.]+)"[^>]*stroke="#B42318"[^>]*>/)!;
      const max20Chart = weeklyChart(renderHtml(CHANGE, "max20"));
      const max20Line = max20Chart.match(/<line x1="([\d.]+)"[^>]*stroke="#B42318"[^>]*>/)!;
      expect(Number(markerLine[1])).toBeCloseTo(Number(max20Line[1]), 5);
    }
  });

  // PUBLISHED is not synthetic: it is the collector's own regime shape (schema2-published.json),
  // and its two Max 20x regimes are 2026-08-19..2026-09-13T21:30 and 2026-09-14T11:30..09-16 --
  // a genuine ~14-hour gap the passive sampler leaves between two clean stretches. An exact
  // `cur.start === prev.end` string match (the check before this fix) always fails on real data
  // shaped like this, which silently dropped the marker on live production data even though the
  // fixture-driven CHANGE tests above (with regimes touching to the microsecond) passed.
  it("draws the step and the marker on Max 20x's own live-shaped regime gap (live data, not a fixture)", () => {
    const chart = weeklyChart(renderHtml(PUBLISHED, "max20"));
    const markerLine = chart.match(/<line x1="([\d.]+)"[^>]*stroke="#B42318"[^>]*>/);
    expect(markerLine).not.toBeNull();
    const redPath = chart.match(/<path d="M ([\d.]+),[\d.]+ L ([\d.]+),[\d.]+ L \2,[\d.]+[^"]*"[^>]*stroke="#B42318"/);
    expect(redPath).not.toBeNull();
    expect(Number(redPath![2])).toBeCloseTo(Number(markerLine![1]), 5);
    // The step lands on Max 20x's real regime boundary (14 Sep 2026, 11:30), not the announced
    // event's own date (11 Sep): the two can disagree, and the level source wins.
    expect(chart).toMatch(/14 Sep 2026: -28% on 14 Sep/);
    // No per-account onset ticks (removed 2026-09-20): the short stray red tick reviewers saw
    // near the plot's top right does not reappear.
    expect(chart).not.toContain("Onset across");
  });

  it("draws every reading as a dot, hollow under 5% of seven-day movement, with its hover text", () => {
    const chart = weeklyChart(renderHtml(WF50));
    const readings = WF50.weekly_windows!.max20!.by_window!.filter((r) => typeof r.windows === "number");
    const dots: string[] = chart.match(/<circle[^>]*r="2\.5"[^>]*>/g) ?? [];
    expect(dots).toHaveLength(readings.length);
    expect(dots.filter((d) => d.includes('fill="none"'))).toHaveLength(readings.filter((r) => r.seven_day_pct < 5).length);
    const one = readings.find((r) => r.seven_day_pct >= 5)!;
    expect(chart).toContain(
      `${one.windows!.toFixed(1)} windows per week. Five-hour meter moved ${one.five_hour_pct}%, seven-day meter ${one.seven_day_pct}%. Account ${one.account}.`,
    );
  });

  it("draws the weekly pooled points with whiskers, the partial week hollow, beneath the step line", () => {
    const chart = weeklyChart(renderHtml(WF50));
    const weekly = WF50.weekly_windows!.max20!.weekly!;
    const markers: string[] = chart.match(/<circle[^>]*r="4\.5"[^>]*>/g) ?? [];
    expect(markers).toHaveLength(weekly.length);
    expect(markers.filter((m) => m.includes('fill="var(--ads-bg)"'))).toHaveLength(weekly.filter((w) => w.partial).length);
    expect(weekly.some((w) => w.partial)).toBe(true);
    expect(chart).toContain("readings pooled");
    // The regime step line stays the top layer: every reading and marker comes before it.
    expect(chart.lastIndexOf("<circle")).toBeLessThan(chart.indexOf('stroke-width="3"'));
    // Chart text takes its ink from the theme, never the series colour.
    expect(chart).not.toMatch(/<text[^>]*fill:\s*#0EA5E9/i);
  });

  it("draws no per-account onset ticks -- the change marker alone carries the step (removed 2026-09-20)", () => {
    const chart = weeklyChart(renderHtml(WF50));
    expect(chart).not.toContain("Onset across");
    expect(chart).not.toContain("Account a1: step on");
    expect(chart).not.toContain("Account a2: step on");
  });

  it("adds reading and weekly to the legend and keeps what was there, with no documented entry", () => {
    const text = render(WF50);
    expect(text).toContain("Each line is the limit itself, held flat between changes");
    expect(text).toContain("Reading: one five-hour window on one account");
    expect(text).toContain("Weekly: a calendar week of readings pooled");
    expect(text).not.toContain("Documented: the level");
  });

  it("scales the table by the credits table and marks the inferred weekly cells", () => {
    const text = render(WF50);
    const max20 = compute(WF50, "max20", "claude-sonnet-5", "high")!;
    // This file publishes no measured window, so the table's figures are the dollar route's.
    expect(row(text, "API value per 5-hour window")).toEqual([
      fmtUsd(max20.apiValueUsd! * 0.05),
      fmtUsd(max20.apiValueUsd! * 0.3),
      fmtUsd(max20.apiValueUsd!),
    ]);
    const weekly = row(text, "API value per week");
    expect(weekly[0]).toMatch(/ inferred$/);
    expect(weekly[1]).toMatch(/ inferred$/);
    expect(weekly[2]).not.toContain("inferred");
    expect(row(text, "API value per 5-hour window").join(" ")).not.toContain("inferred");
    expect(text).toContain("scaled from it by the credits table, 1 : 6 : 20 per five-hour window.");
    expect(text).toContain(
      "scaled from Max 20x by the credits table: 1 : 6 : 20 per five-hour window and 1 : 8.33 : 16.67 per week (she-llac.com/claude-limits, undated).",
    );
    expect(text).toContain(
      "The Max 5x history (Jun–Aug) is measured; its current figure is inferred from Max 20x since the 14 Sep cut, and Pro is inferred the same way.",
    );
    expect(text).not.toContain("Max 20x and Max 5x are both measured from real accounts");
    expect(text).not.toContain("Pro assumes the Max 5x ratio");
    // The hero says where an inferred figure came from instead of calling it measured.
    expect(render(WF50, "max5")).toContain("five-hour windows, inferred from Max 20x since the change on 14 Sep 2026.");
    expect(render(WF50, "max20")).toContain("five-hour windows, measured from a real account since the change");
  });
});

describe("the credits block on the page", () => {
  const CREDITS = schema3Credits as unknown as UsageJson;
  // The same file with the block taken back out: the live file until its next refresh, and every
  // file published before the tracker change.
  const WITHOUT: UsageJson = (() => {
    const j = structuredClone(CREDITS);
    delete j.credits;
    return j;
  })();

  it("says what the change was measured on, and what it leaves unresolved", () => {
    const text = render(CREDITS, "max20", "claude-opus-5");
    expect(text).toContain("The number of five-hour windows in a week fell by 24% between 11 Sep 2026 and 14 Sep 2026.");
    expect(text).toContain("Five-hour windows per week: 6.5 (6.2 to 6.8) before, 5.0 (4.6 to 5.3) after.");
    expect(text).toContain("Anthropic announced -17% on 14 Sep 2026: “Compared to today, this works out to a 17% reduction in weekly limits on Claude Code”.");
    expect(text).toContain("Which meter moved is unresolved.");
    // Nothing anywhere says the five-hour window did not move.
    expect(text).not.toContain("Anthropic last decreased Claude's weekly limit");
  });

  it("leads on the window in credits, and says the tokens are not published yet", () => {
    const text = render(CREDITS, "max20", "claude-opus-5");
    // The token figures this file carries are the window's credits over a family's credits per
    // token; the page states the measured window instead, and this file has none (wf-60).
    expect(text).toContain("tokens per 5-hour window: window tokens not yet published");
    expect(text).toContain("tokens per week: window tokens not yet published");
    expect(text).not.toContain("29M input tokens per 5-hour window");
    expect(text).not.toContain("5.9M output tokens per 5-hour window");
    // One window, priced at each class's own rate, so one line rather than two identical ones.
    expect(text).toContain("$146.58 of API value per window, the same window priced at each class's own rate");
    expect(text).not.toContain("of API value per window in output tokens");
    expect(text).toContain(
      "19,543,887 credits per 5-hour window (17,250,018 to 20,819,693), n=11, pure-opus stretches, on 2 accounts. a1 contributed no clean pure-opus stretch.",
    );
    // The provenance under the credits figures is what the credits block says, not the date on
    // another block's rate (finding 5).
    expect(text).toContain("Method: median credits per 1% of the five-hour meter over the pure-opus stretches");
    expect(text).not.toContain("Source: the account's own meter");
    expect(text).toContain("about 354 sessions per window (312 to 377)");
    expect(text).toContain("1,755 per week (1,549 to 1,870)");
    // The sessions figures are cache-normalised, so the split they assume is beside them.
    expect(text).toContain("0.01% input · 0.4% output · 97.0% cache read · 2.5% cache write");
    expect(text).toContain("Split: history/passive.json `split`, the watched accounts' own token-class shares.");
    expect(text).toContain("Cache-normalised at that split, over a median session of 1.8M tokens.");
  });

  it("moves the credits-per-window figure, the split, the split source, the cache-normalised note and the weekly sentence out of the hero (Jonathan's decision, 2026-09-20)", () => {
    const text = render(CREDITS, "max20", "claude-opus-5");
    const hero = text.slice(0, text.indexOf(" Effective window size "));
    const moved = [
      "19,543,887 credits per 5-hour window",
      "0.01% input · 0.4% output · 97.0% cache read · 2.5% cache write",
      "Split: history/passive.json `split`",
      "Cache-normalised at that split",
      "A week currently holds about",
    ];
    for (const line of moved) {
      expect(hero, line).not.toContain(line);
      expect(text, line).toContain(line);
    }
    // Every moved line still renders inside a details element -- collapsed content stays in the
    // DOM, which is what the publish check relies on. Raw HTML splits an interpolated value from
    // its surrounding text (a comment, or a wrapping <b>), so each check below uses a fragment
    // that JSX cannot split: a whole number, or text with no expression inside it.
    const html = renderHtml(CREDITS, "max20", "claude-opus-5");
    const detailsBlocks = html.split("<details>").slice(1);
    const rawFragments = [
      "19,543,887", // the credits-per-window figure
      "97.0", // the cache-read share in the split
      "history/passive.json", // the split source
      "1.8M", // the cache-normalised note's median session size
      "measured from 3 accounts", // the weekly sentence's account count
    ];
    for (const fragment of rawFragments) {
      expect(detailsBlocks.some((d) => d.includes(fragment)), fragment).toBe(true);
    }
    // Kept in the hero: the headline, pill row, plan/model sentence, the two hero tiles with
    // their ranges, the one-line class breakdown and the sessions line.
    expect(hero).toContain("On Pro Max 5x Max 20x");
    expect(hero).toContain("tokens per 5-hour window: window tokens not yet published");
    expect(hero).toContain("$146.58 of API value per window, the same window priced at each class's own rate");
    expect(hero).toContain("Range $129.38 to $156.15");
    expect(hero).toContain("about 354 sessions per window (312 to 377)");
    expect(hero).toContain("1,755 per week (1,549 to 1,870)");
  });

  it("prints a status sentence in the figure's place, and never a null", () => {
    const text = render(CREDITS, "max20", "claude-fable-5-1");
    expect(text).toContain("API value per window in input tokens: rate not yet identified ($73.00 to $174.44)");
    expect(text).toContain("sessions per window: rate not yet identified (23 to 67)");
    // The window itself is measured on pure-Opus stretches, so it reads the same whatever model
    // is selected: Fable's unidentified rate is not in it.
    expect(text).toContain("19,543,887 credits per 5-hour window");
    for (const model of Object.keys(CREDITS.rates)) {
      const t = render(CREDITS, "max20", model);
      expect(t, model).not.toMatch(/\bnull\b|\bNaN\b|\bundefined\b/);
    }
  });

  it("scales the hero to the selected plan rather than repeating the Max 20x figure", () => {
    expect(render(CREDITS, "max20", "claude-opus-5")).toContain("$146.58 of API value per window");
    expect(render(CREDITS, "pro", "claude-opus-5")).toContain("$7.33 of API value per window");
    expect(render(CREDITS, "max5", "claude-opus-5")).toContain("$43.97 of API value per window");
  });

  it("moves the #78 weekly sentence and account count to the bottom detail, out of the hero", () => {
    // The hero used to state the #78 sentence plainly; now it moved to "How many windows fit in
    // a week" at the bottom entirely, with no account count and no sentence left in the hero
    // (Jonathan's decision, 2026-09-20).
    expect(CREDITS.passive_account_count).toBe(3);
    const text = render(CREDITS, "max20", "claude-opus-5");
    const hero = text.slice(0, text.indexOf(" Effective window size "));
    expect(hero).not.toContain("five-hour windows, measured from a real account since the change");
    expect(hero).not.toContain("3 accounts");
    expect(text).toContain("How many windows fit in a week");
    expect(text).toContain("five-hour windows, measured from 3 accounts since the change");
  });

  it("puts each effort cell's cache state beside it", () => {
    const text = render(CREDITS, "max20", "claude-sonnet-5");
    const mix = CREDITS.credits!.effort_cache_mix!["claude-sonnet-5"]!;
    // The Sonnet row inverts -- low reads dearer than medium -- and the share is what explains it.
    expect(mix.low!.cache_read_share!).toBeGreaterThan(mix.medium!.cache_read_share!);
    // Four of the seven low runs ran cold, which is the whole reason the cell reads dearer.
    expect(text).toContain("$0.02 91.5% cache read · 7 runs · 4 cold");
    expect(text).toContain("$0.03 80.4% cache read · 7 runs · 3 cold");
    // Another model's row, so the matrix is not one row wide.
    expect(text).toContain("$0.22 61.0% cache read · 7 runs · 6 cold");
  });

  it("states what the plan ratios rest on, and dates the table they come from", () => {
    const text = render(CREDITS, "max20", "claude-opus-5");
    expect(text).toContain("Basis: credits_table.");
    expect(text).toContain("Credits per five-hour window, Pro : Max 5x : Max 20x: 550,000 : 3,300,000 : 11,000,000.");
    expect(text).toContain("Credits per week: 5,000,000 : 41,666,700 : 83,333,300.");
    expect(text).toContain("Measured confirmation: Max 5x over Max 20x 1.66, Max 5x Jun-Aug over Max 20x 19 Aug-11 Sep.");
    // The same URL was dated in two sections and called undated in three. It carries one date.
    expect(text).toContain("Source, as of 25 Jan 2026: she-llac.com/claude-limits");
    expect(text).not.toContain("undated");
  });

  it("moves the weekly-measurement note and the ratio-table basis footnote out of the Plan comparison section, into the cross-check details (Jonathan's decision, 2026-09-20)", () => {
    const text = render(CREDITS, "max20", "claude-opus-5");
    const comparisonSection = text.slice(text.indexOf(" Plan comparison "), text.indexOf(" Contribute your own meter "));
    expect(comparisonSection).not.toContain("Basis: credits_table.");
    expect(comparisonSection).not.toContain("weekly figures are measured from");
    // The one-line subtitle stays.
    expect(comparisonSection).toContain("Max 20x is measured; Pro and Max 5x are scaled from it by");
    // Both moved paragraphs still render, inside "Cross-check against the announced caps".
    const crossCheck = text.slice(text.indexOf("Cross-check against the announced caps"));
    expect(crossCheck).toContain("Basis: credits_table.");
    expect(crossCheck).toContain("Credits per five-hour window, Pro : Max 5x : Max 20x: 550,000 : 3,300,000 : 11,000,000.");
  });

  it("gives each account its own row across the change, and resolves nothing", () => {
    const text = render(CREDITS, "max20", "claude-opus-5");
    expect(text).toContain("The five-hour window across the change");
    expect(text).toContain("Each account's own meter either side of 14 Sep 2026, in credits per 1% of the five-hour meter.");
    expect(text).toContain("a1 123,599 139,377 12.8% 166 24 0");
    expect(text).toContain("a2 187,168 204,632 9.3% 41 14 56");
    // a3 has no before, so the cells that would carry one are empty rather than zero.
    expect(text).toContain("a3 — 158,809 — 0 14 14");
    expect(text).toContain("a1: An account whose n_with_capture is 0 has no usable capture column");
    expect(text).toContain(
      "The windows-per-week ratio fell about 23%. That is consistent with a smaller weekly cap, a larger five-hour window, or both; which meter moved is unresolved.",
    );
    expect(text).toContain("Two accounts read 29% apart in credits per 1% of the meter; the cause is not identified.");
    expect(text).toContain(
      "Unresolved: the accounts differ from each other by 46.8% after the change, more than the largest per-account move across it (12.8%), so the five-hour and weekly meters cannot be separated from these stretches.",
    );
  });

  it("says nothing about the windows-per-week ratio when it rose rather than fell", () => {
    const j = structuredClone(CREDITS);
    const cross = j.credits!.window_credits_from_weekly!;
    cross.before.windows_per_week_measured = 4.96;
    cross.after.windows_per_week_measured = 6.48;
    const text = render(j, "max20", "claude-opus-5");
    expect(text).not.toContain("windows-per-week ratio fell");
    expect(text).not.toContain("consistent with a smaller weekly cap");
  });

  it("says nothing about the windows-per-week ratio when it did not move", () => {
    const j = structuredClone(CREDITS);
    const cross = j.credits!.window_credits_from_weekly!;
    cross.before.windows_per_week_measured = 6.48;
    cross.after.windows_per_week_measured = 6.48;
    const text = render(j, "max20", "claude-opus-5");
    expect(text).not.toContain("windows-per-week ratio fell");
    expect(text).not.toContain("consistent with a smaller weekly cap");
  });

  it("says nothing about the account gap with fewer than two accounts carrying a usable capture column", () => {
    const j = structuredClone(CREDITS);
    j.credits!.five_hour_window_across_cut!.per_account.a2.n_with_capture = 0;
    const text = render(j, "max20", "claude-opus-5");
    expect(text).not.toContain("apart in credits per 1% of the meter; the cause is not identified");
  });

  it("says nothing about the account gap when the lowest reading is 0 or below", () => {
    const j = structuredClone(CREDITS);
    j.credits!.five_hour_window_across_cut!.per_account.a3.after = 0;
    const text = render(j, "max20", "claude-opus-5");
    expect(text).not.toContain("apart in credits per 1% of the meter; the cause is not identified");
  });

  it("shows the announced-cap cross-check beside the measured window, with the reference dated", () => {
    const text = render(CREDITS, "max20", "claude-opus-5");
    expect(text).toContain("Cross-check against the announced caps");
    expect(text).toContain("Before the change 83,333,300 × 1.5 = 124,999,950 ÷ 6.48 (6.2 to 6.8) windows 19,290,116");
    expect(text).toContain("After the change 83,333,300 × 1.25 = 104,166,625 ÷ 4.96 (4.6 to 5.3) windows 21,001,336");
    expect(text).toContain("Measured pure-opus stretches, n=11 19,543,887");
    expect(text).toContain("Baseline 83,333,300 credits per week, as of 25 Jan 2026: she-llac.com/claude-limits");
    expect(text).toContain("A reference, shown beside the measurement and never an input to it.");
    expect(text).toContain("Shellac credits table, as of 25 Jan 2026. Announced changes since:");
    expect(text).toContain("6 May 2026 · ×2 · five hour window — Claude Code five-hour limits permanently doubled");
    // The +50% promotion carried a span rather than a date, and is dated as the JSON dates it.
    expect(text).toContain("2026-05 to 2026-09-13 · ×1.5 · weekly");
    expect(text).toContain("14 Sep 2026 · ×1.25 · weekly");
  });

  it("counts the excluded harness runs and carries Fable's status into the caveats", () => {
    const text = render(CREDITS, "max20", "claude-opus-5");
    expect(CREDITS.credits!.harness_runs_excluded).toHaveLength(16);
    expect(text).toContain("16 harness runs are excluded from the stretches behind these figures.");
    expect(text).toContain(
      "Fable 5.1's credit rate: interval, not yet separable, 1.1935 to 2.3631 credits per input token, solved against a window of 195,439 credits per 1% of the meter.",
    );
  });

  it("renders a file with no credits block as it does today, bar the window it cannot state", () => {
    const text = render(WITHOUT, "max20", "claude-opus-5");
    expect(text).toContain("Anthropic last decreased Claude's weekly limit by 24% on 11 Sep 2026.");
    // The 589M the dollar route used to lead on is the list-price window, and no figure on this
    // page comes from it any more (wf-60).
    expect(text).toContain("tokens per 5-hour window: window tokens not yet published");
    expect(text).not.toContain("589M tokens per 5-hour window");
    expect(text).toContain("five-hour windows, measured from a real account since the change");
    for (const gone of [
      "credits per 5-hour window",
      "The five-hour window across the change",
      // The details block itself now renders for this fixture (it also carries the weekly-
      // measurement note moved out of the plan comparison section), but the cross-check table
      // and the ratio-table basis footnote -- both of which need a credits block -- do not.
      "Announced cap ÷ windows per week",
      "Basis: credits_table.",
      "cache read · 7 runs",
      "harness runs are excluded",
      "Five-hour windows per week: 6.5",
    ]) {
      expect(text, gone).not.toContain(gone);
    }
    // Every other published file keeps its own wording too.
    expect(render(PUBLISHED)).toContain("measured from a real account");
  });
});

// wf-57. The page after the second hostile review: one figure per quantity, effort where the
// figures move with it, every number off the JSON, and the reference dated once.
describe("the page states one figure per quantity", () => {
  const MEASURED = schema3Measured as unknown as UsageJson;
  const CREDITS = schema3Credits as unknown as UsageJson;
  const WITHOUT: UsageJson = (() => {
    const j = structuredClone(MEASURED);
    delete j.credits;
    return j;
  })();

  it("gives the hero, the chart headlines and the plan table the same figures", () => {
    for (const plan of ["pro", "max5", "max20"] as Plan[]) {
      const text = render(MEASURED, plan, "claude-sonnet-5");
      const c = computeCredits(MEASURED, plan, "claude-sonnet-5")!;
      const sessions = c.sessionsPerWindow!.text;
      expect(text, plan).toContain(`${sessions} sessions`);
      expect(row(text, "Sessions per window")[["pro", "max5", "max20"].indexOf(plan)], plan).toBe(sessions);
    }
    // Neither route's token figure survives: 1472M is the list-price window, and the credits
    // block's 49M is the same window over a fitted Sonnet rate. The page states the measured
    // window or says it has none (wf-60).
    const text = render(MEASURED, "max20", "claude-sonnet-5");
    const dollarRoute = compute(MEASURED, "max20", "claude-sonnet-5", "high")!;
    expect(fmtTokens(dollarRoute.tokensPerWindow!)).toBe("1472M");
    expect(text).not.toContain("1472M");
    expect(text).not.toContain("49M input tokens");
    expect(text).not.toContain(`${Math.round(dollarRoute.sessionsPerWindow!)} sessions`);
    expect(text).toContain("tokens per 5-hour window: window tokens not yet published");
    expect(text).not.toContain("Plotted: tokens at the account's own mix");
  });

  it("stops claiming the hero moves with effort, and puts the effort figures where it does", () => {
    const text = render(MEASURED, "max20", "claude-opus-5");
    expect(text).toContain(", running Fable 5.1 Opus 5 Sonnet 5 , you get");
    expect(text).not.toMatch(/at low medium high xhigh max effort/);
    expect(text).toContain("Plan comparison Opus 5.");
    // The picker moved to the matrix, and the matrix cells carry the block's per-effort credits.
    expect(text).toContain("Effort low medium high xhigh max One calibration task at each effort level");
    expect(text).toContain("what the cell's own runs cost against a Max 20x window");
    expect(text).toContain("28,547 credits · 0.15% of the window");
    expect(text).toContain("10,228 credits · 0.05% of the window");
    // A family with no identified rate prints the sentence once, not a number.
    expect(text).toContain("credits: rate not yet identified");
    // A Pro window is a twentieth of the size, so the same task takes twenty times the share.
    expect(render(MEASURED, "pro", "claude-opus-5")).toContain("28,547 credits · 3.00% of the window");
    // A file with no effort matrix keeps the picker in the hero.
    expect(render(WITHOUT, "max20", "claude-opus-5")).toMatch(/at low medium high xhigh max effort/);
  });

  it("says what the credits figures were priced at, in the credits block's own fields", () => {
    expect(render(MEASURED, "max20", "claude-sonnet-5")).toContain(
      "Priced at the meter's measured Sonnet rate, 0.518 credits per input token, interval 0.327 to 0.832; Shellac credits table, as of 25 Jan 2026, says 0.400.",
    );
    // Opus is the unit anchor, so its rate is the reference figure and is not quoted twice.
    expect(render(MEASURED, "max20", "claude-opus-5")).toContain(
      "Priced at the reference Opus rate, 0.667 credits per input token.",
    );
    // A family with no rate renders its sentence, and no number.
    const fable = render(MEASURED, "max20", "claude-fable-5-1");
    expect(fable).toContain("Fable rate: rate not yet identified.");
    expect(fable).not.toContain("Priced at");
    // The file published before PR #67 carries no rate source, so the page claims none.
    expect(render(CREDITS, "max20", "claude-sonnet-5")).not.toContain("Priced at");
  });

  it("renders a number with its interval once Fable's rate is a value rather than a status (wf-89)", () => {
    // The tracker is about to publish Fable's row with `credits_per_token.input` a number and
    // `status: null` instead of the "rate not yet identified" sentence it publishes today. Both
    // the rate line and the per-window figures must prefer that number over the old sentence.
    const withFableRate = structuredClone(MEASURED) as UsageJson;
    const fable = (withFableRate.credits as unknown as { per_model: Record<string, Record<string, unknown>> })
      .per_model.fable;
    fable.status = null;
    fable.credits_per_token = { input: 2.0, output: 6.0 };
    const text = render(withFableRate, "max20", "claude-fable-5-1");
    expect(text).toContain("Priced at the meter's measured Fable rate, 2.000 credits per input token");
    expect(text).toContain("interval 1.179 to 3.036");
    // The rate line itself no longer falls back to the family-rate status sentence (the other
    // per-window figures, api value and tokens, are untouched by this fixture and keep theirs).
    expect(text).not.toContain("Fable rate, as of");
    expect(text).not.toContain("Fable rate: rate not yet identified");
  });

  it("keeps the method sentences inside a details element, out of the hero (page back to #78, wf-89)", () => {
    // The hero check is on raw HTML (an absence there is real regardless of comment splitting);
    // the "still renders somewhere" check is on the cleaned text `render` produces, since JSX
    // splits an expression from its neighbouring literal with an HTML comment that would break a
    // raw-HTML substring match.
    // From <main>, not from the document head: the meta description legitimately names the
    // account count (its own test covers that), this test is only about the visible page.
    const html = renderHtml(MEASURED, "max20", "claude-sonnet-5");
    expect(html).toContain("<details>");
    const hero = html.slice(html.indexOf("<main>"), html.indexOf("<details>"));
    const text = render(MEASURED, "max20", "claude-sonnet-5");
    for (const needle of ["Priced at the meter's measured Sonnet rate", "Method: median credits per 1%"]) {
      expect(hero).not.toContain(needle);
      expect(text).toContain(needle);
    }
    // The per-account count for the weekly-window figure: also out of the hero.
    expect(CREDITS.passive_account_count).toBe(3);
    const withAccountsHtml = renderHtml(CREDITS, "max20", "claude-opus-5");
    const heroAccounts = withAccountsHtml.slice(withAccountsHtml.indexOf("<main>"), withAccountsHtml.indexOf("<details>"));
    // Not the specific sentence the dispatch names ("A week currently holds ... measured from 3
    // accounts ..."); the Plan comparison table's own caveat about the same count is a different,
    // still-in-scope line and stays.
    expect(heroAccounts).not.toContain("five-hour windows, measured from 3 accounts");
    expect(render(CREDITS, "max20", "claude-opus-5")).toContain("measured from 3 accounts");
  });

  it("dates the reference wherever it names it, and stops calling it undated", () => {
    const text = render(MEASURED, "max20", "claude-opus-5");
    expect(text).not.toContain("undated");
    expect(text).toContain("Source, as of 25 Jan 2026: she-llac.com/claude-limits");
    expect(text).toContain("she-llac.com/claude-limits, as of 25 Jan 2026");
    expect(text).toContain("Baseline 83,333,300 credits per week, as of 25 Jan 2026");
    expect(text).toContain("Shellac credits table, as of 25 Jan 2026. Announced changes since:");
    // The windows-per-week chart carries no documented reference any more; the same date reaches
    // the reader through the caveat that scales Pro and Max 5x from the credits table.
    expect(text).toContain("she-llac.com/claude-limits, as of 25 Jan 2026)");
  });

  it("reads the figures the page used to carry as constants off the JSON", () => {
    const text = render(MEASURED, "max20", "claude-sonnet-5");
    // The documented level and the per-week ratio, both published.
    expect(text).toContain("scaled from Max 20x by the credits table: 1 : 6 : 20 per five-hour window and 1 : 8.33 : 16.67 per week");
    expect(text).toContain("Credits per week: 5,000,000 : 41,666,700 : 83,333,300.");
    // The run counts the cells print, instead of a number in the sentence.
    expect(text).not.toContain("run seven times at each effort level");
    expect(text).toContain("run the number of times each cell of the matrix above prints");
    // The credits method fits no rate, so the sentence that named one is gone.
    expect(text).not.toContain("the output rate fitted from 60 measured stretches");
    // The chart's hollow-dot rule is stated as the chart's own rule, with no claim beside it.
    expect(text).toContain("hollow where the seven-day meter moved under 5%, this chart's own threshold");
    expect(text).not.toContain("swings the ratio between 3 and 11");
  });

  it("names the quantity in the heading and prints each account's own figure", () => {
    const text = render(MEASURED, "max20", "claude-sonnet-5");
    expect(text).toContain("Five-hour windows per week How many 5-hour windows fit in one week");
    expect(text).not.toContain("Weekly limit, 5-hour windows per week");
    expect(text).toContain("Each watched account's own figure: a1 5.15 (128 readings), a2 4.53 (63 readings), a3 5.48 (9 readings).");
  });

  it("counts the accounts in the page description", () => {
    const describedAs = (j: UsageJson): string => {
      const context: { helmet?: HelmetServerState } = {};
      renderToString(
        <HelmetProvider context={context}>
          <MemoryRouter>
            <ClaudeUsageTracker initial={j} initialPlan="max20" initialModel="claude-sonnet-5" />
          </MemoryRouter>
        </HelmetProvider>,
      );
      return context.helmet!.meta.toString();
    };
    expect(describedAs(MEASURED)).toContain("Measured daily from 3 accounts");
    // Without the block the page has no account count to read, and says what it has always said.
    expect(describedAs(WITHOUT)).toContain("Measured daily from a real account");
  });

  it("renders no null, NaN or undefined for any model on either credits file", () => {
    for (const file of [CREDITS, MEASURED]) {
      for (const model of Object.keys(file.rates)) {
        for (const plan of ["pro", "max5", "max20"] as Plan[]) {
          expect(render(file, plan, model), `${model} ${plan}`).not.toMatch(/\bnull\b|\bNaN\b|\bundefined\b/);
        }
      }
    }
  });

  it("renders a file with no credits block as it does today, bar the window it cannot state", () => {
    const text = render(WITHOUT, "max20", "claude-sonnet-5");
    expect(text).toMatch(/at low medium high xhigh max effort, you get/);
    expect(text).not.toContain("1472M tokens per 5-hour window");
    expect(text).toContain("tokens per 5-hour window: window tokens not yet published");
    expect(text).toContain("the output rate fitted from 60 measured stretches of real work");
    expect(text).toContain("run seven times at each effort level");
    expect(text).not.toContain("Input tokens per 5-hour window");
    expect(text).not.toContain("Plotted: tokens at the account's own mix");
  });
});

// wf-57 follow-up. Tracker PR #68 reconciles the dates and publishes goal 7.
describe("the dated blocks and the shortfall table on the page", () => {
  const SHORTFALL = schema3Shortfall as unknown as UsageJson;
  const MEASURED = schema3Measured as unknown as UsageJson;
  const WITHOUT: UsageJson = (() => {
    const j = structuredClone(SHORTFALL);
    delete j.credits;
    return j;
  })();

  it("dates each named source from its own basis block", () => {
    const text = render(SHORTFALL, "max20", "claude-sonnet-5");
    expect(SHORTFALL.plan_ratios_basis!.as_of).toBe("2026-01-25");
    expect(text).toContain("Source, as of 25 Jan 2026: she-llac.com/claude-limits");
    expect(text).toContain("she-llac.com/claude-limits, as of 25 Jan 2026");
    expect(text).not.toContain("undated");
    // The windows-per-week chart carries no documented overlay any more; the caveat that scales
    // Pro and Max 5x from the credits table is where the reference date still reaches the page.
    expect(weeklyChart(renderHtml(SHORTFALL))).not.toContain("documented");
    // The caveat's date is what is printed, not the reference block's, so moving one moves it.
    const moved = structuredClone(SHORTFALL);
    moved.weekly_window_ratios_basis!.as_of = "2026-02-02";
    expect(render(moved, "max20", "claude-sonnet-5")).toContain("she-llac.com/claude-limits, as of 2 Feb 2026");
  });

  it("dates the credits block and each family's rate", () => {
    const text = render(SHORTFALL, "max20", "claude-sonnet-5");
    expect(text).toContain("Cache writes at the input rate, cache reads at 0 of it. Measured to 20 Sep 2026.");
    expect(text).toContain("Priced at the meter's measured Sonnet rate, as of 20 Sep 2026, 0.518 credits per input token");
    // Opus's own stretches end earlier, and its line says its own date.
    expect(render(SHORTFALL, "max20", "claude-opus-5")).toContain(
      "Priced at the reference Opus rate, as of 18 Sep 2026, 0.667 credits per input token.",
    );
    // A family with no rate carries its date beside the sentence that stands in for the number.
    expect(render(SHORTFALL, "max20", "claude-fable-5-1")).toContain("Fable rate, as of 20 Sep 2026: rate not yet identified.");
    // The file published before PR #68 dates neither, and none is invented for it.
    const older = render(MEASURED, "max20", "claude-sonnet-5");
    expect(older).not.toContain("Measured to ");
    expect(older).toContain("Priced at the meter's measured Sonnet rate, 0.518 credits per input token");
  });

  it("draws the shortfall as one row per plan, with a sentence where a plan was never measured", () => {
    const text = render(SHORTFALL, "max20", "claude-sonnet-5");
    expect(text).toContain(
      "Measured against the reference table: this tracker's measured five-hour windows per week against the reference table's, per plan, for the last regime that ended before the 14 September weekly change. Cut at 14 Sep 2026.",
    );
    expect(text).toContain("Measured Documented Measured ÷ documented Expected Measured ÷ expected Regime");
    expect(text).toContain("Max 20x 6.48 7.58 0.85 5.68 1.14 15 Aug 2026 to 14 Sep 2026");
    expect(text).toContain("Max 5x 10.86 12.63 0.86 9.47 1.15 13 Jun 2026 to 14 Aug 2026");
    // Pro has no measured regime, so the row is the publisher's sentence and carries no figure.
    expect(text).toContain(
      "Pro no measured weekly-window regime for pro ending before the cut; its published windows per week are inferred from max20, never measured",
    );
    expect(text).toContain("Multipliers applied to the table's figures: five-hour window ×2, weekly ×1.5.");
    expect(text).toContain("the reference table predates the 6 May five-hour doubling");
    expect(text).toContain("Status: explained (docs/findings-2026-09-20-reconciliation.md).");
    // A file published before the block draws no such table.
    expect(render(MEASURED, "max20", "claude-sonnet-5")).not.toContain("Measured against the reference table");
  });

  it("keeps the shortfall when the credits block is gone, and the rest of the page as it renders today", () => {
    const text = render(WITHOUT, "max20", "claude-sonnet-5");
    // reference.shortfall is not part of the credits block, so it survives its absence.
    expect(text).toContain("Measured against the reference table");
    expect(text).toContain("Max 20x 6.48 7.58 0.85 5.68 1.14");
    // Everything the credits block carried is gone with it.
    expect(text).not.toContain("credits per 5-hour window");
    expect(text).not.toContain("Cross-check against the announced caps A cross-check");
    expect(text).toMatch(/at low medium high xhigh max effort, you get/);
    expect(text).toContain("the output rate fitted from 60 measured stretches of real work");
  });

  it("renders no null, NaN or undefined on the third file either", () => {
    for (const model of Object.keys(SHORTFALL.rates)) {
      for (const plan of ["pro", "max5", "max20"] as Plan[]) {
        expect(render(SHORTFALL, plan, model), `${model} ${plan}`).not.toMatch(/\bnull\b|\bNaN\b|\bundefined\b/);
      }
    }
  });
});

// wf-60. The page's token figures on one route: the measured window, published by tracker wf-59
// under `credits.window_tokens`. Tokens per 1% of the five-hour meter over the clean pure-Opus
// stretches, times 100 -- no rate, no class weight, and no second route behind it.
describe("the measured window in tokens", () => {
  const WT = schema3WindowTokens as unknown as UsageJson;
  const WINDOW = WT.credits!.window_tokens!;
  // The same file before tracker wf-59: every other block, and no measured window.
  const WITHOUT: UsageJson = (() => {
    const j = structuredClone(WT);
    delete j.credits!.window_tokens;
    return j;
  })();
  const planIndex = (plan: Plan) => ["pro", "max5", "max20"].indexOf(plan);

  it("starts every picker on Opus, the family the window was measured on", () => {
    const html = renderToString(
      <HelmetProvider context={{}}>
        <MemoryRouter>
          <ClaudeUsageTracker initial={WT} />
        </MemoryRouter>
      </HelmetProvider>,
    );
    expect(html).toContain('<option value="claude-opus-5" selected="">Opus 5</option>');
    expect(html).not.toContain('<option value="claude-sonnet-5" selected="">');
    // Both pickers are the one selection, so the contributors chart starts on Opus too.
    expect(html.match(/<option value="claude-opus-5" selected="">/g)).toHaveLength(2);
  });

  it("leads on the measured window, with its interval and its classes", () => {
    const text = render(WT, "max20", "claude-opus-5");
    expect(WINDOW.per_family!.opus.all.value).toBe(473_774_890);
    expect(text).toContain("474M tokens per 5-hour window");
    expect(text).toContain("Range 398M to 542M.");
    // One line of classes, the cache-read share as the block publishes it.
    expect(text).toContain("444M cache reads (96.1%) · 15M cache writes · 2.8M output · 6k fresh input");
    // One method sentence, dated by the stretches behind it.
    expect(text).toContain(
      "Method: median tokens per 1% of the five-hour meter over the pure-opus stretches of every watched account's passive stretch file, times 100, per token class.",
    );
    expect(text).toContain("Measured to 20 Sep 2026.");
    // The figures the page kept: the credits the window costs, its API value, the sessions it buys.
    expect(text).toContain("19,543,887 credits per 5-hour window");
    expect(text).toContain("$146.58 of API value per window");
    expect(text).toContain("about 354 sessions per window");
    // And the two it no longer states: the window's credits over a family's credits per token.
    expect(text).not.toContain("input tokens per 5-hour window");
    expect(text).not.toContain("output tokens per 5-hour window");
  });

  it("states the same window in the hero, the window section and the plan table", () => {
    for (const plan of ["pro", "max5", "max20"] as Plan[]) {
      const text = render(WT, plan, "claude-opus-5");
      const w = computeWindowTokens(WT, plan, "claude-opus-5")!;
      expect(text.split(`${w.perWindow!.text} tokens per 5-hour window`).length, plan).toBeGreaterThanOrEqual(3);
      expect(row(text, "Tokens per 5-hour window")[planIndex(plan)], plan).toBe(w.perWindow!.text);
    }
    // The plan ratios the rest of the page applies to a five-hour window, 1 : 6 : 20.
    expect(row(render(WT, "max20", "claude-opus-5"), "Tokens per 5-hour window")).toEqual(["24M", "142M", "474M"]);
  });

  it("converts the window for Sonnet, and says what the conversion rests on", () => {
    const text = render(WT, "max20", "claude-sonnet-5");
    expect(text).toContain("610M tokens per 5-hour window");
    expect(text).toContain("Range 380M to 967M.");
    expect(text).toContain(
      "Conversion: the measured Opus window converted at the meter's measured Sonnet rate, 0.6667 credits per input token over 0.5178",
    );
    // The classes were measured on Opus, so they are not restated at another family's rate.
    expect(text).not.toContain("cache reads (96.1%)");
    // The list-price window this page used to lead on for Sonnet, and the credits route's own.
    expect(text).not.toContain("1498M");
    expect(text).not.toContain("38M input tokens");
  });

  it("gives Fable its published status sentence and no number", () => {
    const text = render(WT, "max20", "claude-fable-5-1");
    expect(WINDOW.per_family!.fable.all.value).toBeNull();
    expect(text).toContain("tokens per 5-hour window: rate not yet identified");
    expect(text).toContain("tokens per week: rate not yet identified");
    // No interval, no conversion arithmetic, and no level on the chart.
    expect(text).not.toContain("134M");
    expect(text).not.toContain("Conversion:");
    expect(text).toContain("Not enough history yet.");
    // Every cell of the table's token rows carries the sentence, and none carries a number.
    // Fable is not on Pro at all, so that cell is the dash it has always been (finding 2, kept).
    expect(text).toContain("Tokens per 5-hour window \u2014 rate not yet identified rate not yet identified");
    expect(text).toContain("Tokens per week \u2014 rate not yet identified inferred rate not yet identified");
  });

  it("draws the per-week card and the per-week chart from the same figure, on every plan", () => {
    for (const plan of ["pro", "max5", "max20"] as Plan[]) {
      const text = render(WT, plan, "claude-opus-5");
      const w = computeWindowTokens(WT, plan, "claude-opus-5")!;
      const levels = weeklyTokenRegimeLevelsFor(WT, plan, "claude-opus-5");
      // The card is the published per-week figure on this plan's own windows per week; the
      // chart's newest level is that same window at the same count. They are one figure.
      expect(fmtTokens(levels.at(-1)!.tokens), plan).toBe(w.perWeek!.text);
      expect(text, plan).toContain(`${w.perWeek!.text} tokens per week`);
      expect(row(text, "Tokens per week")[planIndex(plan)], plan).toContain(w.perWeek!.text);
      // Every level is the same measured window, so the chart moves only where the limit did.
      const windows = weeklyRegimeLevelsFor(WT, plan).map((l) => l.windows);
      expect(levels.map((l) => Math.round(l.tokens)), plan).toEqual(
        windows.map((n) => Math.round(n * WINDOW.per_family!.opus.all.value! * WT.plan_ratios[plan])),
      );
    }
    expect(row(render(WT, "max20", "claude-opus-5"), "Tokens per week")).toEqual([
      "141M inferred",
      "1173M inferred",
      "2345M",
    ]);
  });

  it("reads no rate and no history row: emptying both leaves every figure standing", () => {
    // The two fields the page used to price a window with. Nothing reads them now, so a file
    // that publishes neither renders exactly the same figures (wf-60).
    const stripped: UsageJson = structuredClone(WT);
    stripped.history = {};
    for (const rate of Object.values(stripped.rates)) rate.tokens_per_window = null;
    const text = render(stripped, "max20", "claude-opus-5");
    expect(text).toContain("474M tokens per 5-hour window");
    expect(text).toContain("2345M tokens per week");
    expect(text).not.toContain("Data temporarily unavailable");
    expect(text).toBe(render(WT, "max20", "claude-opus-5"));
  });

  it("says so when the window is not published, and falls back to nothing", () => {
    const text = render(WITHOUT, "max20", "claude-opus-5");
    expect(text).toContain("tokens per 5-hour window: window tokens not yet published");
    expect(text).toContain("tokens per week: window tokens not yet published");
    // The chart has no level to draw, and the legacy route never stands in for one.
    expect(text).toContain("Not enough history yet.");
    expect(text).not.toMatch(/\d+M tokens per 5-hour window/);
    expect(text).not.toMatch(/\d+M tokens per week/);
    expect(text).not.toContain("Tokens per 5-hour window Pro");
    // Everything else the file publishes is unchanged, and nothing renders as a null.
    expect(text).toContain("19,543,887 credits per 5-hour window");
    expect(text).toContain("about 354 sessions per window");
    for (const model of Object.keys(WITHOUT.rates)) {
      for (const plan of ["pro", "max5", "max20"] as Plan[]) {
        expect(render(WITHOUT, plan, model), `${model} ${plan}`).not.toMatch(/\bnull\b|\bNaN\b|\bundefined\b/);
      }
    }
  });

  it("renders no null, NaN or undefined for any model or plan", () => {
    for (const model of Object.keys(WT.rates)) {
      for (const plan of ["pro", "max5", "max20"] as Plan[]) {
        expect(render(WT, plan, model), `${model} ${plan}`).not.toMatch(/\bnull\b|\bNaN\b|\bundefined\b/);
      }
    }
  });
});
