import { describe, expect, it } from "vitest";
import { placeMarkerLabels, type MarkerLabelSlot } from "./markerLabels";

// The pairing rules every layout keeps where the band has room: each label just beside its own
// line, off every other label on its row, in its markers' order, and never across a leader that
// reaches its row (Jonathan, 2026-10-23).
function expectPaired(marks: { x: number; w: number }[], slots: MarkerLabelSlot[], left: number, right: number) {
  marks.forEach((m, i) => {
    const s = slots[i];
    expect(s.lo).toBeGreaterThanOrEqual(left);
    expect(s.hi).toBeLessThanOrEqual(right);
    expect(s.hi - s.lo).toBeCloseTo(m.w, 9);
    expect(s.anchor === "start" ? s.lo - m.x : m.x - s.hi).toBeCloseTo(6, 9);
    expect(s.tx).toBe(s.anchor === "start" ? s.lo : s.hi);
  });
  for (let i = 0; i < marks.length; i++)
    for (let j = 0; j < marks.length; j++) {
      if (i === j) continue;
      const [a, b] = [slots[i], slots[j]];
      if (a.row === b.row) expect(a.hi <= b.lo || b.hi <= a.lo).toBe(true);
      // j's leader reaches a's row: a's label must not cross it.
      if (b.row >= a.row) expect(a.lo < marks[j].x && marks[j].x < a.hi).toBe(false);
      if (marks[i].x < marks[j].x) {
        expect(a.lo).toBeLessThanOrEqual(b.lo);
        expect(a.hi).toBeLessThanOrEqual(b.hi);
      }
    }
}

describe("placeMarkerLabels", () => {
  it("returns nothing for no markers", () => {
    expect(placeMarkerLabels([], 0, 100)).toEqual([]);
  });

  it("puts a lone label to the right of its line, or to its left where the right has no room", () => {
    expect(placeMarkerLabels([{ x: 100, w: 50 }], 0, 400)).toEqual([{ anchor: "start", lo: 106, hi: 156, tx: 106, row: 0 }]);
    expect(placeMarkerLabels([{ x: 380, w: 50 }], 0, 400)).toEqual([{ anchor: "end", lo: 324, hi: 374, tx: 374, row: 0 }]);
  });

  it("turns two close labels to the outer sides of their lines before lifting one a row", () => {
    const marks = [
      { x: 200, w: 90 },
      { x: 230, w: 90 },
    ];
    const slots = placeMarkerLabels(marks, 0, 600);
    expectPaired(marks, slots, 0, 600);
    expect(slots.map((s) => [s.anchor, s.row])).toEqual([
      ["end", 0],
      ["start", 0],
    ]);
  });

  it("stacks labels only where neither side will do, keeping every pairing", () => {
    // Against the left edge: the earlier label cannot turn left, so the two take two rows.
    const marks = [
      { x: 10, w: 90 },
      { x: 40, w: 90 },
    ];
    const slots = placeMarkerLabels(marks, 0, 600);
    expectPaired(marks, slots, 0, 600);
    expect(new Set(slots.map((s) => s.row)).size).toBe(2);
  });

  it("never overlaps two labels or runs a leader through one, across many marker sets", () => {
    let seed = 7;
    const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    let crossed = 0;
    for (let k = 0; k < 300; k++) {
      const n = 1 + Math.floor(rand() * 4);
      const marks = Array.from({ length: n }, () => ({ x: 60 + rand() * 600, w: 40 + rand() * 100 }));
      const slots = placeMarkerLabels(marks, 0, 840);
      marks.forEach((m, i) => {
        const s = slots[i];
        expect(s.lo).toBeGreaterThanOrEqual(0);
        expect(s.hi).toBeLessThanOrEqual(840);
        expect(s.anchor === "start" ? s.lo - m.x : m.x - s.hi).toBeCloseTo(6, 9);
        marks.forEach((o, j) => {
          if (i === j) return;
          if (slots[j].row === s.row) expect(s.hi <= slots[j].lo || slots[j].hi <= s.lo).toBe(true);
          if (slots[j].row >= s.row && s.lo < o.x && o.x < s.hi) crossed++;
        });
      });
    }
    // A leader through a label is the last resort for a band too crowded for anything else.
    expect(crossed).toBe(0);
  });
});

describe("placeMarkerLabels past the search limit (Codex, PR #139)", () => {
  it("keeps every leader out of every label with six close markers", () => {
    const marks = [500, 540, 580, 620, 660, 700].map((x) => ({ x, w: 50 }));
    const slots = placeMarkerLabels(marks, 0, 732);
    marks.forEach((_, i) =>
      marks.forEach((o, j) => {
        if (i === j) return;
        if (slots[j].row === slots[i].row) expect(slots[i].hi <= slots[j].lo || slots[j].hi <= slots[i].lo).toBe(true);
        if (slots[j].row >= slots[i].row) expect(slots[i].lo < o.x && o.x < slots[i].hi, `label ${i} across leader ${j}`).toBe(false);
      }),
    );
  });
});
