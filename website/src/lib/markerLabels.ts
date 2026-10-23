// Where a change marker's label goes in the band above a chart's plot, shared by the plan charts
// and the four-account chart. Each marker's dashed line runs up out of the plot to its own label's
// row (a leader), and the label sits just beside it: to its right or to its left. So a label is
// attached to the line that reaches it, never floating above another one.
//
// The rules that keep each pairing unambiguous (Jonathan, 2026-10-23: "+20% on 23 Sep" and
// "+15% on 9 Oct (provisional)" stacked so it was hard to tell which belonged to which line):
//  - two labels on one row never overlap;
//  - a leader never runs through a label: a label is never drawn across the x of a marker whose
//    leader reaches its row;
//  - labels keep their markers' left-to-right order, so two never cross;
//  - as few rows as will do, so two close lines take labels on their outer sides before one is
//    lifted above the other; then as many labels to the right of their line as will do.
// Where no layout meets all of them (a band too crowded), the order rule goes first, then the
// leader rule, keeping only the labels apart.

export interface MarkerLabelSlot {
  anchor: "start" | "end";
  lo: number;
  hi: number;
  // The text's anchor point: `lo` for a start-anchored label, `hi` for an end-anchored one.
  tx: number;
  // 0 is the row next to the plot; each higher row sits one row further up.
  row: number;
}

const LEADER_MARGIN_PX = 3;
// Past this many markers the search would take too long; the band is laid out greedily instead.
const SEARCH_LIMIT = 5;

export function placeMarkerLabels(
  marks: { x: number; w: number }[],
  left: number,
  right: number,
  { pad = 6, gap = 0 }: { pad?: number; gap?: number } = {},
): MarkerLabelSlot[] {
  const n = marks.length;
  if (n === 0) return [];
  const slotOf = (i: number, anchor: "start" | "end", row: number): MarkerLabelSlot => {
    const { x, w } = marks[i];
    const [lo, hi] = anchor === "end" ? [x - pad - w, x - pad] : [x + pad, x + pad + w];
    return { anchor, lo, hi, tx: anchor === "end" ? hi : lo, row };
  };
  const fits = (s: MarkerLabelSlot) => s.lo >= left && s.hi <= right;
  const covers = (s: MarkerLabelSlot, x: number) => s.lo - LEADER_MARGIN_PX < x && x < s.hi + LEADER_MARGIN_PX;
  // Whether label i in slot s can sit beside label j in slot p, at the given strictness: 2 keeps
  // all the rules, 1 drops the order rule, 0 keeps only overlapping labels apart.
  const compatible = (i: number, s: MarkerLabelSlot, j: number, p: MarkerLabelSlot, level: number) => {
    if (p.row === s.row && s.lo < p.hi + gap && p.lo < s.hi + gap) return false;
    if (level === 0) return true;
    if (p.row >= s.row && covers(s, marks[j].x)) return false;
    if (s.row >= p.row && covers(p, marks[i].x)) return false;
    if (level === 1) return true;
    const before = marks[i].x < marks[j].x || (marks[i].x === marks[j].x && i < j);
    return before ? s.lo <= p.lo && s.hi <= p.hi : s.lo >= p.lo && s.hi >= p.hi;
  };
  // The sides a label may take: those that fit the band, else the one side it is slid back inside
  // from (a chart too narrow for the label on either side).
  const sides = marks.map((_, i) => {
    const ok = (["start", "end"] as const).filter((a) => fits(slotOf(i, a, 0)));
    if (ok.length > 0) return ok;
    return [fits(slotOf(i, "start", 0)) || !fits(slotOf(i, "end", 0)) ? ("start" as const) : ("end" as const)];
  });
  const place = (i: number, anchor: "start" | "end", row: number): MarkerLabelSlot => {
    const s = slotOf(i, anchor, row);
    if (fits(s)) return s;
    const shift = Math.max(0, left - s.lo) - Math.max(0, s.hi - right);
    return { anchor, lo: s.lo + shift, hi: s.hi + shift, tx: s.tx + shift, row };
  };

  // Newest first, so on a tie the newest change keeps the row next to the plot.
  const order = marks.map((_, i) => i).sort((a, b) => marks[b].x - marks[a].x || b - a);

  // Every layout, fewest rows first and then fewest labels to the left of their line.
  const search = (level: number): MarkerLabelSlot[] | null => {
    let best: MarkerLabelSlot[] | null = null;
    let bestRows = Infinity, bestEnds = Infinity;
    const out = new Array<MarkerLabelSlot>(n);
    const go = (k: number, rows: number, ends: number) => {
      if (rows > bestRows || (rows === bestRows && ends >= bestEnds)) return;
      if (k === n) {
        best = [...out];
        bestRows = rows;
        bestEnds = ends;
        return;
      }
      const i = order[k];
      for (let row = 0; row < n; row++)
        for (const anchor of sides[i]) {
          const s = place(i, anchor, row);
          if (order.slice(0, k).every((j) => compatible(i, s, j, out[j], level))) {
            out[i] = s;
            go(k + 1, Math.max(rows, row + 1), ends + (anchor === "end" ? 1 : 0));
          }
        }
    };
    go(0, 0, 0);
    return best;
  };

  // The layout for a crowded band: each label, newest first, on the lowest row that keeps it off
  // the labels already placed.
  const greedy = (): MarkerLabelSlot[] => {
    const out = new Array<MarkerLabelSlot>(n);
    order.forEach((i, k) => {
      for (let row = 0; ; row++) {
        const s = sides[i].map((a) => place(i, a, row)).find((c) => order.slice(0, k).every((j) => compatible(i, c, j, out[j], 0)));
        if (s) {
          out[i] = s;
          return;
        }
      }
    });
    return out;
  };

  if (n <= SEARCH_LIMIT) {
    for (const level of [2, 1]) {
      const l = search(level);
      if (l) return l;
    }
  }
  return greedy();
}
