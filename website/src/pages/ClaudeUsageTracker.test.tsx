import { describe, expect, it } from "vitest";
import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import ClaudeUsageTracker from "./ClaudeUsageTracker";
import { compute, fmtTokens, fmtUsd, weeklyTokenRegimeLevelsFor, weeklyRegimeLevelsFor, type Plan, type UsageJson } from "@/lib/claudeUsage";
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
    expect(row(text, "Tokens per week")[2]).not.toBe("—");
    expect(row(text, "API value per week")[2]).not.toBe("—");
  });

  it("shows Fable on Pro as not included, with no figures, and keeps the selectors to leave it (finding 2, kept)", () => {
    for (const j of [LIVE, MEASURED]) {
      const text = render(j, "pro", "claude-fable-5-1");
      expect(text).toContain(
        "On Pro Max 5x Max 20x , running Fable 5.1 Opus 5 Sonnet 5 at low medium high xhigh max effort Fable 5.1 is not included with Pro.",
      );
      expect(text).not.toMatch(/\d+[kM] tokens per 5-hour window/);
      expect(row(text, "Tokens per 5-hour window")[0]).toBe("—");
      expect(row(text, "API value per 5-hour window")[0]).toBe("—");
    }
  });

  it("gives Fable on Max the plan's weekly figure, qualified by the published 50% cap (finding 2, kept)", () => {
    const text = render(MEASURED, "max20", "claude-fable-5-1");
    const r = compute(MEASURED, "max20", "claude-fable-5-1", "high")!;
    expect(text).toContain(
      `A week currently holds about ${r.planWindowsPerWeek!.toFixed(1)} five-hour windows, measured from a real account. Fable 5.1 may use 50% of the weekly limit.`,
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

  it("draws Pro and Max 5x on both weekly charts, on both schemas", () => {
    for (const j of [LIVE, PUBLISHED]) {
      const html = renderHtml(j);
      const tokens = chartLevels(html, "Tokens per week over time");
      const weekly = chartLevels(html, "Five-hour windows per week over time");
      expect([...tokens.keys()]).toEqual(["Pro", "Max 5x", "Max 20x"]);
      expect([...weekly.keys()]).toEqual(["Max 5x and Pro", "Max 20x"]);
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
      const window = text.indexOf(" Effective window size, last ");
      const tokens = text.indexOf(" Tokens per week ", window);
      const weekly = text.indexOf(" Weekly limit, 5-hour windows per week ", tokens);
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
    const r = compute(pooled, "max20", "claude-sonnet-5", "high")!;
    const expectedTokens = fmtTokens(r.tokensPerWindow! * r.windowsPerWeek!);
    expect(weeklyTab).toContain(`tracker ${expectedTokens}`);
    expect(weeklyTab).not.toMatch(/tracker [^ ]+ inferred/);
    expect(weeklyTab).toContain("Two contributor IDs on Max 20x have shared meter readings.");
    expect(weeklyTab).not.toContain("9.4");
  });
});

// Tracker wf-50: the weekly chart shows the readings behind its levels, and the plan table and
// copy follow the credits-table ratios and the inferred marks.
describe("the weekly chart and plan table with tracker wf-50's fields", () => {
  const WF50 = withWf50(PUBLISHED);
  // The windows-per-week chart alone: its own svg, up to the next section.
  const weeklyChart = (html: string) => {
    const at = html.indexOf('aria-label="Five-hour windows per week over time');
    return html.slice(html.lastIndexOf("<svg", at), html.indexOf("</svg>", at));
  };

  it("draws only the documented reference beside the levels before the fields exist", () => {
    const chart = weeklyChart(renderHtml(PUBLISHED));
    expect(chart).toContain("documented 7.58 (she-llac, undated)");
    expect(chart).not.toContain("<title>");
    expect(chart).not.toContain("min-width");
    const text = render(PUBLISHED);
    expect(text).toContain("Documented: the level she-llac.com/claude-limits lists");
    expect(text).not.toContain("Reading: one five-hour window");
    expect(text).toContain("by Anthropic's published 1:5:20 ratios");
    expect(text).toContain("Pro assumes the Max 5x ratio until it is measured.");
    expect(text).toContain("scaled from Max 20x by Anthropic's published plan ratios.");
  });

  it("names the selected plan's documented level", () => {
    expect(weeklyChart(renderHtml(PUBLISHED, "max5"))).toContain("documented 12.63 (she-llac, undated)");
    expect(weeklyChart(renderHtml(PUBLISHED, "pro"))).toContain("documented 9.09 (she-llac, undated)");
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

  it("ticks each account's onset when the accounts disagree, and says the range", () => {
    const chart = weeklyChart(renderHtml(WF50));
    expect(chart).toContain("Account a1: step on 13 Sep 2026, 6.5 to 4.7 (-28%). Onset across 2 accounts: 13 Sep 2026 to 14 Sep 2026.");
    expect(chart).toContain("Account a2: step on 14 Sep 2026");
    const agreed = structuredClone(WF50);
    agreed.weekly_windows!.max20!.by_account!.a2!.step!.onset = "2026-09-13";
    expect(weeklyChart(renderHtml(agreed))).not.toContain("Onset across");
  });

  it("adds reading and weekly to the legend and keeps what was there", () => {
    const text = render(WF50);
    expect(text).toContain("Each line is the limit itself, held flat between changes");
    expect(text).toContain("Reading: one five-hour window on one account");
    expect(text).toContain("Weekly: a calendar week of readings pooled");
    expect(text).toContain("Documented: the level she-llac.com/claude-limits lists");
  });

  it("scales the table by the credits table and marks the inferred weekly cells", () => {
    const text = render(WF50);
    const max20 = compute(WF50, "max20", "claude-sonnet-5", "high")!;
    expect(row(text, "Tokens per 5-hour window")).toEqual([
      fmtTokens(max20.tokensPerWindow! * 0.05),
      fmtTokens(max20.tokensPerWindow! * 0.3),
      fmtTokens(max20.tokensPerWindow!),
    ]);
    const weekly = row(text, "Tokens per week");
    expect(weekly[0]).toMatch(/ inferred$/);
    expect(weekly[1]).toMatch(/ inferred$/);
    expect(weekly[2]).not.toContain("inferred");
    expect(row(text, "Tokens per 5-hour window").join(" ")).not.toContain("inferred");
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

  it("leads on the window in credits and the tokens that window holds", () => {
    const text = render(CREDITS, "max20", "claude-opus-5");
    expect(text).toContain("29M input tokens per 5-hour window");
    expect(text).toContain("Range 26M to 31M.");
    expect(text).toContain("5.9M output tokens per 5-hour window (5.2M to 6.2M)");
    expect(text).toContain("$146.58 of API value per window in input tokens");
    expect(text).toContain("19,543,887 credits per 5-hour window (17,250,018 to 20,819,693), n=11, pure-opus stretches, on 2 accounts.");
    expect(text).toContain("about 354 sessions per window (312 to 377)");
    expect(text).toContain("1,755 per week (1,549 to 1,870)");
    // The sessions figures are cache-normalised, so the split they assume is beside them.
    expect(text).toContain("0.01% input · 0.4% output · 97.0% cache read · 2.5% cache write");
    expect(text).toContain("Split: history/passive.json `split`, the watched accounts' own token-class shares.");
  });

  it("prints a status sentence in the figure's place, and never a null", () => {
    const text = render(CREDITS, "max20", "claude-fable-5-1");
    expect(text).toContain("input tokens per 5-hour window: rate not yet identified (7.3M to 17M)");
    expect(text).toContain("output tokens per 5-hour window: rate not yet identified (1.5M to 5.8M)");
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
    expect(render(CREDITS, "pro", "claude-opus-5")).toContain("1.5M input tokens per 5-hour window");
    expect(render(CREDITS, "max5", "claude-opus-5")).toContain("8.8M input tokens per 5-hour window");
  });

  it("counts the accounts instead of saying a real account", () => {
    expect(CREDITS.passive_account_count).toBe(3);
    const text = render(CREDITS, "max20", "claude-opus-5");
    expect(text).toContain("five-hour windows, measured from 3 accounts since the change");
    expect(text).not.toContain("measured from a real account");
    expect(text).not.toContain("measured from real accounts");
  });

  it("puts each effort cell's cache state beside it", () => {
    const text = render(CREDITS, "max20", "claude-sonnet-5");
    const mix = CREDITS.credits!.effort_cache_mix!["claude-sonnet-5"]!;
    // The Sonnet row inverts -- low reads dearer than medium -- and the share is what explains it.
    expect(mix.low!.cache_read_share!).toBeGreaterThan(mix.medium!.cache_read_share!);
    expect(text).toContain("$0.02 91.5% cache read · 7 runs");
    expect(text).toContain("$0.03 80.4% cache read · 7 runs");
    expect(text).toContain("$0.22 61.0% cache read · 7 runs");
  });

  it("states what the plan ratios rest on, and that the source is undated", () => {
    const text = render(CREDITS, "max20", "claude-opus-5");
    expect(text).toContain("Basis: credits_table.");
    expect(text).toContain("Credits per five-hour window, Pro : Max 5x : Max 20x: 550,000 : 3,300,000 : 11,000,000.");
    expect(text).toContain("Credits per week: 5,000,000 : 41,666,700 : 83,333,300.");
    expect(text).toContain("Measured confirmation: Max 5x over Max 20x 1.66, Max 5x Jun-Aug over Max 20x 19 Aug-11 Sep.");
    expect(text).toContain("The source is undated: she-llac.com/claude-limits");
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
      "Unresolved: the accounts differ from each other by 46.8% after the change, more than the largest per-account move across it (12.8%), so the five-hour and weekly meters cannot be separated from these stretches.",
    );
  });

  it("shows the announced-cap cross-check beside the measured window, with the reference dated", () => {
    const text = render(CREDITS, "max20", "claude-opus-5");
    expect(text).toContain("Cross-check against the announced caps");
    expect(text).toContain("Before the change 83,333,300 × 1.5 = 124,999,950 ÷ 6.48 windows 19,290,116");
    expect(text).toContain("After the change 83,333,300 × 1.25 = 104,166,625 ÷ 4.96 windows 21,001,336");
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
    expect(text).toContain("Fable 5.1's credit rate: interval, not yet separable, 1.1935 to 2.3631 credits per input token.");
  });

  it("renders a file with no credits block exactly as it does today", () => {
    const text = render(WITHOUT, "max20", "claude-opus-5");
    expect(text).toContain("Anthropic last decreased Claude's weekly limit by 24% on 11 Sep 2026.");
    expect(text).toContain("589M tokens per 5-hour window");
    expect(text).toContain("five-hour windows, measured from a real account since the change");
    for (const gone of [
      "credits per 5-hour window",
      "The five-hour window across the change",
      "Cross-check against the announced caps",
      "cache read · 7 runs",
      "Basis: credits_table.",
      "harness runs are excluded",
      "Five-hour windows per week: 6.5",
    ]) {
      expect(text, gone).not.toContain(gone);
    }
    // Every other published file keeps its own wording too.
    expect(render(PUBLISHED)).toContain("measured from a real account");
  });
});
