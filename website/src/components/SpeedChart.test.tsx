import { describe, expect, it } from "vitest";
import { renderToString } from "react-dom/server";
import SpeedChart, { placeEndLabels, speedTipLines } from "./SpeedChart";
import type { SpeedDay, SpeedSeries } from "@/lib/claudeUsage";

const dayOf = (day: string, median: number, n = 100): SpeedDay => ({
  day,
  n,
  output_tokens_per_s: { median, q1: median - 5, q3: median + 5 },
  time_to_first_block_s: null,
});
// A model's line: the given medians on consecutive October days, ending on the 20th.
const line = (model: string, medians: number[]): SpeedSeries => {
  const days = medians.map((m, i) => dayOf(`2026-10-${String(21 - medians.length + i).padStart(2, "0")}`, m));
  return { model, runs: [days], last: days[days.length - 1] };
};

// The live shape on 23 Oct: six lines bunched at 63-73 tok/s, Opus 5.5 at 94, Haiku 5.5 at 160.
const SERIES: SpeedSeries[] = [
  line("claude-haiku-5-5", [150, 160]),
  line("claude-sonnet-5-5", [110, 112]),
  line("claude-opus-5-5", [95, 94]),
  line("claude-haiku-4-5", [74, 73]),
  line("claude-fable-5-1", [71, 70]),
  line("claude-opus-5", [69, 70]),
  line("claude-sonnet-5", [70, 70]),
  line("claude-opus-4-7", [67, 68]),
  line("claude-opus-4-8", [64, 63]),
  line("claude-sonnet-4-6", [47, 46]),
];

describe("placeEndLabels", () => {
  it("leaves labels with room at their own lines' heights", () => {
    const m = placeEndLabels(
      [
        { key: "a", y: 30 },
        { key: "b", y: 90 },
      ],
      10,
      200,
      14,
    );
    expect([m.get("a"), m.get("b")]).toEqual([30, 90]);
  });

  it("spreads a bunch about its own lines, in their order, and keeps a pinned label at its line", () => {
    const items = [
      { key: "a", y: 100 },
      { key: "b", y: 102 },
      { key: "c", y: 104, pinned: true },
      { key: "d", y: 106 },
    ];
    const m = placeEndLabels(items, 0, 300, 14);
    expect(m.get("c")).toBe(104);
    const ys = items.map((it) => m.get(it.key)!);
    for (let i = 1; i < ys.length; i++) expect(ys[i] - ys[i - 1]).toBeCloseTo(14, 9);
  });

  it("keeps every label inside its bounds", () => {
    const m = placeEndLabels(
      [0, 1, 2, 3].map((k) => ({ key: String(k), y: 195 + k })),
      10,
      200,
      14,
    );
    for (const y of m.values()) {
      expect(y).toBeGreaterThanOrEqual(10);
      expect(y).toBeLessThanOrEqual(200);
    }
  });
});

describe("SpeedChart end labels (2026-10-23)", () => {
  const svg = renderToString(<SpeedChart series={SERIES} selectedModel="claude-opus-5-5" />);
  // Each model's last point (its leader's first point) and its label's baseline.
  const ends = Object.fromEntries(
    [...svg.matchAll(/data-leader="([^"]+)" points="[\d.]+,([\d.]+) [\d.]+,([\d.]+)/g)].map((m) => [m[1], { line: Number(m[2]), label: Number(m[3]) }]),
  );

  it("puts the selected model's label level with its own line's last value", () => {
    expect(ends["claude-opus-5-5"].label).toBeCloseTo(ends["claude-opus-5-5"].line, 6);
  });

  it("keeps whichever model is selected level with its own line, even inside a bunch at the edge (Codex, PR #139)", () => {
    for (const sel of SERIES.map((s) => s.model)) {
      const out = renderToString(<SpeedChart series={SERIES} selectedModel={sel} />);
      const m = out.match(new RegExp(`data-leader="${sel}" points="[\\d.]+,([\\d.]+) [\\d.]+,([\\d.]+)`))!;
      expect(Number(m[2]), sel).toBeCloseTo(Number(m[1]), 6);
      // Every label still has its own height, in its line's order.
      const all = [...out.matchAll(/data-leader="([^"]+)" points="[\d.]+,([\d.]+) [\d.]+,([\d.]+)/g)].map((x) => ({ line: Number(x[2]), label: Number(x[3]) }));
      // Lines at one height may take their labels in either order.
      const byLine = [...all].sort((a, b) => a.line - b.line || a.label - b.label).map((x) => x.label);
      for (let i = 1; i < byLine.length; i++) expect(byLine[i] - byLine[i - 1], sel).toBeGreaterThanOrEqual(14 - 1e-6);
    }
  });

  it("keeps the labels in their lines' top-to-bottom order, each joined to its own line by a leader", () => {
    const byLine = SERIES.map((s) => s.model).sort((a, b) => ends[a].line - ends[b].line);
    const byLabel = SERIES.map((s) => s.model).sort((a, b) => ends[a].label - ends[b].label);
    expect(byLabel).toEqual(byLine);
    for (const s of SERIES) expect(svg).toContain(`data-end-label="${s.model}"`);
    // The bunched labels sit near their lines, never pushed a whole bunch away.
    for (const s of SERIES) expect(Math.abs(ends[s.model].label - ends[s.model].line)).toBeLessThan(40);
  });

  it("emphasises the selected model's line, leader and label together", () => {
    const g = svg.slice(svg.indexOf('data-model="claude-opus-5-5"'));
    const group = g.slice(0, g.indexOf("</g>"));
    expect(group).toContain('stroke="#0EA5E9" stroke-width="3"');
    expect(group).toMatch(/data-leader="claude-opus-5-5"[^>]*stroke="#0EA5E9" stroke-width="1.5" stroke-dasharray="4 3"/);
    expect(group).toContain("fill:#0277B5;font-weight:700");
  });

  it("has a hover and tap target on every point, and no reading until one is touched", () => {
    const points = SERIES.reduce((n, s) => n + s.runs.flat().length, 0);
    expect((svg.match(/data-hit="/g) ?? []).length).toBe(points);
    expect(svg).not.toContain("data-tooltip");
  });

  it("reads the model, the day, the exact median and the day's requests", () => {
    expect(speedTipLines("claude-opus-5-5", { ...dayOf("2026-10-20", 94.12, 4407) })).toEqual([
      "Opus 5.5 · 20 Oct 2026",
      "94.1 tokens/s median · 4,407 requests",
    ]);
  });
});
