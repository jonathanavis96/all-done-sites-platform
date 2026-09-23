// website/src/pages/ClaudeUsageTracker.tsx
import { useEffect, useId, useMemo, useRef, useState } from "react";
import ContributeMeter from "@/components/ContributeMeter";
import NotifyForm from "@/components/NotifyForm";
import Seo from "@/components/Seo";
import SpeedChart, { SpeedByAccountChart, accountColor } from "@/components/SpeedChart";
import { PageShell } from "@/components/redesign/RedesignChrome";
import {
  EFFORTS,
  MODEL_LABELS,
  modelLabel,
  modelsNewestFirst,
  pageModels,
  accountLabel,
  accountWeeklyTokenLines,
  accountWindowLines,
  accountWindowTokenLines,
  accountWindowsPerWeek,
  basisDate,
  captureEmptyNote,
  changeLines,
  computeCredits,
  computeWindowTokens,
  creditsOf,
  fmtCredits,
  fmtShare,
  PLAN_LABELS,
  compute,
  fmtDate,
  fmtSource,
  fmtTokens,
  fmtUsd,
  fmtUsd2,
  headline,
  modelPlanLimit,
  staleEvidenceAt,
  stoppedFeedsLine,
  weeklyEventsFor,
  latestWeeklyChange,
  planScaling,
  weeklyCurrentFor,
  weeklyReadingsFor,
  effortRunCounts,
  shortfallRows,
  speedAccountSeries,
  speedAccounts,
  speedFastSessionRequestsLatest,
  speedFirstBlockCaveat,
  speedMethodSentence,
  speedSeries,
  windowCreditAccountsWithoutStretch,
  weeklyRegimeLevelsFor,
  weeklySeriesFor,
  weeklyTokenRegimeLevelsFor,
  windowTokenRegimeLevelsFor,
  tokensPerWeekChangePct,
  type AccountLines,
  type ContribPoint,
  type CreditFigureText,
  type Effort,
  type Plan,
  type UsageEvent,
  type UsageJson,
  type WindowTokensView,
} from "@/lib/claudeUsage";
import {
  contribColor,
  contribGroups,
  contribPointValue,
  contribXScale,
  contribYMax,
  contributorSentences,
  fleetUsdPerPercent,
  type ContribMetric,
} from "@/lib/contrib";
import "@/styles/home.css";
import "@/styles/claude-usage.css";
// Build-time snapshot so the prerendered HTML carries real figures; the fetch below refreshes it.
import initialJson from "../../public/data/claude-usage.json";
const initialData = initialJson as unknown as UsageJson;

const SITE = "https://alldonesites.com";

// `fmtDate` renders "11 Sep 2026"; chart labels want the day and month only. A single-digit day
// ("9 Sep 2026") is one character shorter than a two-digit one, so slicing a fixed prefix left a
// trailing space on those dates. Stripping the year (and any space before it) is exact regardless
// of digit count.
const fmtDateShort = (iso: string) => fmtDate(iso).replace(/\s\d{4}$/, "");

/**
 * Vertical positions for the right-margin plan labels. Each label wants to sit at its own
 * line's last value; where two would collide they are pushed apart by `gap` and the whole set
 * is kept inside the plot area, so a label never leaves the chart or covers another.
 */
// The published event label reads "Weekly limit changed -29%" (schema 1) or "Observed weekly/window
// ratio changed -29%" (schema 2). On a chart it becomes the metric and the signed percent: the red
// dashed marker already says something changed there, and schema 1's words name a limit the
// account's metric alone does not establish moved (audit finding 4).
function shortChangeLabel(ev: Pick<UsageEvent, "label" | "scope">): string {
  const pct = ev.label.match(/[-+\u2212]\d+(\.\d+)?%/);
  if (!pct) return ev.label.replace(/\s+changed\b/, "");
  return ev.scope === "weekly" ? `weekly ratio ${pct[0]}` : pct[0];
}

// The one segment a change lands on: from the change date to the next reading, with the start
// interpolated along that segment. Only this segment is drawn red. Shading everything after a
// change would paint the chart red from the change to the end of time, which says nothing.
function dropSegment(xy: [number, number][], cx: number | null): [number, number][] {
  if (cx === null || xy.length < 2) return [];
  const i = xy.findIndex(([px]) => px > cx);
  if (i <= 0) return [];
  const [x0, y0] = xy[i - 1];
  const [x1, y1] = xy[i];
  const seamY = x1 === x0 ? y1 : y0 + ((y1 - y0) * (cx - x0)) / (x1 - x0);
  return [
    [cx, seamY],
    [x1, y1],
  ];
}

// A regime step line: one horizontal run per level, joined by verticals at the boundaries.
// Levels are what the detector measured; the weekly points behind them are estimates of the
// same constant, carrying the assembly error the collector's weighted_regimes docstring lists.
function stepRuns<T extends { start: string; end: string; inferred: boolean }>(
  levels: T[],
  xAt: (iso: string) => number | null,
  yOf: (lvl: T) => number,
): { d: string; inferred: boolean }[] {
  const runs: { d: string; inferred: boolean }[] = [];
  let prev: { x: number; y: number } | null = null;
  for (const lvl of levels) {
    const x0 = xAt(lvl.start), x1 = xAt(lvl.end);
    if (x0 === null || x1 === null) continue;
    const y = yOf(lvl);
    // Join to the previous level with a vertical at the step, so a change reads as a step and
    // never as a slope: a slope would imply the limit moved gradually, which it never does.
    const lead = prev !== null ? `M ${prev.x},${prev.y} L ${x0},${prev.y} L ${x0},${y} ` : `M ${x0},${y} `;
    runs.push({ d: `${lead}L ${x1},${y}`, inferred: lvl.inferred });
    prev = { x: x1, y };
  }
  return runs;
}

// Every real step in one plan's own levels, oldest first: two array-adjacent, non-inferred levels
// whose value differs. This is where the drawn step actually lands, which is not always the day
// an announced event names -- the collector's own regime detector and an announcement can
// disagree.
//
// `weeklyRegimeLevelsFor` marks a level `inferred: false` only when it came from the plan's own
// `regimes` array (see its docstring), so any two non-inferred entries here are necessarily two
// consecutive entries of that same array, regardless of index position. There is no case where
// two non-inferred entries in one plan's own level list come from different plans. An exact
// `cur.start === prev.end` string match used to gate this, but the collector's passive sampling
// leaves a real gap of hours between adjacent regimes (its own regime detector does not require
// the boundary of one clean stretch to be the literal start instant of the next), so live data
// almost always fails a millisecond-exact touch check and the step silently vanished.
//
// A seam between an inferred level and a measured one is never a step. On Max 20x the level
// before 2026-08-15 is Max 5x's measured level scaled by the plan ratio, and the measured level
// after it differs by a fraction of a percent: that is where the plan's own measurements begin,
// not a limit change, so it gets no marker.
export function realSteps(
  levels: { start: string; end: string; value: number; inferred: boolean }[],
): { date: string; pct: number }[] {
  const steps: { date: string; pct: number }[] = [];
  for (let i = 1; i < levels.length; i++) {
    const cur = levels[i];
    const prev = levels[i - 1];
    if (cur.inferred || prev.inferred) continue;
    if (!prev.value || cur.value === prev.value) continue;
    steps.push({ date: cur.start, pct: ((cur.value - prev.value) / prev.value) * 100 });
  }
  return steps;
}

// The change markers for one plan, falling back across plans when the selected plan has no real
// step of its own. Pro and Max 5x currently carry no measured regime at all near the change --
// every recent level on both is inferred (scaled) from Max 20x -- so `realSteps` on their own
// levels is empty and the markers used to vanish for those two plans. The fallback walks to the
// plan the SELECTED plan's own most recent level was inferred from (carried on each level as
// `plan`, the source of that row) and draws the markers where that plan's own steps really are,
// so all three plans mark the same dates. If no source plan is found this way, the chart's own
// announced-event marker is used instead, rather than showing none.
function levelStepsFor(
  plotted: { plan: Plan; levels: { start: string; end: string; value: number; inferred: boolean; plan: Plan }[] }[],
  selected: { levels: { start: string; end: string; value: number; inferred: boolean; plan: Plan }[] } | undefined,
): { date: string; pct: number }[] {
  if (!selected) return [];
  const own = realSteps(selected.levels);
  if (own.length > 0) return own;
  const last = selected.levels[selected.levels.length - 1];
  if (!last || !last.inferred) return [];
  const source = plotted.find((p) => p.plan === last.plan);
  return source ? realSteps(source.levels) : [];
}

// A change marker's percent as its label prints it: whole percent, signed.
export const markerPctText = (pct: number) => `${Math.round(pct) > 0 ? "+" : ""}${Math.round(pct)}%`;

// The signed percent inside a label such as "weekly ratio -4%", or null when it names none.
function labelPct(text: string): number | null {
  const m = text.match(/([-+\u2212])(\d+(?:\.\d+)?)%/);
  return m ? (m[1] === "+" ? 1 : -1) * Number(m[2]) : null;
}

// Every chart with change markers measures how much a plan holds, so a fall is red and a rise
// green. The colour keys off the same rounded percent the label prints, so the two cannot
// disagree: a step that prints "0%", or a label with no percent, is grey.
export function markerColour(pct: number | null): string {
  const shown = pct === null ? 0 : Math.round(pct);
  return shown < 0 ? "#B42318" : shown > 0 ? "#059669" : "#94A3B8";
}

// Rough width of an 11px chart label: enough to tell whether two labels would overlap.
const LABEL_CHAR_PX = 6.5;
// How far an older marker's label drops when a newer one would cover it: one line of 11px text.
const LABEL_LINE_PX = 12;

function stackLabels(items: { plan: Plan; y: number }[], top: number, bottom: number, gap = 16): Map<Plan, number> {
  const sorted = [...items].sort((a, b) => a.y - b.y);
  let prev = -Infinity;
  for (const it of sorted) {
    it.y = Math.max(it.y, prev + gap);
    prev = it.y;
  }
  const overflow = sorted.length > 0 ? sorted[sorted.length - 1].y - bottom : 0;
  if (overflow > 0) for (const it of sorted) it.y -= overflow;
  for (const it of sorted) it.y = Math.max(it.y, top);
  return new Map(sorted.map((it) => [it.plan, it.y]));
}

// One row of the plan-comparison table: its label, and the cell each plan renders.
interface PlanTableRow {
  label: string;
  cell: (p: Plan) => { text: string; inferred: boolean };
}

// One plan's levels on a chart: what the limit was, held flat between changes.
export interface PlanLevels {
  plan: Plan;
  label: string;
  // `plan` on a level is the plan its regime was actually measured on: itself when `inferred`
  // is false, the source it was scaled from when true. That is how the change marker's
  // cross-plan fallback (`levelStepFor`) finds the plan to draw the marker from when the
  // selected plan's own recent levels are all borrowed.
  levels: { start: string; end: string; value: number; inferred: boolean; plan: Plan }[];
}

// What the windows-per-week chart draws beneath the selected plan's levels: the measurements the
// levels were detected from.
export type LevelOverlay = ReturnType<typeof weeklyReadingsFor>;

// A seven-day movement under this many percent gives a ratio that whole-percent rounding alone
// swings between 3 and 11, so those readings are drawn hollow and fainter.
const COARSE_SEVEN_DAY_PCT = 5;

// Pro, Max 5x, Max 20x: the order the credits table lists its plans in, and the order every
// ratio on this page is read in.
const PLAN_ORDER: Plan[] = ["pro", "max5", "max20"];
const PLAN_ORDER_LABEL = PLAN_ORDER.map((p) => PLAN_LABELS[p]).join(" : ");

// "550,000 : 3,300,000 : 11,000,000", or null unless every plan in the order has a figure: a
// partial ratio is not a ratio.
function perPlanText(m: Partial<Record<Plan, number>> | undefined): string | null {
  if (!m || !PLAN_ORDER.every((p) => typeof m[p] === "number")) return null;
  return PLAN_ORDER.map((p) => m[p]!.toLocaleString("en-US")).join(" : ");
}

const fmtInterval = (iv: (number | null)[] | null | undefined): string | null =>
  iv && typeof iv[0] === "number" && typeof iv[1] === "number" ? `${iv[0].toFixed(1)} to ${iv[1].toFixed(1)}` : null;

// The weekly charts draw levels first, and the readings only beneath them.
//
// Windows per week is a plan constant: it moves when the limit moves and not otherwise. A
// weekly ratio is an ESTIMATE of that constant and carries several percent of assembly error
// (whole-percent rounding on a denominator that mostly moves by 1, an interval filter that
// keys on the numerator, work spanning a reset dropped) -- so plotting the weekly points drew
// week-to-week movement the limit never made, and a reader had no way to tell which wiggles
// meant anything. The levels come from the collector's own regime detector, the same machinery
// behind the headline figure, so the chart and the headline can no longer disagree.
function LevelChart({
  levelsByPlan,
  events,
  selectedPlan,
  fmtValue,
  plotRight,
  title,
  overlay,
  changeFromLevels,
  changePct,
  accountLines,
  missingFor,
  shown = true,
}: {
  levelsByPlan: PlanLevels[];
  events: UsageEvent[];
  selectedPlan: Plan;
  fmtValue: (v: number) => string;
  plotRight: number;
  title: string;
  overlay?: LevelOverlay;
  // The chart's change markers: every real step in the SELECTED plan's own levels, not the
  // announced event. The two can disagree by days -- the collector's
  // regime detector draws the step where the meter actually moved, an announced event names the
  // day Anthropic said so -- and a marker on the wrong date used to sit beside a step drawn
  // somewhere else entirely.
  changeFromLevels?: boolean;
  // The signed percent the most recent marker states, where the publisher publishes the figure for this
  // chart's own quantity (tracker wf-61's tokens-per-week change). The marker's DATE still comes
  // from the drawn step, so the line and the label cannot name two different days. Earlier markers,
  // and every marker on a chart without one, read the percent off their own step.
  changePct?: number | null;
  // One line per watched Max 20x account, in the account colours the speed-by-account chart uses,
  // with the same legend and the same "No data for ..." note for an account that has nothing to
  // draw here.
  accountLines?: AccountLines;
  missingFor?: string;
  // False while the chart sits in a hidden panel; the scroller re-opens on the newest readings
  // when it is shown.
  shown?: boolean;
}) {
  // With readings to show, the plot keeps a legible width and scrolls inside its own container on
  // a phone, rather than shrinking a hundred dots into a smear. It opens on the newest readings,
  // which sit at the right-hand end.
  const dense = (overlay?.readings.length ?? 0) > 0 || (overlay?.weekly.length ?? 0) > 0;
  const scroller = useRef<HTMLDivElement>(null);
  // Each chart's own gradient id: the three plan charts share one plot width, and two of them sit
  // in hidden panels, where a gradient another chart points at would not paint.
  const fillId = `lvlfill-${useId().replace(/[^A-Za-z0-9_-]/g, "")}`;
  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, [dense, shown]);
  const plotted = levelsByPlan.filter((p) => p.levels.length > 0);
  const accounts = accountLines?.lines ?? [];
  const colorOf = accountColor;
  // A reading tagged with a drawn account takes that account's colour, so the dots read against
  // the account's own line; any other reading keeps the plan's hue.
  const drawnAccounts = new Set(accounts.map((l) => l.account));
  const readingColor = (a: string | undefined) => (a && drawnAccounts.has(a) ? colorOf(a) : "var(--ads-ac)");
  const accountLegend = accountLines && (accounts.length > 0 || accountLines.missing.length > 0) && (
    <ul className="share-legend speed-legend level-accounts">
      {accounts.map((l) => (
        <li key={l.account} data-account={accountLabel(l.account)}>
          <span className="swatch" style={{ background: colorOf(l.account) }} />
          {accountLabel(l.account)}
          {l.changePct !== null ? ` (${markerPctText(l.changePct)} across the change)` : ""}
        </li>
      ))}
      {accountLines.missing.length > 0 && (
        <li data-legend="no-data">
          No data for {missingFor ?? "this chart"}: {accountLines.missing.map(accountLabel).join(", ")}
        </li>
      )}
    </ul>
  );
  if (plotted.length === 0) return <p className="sub">Not enough history yet.</p>;
  const W = 840, H = 260, L = 44, R = plotRight, T = 20, B = 200;
  const readings = overlay?.readings ?? [];
  // A partial (in-progress) week is dropped entirely -- not drawn, not in the y-axis range, not
  // in the x-axis span, not in the aria label -- so it neither hangs a huge whisker in the
  // margin nor stretches this chart's x domain past its sibling chart's.
  const pooled = (overlay?.weekly ?? []).filter((p) => !p.partial);
  // A whisker end the collector could not bound (null) is not drawn, so it sets no range either.
  const whisker = (iv: (number | null)[] | null | undefined): [number, number] | null =>
    iv && typeof iv[0] === "number" && typeof iv[1] === "number" ? [iv[0], iv[1]] : null;
  // One y-axis for everything drawn: the levels, every reading and every whisker.
  const vals = [
    ...plotted.flatMap((p) => p.levels.map((l) => l.value)),
    ...accounts.flatMap((a) => a.levels.map((l) => l.value)),
    ...readings.map((r) => r.windows),
    ...pooled.flatMap((p) => [p.windows, ...(whisker(p.rounding_interval) ?? [])]),
  ];
  const lo = Math.min(...vals) * 0.9, hi = Math.max(...vals) * 1.05;
  const day = (d: string) => Date.parse(d + "T00:00:00Z");
  // A date-only stamp is midnight UTC; a full timestamp is itself.
  const stamp = (s: string) => (s.length === 10 ? day(s) : Date.parse(s));
  const stamps = [
    ...plotted.flatMap((p) => p.levels.flatMap((l) => [Date.parse(l.start), Date.parse(l.end)])),
    ...accounts.flatMap((a) => a.levels.flatMap((l) => [Date.parse(l.start), Date.parse(l.end)])),
    ...readings.map((r) => stamp(r.window_ending)),
    ...pooled.map((p) => stamp(p.week_ending)),
  ].filter(Number.isFinite);
  const markerDays = events.map((ev) => day(ev.date));
  const d0 = Math.min(...stamps, ...markerDays);
  const d1 = Math.max(...stamps, ...markerDays);
  const span = Math.max(1, d1 - d0);
  const xAt = (iso: string) => {
    const t = Math.min(Math.max(Date.parse(iso), d0), d1);
    return L + ((t - d0) / span) * (R - L);
  };
  const xDay = (d: string) => xAt(`${d}T00:00:00Z`);
  const xStamp = (s: string) => (s.length === 10 ? xDay(s) : xAt(s));
  const y = (v: number) => B - ((v - lo) / (hi - lo)) * (B - T);
  const ticks = [0, 1, 2, 3].map((k) => lo + ((hi - lo) * k) / 3);
  const isSelectedPlan = (p: PlanLevels) =>
    p.plan === selectedPlan || (selectedPlan === "pro" && p.plan === "max5" && !levelsByPlan.some((o) => o.plan === "pro"));
  // The change markers. Two sources: the announced event, or -- where the chart asks for it --
  // every real step in the selected plan's own levels, the two adjacent, non-inferred levels each
  // step actually lands between. The two can name different days; the level source is where the
  // drawn step really is.
  const eventChange = latestWeeklyChange(events);
  const levelSteps = changeFromLevels ? levelStepsFor(plotted, plotted.find(isSelectedPlan)) : [];
  const rawMarkers: { x: number; date: string; text: string; pct: number | null }[] =
    levelSteps.length > 0
      ? levelSteps.map((st, i) => {
          // Only the newest step is the change the publisher's figure describes.
          const pct = i === levelSteps.length - 1 && typeof changePct === "number" ? changePct : st.pct;
          return {
            x: xAt(st.date),
            date: st.date,
            pct,
            text: `${markerPctText(pct)} on ${fmtDateShort(st.date.slice(0, 10))}`,
          };
        })
      : // No real step anywhere in the fallback chain (should not happen while Max 20x has its
        // own measured regimes) -- fall back to the announced event rather than show nothing.
        eventChange
        ? [
            changeFromLevels && typeof changePct === "number"
              ? {
                  x: xDay(eventChange.date),
                  date: eventChange.date,
                  pct: changePct,
                  text: `${markerPctText(changePct)} on ${fmtDateShort(eventChange.date.slice(0, 10))}`,
                }
              : {
                  x: xDay(eventChange.date),
                  date: eventChange.date,
                  // The label's own percent, parsed from the same text it shows.
                  pct: labelPct(shortChangeLabel(eventChange)),
                  text: shortChangeLabel(eventChange),
                },
          ]
        : [];
  // Each label sits beside its own line, anchored off the plot's own right edge (not the wider
  // viewBox) so a label near the right margin never runs past it and gets clipped. Where a newer
  // label would cover an older one, the older drops a line, newest placed first.
  const placed: { lo: number; hi: number; row: number }[] = [];
  const changeMarkers = rawMarkers
    .map((m) => {
      const end = m.x > R - 130;
      const w = m.text.length * LABEL_CHAR_PX;
      const tx = end ? m.x - 6 : m.x + 6;
      return { ...m, tx, anchor: end ? ("end" as const) : ("start" as const), lo: end ? tx - w : tx, hi: end ? tx : tx + w };
    })
    .reverse()
    .map((m) => {
      let row = 0;
      while (placed.some((p) => p.row === row && m.lo < p.hi && p.lo < m.hi)) row++;
      placed.push({ lo: m.lo, hi: m.hi, row });
      return { ...m, ty: T - 3 + row * LABEL_LINE_PX };
    })
    .reverse();
  // Two lines per plan on the right edge — name above, current value below — so the
  // gap has to clear both, not one.
  const labelY = stackLabels(
    plotted.map((p) => ({ plan: p.plan, y: y(p.levels[p.levels.length - 1].value) })),
    T + 6,
    B,
    16,
  );
  const dayMs = 86400e3;
  const spanDays = span / dayMs;
  const stepWeeks = spanDays > 300 ? 8 : spanDays > 120 ? 4 : 2;
  const xTicks: string[] = [];
  for (let t = d0; t <= d1; t += stepWeeks * 7 * dayMs) xTicks.push(new Date(t).toISOString().slice(0, 10));
  const ariaLabel = [
    title,
    ...plotted.map(
      (p) =>
        `${p.label}: ${p.levels
          .map((l) => `${fmtDate(l.start.slice(0, 10))} to ${fmtDate(l.end.slice(0, 10))} ${fmtValue(l.value)}${l.inferred ? " (dashed)" : ""}`)
          .join(", ")}`,
    ),
    ...accounts.map(
      (a) =>
        `${accountLabel(a.account)}: ${a.levels
          .map((l) => `${fmtDate(l.start.slice(0, 10))} to ${fmtDate(l.end.slice(0, 10))} ${fmtValue(l.value)}`)
          .join(", ")}`,
    ),
    ...changeMarkers.map((m) => `${fmtDate(m.date.slice(0, 10))}: ${m.text}`),
    ...(readings.length > 0
      ? [
          `${readings.length} five-hour window readings, ${fmtValue(Math.min(...readings.map((r) => r.windows)))} to ${fmtValue(Math.max(...readings.map((r) => r.windows)))}`,
        ]
      : []),
    ...(pooled.length > 0
      ? [`Weekly pooled: ${pooled.map((p) => `${fmtDate(p.week_ending.slice(0, 10))} ${fmtValue(p.windows)}${p.partial ? " (week in progress)" : ""}`).join(", ")}`]
      : []),
  ].join(". ");
  const svg = (
    <svg
      className="chart"
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      style={dense ? { minWidth: 640, display: "block" } : undefined}
      role="img"
      aria-label={ariaLabel}
    >
      <defs>
        <linearGradient id={fillId} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#0EA5E9" stopOpacity=".22" />
          <stop offset="1" stopColor="#0EA5E9" stopOpacity=".02" />
        </linearGradient>
      </defs>
      <g stroke="#E6E9EE" strokeWidth="1">
        {ticks.map((t) => (
          <line key={t} x1={L} x2={R} y1={y(t)} y2={y(t)} />
        ))}
      </g>
      {ticks.map((t) => (
        <text key={t} x={0} y={y(t) + 4}>{fmtValue(t)}</text>
      ))}
      {changeMarkers.map((m) => (
        <g key={m.date}>
          <line x1={m.x} x2={m.x} y1={T} y2={B} stroke={markerColour(m.pct)} strokeWidth="1.5" strokeDasharray="5 4" />
          <text x={m.tx} y={m.ty} textAnchor={m.anchor} style={{ fill: markerColour(m.pct), fontWeight: 600 }}>
            {m.text}
          </text>
        </g>
      ))}
      {/* Shade under the selected plan's own steps, so the eye lands on the plan in view. Drawn
          first: a fill above the readings would tint them and take their hover. */}
      {plotted.filter(isSelectedPlan).map((p) => (
        <polygon
          key={p.plan}
          fill={`url(#${fillId})`}
          points={`${xAt(p.levels[0].start)},${B} ${p.levels
            .map((l) => `${xAt(l.start)},${y(l.value)} ${xAt(l.end)},${y(l.value)}`)
            .join(" ")} ${xAt(p.levels[p.levels.length - 1].end)},${B}`}
        />
      ))}
      {/* Beneath the levels: what they were detected from. One hue, the selected plan's, kept low
          so the step line stays the figure and these stay the evidence. */}
      <g>
        {readings.map((r) => {
          const coarse = r.seven_day_pct < COARSE_SEVEN_DAY_PCT;
          return (
            <circle
              key={`${r.window_ending}-${r.account ?? ""}`}
              cx={xStamp(r.window_ending)}
              cy={y(r.windows)}
              r="2.5"
              fill={coarse ? "none" : readingColor(r.account)}
              stroke={readingColor(r.account)}
              strokeWidth={coarse ? 1 : 0}
              opacity={coarse ? 0.3 : 0.45}
            >
              <title>
                {`${fmtDate(r.window_ending.slice(0, 10))}: ${fmtValue(r.windows)} windows per week. Five-hour meter moved ${r.five_hour_pct}%, seven-day meter ${r.seven_day_pct}%${coarse ? " (under 5%, so rounding dominates)" : ""}.${r.account ? ` ${accountLabel(r.account)}.` : ""}`}
              </title>
            </circle>
          );
        })}
      </g>
      <g>
        {pooled.map((p) => {
          const xx = xStamp(p.week_ending);
          const iv = whisker(p.rounding_interval);
          return (
            <g key={p.week_ending}>
              {iv && (
                <path
                  d={`M ${xx},${y(iv[0])} L ${xx},${y(iv[1])} M ${xx - 3},${y(iv[0])} L ${xx + 3},${y(iv[0])} M ${xx - 3},${y(iv[1])} L ${xx + 3},${y(iv[1])}`}
                  fill="none"
                  stroke="var(--ads-ac)"
                  strokeWidth="1.25"
                  opacity=".7"
                />
              )}
              <circle
                cx={xx}
                cy={y(p.windows)}
                r="4.5"
                fill={p.partial ? "var(--ads-bg)" : "var(--ads-ac)"}
                stroke="var(--ads-ac)"
                strokeWidth={p.partial ? 1.75 : 0}
                opacity=".8"
              >
                <title>
                  {`Week ending ${fmtDate(p.week_ending.slice(0, 10))}${p.partial ? " (in progress)" : ""}: ${fmtValue(p.windows)} windows per week${fmtInterval(p.rounding_interval) ? `, rounding ${fmtInterval(p.rounding_interval)}` : ""}${typeof p.n === "number" ? `, ${p.n} readings pooled` : ""}.`}
                </title>
              </circle>
            </g>
          );
        })}
      </g>
      {/* The accounts' own lines, beneath the plans' so the plan lines and their labels stay
          on top. Flat per regime, like the plans'. */}
      {accounts.map((a) => (
        <g key={a.account} data-account={accountLabel(a.account)}>
          {stepRuns(
            a.levels.map((l) => ({ ...l, inferred: false })),
            xAt,
            (l) => y(l.value),
          ).map((run, i) => (
            <path key={i} d={run.d} fill="none" stroke={colorOf(a.account)} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" opacity=".9" />
          ))}
        </g>
      ))}
      {plotted.map((p) => {
        const isSelected = isSelectedPlan(p);
        const color = isSelected ? "#0EA5E9" : "#94A3B8";
        // Labels take ink from the theme, never from the series: the line carries the colour.
        const ink = isSelected ? "var(--ads-tx)" : "var(--ads-mut)";
        const runs = stepRuns(p.levels, xAt, (l) => y(l.value));
        const last = p.levels[p.levels.length - 1];
        return (
          <g key={p.plan}>
            {/* Every run in the plan's own colour: the dashed red markers say where the limit
                changed, so the line itself stays one series. */}
            {runs.map((run, i) => (
              <path
                key={i}
                d={run.d}
                fill="none"
                stroke={color}
                strokeWidth={isSelected ? 3 : 1.75}
                strokeDasharray={run.inferred ? "6 4" : undefined}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            ))}
            <g>
              {/* Leader from the line's end to its label, so a stacked label still reads
                  against the right level. */}
              <line
                x1={xAt(last.end)}
                x2={R + 6}
                y1={y(last.value)}
                y2={labelY.get(p.plan) ?? y(last.value)}
                stroke={color}
                strokeWidth="1"
                strokeDasharray="2 3"
                opacity=".6"
              />
              <text x={R + 10} y={(labelY.get(p.plan) ?? y(last.value)) + 4}>
                <tspan style={{ fill: ink, fontWeight: 700 }}>{fmtValue(last.value)}</tspan>
                <tspan style={{ fill: ink, fontWeight: 500 }}> – {p.label}</tspan>
              </text>
            </g>
          </g>
        );
      })}
      <g style={{ fill: "#0277B5", fontWeight: 500 }}>
        {xTicks.map((d) => {
          const xx = xDay(d);
          const anchor = xx < L + 20 ? "start" : xx > R - 20 ? "end" : "middle";
          return (
            <text key={d} x={xx} y={B + 36} textAnchor={anchor}>{fmtDate(d).slice(0, 6)}</text>
          );
        })}
      </g>
    </svg>
  );
  const plot = dense ? <div ref={scroller} style={{ overflowX: "auto", maxWidth: "100%" }}>{svg}</div> : svg;
  return accountLegend ? (
    <>
      {plot}
      {accountLegend}
    </>
  ) : (
    plot
  );
}

// The legend's key for one of the marks beneath the levels, drawn as the chart draws it.
function LegendMark({ kind }: { kind: "reading" | "weekly" }) {
  return (
    <svg width="18" height="12" viewBox="0 0 18 12" aria-hidden="true" style={{ display: "inline-block", verticalAlign: "-1px" }}>
      {kind === "reading" && (
        <>
          <circle cx="5" cy="6" r="2.5" fill="var(--ads-ac)" opacity=".45" />
          <circle cx="13" cy="6" r="2.5" fill="none" stroke="var(--ads-ac)" opacity=".3" />
        </>
      )}
      {kind === "weekly" && (
        <>
          <path d="M 9,0.5 L 9,11.5 M 6,0.5 L 12,0.5 M 6,11.5 L 12,11.5" stroke="var(--ads-ac)" strokeWidth="1.25" opacity=".7" fill="none" />
          <circle cx="9" cy="6" r="3.5" fill="var(--ads-ac)" opacity=".8" />
        </>
      )}
    </svg>
  );
}

// A documented level is quoted as its source gives it, to two places.
// A published credits figure in the hero's own type.
//
// A figure the tracker can bound but not identify publishes a sentence in place of its value, so
// the sentence takes the number's place rather than a dash, a zero or a silently-dropped line.
// The interval is shown beneath either way, as the range the readings spanned.
function Fig({ fig, unit, statusUnit, lead }: { fig: CreditFigureText; unit: string; statusUnit?: string; lead?: string }) {
  // Number first where there is a number, unit first where what was published is a sentence:
  // "about 354 sessions per window", but "sessions per window: rate not yet identified".
  return fig.kind === "value" ? (
    <>
      {lead ? `${lead} ` : ""}
      <b>{fig.text}</b> {unit}
    </>
  ) : (
    <>
      {statusUnit ?? unit}: <b>{fig.text}</b>
    </>
  );
}

// The same figure on one line, for the one that sits beside the hero figure rather than under it.
function FigureLine({ fig, unit, statusUnit }: { fig: CreditFigureText; unit: string; statusUnit?: string }) {
  return (
    <div className="rate">
      <span>
        <Fig fig={fig} unit={unit} statusUnit={statusUnit} />
        {fig.range ? ` (${fig.range})` : ""}
      </span>
    </div>
  );
}

function HeroFigure({
  fig,
  unit,
  statusUnit,
  usd,
}: {
  fig: CreditFigureText;
  unit: string;
  statusUnit?: string;
  usd?: boolean;
}) {
  // A figure with no value never takes the 72px slot: there is no number to put in it, and a
  // sentence set at that size is not the page's look. It drops to the line beside it instead.
  if (fig.kind !== "value") return <FigureLine fig={fig} unit={unit} statusUnit={statusUnit} />;
  return (
    <>
      <div className={usd ? "big usd" : "big"}>
        {fig.text}
        <span>{unit}</span>
      </div>
      {fig.range && <div className="quiet">Range {fig.range}.</div>}
    </>
  );
}

const fmtValue2 = (v: number) => v.toFixed(2);

// What each tab of the contributors section plots. Every one is read off the same
// contributed samples: the dollar and window figures divide by the five-hour percent, the
// weekly figure by the seven-day one. There is no windows-per-week tab: a reading's week of
// tokens over its window of tokens divides two different workloads, not paired meter movement
// (audit finding 7), and schema 2 no longer publishes that quotient.
interface ContribTab {
  key: ContribMetric;
  label: string;
  value: (p: ContribPoint, model: string) => number | null;
  fmt: (v: number) => string;
  // The tracker's own line on this chart. The token tabs take it from the measured window, the
  // same figure the hero states, and draw none where that figure is not published.
  reference: (wt: WindowTokensView | null, fleetUsd: number | null) => number | null;
  refLabel: (v: number, fmt: (v: number) => string) => string;
  legend: string;
}

const CONTRIB_TABS: ContribTab[] = [
  {
    key: "usd",
    label: "Cost per 1%",
    value: (p, model) => contribPointValue(p, "usd", model),
    fmt: fmtUsd2,
    reference: (_wt, fleetUsd) => fleetUsd,
    refLabel: (v, fmt) => `tracker ${fmt(v)} per 1%`,
    legend:
      "One dot per reading, joined when they come from the same contributor ID. Hollow dots: meter under 5%. Dashed line: the tracker's own figure.",
  },
  {
    key: "window",
    label: "Effective window size",
    value: (p, model) => contribPointValue(p, "window", model),
    fmt: fmtTokens,
    reference: (wt) => wt?.perWindowValue ?? null,
    refLabel: (v, fmt) => `tracker ${fmt(v)}`,
    legend:
      "Tokens a full five-hour window buys, read off each contributor's own meter. Dashed line: the tracker's own figure. Both are the selected model. They still differ by how cache-heavy the work was: the plan meter does not count cache reads, so a session that is mostly cache reads shows far more tokens for the same meter percent. ",
  },
  {
    key: "weekly",
    label: "Tokens per week",
    value: (p, model) => contribPointValue(p, "weekly", model),
    fmt: fmtTokens,
    reference: (wt) => wt?.perWeekValue ?? null,
    refLabel: (v, fmt) => `tracker ${fmt(v)}`,
    legend:
      "Tokens a full week buys, read off each contributor's own seven-day meter: their tokens since that meter reset, over the percent of it they have used. Dashed line: the tracker's own figure. Both are the selected model. They still differ by how cache-heavy the work was: the plan meter does not count cache reads, so a session that is mostly cache reads shows far more tokens for the same meter percent. ",
  },
];

// The three plan charts that share one panel, in the order the page used to stack them.
export type PlanChart = "window" | "tokens" | "windows";
const PLAN_CHARTS: { key: PlanChart; label: string }[] = [
  { key: "window", label: "Window size" },
  { key: "tokens", label: "Tokens per week" },
  { key: "windows", label: "Windows per week" },
];
const PLAN_CHART_STORE = "claude-usage-plan-chart";

// The tab a key press moves to, the ARIA tabs pattern: arrows step and wrap, Home and End jump to
// either end. Null for any other key, which the tab leaves alone.
export function planChartForKey(current: PlanChart, key: string): PlanChart | null {
  const i = PLAN_CHARTS.findIndex((c) => c.key === current);
  const n = PLAN_CHARTS.length;
  const at =
    key === "ArrowRight" || key === "ArrowDown"
      ? (i + 1) % n
      : key === "ArrowLeft" || key === "ArrowUp"
        ? (i - 1 + n) % n
        : key === "Home"
          ? 0
          : key === "End"
            ? n - 1
            : null;
  return at === null ? null : PLAN_CHARTS[at].key;
}

function ContributorsChart({
  points,
  reference,
  tab,
  model,
}: {
  points: ContribPoint[];
  reference: number | null;
  tab: ContribTab;
  model: string;
}) {
  const W = 840, H = 260, L = 44, R = 832, T = 20, B = 200;
  const valueOf = (p: ContribPoint) => tab.value(p, model);
  const usable = points.filter((p) => typeof valueOf(p) === "number");
  const groups = contribGroups(points);
  const { t0, t1, frac } = contribXScale(points);
  const yMax = contribYMax(points, reference, (p) => tab.value(p as ContribPoint, model));
  const x = (t: string) => L + frac(t) * (R - L);
  const y = (v: number) => B - (v / yMax) * (B - T);
  const ticks = [0, 1, 2, 3].map((k) => (yMax * k) / 3);
  // A few evenly spaced date labels, same convention as the other charts on this page.
  const dateTicks: number[] = [];
  const tickCount = 4;
  for (let i = 0; i <= tickCount; i++) dateTicks.push(t0 + ((t1 - t0) * i) / tickCount);
  const span =
    usable.length > 0
      ? `${fmtDate(new Date(t0).toISOString())} to ${fmtDate(new Date(t1).toISOString())}`
      : "no readings yet";
  const ariaLabel = `${usable.length} reading${usable.length === 1 ? "" : "s"} from ${groups.length} contributor ID${groups.length === 1 ? "" : "s"}, ${span}`;
  return (
    <>
      <svg className="chart contrib-chart" viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={ariaLabel}>
        <g stroke="var(--ads-line)" strokeWidth="1">
          {ticks.map((t) => (
            <line key={t} x1={L} x2={R} y1={y(t)} y2={y(t)} />
          ))}
        </g>
        <g style={{ fill: "var(--ads-mut)" }}>
          {ticks.map((t) => (
            <text key={t} x={0} y={y(t) + 4}>{tab.fmt(t)}</text>
          ))}
        </g>
        {typeof reference === "number" && (
          <g>
            <line x1={L} x2={R} y1={y(reference)} y2={y(reference)} stroke="var(--ads-ac)" strokeWidth="1.5" strokeDasharray="5 4" />
            <text x={R} y={y(reference) - 6} textAnchor="end" style={{ fill: "var(--ads-ac)", fontWeight: 500 }}>
              {tab.refLabel(reference, tab.fmt)}
            </text>
          </g>
        )}
        {groups.map((g) => {
          const drawable = (g.points as ContribPoint[]).filter((p) => typeof valueOf(p) === "number");
          const color = contribColor(g.c);
          return (
            <g key={g.c}>
              {drawable.length >= 2 && (
                <polyline
                  fill="none"
                  stroke={color}
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                  points={drawable.map((p) => `${x(p.t)},${y(valueOf(p) as number)}`).join(" ")}
                />
              )}
              {drawable.map((p) => (
                <circle
                  key={p.t}
                  cx={x(p.t)}
                  cy={y(valueOf(p) as number)}
                  r="4"
                  fill={p.coarse ? "var(--ads-bg)" : color}
                  stroke={color}
                  strokeWidth={p.coarse ? 1.5 : 0}
                />
              ))}
            </g>
          );
        })}
        <g style={{ fill: "var(--ads-mut)", fontWeight: 500 }}>
          {dateTicks.map((t, i) => {
            const anchor = i === 0 ? "start" : i === dateTicks.length - 1 ? "end" : "middle";
            return (
              <text key={t} x={L + (i / tickCount) * (R - L)} y={B + 24} textAnchor={anchor}>
                {fmtDate(new Date(t).toISOString()).slice(0, 6)}
              </text>
            );
          })}
        </g>
      </svg>
      <p className="sub contrib-chart-legend">
        {usable.length === 0
          ? "No contributed reading carries this figure yet \u2014 only the tracker's own line is drawn."
          : tab.legend}
      </p>
    </>
  );
}

// `initial` is the prerendered snapshot, and the selectors start on `initialPlan` and
// `initialModel`; tests render the page with either schema and any selection through them. The
// model selector starts on Opus: every clean stretch the window was measured on is pure Opus, so
// it is the one family whose figure is the measurement rather than a conversion of it (wf-60).
// The contributor chart starts on `initialContribMetric`. `now` fixes the clock the stale line
// reads. The prerender leaves it unset, so its output never depends on when it ran; a test sets it
// to render the stale line without mounting.
// A credit family's name as the page writes it: the capitalised family ("Opus", "Sonnet"), except
// where the family is one model version and so takes that model's own label ("Opus 5.5", never
// "Opus-5-5"). Without a family, the selected model's label.
const FAMILY_LABELS: Record<string, string> = { "opus-5-5": MODEL_LABELS["claude-opus-5-5"] };
function familyLabel(family: string | null, model: string): string {
  if (!family) return modelLabel(model);
  return FAMILY_LABELS[family] ?? family.charAt(0).toUpperCase() + family.slice(1);
}

export default function ClaudeUsageTracker({
  initial = initialData,
  initialPlan = "max20",
  initialModel = "claude-opus-5",
  initialContribMetric = "usd",
  initialPlanChart = "tokens",
  now,
}: {
  initial?: UsageJson | null;
  initialPlan?: Plan;
  initialModel?: string;
  initialContribMetric?: ContribMetric;
  initialPlanChart?: PlanChart;
  now?: number;
} = {}) {
  const [data, setData] = useState<UsageJson | null>(initial);
  const [failed, setFailed] = useState(false);
  const [plan, setPlan] = useState<Plan>(initialPlan);
  const [model, setModel] = useState(initialModel);
  const [effort, setEffort] = useState<Effort>("high");

  useEffect(() => {
    fetch("/data/claude-usage.json")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((j: UsageJson) => {
        setData(j);
        if (!j.rates[model]) {
          const first = Object.keys(j.rates)[0];
          if (first) setModel(first);
        }
      })
      .catch(() => setFailed(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const r = useMemo(() => (data ? compute(data, plan, model, effort) : null), [data, plan, model, effort]);
  const speed = useMemo(() => speedSeries(data?.speed), [data]);
  const speedSelected = speed.find((s) => s.model === model) ?? null;
  const speedLatest = speedSelected?.last ?? null;
  const speedMethod = data?.speed ? speedMethodSentence(data.speed) : null;
  const speedFast = data?.speed ? speedFastSessionRequestsLatest(data.speed) : null;
  const speedByAccount = useMemo(() => speedAccountSeries(data?.speed, model), [data, model]);
  const speedSpan = useMemo((): [string, string] | undefined => {
    const days = speed.flatMap((s) => s.runs.flat().map((d) => d.day)).sort();
    return days.length > 0 ? [days[0], days[days.length - 1]] : undefined;
  }, [speed]);
  const speedAccountList = useMemo(() => (data?.speed ? speedAccounts(data.speed) : []), [data]);
  const speedFirstBlock = data?.speed ? speedFirstBlockCaveat(data.speed) : null;
  const [contribMetric, setContribMetric] = useState<ContribMetric>(initialContribMetric);
  // Which plan chart the panel shows. The remembered choice is read after mount, so the prerender
  // and the first client render agree; storage can be missing or throw, and then the default holds.
  const [planChart, setPlanChart] = useState<PlanChart>(initialPlanChart);
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(PLAN_CHART_STORE);
      if (saved && PLAN_CHARTS.some((c) => c.key === saved)) setPlanChart(saved as PlanChart);
    } catch {
      /* no storage: keep the default */
    }
  }, []);
  const choosePlanChart = (c: PlanChart) => {
    setPlanChart(c);
    try {
      window.localStorage.setItem(PLAN_CHART_STORE, c);
    } catch {
      /* no storage: the choice lasts this visit only */
    }
  };
  const contribTab = CONTRIB_TABS.find((t) => t.key === contribMetric) ?? CONTRIB_TABS[0];
  const hasContribPoints = !!data?.contributed?.[plan]?.points?.length;
  const contributed = useMemo(
    () =>
      data
        ? contributorSentences(plan, data.contributed?.[plan], fleetUsdPerPercent(data, plan))
        : null,
    [data, plan],
  );
  // 5. What the plan table's ratios rest on, in the basis blocks' own figures.
  const ratioBasis = useMemo(() => {
    const pb = data?.plan_ratios_basis;
    const wb = data?.weekly_window_ratios_basis;
    if (!pb && !wb) return null;
    const mc = wb?.measured_confirmation;
    const url = pb?.source_url ?? wb?.source_url ?? null;
    return {
      kind: pb?.kind ?? wb?.kind ?? null,
      perWindow: perPlanText(pb?.credits_per_window),
      perWeek: perPlanText(wb?.credits_per_week),
      confirmation:
        mc && typeof mc.max5_over_max20 === "number"
          ? `Max 5x over Max 20x ${mc.max5_over_max20}${mc.spans ? `, ${mc.spans}` : ""}`
          : null,
      // The basis blocks say the table is undated; the reference block dates the same URL. The
      // date is the fact, so it wins wherever the two disagree (finding 4).
      undated: pb?.dated === false || wb?.dated === false,
      asOf: data ? basisDate(data, pb) ?? basisDate(data, wb) : null,
      url,
      urlText: url ? url.replace(/^https?:\/\//, "") : null,
    };
  }, [data]);
  const referenceChanges = data?.reference?.changes_since ?? [];
  const weeklySeries = useMemo(() => (data ? weeklySeriesFor(data) : []), [data]);
  const weeklyEvents = useMemo(() => (data ? weeklyEventsFor(data) : []), [data]);
  // Levels for every plan, not just the selected one: the chart draws all three, the selected
  // one solid and the others grey, each plan's own levels solid and the ones borrowed from another
  // plan dashed. A plan's windows per week is a property of the plan, so this chart does not
  // change with the model; a model's share of the week (Fable's half on Max) applies to the
  // per-week token and dollar figures instead.
  const weeklyLevels = useMemo(
    () =>
      data
        ? // Max 5x before Pro, so the line the two collapse into below keeps Max 5x's own measured
          // spans solid and reads "Max 5x and Pro".
          (["max5", "pro", "max20"] as Plan[])
            .map((pl) => ({
              plan: pl,
              label: PLAN_LABELS[pl],
              levels: weeklyRegimeLevelsFor(data, pl).map((l) => ({ ...l, value: l.windows })),
            }))
            .filter((p) => p.levels.length > 0)
            // Pro holds the same number of windows as Max 5x (it borrows its figures), so on
            // this chart the two are one line. Collapsed into a single labelled series rather
            // than drawn twice at identical y, which only stacks two labels on one line.
            .reduce<PlanLevels[]>((acc, cur) => {
              const same = acc.find(
                (a) =>
                  a.levels.length === cur.levels.length &&
                  a.levels.every((l, i) => l.value === cur.levels[i].value && l.start === cur.levels[i].start),
              );
              if (same) same.label = `${same.label} and ${PLAN_LABELS[cur.plan]}`;
              else acc.push(cur);
              return acc;
            }, [])
        : [],
    [data],
  );
  // The signed tokens-per-week figure for the newest weekly change, when the publisher measured
  // one: what the tokens-per-week chart's marker states instead of the step it happens to draw.
  const tokensPerWeekPct = useMemo(() => (data ? tokensPerWeekChangePct(data) : null), [data]);
  const weeklyTokenLevels = useMemo(
    () =>
      data
        ? (Object.keys(PLAN_LABELS) as Plan[])
            .map((pl) => ({
              plan: pl,
              label: PLAN_LABELS[pl],
              levels: weeklyTokenRegimeLevelsFor(data, pl, model).map((l) => ({ ...l, value: l.tokens })),
            }))
            .filter((p) => p.levels.length > 0)
        : [],
    [data, model],
  );
  // The window itself, held flat across the same regime dates: `credits.window_tokens` is one
  // published number, not a history, so every level in a plan's own series carries the same
  // value. Drawn with the tokens-per-week chart's own component so the two agree on how a flat
  // figure is drawn.
  const windowTokenLevels = useMemo(
    () =>
      data
        ? (Object.keys(PLAN_LABELS) as Plan[])
            .map((pl) => ({
              plan: pl,
              label: PLAN_LABELS[pl],
              levels: windowTokenRegimeLevelsFor(data, pl, model).map((l) => ({ ...l, value: l.tokens })),
            }))
            .filter((p) => p.levels.length > 0)
        : [],
    [data, model],
  );
  // One line per watched Max 20x account on each of the three plan charts, in the colours the
  // speed-by-account chart gives the same accounts.
  const windowAccountLines = useMemo(() => (data ? accountWindowTokenLines(data, model) : undefined), [data, model]);
  const weeklyTokenAccountLines = useMemo(() => (data ? accountWeeklyTokenLines(data, model) : undefined), [data, model]);
  const windowsAccountLines = useMemo(() => (data ? accountWindowLines(data) : undefined), [data]);
  // The readings behind the selected plan's levels, and the documented level beside them. Only a
  // plan's own readings: today that is Max 20x, so Pro and Max 5x get the reference alone.
  const weeklyOverlay = useMemo(() => (data ? weeklyReadingsFor(data, plan) : undefined), [data, plan]);
  const scaling = useMemo(() => (data ? planScaling(data) : null), [data]);
  // The credits block, and the hero's figures read off it on the selected plan's scale. Both are
  // null for a file published before the block existed, and every sentence below falls back to
  // the wording that file has always rendered.
  const credits = useMemo(() => (data ? creditsOf(data) : null), [data]);
  const cr = useMemo(() => (data ? computeCredits(data, plan, model, effort) : null), [data, plan, model, effort]);
  // The measured window in tokens: tokens per 1% of the five-hour meter over the clean pure-Opus
  // stretches, times 100. Every token figure on this route comes from here -- the hero, the
  // window section, the per-week card and the per-week chart -- so they cannot state one quantity
  // at two scales. Null for a file published before the block, which the page says in words.
  const wt = useMemo(() => (data ? computeWindowTokens(data, plan, model) : null), [data, plan, model]);
  // The models the contributors section can offer on the open tab: only those at least one of
  // this plan's readings has a figure for. The cost tab's figure covers every model together, so
  // it offers none. A model the readings lack would only draw an empty chart.
  const contribModels = useMemo(() => {
    if (!data || contribTab.key === "usd") return [];
    const points = data.contributed?.[plan]?.points ?? [];
    return modelsNewestFirst(pageModels(data, Object.keys(data.rates))).filter((m) =>
      points.some((p) => typeof contribTab.value(p, m) === "number"),
    );
  }, [data, plan, contribTab]);
  // The hero's model where the readings have it, otherwise the first they do have. The hero keeps
  // its own choice; only this section's dots, line and select move to the stand-in.
  const contribModel = contribModels.length === 0 || contribModels.includes(model) ? model : contribModels[0];
  const contribWt = useMemo(
    () => (contribModel === model ? wt : data ? computeWindowTokens(data, plan, contribModel) : null),
    [contribModel, model, wt, data, plan],
  );
  const changeSentences = useMemo(() => (data ? changeLines(data) : []), [data]);
  // How many accounts the passive readings rest on, in words. Null without the credits block, in
  // which case the page keeps saying "a real account" as it does today.
  const accountsWord =
    credits && typeof data?.passive_account_count === "number"
      ? data.passive_account_count === 1
        ? "one account"
        : `${data.passive_account_count} accounts`
      : null;
  const effortMix = credits?.effort_cache_mix ?? null;
  const effortCredits = credits?.effort_credits ?? null;
  // The effort table's own column order: Sonnet, Opus, Fable first (the plan's own progression),
  // then any other model key the file happens to publish, kept in whatever order the file gives
  // them so a new model never silently drops off the table.
  const EFFORT_MODEL_ORDER = ["claude-sonnet-5", "claude-opus-5", "claude-fable-5-1"];
  const effortModelOrder =
    effortMix && data
      ? pageModels(data, [
          ...EFFORT_MODEL_ORDER.filter((m) => m in effortMix),
          ...Object.keys(effortMix).filter((m) => !EFFORT_MODEL_ORDER.includes(m)),
        ])
      : [];
  // True once the credits block can state this model's window in credits. Everything the page
  // says about the meter, the API value it holds and the sessions it buys then comes from that one
  // block, so the hero, the chart headlines and the plan table cannot disagree. The token figures
  // come from `window_tokens` below, on their own route.
  const creditsRoute = !!cr && cr.usdIn !== null;
  // The hero's figures do not move with effort; the effort matrix's do. The picker goes where the
  // dependence is, and stays in the hero for a file whose JSON has no effort matrix (finding 2).
  const effortInHero = !(creditsRoute && effortMix);
  const effortSelect = (
    <span className="sel">
      <select aria-label="Effort" value={effort} onChange={(e) => setEffort(e.target.value as Effort)}>
        {EFFORTS.map((e) => (
          <option key={e} value={e}>{e}</option>
        ))}
      </select>
    </span>
  );
  // Each watched account's own windows per week, as values rather than as dots alone.
  const accountWeekly = data ? accountWindowsPerWeek(data, plan) : [];
  // How many runs each effort cell was measured over, for the caveat that used to name a number.
  const runCounts = effortRunCounts(effortMix);
  const documentedUrlText =
    data?.weekly_window_ratios_basis?.source_url?.replace(/^https?:\/\//, "") ?? "she-llac.com/claude-limits";
  const documentedAsOf = data ? basisDate(data, data.weekly_window_ratios_basis) : null;
  // The input and output API-value lines are the same window priced at each class's own rate, and
  // on every file so far they come to the same figure. Two identical lines read as two findings.
  const usdOneLine = !!(
    cr?.usdIn &&
    cr?.usdOut &&
    cr.usdIn.kind === cr.usdOut.kind &&
    cr.usdIn.text === cr.usdOut.text &&
    cr.usdIn.range === cr.usdOut.range
  );
  // What this family's row was priced at, in the credits block's own fields. A family the block
  // publishes a status for renders that sentence instead, with no number (finding 5).
  // The plan table's rows. Every quantity the credits block publishes comes from it, on the same
  // helper the hero uses, so a cell and the hero cannot state one quantity at two scales.
  const planTableRows: PlanTableRow[] = (() => {
    if (!data || !r) return [];
    const dash = (f: CreditFigureText | null | undefined) => (f ? f.text : "\u2014");
    // Tokens per window and per week are the measured window, whichever route the dollar and
    // session figures below take: one quantity, one figure, and the same one the hero states.
    const tokenRows: PlanTableRow[] = wt
      ? (
          [
            { label: "Tokens per 5-hour window", of: (w: WindowTokensView) => w.perWindow },
            { label: "Tokens per week", of: (w: WindowTokensView) => w.perWeek },
          ] as const
        ).map(({ label, of }) => ({
          label,
          cell: (p: Plan) => {
            const w = computeWindowTokens(data, p, model);
            return { text: dash(w ? of(w) : null), inferred: !!w?.weeklyInferred };
          },
        }))
      : [];
    if (creditsRoute && cr) {
      const pick: { label: string; of: (c: NonNullable<ReturnType<typeof computeCredits>>) => CreditFigureText | null }[] = [
        ...(cr.sessionsPerWindow ? [{ label: "Sessions per window", of: (c: NonNullable<ReturnType<typeof computeCredits>>) => c.sessionsPerWindow }] : []),
        ...(cr.sessionsPerWeek ? [{ label: "Sessions per week", of: (c: NonNullable<ReturnType<typeof computeCredits>>) => c.sessionsPerWeek }] : []),
        { label: "API value per 5-hour window", of: (c) => c.usdIn },
        ...(cr.usdInPerWeek ? [{ label: "API value per week", of: (c: NonNullable<ReturnType<typeof computeCredits>>) => c.usdInPerWeek }] : []),
      ];
      return [
        ...tokenRows,
        ...pick.map(({ label, of }) => ({
          label,
          cell: (p: Plan) => {
            const c = computeCredits(data, p, model)!;
            return { text: dash(of(c)), inferred: c.weeklyInferred };
          },
        })),
      ];
    }
    const rows: { label: string; of: (c: NonNullable<ReturnType<typeof compute>>) => string }[] = [
      ...(r.sessionsPerWindow !== null
        ? [
            {
              label: "Sessions per window",
              of: (c: NonNullable<ReturnType<typeof compute>>) =>
                c.sessionsPerWindow === null ? "\u2014" : c.sessionsPerWindow < 1 ? "< 1" : String(Math.round(c.sessionsPerWindow)),
            },
          ]
        : []),
      ...(r.sessionsPerWindow !== null && r.windowsPerWeek !== null
        ? [
            {
              label: "Sessions per week",
              of: (c: NonNullable<ReturnType<typeof compute>>) =>
                c.sessionsPerWeek === null ? "\u2014" : String(Math.round(c.sessionsPerWeek)),
            },
          ]
        : []),
      { label: "API value per 5-hour window", of: (c) => (c.apiValueUsd === null ? "\u2014" : fmtUsd(c.apiValueUsd)) },
      ...(r.windowsPerWeek !== null
        ? [
            {
              label: "API value per week",
              of: (c: NonNullable<ReturnType<typeof compute>>) =>
                c.apiValueUsdPerWeek === null ? "\u2014" : fmtUsd(c.apiValueUsdPerWeek),
            },
          ]
        : []),
    ];
    return [
      ...tokenRows,
      ...rows.map(({ label, of }) => ({
        label,
        cell: (p: Plan) => {
          const c = compute(data, p, model, effort)!;
          return { text: of(c), inferred: c.weeklyInferred };
        },
      })),
    ];
  })();
  const creditRateLine = (() => {
    if (!cr || cr.modelStatus || typeof cr.creditsPerTokenIn !== "number") return null;
    const rate = (n: number) => n.toFixed(3);
    const family = familyLabel(cr.family, model);
    const at = cr.familyAsOf ? `, as of ${fmtDate(cr.familyAsOf)}` : "";
    const lead =
      cr.rateSource === "measured"
        ? `Priced at the meter's measured ${family} rate${at}`
        : cr.rateSource === "reference"
          ? `Priced at the reference ${family} rate${at}`
          : cr.rateSource === "inferred"
            ? `Priced at an inferred ${family} rate${at}`
            : null;
    if (lead === null) return null;
    const iv = cr.creditsPerTokenInInterval;
    const interval =
      iv && typeof iv[0] === "number" && typeof iv[1] === "number" ? `, interval ${rate(iv[0])} to ${rate(iv[1])}` : "";
    // The reference figure is drawn beside the measurement, dated, and used in no arithmetic. It
    // is not repeated where it IS the rate, which would state the same number twice.
    const refRate = cr.rateSource === "measured" && typeof cr.referenceRateIn === "number" ? cr.referenceRateIn : null;
    const refName = data?.reference?.name ?? null;
    const reference =
      refRate === null || refName === null
        ? ""
        : `; ${refName}${data?.reference?.as_of ? `, as of ${fmtDate(data.reference.as_of)}` : ""}, says ${rate(refRate)}`;
    return `${lead}, ${rate(cr.creditsPerTokenIn)} credits per input token${interval}${reference}.`;
  })();
  const acrossCut = credits?.five_hour_window_across_cut ?? null;
  // The accounts whose capture column is empty, and the publisher's own sentence for what that
  // means. Paraphrasing a measurement caveat is how it gets weaker, so the sentence is lifted
  // out of the block's `method` rather than rewritten here.
  const emptyCapture = Object.entries(acrossCut?.per_account ?? {})
    .filter(([, a]) => a.n_with_capture === 0)
    .map(([label]) => label);
  const captureNote = captureEmptyNote(acrossCut?.method);
  const fromWeekly = credits?.window_credits_from_weekly ?? null;
  // How far the windows-per-week ratio moved across the change, from the same measured windows
  // the cross-check table below states. A stable account-specific scale cancels in this
  // within-account before/after ratio, which is why it is safe to publish where the raw spread
  // between accounts is not (audit finding, 2026-09-20).
  const weeklyRatioFellPct = (() => {
    const before = fromWeekly?.before?.windows_per_week_measured;
    const after = fromWeekly?.after?.windows_per_week_measured;
    if (typeof before !== "number" || typeof after !== "number" || before <= 0) return null;
    return ((before - after) / before) * 100;
  })();
  // The account-to-account gap in the same five-hour figure, from the accounts whose capture
  // column is usable (an empty one reads low, per the note above, and would widen this beyond
  // what the accounts themselves measured). Two accounts on the same plan reading apart is not,
  // on its own, evidence of a pricing or allowance difference between them.
  const acrossAccountGapPct = (() => {
    const values = Object.values(acrossCut?.per_account ?? {})
      .filter((a) => typeof a.after === "number" && a.n_with_capture > 0)
      .map((a) => a.after as number);
    if (values.length < 2) return null;
    const lo = Math.min(...values);
    const hi = Math.max(...values);
    if (lo <= 0) return null;
    return ((hi - lo) / lo) * 100;
  })();
  // Goal 7: the measured windows per week against the reference table's own, per plan, with the
  // announced changes since that table applied. A comparison, never an input to a figure here.
  const shortfall = data?.reference?.shortfall ?? null;
  const shortfallPlans = data ? shortfallRows(data) : [];
  const perWeekFmt = (v: number | null | undefined) => (typeof v === "number" ? v.toFixed(2) : "\u2014");
  // A stretch that overlaps one of the tracker's own runs is dropped, so the figures describe
  // ordinary working days and not the tracker measuring itself. The count says how many.
  const harnessExcluded = credits?.harness_runs_excluded?.length ?? null;
  const fableInterval = credits?.fable_interval ?? null;
  // Which plans' current weekly figure is inferred from another plan, and the cut it dates from.
  const inferredPlans = data
    ? (Object.keys(PLAN_LABELS) as Plan[]).filter((p) => compute(data, p, model, effort)?.weeklyInferred)
    : [];
  const weeklyCut = latestWeeklyChange(weeklyEvents);
  const max5History = data?.weekly_windows?.max5?.regimes ?? [];
  const monthOf = (iso: string) => fmtDate(iso.slice(0, 10)).split(" ")[1];
  const max5Span =
    max5History.length > 0 ? ` (${monthOf(max5History[0].start)}\u2013${monthOf(max5History[max5History.length - 1].end)})` : "";
  const inferredNote = `The Max 5x history${max5Span} is measured; its current figure is inferred from Max 20x${
    weeklyCut ? ` since the ${fmtDate(weeklyCut.date).slice(0, -5)} cut` : ""
  }, and Pro is inferred the same way.`;
  const h = data ? headline(data) : null;
  // Localise only after mount: the prerender must emit the same text the first client render produces.
  const [localTime, setLocalTime] = useState<string | null>(null);
  // The stale line depends on the clock, so without a fixed `now` it is decided after mount, never
  // in the prerender. Whether it shows and the date it gives both follow the selected figure's own
  // evidence, not when the file was built or another model's reading (finding 16).
  const [staleAt, setStaleAt] = useState<string | null>(() =>
    now !== undefined && initial ? staleEvidenceAt(initial, initialModel, now) : null,
  );
  useEffect(() => {
    setStaleAt(data ? staleEvidenceAt(data, model, now ?? Date.now()) : null);
  }, [data, model, now]);
  // An account whose feed has stopped can leave a figure looking current. Decided after mount
  // like the stale line, so the prerender matches the first client render.
  const [stoppedLine, setStoppedLine] = useState<string | null>(() =>
    now !== undefined && initial ? stoppedFeedsLine(initial) : null,
  );
  useEffect(() => {
    setStoppedLine(data ? stoppedFeedsLine(data) : null);
  }, [data]);
  useEffect(() => {
    // "Last sample" means the meter reading, so show when the meter was last read.
    // The old pair is the fallback for JSON published before meter_read_at existed, and
    // both are the wrong answer to the label: last_sample_at is the end of the newest
    // completed measurement, hours behind a meter read every few minutes, and
    // passive_generated_at is when a file was rebuilt on another host.
    const meterT = data?.meter_read_at ? Date.parse(data.meter_read_at) : NaN;
    const lastSampleT = data?.last_sample_at ? Date.parse(data.last_sample_at) : NaN;
    const passiveT = data?.passive_generated_at ? Date.parse(data.passive_generated_at) : NaN;
    const newestT = Number.isFinite(meterT) ? [meterT] : [lastSampleT, passiveT].filter(Number.isFinite);
    setLocalTime(
      newestT.length > 0
        ? new Date(Math.max(...newestT)).toLocaleString([], { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
        : null,
    );
  }, [data]);
  // A failed refresh is not fatal while the build-time snapshot is still usable. A schema 2 rate
  // with no eligible measurement publishes null figures, and nothing stands in for them (finding
  // 13): the page has no figure of any route left to show, so it says so.
  const unavailable =
    (failed && data === null) ||
    (data !== null && (r === null || (r.included && r.apiValueUsd === null && wt === null)));
  const limit = data ? modelPlanLimit(data, model, plan) : null;
  const notIncluded = limit?.source_url ? (
    <>
      {modelLabel(model)} is <a href={limit.source_url}>not included</a> with {PLAN_LABELS[plan]}.
    </>
  ) : (
    <>
      {modelLabel(model)} is not included with {PLAN_LABELS[plan]}.
    </>
  );

  return (
    <PageShell>
      <Seo
        title="Claude Usage Tracker: what a Max plan actually buys | All Done Sites"
        description={`Measured daily from ${accountsWord ?? "a real account"}: how many tokens a Claude Max 20x plan buys per 5-hour window, and when that changes.`}
        canonical={`${SITE}/claude-usage-tracker/`}
        image={`${SITE}/og1200x630_v2.jpg`}
      />
      <div className="cut">
        <div className="hero">
          <div className="lockup">
            <svg viewBox="0 0 24 24">
              <path d="M12 1.5l1.6 6.2 4.6-4.4-3 5.6 6.3-.4-5.8 2.5 5.8 2.5-6.3-.4 3 5.6-4.6-4.4L12 22.5l-1.6-6.2-4.6 4.4 3-5.6-6.3.4 5.8-2.5-5.8-2.5 6.3.4-3-5.6 4.6 4.4z" />
            </svg>
            <b>Claude</b> <small>usage tracker</small>
          </div>
          {unavailable && <h1>Data temporarily unavailable.</h1>}
          {!unavailable && h && (
            <h1
              dangerouslySetInnerHTML={{
                __html: h.text
                  .replace(/(increased|decreased)/, `<span class="${h.tone === "down" ? "down" : "up"}">$1</span>`)
                  .replace(/(\d+%)/, `<span class="${h.tone === "down" ? "down" : "up"}">$1</span>`)
                  .replace(/Claude/, `<span class="claude">Claude</span>`),
              }}
            />
          )}
          {/* The #78 hero has nothing between the h1 and the pill row (Jonathan's decision,
              2026-09-20). What the headline figure was measured either side of, Anthropic's own
              figure for the same change, and -- where the stretches cannot separate the two
              meters -- that they cannot: moved into "The five-hour window across the change" at
              the bottom, where it still renders in full. */}
          {!unavailable && data && (
            <div className="pillrow">
              {localTime && (
                <div className="pill">
                  <i />
                  <span>Last sample {localTime}</span>
                </div>
              )}
              <a className="stats-cta desk" href="#contribute">See your own stats &darr;</a>
            </div>
          )}
          <NotifyForm />
          {!unavailable && data && r && (
            <>
              <div className="sentence">
                On{" "}
                <span className="sel">
                  <select aria-label="Plan" value={plan} onChange={(e) => setPlan(e.target.value as Plan)}>
                    {(Object.keys(PLAN_LABELS) as Plan[]).map((p) => (
                      <option key={p} value={p}>{PLAN_LABELS[p]}</option>
                    ))}
                  </select>
                </span>
                , running{" "}
                <span className="sel">
                  <select aria-label="Model" value={model} onChange={(e) => setModel(e.target.value)}>
                    {modelsNewestFirst(pageModels(data, Object.keys(data.rates))).map((m) => (
                      <option key={m} value={m}>{modelLabel(m)}</option>
                    ))}
                  </select>
                </span>
                {effortInHero ? (
                  <>
                    {" "}
                    at {effortSelect} effort
                  </>
                ) : null}
                {r.included ? ", you get" : ""}
              </div>
              {!r.included && <div className="quiet">{notIncluded}</div>}
              {r.included && (
                <>
                  {/* The headline is the measured window: the tokens the five-hour meter holds,
                      counted on the clean pure-Opus stretches. No rate and no class weight enter
                      it, and nothing stands in for it -- a file that does not publish it says so
                      rather than falling back to the list-price arithmetic it replaced. */}
                  {wt?.perWindow ? (
                    <>
                      <HeroFigure fig={wt.perWindow} unit="tokens per 5-hour window" statusUnit="tokens per 5-hour window" />
                      {/* An inferred rate's figures are marked in words, as the plan table marks an
                          inferred plan's, and draw no range. */}
                      {wt.inferredNote && wt.perWindow.kind === "value" && (
                        <div className="quiet">{wt.inferredNote}</div>
                      )}
                    </>
                  ) : (
                    <div className="rate">
                      <span>tokens per 5-hour window: <b>window tokens not yet published</b></span>
                    </div>
                  )}
                  {/* What those tokens were, by class, on the family they were measured on. The
                      cache-read share is published beside them, so the line divides nothing. */}
                  {wt && wt.perClass.length > 0 && (
                    <div className="split">
                      {wt.perClass.map(({ cls, fig }, i) => (
                        <span key={cls}>
                          {i > 0 && <em>·</em>}
                          <b>{fig.text}</b>{" "}
                          {cls === "cache_read"
                            ? `cache reads${wt.cacheReadShare !== null ? ` (${fmtShare(wt.cacheReadShare)})` : ""}`
                            : cls === "cache_write"
                              ? "cache writes"
                              : cls === "output"
                                ? "output"
                                : "fresh input"}
                        </span>
                      ))}
                    </div>
                  )}
                  {/* The credits route: what the meter charges for that window, what it is worth
                      at API list price, and the sessions it buys. The dollar route below is what
                      the page showed before the block existed. */}
                  {cr && cr.usdIn ? (
                    <>
                      {cr.usdIn && (
                        <HeroFigure
                          fig={cr.usdIn}
                          unit={
                            usdOneLine
                              ? "of API value per window, the same window priced at each class's own rate"
                              : "of API value per window in input tokens"
                          }
                          statusUnit={
                            usdOneLine
                              ? "API value per window, the same window priced at each class's own rate"
                              : "API value per window in input tokens"
                          }
                          usd
                        />
                      )}
                      {cr.usdOut && !usdOneLine && (
                        <FigureLine
                          fig={cr.usdOut}
                          unit="of API value per window in output tokens"
                          statusUnit="API value per window in output tokens"
                        />
                      )}
                      {/* The credits-per-window figure (range, n, account count, per-account
                          shortfall note) moved to "How the price and the window are measured"
                          at the bottom -- not deleted, just not above the fold (Jonathan's
                          decision, 2026-09-20). */}
                      {(cr.sessionsPerWindow || cr.sessionsPerWeek) && (
                        <div className="rate">
                          {cr.sessionsPerWindow && (
                            <span>
                              <Fig fig={cr.sessionsPerWindow} unit="sessions per window" lead="about" />
                              {cr.sessionsPerWindow.range ? ` (${cr.sessionsPerWindow.range})` : ""}
                            </span>
                          )}
                          {cr.sessionsPerWindow && cr.sessionsPerWeek && <em className="brk">·</em>}
                          {cr.sessionsPerWeek && (
                            <span>
                              <Fig fig={cr.sessionsPerWeek} unit="per week" />
                              {cr.sessionsPerWeek.range ? ` (${cr.sessionsPerWeek.range})` : ""}
                            </span>
                          )}
                        </div>
                      )}
                      {/* The sessions figures are cache-normalised: cache reads cost nothing
                          against the meter, so the same window bought cold is worth far fewer
                          tokens. The split they assume, the split source and the cache-
                          normalisation note moved to "How the price and the window are
                          measured" at the bottom -- not deleted (Jonathan's decision,
                          2026-09-20). */}
                      {/* What the credits block says about its own figures: how the window was
                          measured, and what this family's row was priced at. Not another block's
                          date (finding 5). */}
                      {/* The window's own method, what this family's row was priced at, the
                          account and per-chart-legend detail: moved out of the hero into "How
                          the figures are measured" at the bottom (Jonathan's decision,
                          2026-09-20). Every figure still renders, just further down the page. */}
                    </>
                  ) : (
                    <>
                      {r.apiValueUsd !== null && (
                        <div className="big usd">
                          {fmtUsd(r.apiValueUsd)}
                          <span>of API value per 5-hour window</span>
                        </div>
                      )}
                      {(r.sessionsPerWindow !== null || r.apiValueUsdPerWeek !== null) && (
                        <div className="rate">
                          {r.sessionsPerWindow !== null && r.sessionsPerWeek !== null && (
                            <>
                              <span>
                                about <b>{Math.round(r.sessionsPerWindow)}</b> sessions<em>·</em>
                                <b>{Math.round(r.sessionsPerWeek)}</b> per week
                              </span>
                              {r.apiValueUsdPerWeek !== null && <em className="brk">·</em>}
                            </>
                          )}
                          {r.apiValueUsdPerWeek !== null && (
                            <span>
                              <b>{fmtUsd(r.apiValueUsdPerWeek)}</b> of API value per week
                            </span>
                          )}
                        </div>
                      )}
                    </>
                  )}
                  {!creditsRoute && fmtSource(data.rates[model]) && (
                    <div className="quiet">Source: {fmtSource(data.rates[model])}</div>
                  )}
                  {/* The "a week holds about N windows" sentence moved to "How many windows fit
                      in a week" at the bottom -- not deleted (Jonathan's decision, 2026-09-20).
                      Fable's half-week cap (audit finding 2) stays in the hero: it is not one of
                      the five moved sentences. */}
                  {r.planWindowsPerWeek !== null && r.weeklyFraction < 1 && (
                    <div className="quiet">
                      {modelLabel(model)} may use{" "}
                      {limit?.source_url ? (
                        <a href={limit.source_url}>{Math.round(r.weeklyFraction * 100)}% of the weekly limit</a>
                      ) : (
                        `${Math.round(r.weeklyFraction * 100)}% of the weekly limit`
                      )}
                      .
                    </div>
                  )}
                  {staleAt && <div className="stale">Last measured {fmtDate(staleAt.slice(0, 10))}.</div>}
                  {stoppedLine && <div className="stale">{stoppedLine}</div>}
                </>
              )}
            </>
          )}
        </div>

        {!unavailable && data && (
          <section id="plan-charts">
            {/* One panel for the three plan charts, one shown at a time. Every panel is rendered
                and the others hidden, so the prerendered page still carries all three charts'
                figures and switching does not re-mount a chart. */}
            <div className="chart-tabs plan-chart-tabs" role="tablist" aria-label="Plan chart">
              {PLAN_CHARTS.map((c) => (
                <button
                  key={c.key}
                  id={`plan-chart-tab-${c.key}`}
                  type="button"
                  role="tab"
                  aria-selected={c.key === planChart}
                  aria-controls={`plan-chart-${c.key}`}
                  tabIndex={c.key === planChart ? 0 : -1}
                  className={c.key === planChart ? "on" : undefined}
                  onClick={() => choosePlanChart(c.key)}
                  onKeyDown={(e) => {
                    const next = planChartForKey(c.key, e.key);
                    if (next === null) return;
                    e.preventDefault();
                    choosePlanChart(next);
                    document.getElementById(`plan-chart-tab-${next}`)?.focus();
                  }}
                >
                  {c.label}
                </button>
              ))}
            </div>
            <div role="tabpanel" id="plan-chart-window" aria-labelledby="plan-chart-tab-window" hidden={planChart !== "window"}>
                <h2>Effective window size</h2>
                <div className="sub">
                  {PLAN_LABELS[plan]} · {modelLabel(model)} tokens per 5-hour window. Full history.
                </div>
                {/* The same measured window the hero states, from the same published figure, so this
                    section and the hero cannot disagree. There is no reading series beneath it: the
                    window is measured on the stretches the block names, not read off a daily list-price
                    history, and that history is not a second answer to this question (wf-60). The chart
                    below is a flat line for the same reason: `credits.window_tokens` publishes one
                    number, not a series, so it is held at that one value across the regime dates the
                    windows-per-week chart uses (there is no per-day range to toggle any more; a range
                    toggle here would slice a line that never changes). */}
                {r && !r.included ? (
                  <p className="sub">{notIncluded}</p>
                ) : (
                  <>
                    <div className="rate">
                      <span>
                        {wt?.perWindow ? (
                          <>
                            <Fig fig={wt.perWindow} unit="tokens per 5-hour window" />
                            {wt.perWindow.range ? ` (${wt.perWindow.range})` : ""}
                            {wt.inferredNote && wt.perWindow.kind === "value" && (
                              <em>{wt.inferredNote}</em>
                            )}
                          </>
                        ) : (
                          <>tokens per 5-hour window: <b>window tokens not yet published</b></>
                        )}
                      </span>
                      {cr?.sessionsPerWindow && (
                        <>
                          <em className="brk">·</em>
                          <span>
                            <Fig fig={cr.sessionsPerWindow} unit="sessions" />
                          </span>
                        </>
                      )}
                    </div>
                    {windowTokenLevels.some((p) => p.levels.length > 0) && (
                      <LevelChart
                        levelsByPlan={windowTokenLevels}
                        // Markers only where this chart's own levels step: no announced event, so a
                        // flat window (which meter moved is unresolved) draws no marker on a line that
                        // never actually stepped.
                        events={[]}
                        selectedPlan={plan}
                        fmtValue={fmtTokens}
                        plotRight={732}
                        title="Effective window size over time"
                        changeFromLevels
                        accountLines={windowAccountLines}
                        missingFor={modelLabel(model)}
                        shown={planChart === "window"}
                      />
                    )}
                  </>
                )}
            </div>
            <div role="tabpanel" id="plan-chart-tokens" aria-labelledby="plan-chart-tab-tokens" hidden={planChart !== "tokens"}>
                <h2>Tokens per week</h2>
                <p className="sub">
                  {PLAN_LABELS[plan]} · {modelLabel(model)} · how many tokens a full week of five-hour windows
                  buys. Full history.
                </p>
                {/* The same notice as the window chart: another plan's line under this plan's heading would
                    read as this plan's figure (audit finding 2, kept). */}
                {r && !r.included ? (
                  <p className="sub">{notIncluded}</p>
                ) : (
                  <>
                    {/* The measured window a week of windows holds: the published per-week figure,
                        on this plan's own windows per week. The chart below draws the same figure at
                        each regime's windows, so the card and the chart cannot disagree. */}
                    <div className="rate">
                      <span>
                        {wt?.perWeek ? (
                          <>
                            <Fig fig={wt.perWeek} unit="tokens per week" />
                            {wt.perWeek.range ? ` (${wt.perWeek.range})` : ""}
                          </>
                        ) : (
                          <>tokens per week: <b>window tokens not yet published</b></>
                        )}
                      </span>
                      {cr?.sessionsPerWeek && (
                        <>
                          <em className="brk">·</em>
                          <span>
                            <Fig fig={cr.sessionsPerWeek} unit="sessions" />
                          </span>
                        </>
                      )}
                    </div>
                    <LevelChart
                      levelsByPlan={weeklyTokenLevels}
                      events={weeklyEvents}
                      selectedPlan={plan}
                      fmtValue={fmtTokens}
                      plotRight={732}
                      title="Tokens per week over time"
                      changeFromLevels
                      accountLines={weeklyTokenAccountLines}
                      missingFor={modelLabel(model)}
                      shown={planChart === "tokens"}
                      // This chart's quantity is tokens a week buys, so its marker states the
                      // published tokens-per-week figure where there is one. The windows-per-week
                      // chart below keeps its own windows-per-week figure.
                      changePct={tokensPerWeekPct}
                    />
                  </>
                )}
            </div>
            <div role="tabpanel" id="plan-chart-windows" aria-labelledby="plan-chart-tab-windows" hidden={planChart !== "windows"}>
                <h2>Five-hour windows per week</h2>
                <p className="sub">
                  How many 5-hour windows fit in one week, read from the usage meter. Full history.
                </p>
                {r && !r.included ? (
                  <p className="sub">{notIncluded}</p>
                ) : (
                  <>
                    {r && r.planWindowsPerWeek !== null && (
                      <div className="rate">
                        <span>
                          <b>{r.planWindowsPerWeek.toFixed(1)}</b> five-hour windows per week
                        </span>
                      </div>
                    )}
                    <LevelChart
                      levelsByPlan={weeklyLevels}
                      events={weeklyEvents}
                      selectedPlan={plan}
                      fmtValue={(v) => v.toFixed(1)}
                      plotRight={732}
                      title="Five-hour windows per week over time"
                      overlay={weeklyOverlay}
                      changeFromLevels
                      accountLines={windowsAccountLines}
                      missingFor="five-hour windows per week"
                      shown={planChart === "windows"}
                    />
                  </>
                )}
            </div>
            <p className="stats-cta-row mob">
              <a className="stats-cta" href="#contribute">See your own stats &darr;</a>
            </p>
          </section>
        )}

        {/* How fast each model answers, from the block tracker PR #87 publishes. Figures only:
            the chart, the selected model's latest day, and the block's own method and caveats.
            An older file has no block, and the section is not drawn at all. */}
        {!unavailable && data?.speed && speed.length > 0 && (
          <section id="speed">
            <div className="h2row">
              <h2>How fast each model answers</h2>
              <div className="section-sel">
                <span className="sel">
                  <select aria-label="Model" value={model} onChange={(e) => setModel(e.target.value)}>
                    {modelsNewestFirst(pageModels(data, Object.keys(data.rates))).map((m) => (
                      <option key={m} value={m}>{modelLabel(m)}</option>
                    ))}
                  </select>
                </span>
              </div>
            </div>
            <p className="sub">
              Median output tokens per second, per UTC day, one line per model.
              {speedSelected ? ` The band is ${modelLabel(model)}'s interquartile range.` : ""}
            </p>
            {speedLatest ? (
              <div className="rate">
                <span>
                  <b>{speedLatest.output_tokens_per_s.median.toFixed(1)}</b> output tokens per second
                  {` (${speedLatest.output_tokens_per_s.q1.toFixed(1)} to ${speedLatest.output_tokens_per_s.q3.toFixed(1)})`}
                </span>
                {speedLatest.time_to_first_block_s && (
                  <>
                    <em className="brk">·</em>
                    <span>
                      <b>{speedLatest.time_to_first_block_s.median.toFixed(1)} s</b> to first block
                      {` (${speedLatest.time_to_first_block_s.q1.toFixed(1)} to ${speedLatest.time_to_first_block_s.q3.toFixed(1)} s)`}
                    </span>
                  </>
                )}
                <em className="brk">·</em>
                <span>
                  {modelLabel(model)}, {speedLatest.n.toLocaleString("en-GB")} requests on {fmtDate(speedLatest.day)}
                </span>
              </div>
            ) : (
              <div className="rate">
                <span>No speed figures for {modelLabel(model)} yet.</span>
              </div>
            )}
            <SpeedChart series={speed} selectedModel={model} />
            {speedMethod && <p className="sub speed-note">{speedMethod}</p>}
            {/* A count of 0 says nothing a reader needs, so the line shows only when there is one. */}
            {speedFast && speedFast.count > 0 && (
              <p className="sub speed-note">
                Requests at about 2x usual speed: {speedFast.count.toLocaleString("en-GB")} on {fmtDate(speedFast.day)}.
              </p>
            )}
            {speedFirstBlock && <p className="sub speed-note">{speedFirstBlock}</p>}
            {speedAccountList.length > 0 && (
              <>
                <h3 className="speed-sub">{modelLabel(model)} by account</h3>
                <p className="sub">Median output tokens per second, per UTC day, one line per account.</p>
                <SpeedByAccountChart series={speedByAccount.series} missing={speedByAccount.missing} model={model} span={speedSpan} />
              </>
            )}
          </section>
        )}

        {!unavailable && data && r && (
          <section>
            <h2>Plan comparison</h2>
            <div className="sub">
              {modelLabel(model)}
              {creditsRoute ? "" : ` at ${effort} effort`}. Max 20x is measured; Pro and Max 5x are scaled from it by{" "}
              {scaling?.credits ? `the credits table, ${scaling.perWindow} per five-hour window` : `Anthropic's published ${planScaling(data, ":").perWindow} ratios`}.
            </div>
            <table>
              <thead>
                <tr>
                  <th></th>
                  {(Object.keys(PLAN_LABELS) as Plan[]).map((p) => (
                    <th key={p} className={p === plan ? "hl" : ""}>{PLAN_LABELS[p]}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {planTableRows.map((rw) => (
                  <tr key={rw.label}>
                    <td>{rw.label}</td>
                    {(Object.keys(PLAN_LABELS) as Plan[]).map((p) => {
                      const { text, inferred } = rw.cell(p);
                      return (
                        <td key={p} className={p === plan ? "hl" : ""}>
                          {text}
                          {/* The table's form of the dashed line the weekly charts draw for an inferred level,
                              and every figure of a model priced at an inferred rate. */}
                          {text !== "\u2014" && ((rw.label.endsWith("per week") && inferred) || cr?.rateInferred) && (
                            <>
                              {" "}
                              <em>inferred</em>
                            </>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
            {/* The weekly-measurement note and the ratio-table basis footnote moved to
                "Cross-check against the announced caps" at the bottom -- not deleted
                (Jonathan's decision, 2026-09-20). */}
          </section>
        )}

        {!unavailable && data && contributed && (
          <section id="contributors">
            {/* The same pickers as the hero, so a reader comparing their own plan does not have
                to scroll back up. Plan picks whose readings are plotted. On the two token tabs,
                model picks each reading's own figure for that model and the tracker's line for
                it, and lists only the models the readings have figures for. The cost tab has no
                model picker: its figure is the meter's dollars per 1% across every model. */}
            <h2>From contributors</h2>
            <p className="sub">{contributed.intro}</p>
            {hasContribPoints && (
              <>
                <div className="chart-tabs" role="tablist" aria-label="Contributor chart">
                  {CONTRIB_TABS.map((t) => (
                    <button
                      key={t.key}
                      type="button"
                      role="tab"
                      aria-selected={t.key === contribTab.key}
                      className={t.key === contribTab.key ? "on" : undefined}
                      onClick={() => setContribMetric(t.key)}
                    >
                      {t.label}
                    </button>
                  ))}
                  {/* Plan chooses whose readings are plotted, always. Model appears only on the
                      token tabs, lists only models the readings cover, and puts the dots and the
                      tracker's line on the same model; where the hero's model is not among them
                      it shows the first that is, without changing the hero. No effort picker:
                      nothing on these charts depends on effort, and a reading does not carry it. */}
                  <div className="section-sel">
                    <span className="sel">
                      <select aria-label="Plan" value={plan} onChange={(e) => setPlan(e.target.value as Plan)}>
                        {(Object.keys(PLAN_LABELS) as Plan[]).map((p) => (
                          <option key={p} value={p}>{PLAN_LABELS[p]}</option>
                        ))}
                      </select>
                    </span>
                    {contribModels.length > 0 && (
                      <span className="sel">
                        <select aria-label="Model" value={contribModel} onChange={(e) => setModel(e.target.value)}>
                          {contribModels.map((m) => (
                            <option key={m} value={m}>{modelLabel(m)}</option>
                          ))}
                        </select>
                      </span>
                    )}
                  </div>
                </div>
                <ContributorsChart
                  points={data.contributed[plan]!.points!}
                  tab={contribTab}
                  reference={contribTab.reference(contribWt, fleetUsdPerPercent(data, plan))}
                  model={contribModel}
                />
              </>
            )}
            {/* The cost sentence belongs to the cost chart, so it follows its own tab rather than
                sitting under whichever chart happens to be open. */}
            {contributed.cost && (!hasContribPoints || contribTab.key === "usd") && (
              <p className="sub">{contributed.cost}</p>
            )}
          </section>
        )}

        <section id="contribute">
          <h2>Contribute your own meter</h2>
          <ContributeMeter />
        </section>

        {/* 4. The effort matrix. Each cell is what one calibration task costs at that effort, and
            beside it the cache state of the runs it was measured over: a cold run writes cache
            where a warm one reads it, and the meter charges nothing for a cache read, which is
            why a model's low cell can read dearer than its medium one. */}
        {!unavailable && data && effortMix && (
          <section>
            <div className="h2row">
              <h2>Effort</h2>
              {/* The figures here are the only ones on the page that move with effort, so the
                  picker sits with them rather than over the hero's window (finding 2). */}
              {!effortInHero && <div className="section-sel">{effortSelect}</div>}
            </div>
            <p className="sub">
              One calibration task at each effort level, with the cache-read share and the run count of the
              cell it was measured over{effortCredits ? `, and what the cell's own runs cost against a ${PLAN_LABELS[plan]} window` : ""}.
              {effortCredits && cr?.windowCredits?.kind === "value" && (
                <>
                  {" "}A credit is the unit Claude's usage meter counts. One {PLAN_LABELS[plan]} five-hour window is{" "}
                  <b>{cr.windowCredits.text}</b> credits.
                </>
              )}
            </p>
            <table className="effort">
              <thead>
                <tr>
                  <th></th>
                  {effortModelOrder.map((m) => (
                    <th key={m} className={m === model ? "hl" : ""}>{modelLabel(m)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...EFFORTS].reverse().map((e) => (
                  <tr key={e}>
                    <td data-effort={e} className={e === effort ? "hl" : ""}>{e}</td>
                    {effortModelOrder.map((m) => {
                      const usd = data.effort_usd?.[m]?.[e];
                      const tokens = data.effort[m]?.[e];
                      const cell = effortMix[m]?.[e];
                      const ec = effortCredits ? computeCredits(data, plan, m, e)?.effortCredits ?? null : null;
                      const hl = m === model && e === effort ? "hl" : "";
                      return (
                        <td key={m} data-model={m} data-model-label={modelLabel(m)} className={hl}>
                          {/* One element, so the stacked phone layout keeps the figure and its unit
                              in one grid cell. */}
                          <span>
                            <b className="fig">
                              {typeof usd === "number" ? fmtUsd2(usd) : typeof tokens === "number" ? fmtTokens(tokens) : "—"}
                            </b>
                            {typeof usd === "number" ? " at API prices" : typeof tokens === "number" ? " tokens" : ""}
                          </span>
                          {ec?.credits && (
                            <div>
                              <em>
                                <span className="nowrap">
                                  <Fig fig={ec.credits} unit="credits" />
                                </span>
                                {ec.credits.kind === "value" && ec.percentOfWindow && (
                                  <span className="nowrap">
                                    {" · "}
                                    <Fig fig={ec.percentOfWindow} unit="of the window" />
                                  </span>
                                )}
                              </em>
                            </div>
                          )}
                          {cell && (
                            <div>
                              <em>
                                {typeof cell.cache_read_share === "number" ? `${fmtShare(cell.cache_read_share)} cache read` : "no cache share"}
                                {typeof cell.runs === "number" && (
                                  <span className="nowrap">{` · ${cell.runs} runs`}</span>
                                )}
                                {typeof cell.cold_cache_runs === "number" && (
                                  <span className="nowrap">{` · ${cell.cold_cache_runs} cold`}</span>
                                )}
                              </em>
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        <section>
          <details>
            <summary>How we measure this</summary>
            <p>
              Every morning the tracker reads two things off each Max 20x account it watches
              {data?.passive_account_count ? ` (${data.passive_account_count === 1 ? "one account" : `${data.passive_account_count} accounts`} with usable readings today)` : ""}
              : the Claude Code transcripts of the work actually done on it, and that account's own usage meter. Between
              any two meter readings it knows how far the meter moved and which tokens were spent moving it, and that
              gives a price for one percent of the five-hour window. Readings from every account are pooled by day.
              Nothing is run to produce these numbers. They come out of ordinary working days.
            </p>
            <p>
              The meter does not treat every token the same. Cache reads cost nothing against it. Input, output and
              cache writes are charged at Anthropic's list price
              {credits ? "" : ", the output rate fitted from 60 measured stretches of real work"}. So every reading here
              is an API-dollar value per percent of meter.{" "}
              {credits?.window_tokens
                ? "The token figures are not converted from it: they are the tokens those same stretches carried, counted per percent of the meter."
                : "The token counts are that value converted back through the token mix of real sessions."}{" "}
              The effort figures come from one calibration task, run at each effort level on each model.
            </p>
            <p>
              The weekly limit is measured the same way, per five-hour window: how far the seven-day meter moves for
              each full window spent. A change is dated to the day it lands rather than averaged into a calendar week.
            </p>
            {wt?.conversion && (
              <p>
                Fable and Sonnet window figures are the Opus window converted at the two families' measured input
                rates, at the same token-class mix.
              </p>
            )}
          </details>
          <details>
            <summary>Caveats</summary>
            <p>
              Token figures depend on the token mix. Because cache reads cost nothing against the meter, cache-heavy
              work gets far more tokens per window than cache-light work for the same dollar value. The split shown is
              one account's real mix; yours will differ, and the dollar figure is the one that carries across. The meter
              reports whole percent, so each reading carries up to a percent's worth of rounding.
            </p>
            <p>
              The tokens and dollars per window for Pro and Max 5x are{" "}
              {scaling?.credits
                ? `scaled from Max 20x by the credits table: ${scaling.perWindow} per five-hour window${
                    scaling.perWeek ? ` and ${scaling.perWeek} per week` : ""
                  } (${documentedUrlText}${documentedAsOf ? `, as of ${fmtDate(documentedAsOf)}` : ", undated"}).`
                : "scaled from Max 20x by Anthropic's published plan ratios."}{" "}
              {inferredPlans.includes("max5")
                ? `The weekly window counts are measured on Max 20x. ${inferredNote}`
                : `The weekly window counts are not: Max 20x and Max 5x are both measured from ${accountsWord ?? "real accounts"}, Max 5x from the period one of them spent on that plan, and only Pro is assumed, from Max 5x.`}
            </p>
            <p>
              The effort figures describe one task shape,{" "}
              {runCounts.length === 1
                ? `run ${runCounts[0]} times at each effort level on each model`
                : runCounts.length > 1
                  ? "run the number of times each cell of the matrix above prints"
                  : "run seven times at each effort level on each model"}
              . On Sonnet the spread between runs is wider than the gap between low, medium and high, so read those
              three rows as roughly equal rather than in order.
            </p>
            {credits && (
              <p>
                {harnessExcluded !== null
                  ? `${harnessExcluded} harness ${harnessExcluded === 1 ? "run is" : "runs are"} excluded from the stretches behind these figures. `
                  : ""}
                {fableInterval?.status
                  ? `${MODEL_LABELS["claude-fable-5-1"] ?? "Fable"}'s credit rate: ${fableInterval.status}${
                      typeof fableInterval.input_low === "number" && typeof fableInterval.input_high === "number"
                        ? `, ${fableInterval.input_low} to ${fableInterval.input_high} credits per input token`
                        : ""
                    }${
                      typeof fableInterval.window_credits_per_pct === "number"
                        ? `, solved against a window of ${fmtCredits(fableInterval.window_credits_per_pct)} credits per 1% of the meter`
                        : ""
                    }.`
                  : ""}
              </p>
            )}
            <p>
              This method is only as good as what it can see. Work done away from the machine being read moves the meter
              with no transcript to match it. Where that is obvious, because the meter moved with no transcripts at all,
              the stretch is dropped. Partial use elsewhere is not obvious, and it reads as a cheap day.
            </p>
            <p>
              The current figure does not wait for a week to finish. It is measured from the five-hour windows since the
              last confirmed change, so a step is dated to the day it landed rather than blended into a week's average.
            </p>
            <p>
              Every number on this page comes from the JSON at{" "}
              <a href="/data/claude-usage.json">/data/claude-usage.json</a>.
            </p>
            <p>
              Source code and raw data: <a href="https://github.com/jonathanavis96/claude-usage-tracker">github.com/jonathanavis96/claude-usage-tracker</a>.
            </p>
          </details>
        {/* The method and pricing sentences the hero used to carry above the fold (Jonathan's
            decision, 2026-09-20): every figure still renders, just further down the page. */}
        {!unavailable && data && r && (cr || wt) && (
          <details>
            <summary>How the price and the window are measured</summary>
            {cr && !wt && cr.windowCreditsMethod && (
              <p>
                Method: {cr.windowCreditsMethod}
                {cr.creditsAsOf ? ` Measured to ${fmtDate(cr.creditsAsOf)}.` : ""}
              </p>
            )}
            {wt?.method && (
              <p>
                Method: {wt.method}
                {wt.asOf ? ` Measured to ${fmtDate(wt.asOf)}.` : ""}
              </p>
            )}
            {cr &&
              (cr.modelStatus ? (
                <p>
                  {familyLabel(cr.family, model)} rate
                  {cr.familyAsOf ? `, as of ${fmtDate(cr.familyAsOf)}` : ""}: {cr.modelStatus}.
                </p>
              ) : (
                creditRateLine && <p>{creditRateLine}</p>
              ))}
            {cr?.windowCredits && (
              <p>
                <Fig fig={cr.windowCredits} unit="credits per 5-hour window" />
                {cr.windowCredits.range ? ` (${cr.windowCredits.range})` : ""}
                {cr.windowCreditsN !== null ? `, n=${cr.windowCreditsN}` : ""}
                {cr.pureFamily ? `, pure-${cr.pureFamily} stretches` : ""}
                {cr.accountCount !== null
                  ? `, on ${cr.accountCount === 1 ? "one account" : `${cr.accountCount} accounts`}`
                  : ""}
                .
                {cr.accountsWithoutStretch.length > 0
                  ? ` ${cr.accountsWithoutStretch.map(accountLabel).join(", ")} contributed no clean ${
                      cr.pureFamily ? `pure-${cr.pureFamily} ` : ""
                    }stretch.`
                  : ""}
              </p>
            )}
            {cr?.split && (
              <p>
                <b>{fmtShare(cr.split.input ?? 0)}</b> input<em>·</em>
                <b>{fmtShare(cr.split.output ?? 0)}</b> output<em>·</em>
                <b>{fmtShare(cr.split.cache_read ?? 0)}</b> cache read<em>·</em>
                <b>{fmtShare(cr.split.cache_write ?? 0)}</b> cache write
              </p>
            )}
            {cr?.splitSource && <p>Split: {cr.splitSource}.</p>}
            {cr?.cacheNormalised && cr.medianSessionTokens !== null && (
              <p>Cache-normalised at that split, over a median session of {fmtTokens(cr.medianSessionTokens)} tokens.</p>
            )}
          </details>
        )}

        {/* The account count and per-chart legends the hero and the charts used to carry above
            the fold: moved down, not deleted. */}
        {!unavailable && data && r && r.planWindowsPerWeek !== null && (
          <details>
            <summary>How many windows fit in a week</summary>
            <p>
              A week currently holds about {r.planWindowsPerWeek.toFixed(1)} five-hour windows,{" "}
              {r.weeklyInferred
                ? `inferred from ${PLAN_LABELS[weeklyCurrentFor(data, plan)?.inferredFrom ?? data.plan_measured]}`
                : accountsWord
                  ? `measured from ${accountsWord}`
                  : "measured from a real account"}
              {data.last_change?.scope === "weekly" ? ` since the change on ${fmtDate(data.last_change.date)}` : ""}.
            </p>
            {weeklyTokenLevels.some((p) => p.levels.length > 0) && (
              <p>
                Tokens per week chart: each line is the limit itself, held flat between changes -- a step means a
                measured change, and nothing else on the chart moves. Solid and shaded: selected plan. Grey: the
                others. Dashed: inferred from another plan by the measured plan ratio, not measured on this one.
                Red: a measured change.
              </p>
            )}
            {accountWeekly.length > 0 && (
              <p>
                Each watched account's own figure:{" "}
                {accountWeekly
                  .map((a) => `${accountLabel(a.account)} ${a.value.toFixed(2)}${a.n !== null ? ` (${a.n} readings)` : ""}`)
                  .join(", ")}
                .
              </p>
            )}
            {weeklySeries.some((s) => s.points.length >= 2) && (
              <p>
                Each line is the limit itself, held flat between changes: a step means a measured change. Solid:
                selected plan. Grey: the others. Dashed: inferred from another plan by the measured plan ratio,
                not measured on this one.{" "}
                {inferredPlans.includes("pro") && inferredPlans.includes("max5")
                  ? "Pro and Max 5x are currently inferred from Max 20x."
                  : "Pro is assumed from Max 5x."}
                {weeklyOverlay && weeklyOverlay.readings.length > 0 && (
                  <>
                    {" "}
                    <LegendMark kind="reading" /> Reading: one five-hour window on one account, hollow where the
                    seven-day meter moved under {COARSE_SEVEN_DAY_PCT}%, this chart's own threshold for drawing a
                    reading hollow.
                  </>
                )}
                {weeklyOverlay && weeklyOverlay.weekly.length > 0 && (
                  <>
                    {" "}
                    <LegendMark kind="weekly" /> Weekly: a calendar week of readings pooled, the whisker its
                    rounding interval, hollow while the week is in progress.
                  </>
                )}
              </p>
            )}
          </details>
        )}

        {/* 6. Each watched account's own meter either side of the announced change. What the
            block can say without reasoning from the raw spread between accounts (a stable
            account-specific scale cancels in each account's own before/after ratio, so a
            cross-account spread proves nothing about which meter moved): the windows-per-week
            ratio's own change, and the account-to-account gap, with no cause attached to
            either. */}
        {!unavailable && (acrossCut || changeSentences.length > 0) && (
          <details>
            <summary>The five-hour window across the change</summary>
            {/* What the headline figure was measured either side of, Anthropic's own figure for
                the same change, and -- where the stretches cannot separate the two meters --
                that they cannot: moved out of the hero (Jonathan's decision, 2026-09-20). */}
            {changeSentences.length > 0 && (
              <p className="sub">
                {changeSentences.map((line) => (
                  <span key={line}>{line} </span>
                ))}
              </p>
            )}
            {acrossCut && (
              <p className="sub">
                Each account's own meter{acrossCut.cut_at ? ` either side of ${fmtDate(acrossCut.cut_at.slice(0, 10))}` : ""}
                {acrossCut.unit ? `, in ${acrossCut.unit}` : ""}.
              </p>
            )}
            {acrossCut && (
              <>
                <table>
                  <thead>
                    <tr>
                      <th></th>
                      <th>Before</th>
                      <th>After</th>
                      <th>Change</th>
                      <th>Stretches before</th>
                      <th>Stretches after</th>
                      <th>With capture</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(acrossCut.per_account).map(([label, a]) => (
                      <tr key={label}>
                        <td>{accountLabel(label)}</td>
                        <td>{typeof a.before === "number" ? fmtCredits(a.before) : "—"}</td>
                        <td>{typeof a.after === "number" ? fmtCredits(a.after) : "—"}</td>
                        <td>{typeof a.change_pct === "number" ? `${a.change_pct}%` : "—"}</td>
                        <td>{a.n_before}</td>
                        <td>{a.n_after}</td>
                        <td>{a.n_with_capture}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {emptyCapture.length > 0 && captureNote && (
                  <div className="quiet">
                    {emptyCapture.map(accountLabel).join(", ")}: {captureNote}.
                  </div>
                )}
                {typeof weeklyRatioFellPct === "number" && Math.round(weeklyRatioFellPct) >= 1 && (
                  <div className="quiet">
                    The windows-per-week ratio fell about {Math.round(weeklyRatioFellPct)}%. That is consistent with a
                    smaller weekly cap, a larger five-hour window, or both; which meter moved is unresolved.
                  </div>
                )}
                {typeof acrossAccountGapPct === "number" && (
                  <div className="quiet">
                    Two accounts read {Math.round(acrossAccountGapPct)}% apart in credits per 1% of the meter; the
                    cause is not identified.
                  </div>
                )}
                {(acrossCut.unresolved || acrossCut.resolved === false) && (
                  <div className="quiet">{acrossCut.unresolved ? `Unresolved: ${acrossCut.unresolved}.` : "Unresolved."}</div>
                )}
              </>
            )}
          </details>
        )}

        {/* 7. The same window anchored the other way. It shares no input with the measured
            cluster, which is the only reason it is worth putting beside it. Every number in the
            arithmetic below is published: the page states the composition, it does not compute
            the result, and the undated baseline is never an input to a figure of our own. */}
        {!unavailable && (fromWeekly || shortfall || data?.weekly_windows || (credits && ratioBasis)) && (
          <details>
            <summary>Cross-check against the announced caps</summary>
            {data?.weekly_windows && (
              <p className="quiet">
                {inferredPlans.includes("max5")
                  ? `Max 20x weekly figures are measured from ${accountsWord ?? "real accounts"}. ${inferredNote}`
                  : `Max 20x and Max 5x weekly figures are measured from ${accountsWord ?? "real accounts"}. Pro assumes the Max 5x ratio until it is measured.`}
              </p>
            )}
            {credits && ratioBasis && (
              <p className="quiet">
                Basis: {ratioBasis.kind}.
                {ratioBasis.perWindow ? ` Credits per five-hour window, ${PLAN_ORDER_LABEL}: ${ratioBasis.perWindow}.` : ""}
                {ratioBasis.perWeek ? ` Credits per week: ${ratioBasis.perWeek}.` : ""}
                {ratioBasis.confirmation ? ` Measured confirmation: ${ratioBasis.confirmation}.` : ""}
                {ratioBasis.asOf ? ` Source, as of ${fmtDate(ratioBasis.asOf)}:` : ratioBasis.undated ? " The source is undated:" : " Source:"}{" "}
                <a href={ratioBasis.url}>{ratioBasis.urlText}</a>.
              </p>
            )}
            {fromWeekly && (
              <>
            <p className="sub">
              {fromWeekly.kind === "cross_check"
                ? "A cross-check, not a second measurement: the announced weekly cap over this tracker's own measured windows per week."
                : "The announced weekly cap over this tracker's own measured windows per week."}
            </p>
            <table>
              <thead>
                <tr>
                  <th></th>
                  <th>Announced cap ÷ windows per week</th>
                  <th>Credits per 5-hour window</th>
                </tr>
              </thead>
              <tbody>
                {([["Before the change", fromWeekly.before], ["After the change", fromWeekly.after]] as const).map(
                  ([label, side]) => (
                    <tr key={label}>
                      <td>{label}</td>
                      <td>
                        {fmtCredits(fromWeekly.weekly_cap_baseline_credits)} × {side.weekly_cap_multiplier} ={" "}
                        {fmtCredits(side.announced_weekly_cap_credits)} ÷ {side.windows_per_week_measured.toFixed(2)}
                        {fmtInterval(side.windows_per_week_rounding_interval) ? ` (${fmtInterval(side.windows_per_week_rounding_interval)})` : ""} windows
                      </td>
                      <td>{typeof side.value === "number" ? fmtCredits(side.value) : "—"}</td>
                    </tr>
                  ),
                )}
                {credits && (
                  <tr>
                    <td className="hl">Measured</td>
                    <td>
                      pure-{credits.window_credits.pure_family} stretches, n={credits.window_credits.n}
                    </td>
                    <td className="hl">
                      {typeof credits.window_credits.value === "number"
                        ? fmtCredits(credits.window_credits.value)
                        : credits.window_credits.status ?? "—"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            <div className="quiet">
              Baseline {fmtCredits(fromWeekly.weekly_cap_baseline_credits)} credits per week, as of{" "}
              {fmtDate(fromWeekly.weekly_cap_baseline_source.as_of)}:{" "}
              <a href={fromWeekly.weekly_cap_baseline_source.url}>
                {fromWeekly.weekly_cap_baseline_source.url.replace(/^https?:\/\//, "")}
              </a>
              . A reference, shown beside the measurement and never an input to it.
            </div>
            {referenceChanges.length > 0 && (
              <>
                <div className="quiet">
                  {data?.reference?.name ?? "Reference table"}
                  {data?.reference?.as_of ? `, as of ${fmtDate(data.reference.as_of)}` : ""}. Announced changes since:
                </div>
                {referenceChanges.map((c, i) => (
                  <div className="quiet" key={`${c.date ?? c.from ?? i}-${c.scope ?? ""}`}>
                    {c.date_known && c.date
                      ? fmtDate(c.date)
                      : [c.from, c.until].filter(Boolean).join(" to ") || "date not given"}
                    {typeof c.multiplier === "number" ? ` · ×${c.multiplier}` : ""}
                    {c.scope ? ` · ${c.scope.replace(/_/g, " ")}` : ""}
                    {c.summary ? ` — ${c.summary}` : ""}
                    {c.quote ? ` \u201c${c.quote}\u201d` : ""}
                    {c.source ? ` (${c.source})` : ""}
                  </div>
                ))}
              </>
            )}
              </>
            )}
            {/* Goal 7. The measured levels against the reference table's own, per plan. The table
                predates three announced changes, so what it predicts today is its own figure with
                those multipliers applied, and the publisher says whether that closes the gap. */}
            {shortfall && shortfallPlans.length > 0 && (
              <>
                <p className="sub">
                  Measured against the reference table{shortfall.what ? `: ${shortfall.what}` : ""}.
                  {shortfall.cut_at ? ` Cut at ${fmtDate(shortfall.cut_at.slice(0, 10))}.` : ""}
                </p>
                <table>
                  <thead>
                    <tr>
                      <th></th>
                      <th>Measured</th>
                      <th>Documented</th>
                      <th>Measured ÷ documented</th>
                      <th>Expected</th>
                      <th>Measured ÷ expected</th>
                      <th>Regime</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shortfallPlans.map(({ plan: p, row }) => (
                      <tr key={p}>
                        <td className={p === plan ? "hl" : ""}>{PLAN_LABELS[p]}</td>
                        {row.status ? (
                          <td colSpan={6}>{row.status}</td>
                        ) : (
                          <>
                            <td className={p === plan ? "hl" : ""}>{perWeekFmt(row.measured_windows_per_week)}</td>
                            <td>{perWeekFmt(row.documented_windows_per_week)}</td>
                            <td>{perWeekFmt(row.ratio)}</td>
                            <td>{perWeekFmt(row.expected_windows_per_week)}</td>
                            <td>{perWeekFmt(row.ratio_to_expected)}</td>
                            <td>
                              {row.from && row.to
                                ? `${fmtDate(row.from.slice(0, 10))} to ${fmtDate(row.to.slice(0, 10))}`
                                : "\u2014"}
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {(typeof shortfall.multipliers_applied?.five_hour_window === "number" ||
                  typeof shortfall.multipliers_applied?.weekly === "number") && (
                  <div className="quiet">
                    Multipliers applied to the table's figures:{" "}
                    {[
                      typeof shortfall.multipliers_applied?.five_hour_window === "number"
                        ? `five-hour window ×${shortfall.multipliers_applied.five_hour_window}`
                        : null,
                      typeof shortfall.multipliers_applied?.weekly === "number"
                        ? `weekly ×${shortfall.multipliers_applied.weekly}`
                        : null,
                    ]
                      .filter(Boolean)
                      .join(", ")}
                    .
                  </div>
                )}
                {shortfall.explanation && <div className="quiet">{shortfall.explanation}</div>}
                {shortfall.status && (
                  <div className="quiet">
                    Status: {shortfall.status}
                    {shortfall.source ? ` (${shortfall.source})` : ""}.
                  </div>
                )}
              </>
            )}
          </details>
        )}


        </section>

        <p className="sub" style={{ textAlign: "center", padding: "24px 0 8px" }}>
          All Done Sites measures before it claims. Want a site that does the same? <a href="/#getquote">Get in touch</a>
          <br />
          <a href="https://github.com/jonathanavis96/claude-usage-tracker">Source code and raw data</a>
        </p>
      </div>
    </PageShell>
  );
}
