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
