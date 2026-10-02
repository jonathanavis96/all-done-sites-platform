import { describe, expect, it } from "vitest";
import { signToken, verifyToken } from "./_lib";

describe("link tokens", () => {
  it("round-trip a non-ASCII address and bind the action", async () => {
    const t = await signToken("s", "unsub", "ü@example.com");
    expect(await verifyToken("s", "unsub", t)).toBe("ü@example.com");
    expect(await verifyToken("s", "confirm", t)).toBeNull();
    expect(await verifyToken("other", "unsub", t)).toBeNull();
  });

  it("refuse malformed tokens", async () => {
    for (const bad of [null, "", "abc", "a.b.c", ".sig", "x".repeat(3000)]) {
      expect(await verifyToken("s", "unsub", bad)).toBeNull();
    }
  });
});
