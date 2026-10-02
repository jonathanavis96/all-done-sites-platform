import { describe, expect, it } from "vitest";
import { convert, findPrices, roundApprox } from "./currency";

describe("findPrices", () => {
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
