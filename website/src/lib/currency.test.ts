import { describe, expect, it } from "vitest";
import { convert, findPrices, roundApprox } from "./currency";

describe("findPrices", () => {
  it("reads an unseparated amount of four or more digits whole", () => {
    expect(findPrices("R2000, R15000, $1500 and ZAR 12000").map((p) => [p.text, p.amount])).toEqual([
      ["R2000", 2000],
      ["R15000", 15000],
      ["$1500", 1500],
      ["ZAR 12000", 12000],
    ]);
  });

  it("still reads the short and separated forms", () => {
    expect(findPrices("R800, R2 000, R2,000, R1,200.50 and R12 500").map((p) => p.amount)).toEqual([
      800, 2000, 2000, 1200.5, 12500,
    ]);
  });

  it("reads rand, symbols and codes", () => {
    expect(findPrices("R800, $45 and ZAR 1,200").map((p) => [p.currency, p.amount])).toEqual([
      ["ZAR", 800],
      ["USD", 45],
      ["ZAR", 1200],
    ]);
  });

  it("does not read an R inside a word as rand", () => {
    expect(findPrices("an HDR10 screen and a PR2 badge")).toEqual([]);
  });
});

describe("roundApprox", () => {
  it("never rounds a real price to nothing", () => {
    expect(roundApprox(0.3)).toBe(1);
    expect(roundApprox(1340)).toBe(1300);
  });
});

describe("convert", () => {
  it("converts through USD", () => {
    expect(convert(180, "ZAR", "GBP", { ZAR: 18, GBP: 0.8 })).toBeCloseTo(8, 5);
  });

  it("refuses a malformed rate rather than printing a nonsense price", () => {
    const bad = { ZAR: -18, GBP: "0.8" as unknown as number, EUR: Infinity };
    expect(convert(100, "ZAR", "USD", bad)).toBeNull();
    expect(convert(100, "USD", "GBP", bad)).toBeNull();
    expect(convert(100, "USD", "EUR", bad)).toBeNull();
  });
});
