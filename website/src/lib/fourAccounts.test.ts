import { describe, expect, it } from "vitest";
import {
  accountKey,
  accountsHeading,
  fourAccountChart,
  intervalText,
  offScale,
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
    expect(seven.changes.map((c) => [c.date, c.size, c.interval, c.state, c.unconfirmed, c.found])).toEqual([
      ["23 Sep", "+18.3%", "+11.5 to +25.6%", "measured", false, true],
    ]);
    expect(ratio.changes.map((c) => [c.date, c.size, c.interval, c.state, c.unconfirmed, c.found])).toEqual([
      ["14 Sep", "−17.4%", "−25.7 to −8.1%", "measured", false, true],
      ["9 Oct", "−9.2%", "−16.2 to −1.6%", "provisional", true, true],
    ]);
    // The other line's changes are a faint guide only.
    expect(seven.guides.map((t) => new Date(t).toISOString().slice(0, 10))).toEqual(["2026-09-14", "2026-10-09"]);
    expect(ratio.guides.map((t) => new Date(t).toISOString().slice(0, 10))).toEqual(["2026-09-23"]);
    // The range the change could have happened in.
    const sep23 = seven.changes[0];
    expect(new Date(sep23.lo).toISOString()).toBe("2026-09-20T12:00:00.000Z");
    expect(new Date(sep23.hi).toISOString()).toBe("2026-09-29T16:00:00.000Z");
  });

  it("states the model rates' range beside a size the rates limit, and only there", () => {
    const [seven, ratio] = fourAccountChart(block)!.panels;
    // 23 Sep on the seven-day line: rate_limited, its interval with the rates −5.2 to +47.8.
    expect(seven.changes[0].ratesInterval).toBe("−5.2 to +47.8%");
    expect(ratio.changes.map((c) => c.ratesInterval)).toEqual([null, null]);
  });

  it("draws the shared step from the published levels, a step not yet measured dashed", () => {
    const [seven, ratio] = fourAccountChart(block)!.panels;
    expect(seven.shared.map((s) => s.v)).toEqual([0.8451, 0.8451, 1, 1]);
    // The 9 Oct change opened a seven-day segment without moving the line: not a dashed step.
    expect(seven.shared.map((s) => s.unconfirmed)).toEqual([false, false, false, false]);
    expect(ratio.shared.map((s) => [s.v, s.unconfirmed])).toEqual([
      [1.3332, false],
      [1.1015, false],
      [1.1015, false],
      [1, true],
    ]);
    const at = Date.parse("2026-09-20T00:00:00Z");
    expect(sharedAt(ratio.shared, at)).toBe(1.1015);
    expect(sharedAt(seven.shared, Date.parse("2026-10-20T00:00:00Z"))).toBe(1);
  });

  it("draws a candidate change as not yet measured, labelled with its own state", () => {
    const probe = JSON.parse(JSON.stringify(block)) as FourAccountsBlock;
    probe.changes!.find((c) => c.at.startsWith("2026-10-09"))!.state = "candidate";
    for (const ls of Object.values(probe.levels!)) for (const l of ls!) if (l.opened_by === "provisional") l.opened_by = "candidate";
    const [seven, ratio] = fourAccountChart(probe)!.panels;
    const oct9 = ratio.changes.find((c) => c.date === "9 Oct")!;
    expect([oct9.state, oct9.unconfirmed]).toEqual(["candidate", true]);
    expect(ratio.shared.map((s) => [s.state, s.unconfirmed])).toEqual([
      [null, false],
      ["measured", false],
      ["measured", false],
      ["candidate", true],
    ]);
    expect(seven.shared.some((s) => s.unconfirmed)).toBe(false);
  });

  it("labels a step on the line that did not find the change with that line's own figure", () => {
    // Make the 23 Sep seven-day change move the ratio too: the ratio's shared level steps there.
    const probe = JSON.parse(JSON.stringify(block)) as FourAccountsBlock;
    const ratioLevels = probe.levels!.ratio!;
    ratioLevels[1].index = 1.1309; // before 23 Sep: 1.1015 / (1 - 0.026)
    ratioLevels[0].index = 1.3687;
    const [seven, ratio] = fourAccountChart(probe)!.panels;
    const sep23 = ratio.changes.find((c) => c.date === "23 Sep")!;
    expect([sep23.size, sep23.interval, sep23.found]).toEqual(["−2.6%", "−12.5 to +8.4%", false]);
    expect(ratio.guides.map((t) => new Date(t).toISOString().slice(0, 10))).toEqual([]);
    // The seven-day line did not step on 14 Sep or 9 Oct: guides there, still.
    expect(seven.guides.map((t) => new Date(t).toISOString().slice(0, 10))).toEqual(["2026-09-14", "2026-10-09"]);
  });

  it("finds where an account's line runs off the panel's range", () => {
    const seven = fourAccountChart(block)!.panels[0];
    const a1 = seven.series.find((s) => s.account === "Max account 1")!;
    const off = offScale(a1, seven.domain);
    for (const o of off) expect(o.t1).toBeGreaterThanOrEqual(o.t0);
    const below = a1.runs.flat().filter((p) => p.v < seven.domain[0]);
    expect(below.length > 0).toBe(off.some((o) => o.side === "below"));
    expect(offScale({ account: "x", runs: [[{ t: 0, v: 0.1 }, { t: 1, v: 0.2 }, { t: 2, v: 1 }, { t: 3, v: 9 }]], dots: [] }, [0.5, 2])).toEqual([
      { t0: 0, t1: 1, side: "below" },
      { t0: 3, t1: 3, side: "above" },
    ]);
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
    expect(intervalText([-25.7, -8.1])).toBe("−25.7 to −8.1%");
    expect(intervalText([11.5, 25.6])).toBe("+11.5 to +25.6%");
    expect(intervalText(null)).toBeNull();
    expect(intervalText([1, null])).toBeNull();
  });

  it("counts the accounts in the section's heading", () => {
    expect(accountsHeading(4)).toBe("Limit changes on four Max accounts");
    expect(accountsHeading(3)).toBe("Limit changes on three Max accounts");
    expect(accountsHeading(1)).toBe("Limit changes on one Max account");
    expect(accountsHeading(12)).toBe("Limit changes on 12 Max accounts");
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
