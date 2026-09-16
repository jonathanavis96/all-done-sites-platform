import { describe, expect, it } from "vitest";
import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import ClaudeUsageTracker from "./ClaudeUsageTracker";
import type { Plan, UsageJson } from "@/lib/claudeUsage";
import type { ContribMetric } from "@/lib/contrib";
// Schema 1: the published file as of 4401911 (generated 2026-09-16T16:30Z), what the live page
// renders until the collector change merges. Schema 2: tracker PR #57's offline rebuild from the
// same inputs, in which max20's weekly figure is unavailable until passive.json is re-paired.
import schema1 from "@/lib/__fixtures__/claude-usage-schema1.json";
import schema2 from "@/lib/__fixtures__/claude-usage-schema2.json";

function render(j: UsageJson, plan: Plan = "max20", model = "claude-sonnet-5", now?: number, contribMetric?: ContribMetric): string {
  const html = renderToString(
    <HelmetProvider context={{}}>
      <MemoryRouter>
        <ClaudeUsageTracker initial={j} initialPlan={plan} initialModel={model} now={now} initialContribMetric={contribMetric} />
      </MemoryRouter>
    </HelmetProvider>,
  );
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

// The cells of one plan-comparison row, in Pro, Max 5x, Max 20x order.
function row(text: string, label: string): string[] {
  const table = text.slice(text.indexOf(" Plan comparison "), text.indexOf(" Contribute your own meter "));
  const after = table.split(` ${label} `)[1];
  return after.trim().split(" ").slice(0, 3);
}

const LIVE = schema1 as unknown as UsageJson;
const REBUILT = schema2 as unknown as UsageJson;

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
  it("renders the live schema 1 file with its dollar figure under the meter budget's name (findings 1, 4, 6, 11)", () => {
    const text = render(LIVE);
    expect(text).not.toContain("Data temporarily unavailable");
    // Headline: an observed ratio on the account, not an Anthropic limit change.
    expect(text).toContain("Claude's observed weekly-to-window ratio decreased by 29% on 14 Sep 2026.");
    expect(text).not.toMatch(/Anthropic (last|hasn't|increased|decreased|cut)/);
    // The only dollar field schema 1 has is the meter budget; its API list value is not published.
    expect(text).toContain("$126 meter budget per 5-hour window");
    expect(text).toContain("API list value not published");
    expect(text).not.toContain("of API value");
    expect(row(text, "Meter budget per 5-hour window")).toEqual(["$6", "$31", "$126"]);
    expect(row(text, "API list value per 5-hour window")).toEqual(["—", "—", "—"]);
    // Tokens on the reference mix, and no session count.
    expect(text).toContain("1286M tokens per 5-hour window on the reference mix");
    expect(text).not.toMatch(/\d sessions|sessions per/i);
    // Max 20x's own weekly figure, the same in the sentence, the chart and the table; Max 5x's
    // frozen 11.02 and Pro's copy of it are not current anywhere.
    expect(text).toContain("A week currently holds about 4.6 five-hour windows, measured from a real account.");
    expect(text).toContain("4.6 five-hour windows per week");
    expect(text).not.toContain("11.0 five-hour");
    expect(row(text, "Tokens per week").slice(0, 2)).toEqual(["—", "—"]);
    expect(row(text, "Tokens per week")[2]).toBe("5929M");
    // Pro's assumed copy of Max 5x draws no line; Max 5x keeps its own history.
    expect(text).not.toContain("Max 5x and Pro");
    expect(text).toContain("Source: the account's own meter, newest reading 16 Sep");
    // The contributor section has no windows-per-week tab (finding 7), and counts IDs (finding 14).
    expect(text).toContain("Cost per 1% Effective window size Tokens per week Pro Max 5x Max 20x");
    expect(text).toContain("Two contributor IDs on Max 20x have shared meter readings.");
    expect(text).toContain("$0.90 of meter budget per 1% of the five-hour meter");
  });

  it("renders the rebuilt schema 2 file with both dollar figures and no weekly figure it does not have (findings 1, 6, 13, 16)", () => {
    const text = render(REBUILT);
    expect(text).not.toContain("Data temporarily unavailable");
    expect(text).toContain("No change in Claude's limits detected since 5 Sep 2026.");
    expect(text).toContain("1176M tokens per 5-hour window on the reference mix");
    expect(text).toContain("$115 meter budget per 5-hour window");
    expect(text).toContain("$343 of API list value per 5-hour window");
    expect(text).toContain("Source: the account's own meter, newest reading 16 Sep, conditional");
    expect(text).not.toContain("A week currently holds");
    expect(row(text, "API list value per week")).toEqual(["—", "—", "—"]);
    expect(row(text, "Tokens per week")).toEqual(["—", "—", "—"]);
    expect(text).not.toMatch(/\d sessions|sessions per/i);
    expect(text).toContain("There is no cost figure to show yet.");
  });

  it("draws a measured schema 2 weekly estimate as one value in the sentence, the rate line and the table", () => {
    const text = render(MEASURED);
    expect(text).toContain("A week currently holds about 6.1 five-hour windows, measured from a real account.");
    expect(text).toContain("6.1 five-hour windows per week");
    expect(row(text, "Tokens per week")).toEqual(["—", "—", "7207M"]);
    expect(row(text, "API list value per week")).toEqual(["—", "—", "$2,105"]);
    expect(text).toContain("$2,105 per week");
  });

  it("shows Fable on Pro as not included, with no figures, and keeps the selectors to leave it (finding 2)", () => {
    for (const j of [LIVE, MEASURED]) {
      const text = render(j, "pro", "claude-fable-5-1");
      expect(text).toContain("On Pro Max 5x Max 20x , running Fable 5.1 Opus 5 Sonnet 5 Fable 5.1 is not included with Pro.");
      expect(text).not.toContain("tokens per 5-hour window on the reference mix");
      expect(text).not.toContain("meter budget per 5-hour window");
      expect(row(text, "Tokens per 5-hour window")[0]).toBe("—");
      expect(row(text, "Meter budget per 5-hour window")[0]).toBe("—");
    }
  });

  it("gives Fable on Max the plan's weekly figure, qualified by the published 50% cap, and half the week's tokens (finding 2)", () => {
    const text = render(MEASURED, "max20", "claude-fable-5-1");
    expect(text).toContain(
      "A week currently holds about 6.1 five-hour windows, measured from a real account. Fable 5.1 may use 50% of the weekly limit.",
    );
    expect(text).toContain("6.1 five-hour windows per week");
    // 235,146,113 tokens a window x 6.13 x 0.5.
    expect(row(text, "Tokens per week")).toEqual(["—", "—", "721M"]);
  });

  it("marks the selected model stale by its own evidence, and dates the line by that same evidence (finding 16)", () => {
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

  it("captions no contributor chart with a pooled windows-per-week figure, even when schema 1 publishes one (findings 7, 14)", () => {
    // The review's case: contributed.max20.weekly_windows.measured is a number, and the tab that
    // used to carry its sentence now plots tokens per week.
    const pooled: UsageJson = structuredClone(LIVE);
    pooled.contributed!.max20!.weekly_windows.measured = 9.4;
    const weeklyTab = render(pooled, "max20", "claude-sonnet-5", undefined, "weekly");
    // The tokens-per-week tab is the one open: its dashed line is the tracker's tokens per week, and
    // neither live reading carries a per-model weekly figure to plot.
    expect(weeklyTab).toContain("tracker 5929M");
    expect(weeklyTab).toContain("No contributed reading carries this figure yet");
    for (const text of [weeklyTab, render(pooled), render(pooled, "max20", "claude-sonnet-5", undefined, "window")]) {
      expect(text).toContain("Two contributor IDs on Max 20x have shared meter readings.");
      expect(text).not.toContain("windows of use per week");
      expect(text).not.toContain("9.4");
    }
    // Nor as a lone sentence when the plan has no points to chart.
    delete pooled.contributed!.max20!.points;
    const noChart = render(pooled);
    expect(noChart).toContain("$0.90 of meter budget per 1% of the five-hour meter");
    expect(noChart).not.toContain("windows of use per week");
  });

  it("says the data is unavailable when schema 2 publishes no eligible measurement, rather than substituting one (finding 13)", () => {
    const none: UsageJson = structuredClone(REBUILT);
    for (const rate of Object.values(none.rates)) {
      Object.assign(rate, { tokens_per_window: null, meter_budget_per_window: null, api_value_per_window: null, api_list_value_per_window: null, source: "unavailable" });
    }
    const text = render(none);
    expect(text).toContain("Data temporarily unavailable.");
    expect(text).not.toContain("meter budget per 5-hour window");
  });
});
