import { describe, expect, it } from "vitest";
import {
  accountKey,
  fourAccountChart,
  intervalText,
  panelDomain,
  pctTicks,
  seriesAt,
  sharedAt,
  signedPct,
  tickText,
  type FourAccountsBlock,
} from "./fourAccounts";
import type { UsageJson } from "./claudeUsage";
// The tracker's offline publish on 2026-10-23 from branch feat/four-account-detector: the first
// file with the `four_accounts` block (14 Sep windows per week -17.4%, 23 Sep weekly limit +18.3%,
// a provisional 9 Oct windows per week -9.2%).
import fourAccountsJson from "./__fixtures__/claude-usage-four-accounts.json";
// A file published before the detector: no block.
import live0928Json from "./__fixtures__/claude-usage-live-2026-09-28.json";

const fixture = fourAccountsJson as unknown as UsageJson;
const block = fixture.four_accounts as FourAccountsBlock;

describe("fourAccountChart", () => {
  it("draws nothing for a file without the block", () => {
    expect(fourAccountChart((live0928Json as unknown as UsageJson).four_accounts)).toBeNull();
    expect(fourAccountChart(null)).toBeNull();
    expect(fourAccountChart({ lines: {}, accounts: [] })).toBeNull();
  });

  it("stacks the two searched lines, seven-day first, each with every account", () => {
    const chart = fourAccountChart(block)!;
    expect(chart.panels.map((p) => p.line)).toEqual(["seven_day", "ratio"]);
    expect(chart.panels.map((p) => p.title)).toEqual(["Seven-day meter: credits per 1%", "Five-hour points per seven-day point"]);
    expect(chart.accounts).toEqual(["Max account 1", "Max account 2", "Max account 3", "Max account 4"]);
    for (const p of chart.panels) expect(p.series.map((s) => s.account)).toEqual(chart.accounts);
    // One time axis: from the first reading on either line to the day the run read up to.
    expect(new Date(chart.t0).toISOString().slice(0, 10)).toBe("2026-08-18");
    expect(new Date(chart.t1).toISOString()).toBe("2026-10-23T00:00:00.000Z");
  });

  it("marks each change on the line that found it, with its size and interval", () => {
    const [seven, ratio] = fourAccountChart(block)!.panels;
    expect(seven.changes.map((c) => [c.date, c.size, c.interval, c.provisional])).toEqual([
      ["23 Sep", "+18.3%", "11.5 to 25.6", false],
    ]);
    expect(ratio.changes.map((c) => [c.date, c.size, c.interval, c.provisional])).toEqual([
      ["14 Sep", "−17.4%", "−25.7 to −8.1", false],
      ["9 Oct", "−9.2%", "−16.2 to −1.6", true],
    ]);
    // The other line's changes are a faint guide only.
    expect(seven.guides.map((t) => new Date(t).toISOString().slice(0, 10))).toEqual(["2026-09-14", "2026-10-09"]);
    expect(ratio.guides.map((t) => new Date(t).toISOString().slice(0, 10))).toEqual(["2026-09-23"]);
    // The range the change could have happened in.
    const sep23 = seven.changes[0];
    expect(new Date(sep23.lo).toISOString()).toBe("2026-09-20T12:00:00.000Z");
    expect(new Date(sep23.hi).toISOString()).toBe("2026-09-29T16:00:00.000Z");
  });

  it("draws the shared step from the published levels, the provisional segment marked", () => {
    const [seven, ratio] = fourAccountChart(block)!.panels;
    expect(seven.shared.map((s) => s.v)).toEqual([0.8451, 0.8451, 1, 1]);
    expect(ratio.shared.map((s) => [s.v, s.provisional])).toEqual([
      [1.3332, false],
      [1.1015, false],
      [1.1015, false],
      [1, true],
    ]);
    const at = Date.parse("2026-09-20T00:00:00Z");
    expect(sharedAt(ratio.shared, at)).toBe(1.1015);
    expect(sharedAt(seven.shared, Date.parse("2026-10-20T00:00:00Z"))).toBe(1);
  });

  it("splits an account's line where a change splits a day and where it has no readings", () => {
    const ratio = fourAccountChart(block)!.panels[1];
    const a4 = ratio.series.find((s) => s.account === "Max account 4")!;
    // Max account 4's first day, 23 Sep, has a row either side of the 23 Sep 13:00 change.
    expect(a4.runs[0]).toHaveLength(1);
    expect(a4.runs[1][0].v).toBe(1.0844);
    // 24 Sep to 28 Sep is a four-day gap: not joined.
    expect(a4.runs[1].map((p) => new Date(p.t).toISOString().slice(0, 10))).toEqual(["2026-09-23", "2026-09-24"]);
    // Every daily level is a dot, pooled or not.
    expect(a4.dots).toHaveLength((block.lines!.ratio!["Max account 4"] ?? []).length);
    expect(seriesAt(a4, Date.parse("2026-09-24T12:00:00Z"))).toBe(1.0855);
    expect(seriesAt(a4, Date.parse("2026-09-26T12:00:00Z"))).toBeNull();
  });

  it("keeps the level now and the shared step inside each panel's range", () => {
    for (const p of fourAccountChart(block)!.panels) {
      const [lo, hi] = p.domain;
      expect(lo).toBeLessThan(1);
      expect(hi).toBeGreaterThan(1);
      for (const s of p.shared) {
        expect(s.v).toBeGreaterThan(lo);
        expect(s.v).toBeLessThan(hi);
      }
    }
    expect(panelDomain([], [])[0]).toBeLessThan(1);
  });

  it("never names an account by its raw label", () => {
    const chart = fourAccountChart(block)!;
    expect(JSON.stringify(chart.accounts)).not.toMatch(/"a\d"/);
    expect(accountKey("Max account 3")).toBe("a3");
  });
});

describe("four-account figures", () => {
  it("prints sizes and intervals to one decimal with a true minus", () => {
    expect(signedPct(18.3)).toBe("+18.3%");
    expect(signedPct(-9.2)).toBe("−9.2%");
    expect(intervalText([-25.7, -8.1])).toBe("−25.7 to −8.1");
    expect(intervalText(null)).toBeNull();
    expect(intervalText([1, null])).toBeNull();
  });

  it("ticks in round percent against now, never more than asked", () => {
    expect(tickText(1)).toBe("now");
    expect(tickText(1.2)).toBe("+20%");
    expect(tickText(0.6)).toBe("−40%");
    const ticks = pctTicks([0.55, 1.2], 5);
    expect(ticks.length).toBeLessThanOrEqual(5);
    expect(ticks).toContain(1);
    expect(pctTicks([0.55, 1.2], 3).length).toBeLessThanOrEqual(3);
  });
});
