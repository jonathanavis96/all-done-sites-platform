// Tracker ADR 0001 rule 22, amended 2026-10-23 (Jonathan's decision): a provisional change opens a
// provisional level on every chart it moves, and every figure read off that level says so. The
// fixture is the tracker branch's publish of the committed state of 2026-10-23: 9 Oct 16:00Z
// provisional, the 5-hour limit +15.3% and windows per week -9.2%, the week not moved.
import { describe, expect, it } from "vitest";
import {
  computeCredits,
  computeWindowTokens,
  onLevel,
  weeklyRegimeLevelsFor,
  weeklyTokenRegimeLevelsFor,
  windowTokenRegimeLevelsFor,
  type UsageJson,
} from "./claudeUsage";
import provisionalJson from "./__fixtures__/claude-usage-provisional-levels.json";

const PROV = provisionalJson as unknown as UsageJson;
const MODEL = "claude-opus-5-5";
const NINE = "2026-10-09T16:00:00+00:00";

// The same file once the change is measured: the same split, every flag false.
function measured(j: UsageJson): UsageJson {
  const copy = JSON.parse(JSON.stringify(j));
  const off = (rows: Record<string, unknown>[] | undefined) =>
    rows?.forEach((r) => {
      if ("provisional" in r) r.provisional = false;
      if ("windows_per_week_provisional" in r) r.windows_per_week_provisional = false;
    });
  const wt = copy.credits.window_tokens;
  off(wt.regimes);
  off(wt.per_week_regimes);
  off([wt, wt.per_week, copy.credits.window_credits, copy.weekly_windows.max20]);
  off(copy.weekly_windows.max20.regimes);
  return copy;
}

describe("provisional levels", () => {
  it("the window chart's level from 9 Oct is provisional, and the one before it is not", () => {
    const levels = windowTokenRegimeLevelsFor(PROV, "max20", MODEL);
    expect(levels.map((l) => [l.start, !!l.provisional]).slice(-2)).toEqual([
      ["2026-09-23T13:00:00+00:00", false],
      [NINE, true],
    ]);
    // +15.3% between them, the hero's figure.
    const [a, b] = levels.slice(-2);
    expect(Math.round((b.tokens / a.tokens - 1) * 1000) / 10).toBe(15.3);
  });

  it("the windows-per-week chart's level from 9 Oct is provisional; tokens per week is not moved there", () => {
    const wpw = weeklyRegimeLevelsFor(PROV, "max20");
    expect(wpw[wpw.length - 1]).toMatchObject({ start: NINE, provisional: true });
    expect(wpw.slice(0, -1).every((l) => !l.provisional)).toBe(true);
    const week = weeklyTokenRegimeLevelsFor(PROV, "max20", MODEL);
    expect(week.every((l) => !l.provisional)).toBe(true);
  });

  it("the hero's window and the plan table's figures are tagged provisional while the level is", () => {
    const w = computeWindowTokens(PROV, "max20", MODEL)!;
    expect(w.perWindow?.levelProvisional).toBe(true);
    expect(w.perWeek?.levelProvisional).toBe(true);
    expect(w.perClass.every((c) => c.fig.levelProvisional)).toBe(true);
    const c = computeCredits(PROV, "max20", MODEL)!;
    expect(c.usdIn?.levelProvisional).toBe(true);
    const m = computeWindowTokens(measured(PROV), "max20", MODEL)!;
    expect(m.perWindow?.levelProvisional).toBeUndefined();
    expect(m.perWeek?.levelProvisional).toBeUndefined();
    expect(computeCredits(measured(PROV), "max20", MODEL)!.usdIn?.levelProvisional).toBeUndefined();
    // Measured, the same split: the same levels, solid.
    expect(windowTokenRegimeLevelsFor(measured(PROV), "max20", MODEL).map((l) => [l.start, l.tokens])).toEqual(
      windowTokenRegimeLevelsFor(PROV, "max20", MODEL).map((l) => [l.start, l.tokens]),
    );
    expect(windowTokenRegimeLevelsFor(measured(PROV), "max20", MODEL).some((l) => l.provisional)).toBe(false);
  });

  it("never tags a status sentence", () => {
    expect(onLevel({ kind: "status", text: "no measured window", range: null }, true)).toEqual({
      kind: "status",
      text: "no measured window",
      range: null,
    });
  });
});
