import { describe, expect, it } from "vitest";
import { CONTINUOUS_PROMPT, DEFAULT_INTERVAL_MINUTES, INTERVALS, continuousPrompt } from "./contribPrompts";

describe("continuousPrompt", () => {
  it("defaults to the hourly schedule", () => {
    expect(DEFAULT_INTERVAL_MINUTES).toBe(60);
    expect(CONTINUOUS_PROMPT).toContain("install the hourly schedule from the README");
    expect(continuousPrompt()).toBe(CONTINUOUS_PROMPT);
  });
  it("names the chosen interval and keeps the approve gate", () => {
    for (const i of INTERVALS) {
      const p = continuousPrompt(i.minutes);
      expect(p).toContain(`install the ${i.phrase} schedule`);
      expect(p).toContain("Do not send anything and do not install anything until I type `approve`");
    }
    expect(continuousPrompt(45)).toContain("install the 45-minute schedule");
  });
});
