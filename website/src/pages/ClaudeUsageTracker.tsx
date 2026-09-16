// website/src/pages/ClaudeUsageTracker.tsx
import { useEffect, useMemo, useState } from "react";
import ContributeMeter from "@/components/ContributeMeter";
import NotifyForm from "@/components/NotifyForm";
import Seo from "@/components/Seo";
import { PageShell } from "@/components/redesign/RedesignChrome";
import {
  EFFORTS,
  MODEL_LABELS,
  PLAN_LABELS,
  RANGE_DAYS,
  compute,
  eventsFor,
  fmtDate,
  fmtSource,
  fmtTokens,
  fmtUsd,
  fmtUsd2,
  headline,
  seriesFor,
  weeklyEventsFor,
  latestWeeklyChange,
  weeklyRegimeLevelsFor,
  weeklySeriesFor,
  weeklyTokenRegimeLevelsFor,
  weeklyTokenSeriesFor,
  type ContribPoint,
  type Effort,
  type Plan,
  type RangeDays,
  type UsageEvent,
  type UsageJson,
  type WeeklyPoint,
  type WeeklySeries,
  type RegimeLevel,
} from "@/lib/claudeUsage";
import { contribColor, contribGroups, contribXScale, contribYMax, contributorSentences, fleetUsdPerPercent } from "@/lib/contrib";
import "@/styles/home.css";
import "@/styles/claude-usage.css";
// Build-time snapshot so the prerendered HTML carries real figures; the fetch below refreshes it.
import initialJson from "../../public/data/claude-usage.json";
const initialData = initialJson as unknown as UsageJson;

const SITE = "https://alldonesites.com";

function Chart({
  points,
  change,
  events,
  days,
}: {
  points: { date: string; value: number; interpolated: boolean; held: boolean }[];
  change: { date: string; direction: string; percent: number } | null;
  events: UsageEvent[];
  days: number;
}) {
  if (points.length < 2) return <p className="sub">Not enough history yet.</p>;
  const W = 840, H = 260, L = 44, R = 832, T = 20, B = 200;
  const vals = points.map((p) => p.value);
  const lo = Math.min(...vals) * 0.9, hi = Math.max(...vals) * 1.05;
  // One date scale for samples and markers: every x is elapsed time between the first and
  // last sample, so a sparse or irregular history never puts a marker beside the wrong point.
  const day = (d: string) => Date.parse(d + "T00:00:00Z");
  // The axis starts at the earlier of the first sample and the earliest marker inside the
  // selected range, so an in-range marker before the first sample stays visible while a
  // marker older than the range cutoff never widens the chart.
  const d1 = day(points[points.length - 1].date);
  const cutoff = d1 - days * 86400e3;
  const markerDays = [...events.map((ev) => ev.date), ...(change ? [change.date] : [])]
    .map(day)
    .filter((t) => t >= cutoff && t <= d1);
  const d0 = Math.min(day(points[0].date), ...markerDays);
  const span = Math.max(1, d1 - d0);
  const xDate = (d: string) => {
    const t = day(d);
    if (!(t >= d0 && t <= d1)) return null;
    return L + ((t - d0) / span) * (R - L);
  };
  const x = (i: number) => xDate(points[i].date) ?? L;
  const y = (v: number) => B - ((v - lo) / (hi - lo)) * (B - T);
  // Held (backfilled) rows are flat-lined at the first real reading, not measured: they are
  // drawn as a dashed grey segment with no fill, so a reader never mistakes the flat line for
  // a proven period of no change. firstRealIdx is the earliest point that is a real reading.
  // When no point in range is real (findIndex gives -1) the whole series is held: it is drawn
  // dashed with no real segment and no fill, never as proven data.
  const firstRealIdx = points.findIndex((p) => !p.held);
  const allHeld = firstRealIdx === -1 && points.length > 0;
  const hasHeld = allHeld || firstRealIdx > 0;
  const heldEnd = allHeld ? points.length : firstRealIdx + 1;
  const heldPath = hasHeld ? points.slice(0, heldEnd).map((p, i) => `${x(i)},${y(p.value)}`).join(" ") : "";
  const realStartIdx = hasHeld ? firstRealIdx : 0;
  const realPath = allHeld ? "" : points.slice(realStartIdx).map((p, i) => `${x(realStartIdx + i)},${y(p.value)}`).join(" ");
  const ticks = [0, 1, 2, 3].map((k) => lo + ((hi - lo) * k) / 3);
  const cx = change ? xDate(change.date) : null;
  // The first real reading gets its own marker so a dashed-flat period never reads as proven.
  const measureX = hasHeld && !allHeld ? xDate(points[firstRealIdx].date) : null;
  const labelEvery = Math.max(1, Math.floor(points.length / 5));
  // The SVG is one image to assistive technology, so its label carries the marker text too.
  const shown = events.filter((ev) => xDate(ev.date) !== null && !(change && ev.kind === "change" && ev.date === change.date));
  const ariaLabel = [
    "Effective window size over time",
    ...(allHeld ? ["Dashed throughout: shown flat at the first measured value, not measured day-by-day."] : []),
    ...(hasHeld && !allHeld ? [`Dashed before ${fmtDate(points[firstRealIdx].date)}: shown flat at the first measured value, not measured day-by-day.`] : []),
    ...(change && xDate(change.date) !== null
      ? [`${fmtDate(change.date)}: window ${change.direction === "decreased" ? "down" : "up"} ${change.percent}%`]
      : []),
    ...shown.map((ev) => `${fmtDate(ev.date)}: ${ev.label}`),
  ].join(". ");
  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={ariaLabel}>
      <defs>
        <linearGradient id="cutfill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#0EA5E9" stopOpacity=".28" />
          <stop offset="1" stopColor="#0EA5E9" stopOpacity=".02" />
        </linearGradient>
      </defs>
      <g stroke="#E6E9EE" strokeWidth="1">
        {ticks.map((t) => (
          <line key={t} x1={L} x2={R} y1={y(t)} y2={y(t)} />
        ))}
      </g>
      {ticks.map((t) => (
        <text key={t} x={0} y={y(t) + 4}>{fmtTokens(t)}</text>
      ))}
      {!allHeld && <polygon fill="url(#cutfill)" points={`${L},${B} ${realPath} ${R},${B}`} />}
      {hasHeld && <polyline fill="none" stroke="#94A3B8" strokeWidth="2" strokeDasharray="4 4" strokeLinejoin="round" points={heldPath} />}
      {!allHeld && <polyline fill="none" stroke="#0EA5E9" strokeWidth="2.5" strokeLinejoin="round" points={realPath} />}
      {points.map(
        (p, i) =>
          p.interpolated && <circle key={p.date} cx={x(i)} cy={y(p.value)} r="3" fill="#fff" stroke="#0EA5E9" strokeWidth="2" />
      )}
      {measureX !== null && (
        <g>
          <line x1={measureX} x2={measureX} y1={T} y2={B} stroke="#64748B" strokeWidth="1.25" strokeDasharray="2 3" />
          <text
            x={measureX > R - 160 ? measureX - 4 : measureX + 4}
            y={B + 16}
            textAnchor={measureX > R - 160 ? "end" : "start"}
            style={{ fill: "#64748B", fontWeight: 500 }}
          >
            measuring since {fmtDate(points[firstRealIdx].date)}
          </text>
        </g>
      )}
      {cx !== null && (
        <g>
          <line x1={cx} x2={cx} y1={T} y2={B} stroke="#B42318" strokeWidth="1.5" strokeDasharray="5 4" />
          <rect x={Math.min(cx + 7, R - 120)} y={T + 4} width="112" height="22" rx="6" fill="#B42318" />
          <text x={Math.min(cx + 15, R - 112)} y={T + 19} style={{ fill: "#fff", fontWeight: 600 }}>
            {fmtDate(change!.date).slice(0, 6)} · {change!.direction === "decreased" ? "down" : "up"} {change!.percent}%
          </text>
        </g>
      )}
      {events.map((ev) => {
        // The last change already has its own boxed marker; do not draw it twice.
        if (change && ev.kind === "change" && ev.date === change.date) return null;
        const xx = xDate(ev.date);
        if (xx === null) return null;
        const color = ev.kind === "change" ? "#B42318" : "#8A94A6";
        return (
          <g key={`${ev.date}-${ev.label}`}>
            <line x1={xx} x2={xx} y1={T} y2={B} stroke={color} strokeWidth="1.25" strokeDasharray="4 3" />
            <text
              x={xx > W - 130 ? xx - 6 : xx + 6}
              y={T - 3}
              textAnchor={xx > W - 130 ? "end" : "start"}
              style={{ fill: color, fontWeight: 500 }}
            >
              {shortChangeLabel(ev.label)}
            </text>
          </g>
        );
      })}
      <circle cx={R} cy={y(points[points.length - 1].value)} r="4.5" fill="#0EA5E9" stroke="#fff" strokeWidth="2" />
      <g style={{ fill: "#0277B5", fontWeight: 500 }}>
        {points.map((p, i) => {
          if (i % labelEvery !== 0) return null;
          const xx = x(i);
          // Anchored by position, the same rule the weekly charts use: a label at the plot's
          // right edge defaults to text-anchor start and runs past the viewBox, which cut the
          // newest date in half. End-anchor it there, start-anchor it at the left edge, centre
          // it everywhere between.
          const anchor = xx < L + 20 ? "start" : xx > R - 20 ? "end" : "middle";
          return (
            <text key={p.date} x={xx} y={B + 36} textAnchor={anchor}>
              {fmtDate(p.date).slice(0, 6)}
            </text>
          );
        })}
      </g>
    </svg>
  );
}

/**
 * Vertical positions for the right-margin plan labels. Each label wants to sit at its own
 * line's last value; where two would collide they are pushed apart by `gap` and the whole set
 * is kept inside the plot area, so a label never leaves the chart or covers another.
 */
// The published event label reads "Weekly limit changed -29%". On a chart the word adds
// nothing: a red dashed marker already says something changed there.
function shortChangeLabel(label: string): string {
  return label.replace(/\s+changed\b/, "");
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

// One plan's levels on a chart: what the limit was, held flat between changes.
export interface PlanLevels {
  plan: Plan;
  label: string;
  levels: { start: string; end: string; value: number; inferred: boolean }[];
}

// The weekly charts draw levels, not weekly points.
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
}: {
  levelsByPlan: PlanLevels[];
  events: UsageEvent[];
  selectedPlan: Plan;
  fmtValue: (v: number) => string;
  plotRight: number;
  title: string;
}) {
  const plotted = levelsByPlan.filter((p) => p.levels.length > 0);
  if (plotted.length === 0) return <p className="sub">Not enough history yet.</p>;
  const W = 840, H = 260, L = 44, R = plotRight, T = 20, B = 200;
  const vals = plotted.flatMap((p) => p.levels.map((l) => l.value));
  const lo = Math.min(...vals) * 0.9, hi = Math.max(...vals) * 1.05;
  const stamps = plotted.flatMap((p) => p.levels.flatMap((l) => [Date.parse(l.start), Date.parse(l.end)]));
  const day = (d: string) => Date.parse(d + "T00:00:00Z");
  const markerDays = events.map((ev) => day(ev.date));
  const d0 = Math.min(...stamps, ...markerDays);
  const d1 = Math.max(...stamps, ...markerDays);
  const span = Math.max(1, d1 - d0);
  const xAt = (iso: string) => {
    const t = Math.min(Math.max(Date.parse(iso), d0), d1);
    return L + ((t - d0) / span) * (R - L);
  };
  const xDay = (d: string) => xAt(`${d}T00:00:00Z`);
  const y = (v: number) => B - ((v - lo) / (hi - lo)) * (B - T);
  const ticks = [0, 1, 2, 3].map((k) => lo + ((hi - lo) * k) / 3);
  const change = latestWeeklyChange(events);
  // Two lines per plan on the right edge — name above, current value below — so the
  // gap has to clear both, not one.
  const labelY = stackLabels(
    plotted.map((p) => ({ plan: p.plan, y: y(p.levels[p.levels.length - 1].value) })),
    T + 6,
    B,
    34,
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
          .map((l) => `${fmtDate(l.start.slice(0, 10))} to ${fmtDate(l.end.slice(0, 10))} ${fmtValue(l.value)}${l.inferred ? " (inferred)" : ""}`)
          .join(", ")}`,
    ),
    ...(change ? [`${fmtDate(change.date)}: ${change.label}`] : []),
  ].join(". ");
  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={ariaLabel}>
      <defs>
        <linearGradient id={`lvlfill-${plotRight}`} x1="0" x2="0" y1="0" y2="1">
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
      {change !== null && xDay(change.date) !== null && (
        <g>
          <line x1={xDay(change.date)} x2={xDay(change.date)} y1={T} y2={B} stroke="#B42318" strokeWidth="1.5" strokeDasharray="5 4" />
          <text
            x={xDay(change.date) > W - 130 ? xDay(change.date) - 6 : xDay(change.date) + 6}
            y={T - 3}
            textAnchor={xDay(change.date) > W - 130 ? "end" : "start"}
            style={{ fill: "#B42318", fontWeight: 600 }}
          >
            {shortChangeLabel(change.label)}
          </text>
        </g>
      )}
      {plotted.map((p) => {
        const isSelected =
          p.plan === selectedPlan || (selectedPlan === "pro" && p.plan === "max5" && !levelsByPlan.some((o) => o.plan === "pro"));
        const color = isSelected ? "#0EA5E9" : "#94A3B8";
        const runs = stepRuns(p.levels, xAt, (l) => y(l.value));
        // Shade under the selected plan's own steps, so the eye lands on the plan in view.
        const area = isSelected
          ? p.levels
              .map((l) => `${xAt(l.start)},${y(l.value)} ${xAt(l.end)},${y(l.value)}`)
              .join(" ")
          : "";
        const last = p.levels[p.levels.length - 1];
        return (
          <g key={p.plan}>
            {isSelected && p.levels.length > 0 && (
              <polygon
                fill={`url(#lvlfill-${plotRight})`}
                points={`${xAt(p.levels[0].start)},${B} ${area} ${xAt(last.end)},${B}`}
              />
            )}
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
                y2={(labelY.get(p.plan) ?? y(last.value)) - 4}
                stroke={color}
                strokeWidth="1"
                strokeDasharray="2 3"
                opacity=".6"
              />
              <text x={R + 10} y={(labelY.get(p.plan) ?? y(last.value)) - 8} style={{ fill: color, fontWeight: 500 }}>
                {p.label}
              </text>
              <text x={R + 10} y={(labelY.get(p.plan) ?? y(last.value)) + 8} style={{ fill: color, fontWeight: 700 }}>
                {fmtValue(last.value)}
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
}

// What each tab of the contributors section plots. Every one is read off the same
// contributed samples: the dollar and token figures divide by the five-hour percent,
// the windows figure divides the five-hour percent by the seven-day one.
type ContribMetric = "usd" | "window" | "weekly" | "windows";

interface ContribTab {
  key: ContribMetric;
  label: string;
  value: (p: ContribPoint) => number | null;
  fmt: (v: number) => string;
  reference: (r: ReturnType<typeof compute> | null, fleetUsd: number | null) => number | null;
  refLabel: (v: number, fmt: (v: number) => string) => string;
  legend: string;
}

const CONTRIB_TABS: ContribTab[] = [
  {
    key: "usd",
    label: "Cost per 1%",
    value: (p) => p.usd_per_pct ?? null,
    fmt: fmtUsd2,
    reference: (_r, fleetUsd) => fleetUsd,
    refLabel: (v, fmt) => `tracker ${fmt(v)} per 1%`,
    legend:
      "One dot per reading, joined when they come from the same person. Hollow dots: meter under 5%. Dashed line: the tracker's own figure.",
  },
  {
    key: "window",
    label: "Effective window size",
    value: (p) => (typeof p.tokens_per_pct === "number" ? p.tokens_per_pct * 100 : null),
    fmt: fmtTokens,
    reference: (r) => r?.tokensPerWindow ?? null,
    refLabel: (v, fmt) => `tracker ${fmt(v)}`,
    legend:
      "Tokens a full five-hour window buys, read off each contributor's own meter. Hollow dots: meter under 5%. Dashed line: the tracker's own figure. The tracker's line is one model at one effort; a dot is that reader's own mix, so a heavier mix reads lower.",
  },
  {
    key: "weekly",
    label: "Tokens per week",
    value: (p) => (typeof p.tokens_per_pct_week === "number" ? p.tokens_per_pct_week * 100 : null),
    fmt: fmtTokens,
    reference: (r) =>
      r && r.windowsPerWeek !== null ? r.tokensPerWindow * r.windowsPerWeek : null,
    refLabel: (v, fmt) => `tracker ${fmt(v)}`,
    legend:
      "Tokens a full week buys, read off each contributor's own seven-day meter: their tokens since that meter reset, over the percent of it they have used. Dashed line: the tracker's own figure. The tracker's line is one model at one effort; a dot is that reader's own mix, so a heavier mix reads lower.",
  },
  {
    key: "windows",
    label: "Weekly limit",
    value: (p) => p.windows ?? null,
    fmt: (v) => v.toFixed(1),
    reference: (r) => r?.windowsPerWeek ?? null,
    refLabel: (v, fmt) => `tracker ${fmt(v)} windows`,
    legend:
      "Five-hour windows one week holds, from one reading: what a week buys over what a window buys, each measured on its own meter. Both meters step in whole percents, so a low reading swings it. Dashed line: the tracker's own figure.",
  },
];

function ContributorsChart({
  points,
  reference,
  tab,
}: {
  points: ContribPoint[];
  reference: number | null;
  tab: ContribTab;
}) {
  const W = 840, H = 260, L = 44, R = 832, T = 20, B = 200;
  const valueOf = (p: ContribPoint) => tab.value(p);
  const usable = points.filter((p) => typeof valueOf(p) === "number");
  const groups = contribGroups(points);
  const { t0, t1, frac } = contribXScale(points);
  const yMax = contribYMax(points, reference, (p) => tab.value(p as ContribPoint));
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
  const ariaLabel = `${usable.length} reading${usable.length === 1 ? "" : "s"} from ${groups.length} ${groups.length === 1 ? "person" : "people"}, ${span}`;
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

export default function ClaudeUsageTracker() {
  const [data, setData] = useState<UsageJson | null>(initialData);
  const [failed, setFailed] = useState(false);
  const [plan, setPlan] = useState<Plan>("max20");
  const [model, setModel] = useState("claude-sonnet-5");
  const [effort, setEffort] = useState<Effort>("high");
  const [range, setRange] = useState<RangeDays>(30);

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
  const [contribMetric, setContribMetric] = useState<ContribMetric>("usd");
  const contribTab = CONTRIB_TABS.find((t) => t.key === contribMetric) ?? CONTRIB_TABS[0];
  const hasContribPoints = !!data?.contributed?.[plan]?.points?.length;
  const contributed = useMemo(
    () =>
      data
        ? contributorSentences(
            plan,
            data.contributed?.[plan],
            fleetUsdPerPercent(data, plan),
            data.contributed?.min_contributors,
            data.contributed?.max_deviation,
          )
        : null,
    [data, plan],
  );
  const chartPoints = useMemo(() => (data ? seriesFor(data, plan, model, range) : []), [data, plan, model, range]);
  const weeklySeries = useMemo(() => (data ? weeklySeriesFor(data) : []), [data]);
  const weeklyEvents = useMemo(() => (data ? weeklyEventsFor(data) : []), [data]);
  const weeklyTokenSeries = useMemo(() => (data ? weeklyTokenSeriesFor(data, model) : []), [data, model]);
  // Levels for every plan, not just the selected one: the chart draws all three, the selected
  // one solid and the others grey, exactly as the old weekly lines did.
  const weeklyLevels = useMemo(
    () =>
      data
        ? (Object.keys(PLAN_LABELS) as Plan[])
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
  const h = data ? headline(data) : null;
  // Localise only after mount: the prerender must emit the same text the first client render produces.
  const [localTime, setLocalTime] = useState<string | null>(null);
  // The stale flag depends on the clock, so it is also decided after mount, never in the prerender.
  const [stale, setStale] = useState(false);
  useEffect(() => {
    setStale(data ? Date.now() - new Date(data.generated_at).getTime() > 3 * 86400e3 : false);
    // The pill shows whichever measurement is newer: a probe sample or a passive reading.
    const lastSampleT = data?.last_sample_at ? Date.parse(data.last_sample_at) : NaN;
    const passiveT = data?.passive_generated_at ? Date.parse(data.passive_generated_at) : NaN;
    const newestT = [lastSampleT, passiveT].filter(Number.isFinite);
    setLocalTime(
      newestT.length > 0
        ? new Date(Math.max(...newestT)).toLocaleString([], { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
        : null,
    );
  }, [data]);
  // A failed refresh is not fatal while the build-time snapshot is still usable.
  const unavailable = (failed && data === null) || (data !== null && r === null);

  return (
    <PageShell>
      <Seo
        title="Claude Usage Tracker: what a Max plan actually buys | All Done Sites"
        description="Measured daily from a real account: how many tokens a Claude Max 20x plan buys per 5-hour window, and whether Anthropic has changed the limit."
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
                    {Object.keys(data.rates).map((m) => (
                      <option key={m} value={m}>{MODEL_LABELS[m] ?? m}</option>
                    ))}
                  </select>
                </span>{" "}
                at{" "}
                <span className="sel">
                  <select aria-label="Effort" value={effort} onChange={(e) => setEffort(e.target.value as Effort)}>
                    {EFFORTS.map((e) => (
                      <option key={e} value={e}>{e}</option>
                    ))}
                  </select>
                </span>{" "}
                effort, you get
              </div>
              <div className="big">
                {fmtTokens(r.tokensPerWindow)}
                <span>tokens per 5-hour window</span>
              </div>
              <div className="big usd">
                {fmtUsd(r.apiValueUsd)}
                <span>of API value per 5-hour window</span>
              </div>
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
              <div className="split">
                <span>
                  <b>{fmtTokens(r.split.input)}</b> input<em>·</em>
                  <b>{fmtTokens(r.split.output)}</b> output
                </span>
                <em className="brk">·</em>
                <span>
                  <b>{fmtTokens(r.split.cache_read)}</b> cache read<em>·</em>
                  <b>{fmtTokens(r.split.cache_write)}</b> cache write
                </span>
              </div>
              {fmtSource(data.rates[model]) && (
                <div className="quiet">Source: {fmtSource(data.rates[model])}</div>
              )}
              {data.weekly_windows?.[plan] && (
                <div className="quiet">
                  A week currently holds about {data.weekly_windows[plan]!.current.toFixed(1)} five-hour windows, measured
                  from a real account
                  {data.last_change?.scope === "weekly" ? ` since the change on ${fmtDate(data.last_change.date)}` : ""}.
                </div>
              )}
              {stale && (
                <div className="stale">
                  Last updated {fmtDate(data.generated_at.slice(0, 10))}. The daily job has not run since.
                </div>
              )}
            </>
          )}
        </div>

        {!unavailable && data && (
          <section>
            <div className="h2row">
              <h2>Effective window size, last {range} days</h2>
              <div className="range-toggle" role="group" aria-label="Chart range">
                {RANGE_DAYS.map((d) => (
                  <button
                    key={d}
                    type="button"
                    aria-pressed={range === d}
                    onClick={() => setRange(d)}
                  >
                    {d}d
                  </button>
                ))}
              </div>
            </div>
            <div className="sub">
              {PLAN_LABELS[plan]} · {MODEL_LABELS[model] ?? model} tokens per 5-hour window
            </div>
            {r && (
              <div className="rate">
                <span>
                  <b>{fmtTokens(r.tokensPerWindow)}</b> tokens
                  {r.sessionsPerWindow !== null && (
                    <>
                      <em>·</em>
                      <b>{Math.round(r.sessionsPerWindow)}</b> sessions
                    </>
                  )}{" "}
                  per 5-hour window
                </span>
              </div>
            )}
            <Chart
              points={chartPoints}
              change={
                data.last_change &&
                (data.last_change.scope ?? "window") === "window" &&
                (data.last_change.model === model || data.last_change.model === "all")
                  ? data.last_change
                  : null
              }
              events={eventsFor(data, model, range)}
              days={range}
            />
            {chartPoints.some((p) => p.held) && (
              <p className="sub chart-legend">
                Dashed: before measurement began, shown flat at the first measured value.
              </p>
            )}
            <p className="stats-cta-row mob">
              <a className="stats-cta" href="#contribute">See your own stats &darr;</a>
            </p>
          </section>
        )}

        {!unavailable && data && (
          <section>
            <h2>Tokens per week</h2>
            <p className="sub">
              {PLAN_LABELS[plan]} · {MODEL_LABELS[model] ?? model} · how many tokens a full week of five-hour windows
              buys. Full history.
            </p>
            {r && r.windowsPerWeek !== null && (
              <div className="rate">
                <span>
                  <b>{fmtTokens(r.tokensPerWindow * r.windowsPerWeek)}</b> tokens
                  {r.sessionsPerWeek !== null && (
                    <>
                      <em>·</em>
                      <b>{Math.round(r.sessionsPerWeek)}</b> sessions
                    </>
                  )}{" "}
                  per week
                </span>
              </div>
            )}
            <LevelChart
              levelsByPlan={weeklyTokenLevels}
              events={weeklyEvents}
              selectedPlan={plan}
              fmtValue={fmtTokens}
              plotRight={732}
              title="Tokens per week over time"
            />
            <p className="sub">
              Each line is the limit itself, held flat between changes: a step means a measured change, and nothing
              else on the chart moves. Solid and shaded: selected plan. Grey: the others. Dashed: inferred from
              another plan by the measured plan ratio, not measured on this one. Red: a measured change.
            </p>
          </section>
        )}

        {!unavailable && data && (
          <section>
            <h2>Weekly limit, 5-hour windows per week</h2>
            <p className="sub">
              How many 5-hour windows fit in one week, read from the usage meter. Full history.
            </p>
            {r && r.windowsPerWeek !== null && (
              <div className="rate">
                <span>
                  <b>{r.windowsPerWeek.toFixed(1)}</b> five-hour windows per week
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
            />
            {weeklySeries.some((s) => s.points.length >= 2) && (
              <p className="sub chart-legend">
                Each line is the limit itself, held flat between changes: a step means a measured change. Solid: selected plan. Grey: the others. Dashed: inferred from another plan by the measured plan ratio, not measured on this one. Pro is assumed from Max 5x.
              </p>
            )}
          </section>
        )}

        {!unavailable && data && r && (
          <section>
            <h2>Plan comparison</h2>
            <div className="sub">
              {MODEL_LABELS[model] ?? model} at {effort} effort. Max 20x is measured; Pro and Max 5x are scaled from it by
              Anthropic's published 1:5:20 ratios.
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
                {(
                  [
                    ["Tokens per 5-hour window", (c: ReturnType<typeof compute>) => fmtTokens(c!.tokensPerWindow)],
                    [
                      "Tokens per week",
                      (c: ReturnType<typeof compute>) =>
                        c!.windowsPerWeek === null ? "—" : fmtTokens(c!.tokensPerWindow * c!.windowsPerWeek),
                    ],
                    ...(r.sessionsPerWindow !== null
                      ? ([
                          [
                            "Sessions per window",
                            (c: ReturnType<typeof compute>) =>
                              c!.sessionsPerWindow === null
                                ? "—"
                                : c!.sessionsPerWindow < 1
                                  ? "< 1"
                                  : String(Math.round(c!.sessionsPerWindow)),
                          ],
                        ] as [string, (c: ReturnType<typeof compute>) => string][])
                      : []),
                    ...(r.sessionsPerWindow !== null && r.windowsPerWeek !== null
                      ? ([
                          [
                            "Sessions per week",
                            (c: ReturnType<typeof compute>) =>
                              c!.sessionsPerWeek === null ? "—" : String(Math.round(c!.sessionsPerWeek)),
                          ],
                        ] as [string, (c: ReturnType<typeof compute>) => string][])
                      : []),
                    ["API value per 5-hour window", (c: ReturnType<typeof compute>) => fmtUsd(c!.apiValueUsd)],
                    ...(r.windowsPerWeek !== null
                      ? ([
                          [
                            "API value per week",
                            (c: ReturnType<typeof compute>) => fmtUsd(c!.apiValueUsdPerWeek ?? 0),
                          ],
                        ] as [string, (c: ReturnType<typeof compute>) => string][])
                      : []),
                  ] as [string, (c: ReturnType<typeof compute>) => string][]
                ).map(([label, f]) => (
                  <tr key={label}>
                    <td>{label}</td>
                    {(Object.keys(PLAN_LABELS) as Plan[]).map((p) => (
                      <td key={p} className={p === plan ? "hl" : ""}>{f(compute(data, p, model, effort))}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {data.weekly_windows && (
              <div className="quiet">
                Max 20x and Max 5x weekly figures are measured from real accounts. Pro assumes the Max 5x ratio until
                it is measured.
              </div>
            )}
          </section>
        )}

        {!unavailable && data && contributed && (
          <section id="contributors">
            {/* The same three pickers as the hero, so a reader comparing their own plan
                does not have to scroll back up. Plan picks whose readings are plotted;
                model and effort only move the tracker's own reference line, because a
                contributed point is one figure across every model in that sample. */}
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
                  {/* Same three pickers as the hero, inline with the tabs: plan chooses
                      whose readings are plotted, model and effort move only the tracker's
                      own reference line. */}
                  <div className="section-sel">
                    <span className="sel">
                      <select aria-label="Plan" value={plan} onChange={(e) => setPlan(e.target.value as Plan)}>
                        {(Object.keys(PLAN_LABELS) as Plan[]).map((p) => (
                          <option key={p} value={p}>{PLAN_LABELS[p]}</option>
                        ))}
                      </select>
                    </span>
                    <span className="sel">
                      <select aria-label="Model" value={model} onChange={(e) => setModel(e.target.value)}>
                        {Object.keys(data.rates).map((m) => (
                          <option key={m} value={m}>{MODEL_LABELS[m] ?? m}</option>
                        ))}
                      </select>
                    </span>
                    <span className="sel">
                      <select aria-label="Effort" value={effort} onChange={(e) => setEffort(e.target.value as Effort)}>
                        {EFFORTS.map((e) => (
                          <option key={e} value={e}>{e}</option>
                        ))}
                      </select>
                    </span>
                  </div>
                </div>
                <ContributorsChart
                  points={data.contributed[plan]!.points!}
                  tab={contribTab}
                  reference={contribTab.reference(r, fleetUsdPerPercent(data, plan))}
                />
              </>
            )}
            {/* Each sentence belongs to one chart, so it follows its own tab rather than
                sitting under whichever chart happens to be open. */}
            {contributed.cost && (!hasContribPoints || contribTab.key === "usd") && (
              <p className="sub">{contributed.cost}</p>
            )}
            {contributed.weekly && (!hasContribPoints || contribTab.key === "windows") && (
              <p className="sub">{contributed.weekly}</p>
            )}
          </section>
        )}

        <section id="contribute">
          <h2>Contribute your own meter</h2>
          <ContributeMeter />
        </section>

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
              cache writes are charged at Anthropic's list price, the output rate fitted from 60 measured stretches of
              real work. So every reading here is an API-dollar value per percent of meter, and the token counts are
              that value converted back through the token mix of real sessions. The effort figures come from one
              calibration task, run at each effort level on each model.
            </p>
            <p>
              The weekly limit is measured the same way, per five-hour window: how far the seven-day meter moves for
              each full window spent. A change is dated to the day it lands rather than averaged into a calendar week.
            </p>
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
              The tokens and dollars per window for Pro and Max 5x are scaled from Max 20x by Anthropic's published plan
              ratios. The weekly window counts are not: Max 20x and Max 5x are both measured from real accounts, Max 5x
              from the period one of them spent on that plan, and only Pro is assumed, from Max 5x.
            </p>
            <p>
              The effort figures describe one task shape, run seven times at each effort level on each model. On Sonnet
              the spread between runs is wider than the gap between low, medium and high, so read those three rows as
              roughly equal rather than in order.
            </p>
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
