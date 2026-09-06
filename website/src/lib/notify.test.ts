import { describe, expect, it } from "vitest";
import { isValidEmail, normalizeEmail } from "./notify";

describe("normalizeEmail", () => {
  it("trims and lower-cases", () => {
    expect(normalizeEmail("  Jono@Example.COM \n")).toBe("jono@example.com");
  });
});

describe("isValidEmail", () => {
  it.each([
    "a@b.co",
    "jono@alldonesites.com",
    "first.last+tag@sub.domain.co.za",
    "  Mixed@Case.Com  ",
  ])("accepts %j", (e) => expect(isValidEmail(e)).toBe(true));

  it.each([
    "",
    "   ",
    "no-at-sign.com",
    "@example.com",
    "user@",
    "user@localhost",
    "user@example..com",
    "user name@example.com",
    "user@exam ple.com",
    "two@at@example.com",
    "user@example.com, other@example.com",
    "<user@example.com>",
    'quo"te@example.com',
  ])("rejects %j", (e) => expect(isValidEmail(e)).toBe(false));

  it("rejects an address over the 254-character forward-path limit", () => {
    expect(isValidEmail("a".repeat(250) + "@example.com")).toBe(false);
  });
});
