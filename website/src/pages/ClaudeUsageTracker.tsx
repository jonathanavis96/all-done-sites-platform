// website/src/pages/ClaudeUsageTracker.tsx
import { useEffect, useMemo, useState } from "react";
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
  headline,
  seriesFor,
  weeklyEventsFor,
  weeklySeriesFor,
  type Effort,
  type Plan,
  type RangeDays,
  type UsageEvent,
  type UsageJson,
  type WeeklyPoint,
  type WeeklySeries,
} from "@/lib/claudeUsage";
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
  const W = 840, H = 260, L = 44, R = 820, T = 20, B = 200;
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
            <text x={xx > R - 140 ? xx - 4 : xx + 4} y={T + 10} textAnchor={xx > R - 140 ? "end" : "start"} style={{ fill: color, fontWeight: 500 }}>
              {ev.label}
            </text>
          </g>
        );
      })}
      <circle cx={R} cy={y(points[points.length - 1].value)} r="4.5" fill="#0EA5E9" stroke="#fff" strokeWidth="2" />
      <g style={{ fill: "#0277B5", fontWeight: 500 }}>
        {points.map(
          (p, i) => i % labelEvery === 0 && <text key={p.date} x={x(i)} y={B + 36}>{fmtDate(p.date).slice(0, 6)}</text>
        )}
      </g>
    </svg>
  );
}

function WeeklyChart({
  series,
  events,
  selectedPlan,
}: {
  series: WeeklySeries[];
  events: UsageEvent[];
  selectedPlan: Plan;
}) {
  const [hoverX, setHoverX] = useState<number | null>(null);
  const plotted = series.filter((s) => s.points.length >= 2);
  if (plotted.length === 0) return <p className="sub">Not enough weekly history yet.</p>;
  const W = 840, H = 260, L = 44, R = 820, T = 20, B = 200;
  const vals = plotted.flatMap((s) => s.points.map((p) => p.windows));
  const lo = Math.min(...vals) * 0.9, hi = Math.max(...vals) * 1.05;
  const day = (d: string) => Date.parse(d + "T00:00:00Z");
  // Unscoped by the range picker: the chart always shows the full weekly history, since that
  // longer history (months, not just the last 30/90/180 days) is the reason it exists.
  const allDates = Array.from(new Set(plotted.flatMap((s) => s.points.map((p) => p.date)))).sort();
  const d1 = Math.max(...allDates.map(day));
  const markerDays = events.map((ev) => day(ev.date));
  const d0 = Math.min(...allDates.map(day), ...markerDays);
  const span = Math.max(1, d1 - d0);
  const xDate = (d: string) => {
    const t = day(d);
    if (!(t >= d0 && t <= d1)) return null;
    return L + ((t - d0) / span) * (R - L);
  };
  const y = (v: number) => B - ((v - lo) / (hi - lo)) * (B - T);
  const ticks = [0, 1, 2, 3].map((k) => lo + ((hi - lo) * k) / 3);
  const shown = events.filter((ev) => xDate(ev.date) !== null);
  // Calendar-aligned x-axis ticks, not every Nth data point: spacing stays regular regardless
  // of how the samples fall, and the step widens as the span gets long. The span is the one
  // actually mapped onto the SVG (d0 to d1), which an old event marker can stretch well before
  // the first plotted point, so the ticks start at d0 and the step is chosen from that width
  // rather than from the data alone; otherwise the labels bunch up in the data's corner.
  const dayMs = 86400e3;
  const spanDays = (d1 - d0) / dayMs;
  const stepWeeks = spanDays > 300 ? 8 : spanDays > 120 ? 4 : 2;
  const stepMs = stepWeeks * 7 * dayMs;
  const xTicks: string[] = [];
  for (let t = d0; t <= d1; t += stepMs) {
    xTicks.push(new Date(t).toISOString().slice(0, 10));
  }
  // Hover lookup: nearest plotted date to the pointer's x position, in SVG viewBox units.
  const hoverDate = (() => {
    if (hoverX === null) return null;
    let best: string | null = null;
    let bestDist = Infinity;
    for (const d of allDates) {
      const xx = xDate(d);
      if (xx === null) continue;
      const dist = Math.abs(xx - hoverX);
      if (dist < bestDist) { bestDist = dist; best = d; }
    }
    return best;
  })();
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setHoverX(((e.clientX - rect.left) / rect.width) * W);
  };
  const handleMouseLeave = () => setHoverX(null);
  const ariaLabel = [
    "Weekly limit, 5-hour windows per week over time",
    ...plotted.map((s) => {
      const base = `${s.label}: ${s.points.map((p) => `${fmtDate(p.date)} ${p.windows.toFixed(1)}${p.partial ? " (partial week)" : ""}`).join(", ")}`;
      const measuredDates = s.points.filter((p) => !p.inferred).map((p) => p.date);
      if (measuredDates.length === 0) return base;
      const firstMeasured = measuredDates[0];
      const lastMeasured = measuredDates[measuredDates.length - 1];
      const notes: string[] = [];
      if (s.points.some((p) => p.inferred && p.date < firstMeasured)) notes.push(`dashed before ${fmtDate(firstMeasured)}`);
      if (s.points.some((p) => p.inferred && p.date > lastMeasured)) notes.push(`dashed after ${fmtDate(lastMeasured)}`);
      return notes.length > 0 ? `${base} (${notes.join(", ")})` : base;
    }),
    ...shown.map((ev) => `${fmtDate(ev.date)}: ${ev.label}`),
  ].join(". ");
  return (
    <svg
      className="chart"
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      role="img"
      aria-label={ariaLabel}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <g stroke="#E6E9EE" strokeWidth="1">
        {ticks.map((t) => (
          <line key={t} x1={L} x2={R} y1={y(t)} y2={y(t)} />
        ))}
      </g>
      {ticks.map((t) => (
        <text key={t} x={0} y={y(t) + 4}>{t.toFixed(1)}</text>
      ))}
      {shown.map((ev) => {
        const xx = xDate(ev.date)!;
        return (
          <g key={`${ev.date}-${ev.label}`}>
            <line x1={xx} x2={xx} y1={T} y2={B} stroke="#B42318" strokeWidth="1.25" strokeDasharray="4 3" />
            <text
              x={xx > R - 140 ? xx - 4 : xx + 4}
              y={T + 10}
              textAnchor={xx > R - 140 ? "end" : "start"}
              style={{ fill: "#B42318", fontWeight: 500 }}
            >
              {ev.label}
            </text>
          </g>
        );
      })}
      {plotted.map((s) => {
        const pts = s.points.filter((p) => xDate(p.date) !== null);
        if (pts.length === 0) return null;
        const isSelected = s.plan === selectedPlan || (!!s.sharedWithPro && (selectedPlan === "pro" || selectedPlan === "max5"));
        const color = isSelected ? "#0EA5E9" : "#94A3B8";
        const measuredWidth = isSelected ? 2.5 : 1.5;
        const inferredWidth = isSelected ? 1.5 : 1.25;
        // Split into consecutive runs by `inferred` so measured spans draw solid and inferred
        // spans draw dashed; the point where a run changes is duplicated into both runs so the
        // two strokes meet without a gap.
        const runs: { inferred: boolean; pts: WeeklyPoint[] }[] = [];
        for (const p of pts) {
          const prevRun = runs[runs.length - 1];
          if (!prevRun || prevRun.inferred !== p.inferred) {
            const boundary = prevRun ? [prevRun.pts[prevRun.pts.length - 1]] : [];
            runs.push({ inferred: p.inferred, pts: [...boundary, p] });
          } else {
            prevRun.pts.push(p);
          }
        }
        let lastPartialIdx = -1;
        for (let i = pts.length - 1; i >= 0; i--) {
          if (pts[i].partial && !pts[i].inferred) { lastPartialIdx = i; break; }
        }
        const last = pts[pts.length - 1];
        const lastX = xDate(last.date)!;
        const nearRightEdge = lastX > R - 120;
        return (
          <g key={s.plan}>
            {runs.map((run, i) => (
              <polyline
                key={i}
                fill="none"
                stroke={color}
                strokeWidth={run.inferred ? inferredWidth : measuredWidth}
                strokeLinejoin="round"
                strokeDasharray={run.inferred ? "5 4" : undefined}
                points={run.pts.map((p) => `${xDate(p.date)},${y(p.windows)}`).join(" ")}
              />
            ))}
            {pts.filter((p) => p.partial && !p.inferred).map((p) => (
              <circle
                key={p.date}
                cx={xDate(p.date)!}
                cy={y(p.windows)}
                r={isSelected ? 4 : 3}
                fill="#fff"
                stroke={color}
                strokeWidth={2}
              />
            ))}
            {lastPartialIdx !== -1 && (() => {
              const px = xDate(pts[lastPartialIdx].date) ?? 0;
              const partialNearRight = px > R - 120;
              return (
                <text
                  x={partialNearRight ? px - 6 : px + 6}
                  y={y(pts[lastPartialIdx].windows) - 8}
                  textAnchor={partialNearRight ? "end" : "start"}
                  style={{ fill: "#64748B", fontWeight: 500 }}
                >
                  week in progress
                </text>
              );
            })()}
            <text
              x={nearRightEdge ? lastX - 6 : lastX + 6}
              y={y(last.windows) - (lastPartialIdx === pts.length - 1 ? 20 : 8)}
              textAnchor={nearRightEdge ? "end" : "start"}
              style={{ fill: color, fontWeight: 600 }}
            >
              {s.label}
            </text>
          </g>
        );
      })}
      <g style={{ fill: "#0277B5", fontWeight: 500 }}>
        {xTicks.map((d) => {
          const xx = xDate(d);
          if (xx === null) return null;
          const anchor = xx < L + 20 ? "start" : xx > R - 20 ? "end" : "middle";
          return (
            <text key={d} x={xx} y={B + 36} textAnchor={anchor}>{fmtDate(d).slice(0, 6)}</text>
          );
        })}
      </g>
      {hoverDate && (() => {
        const hx = xDate(hoverDate);
        if (hx === null) return null;
        const rows = plotted
          .map((s) => ({ s, p: s.points.find((p) => p.date === hoverDate) }))
          .filter((row): row is { s: WeeklySeries; p: WeeklyPoint } => !!row.p);
        if (rows.length === 0) return null;
        const headerText = fmtDate(hoverDate);
        const lineTexts = rows.map(
          (row) =>
            `${row.s.label}: ${row.p.windows.toFixed(1)}${row.p.partial ? " (week in progress)" : ""}${row.p.inferred ? " (inferred)" : ""}`,
        );
        const maxChars = Math.max(headerText.length, ...lineTexts.map((t) => t.length));
        const lineH = 16;
        const boxW = Math.min(340, Math.max(150, maxChars * 6.3 + 20));
        const boxH = 22 + rows.length * lineH;
        const tipNearRight = hx > R - boxW - 12;
        const boxX = tipNearRight ? hx - boxW - 10 : hx + 10;
        const boxY = T + 4;
        return (
          <g pointerEvents="none">
            <line x1={hx} x2={hx} y1={T} y2={B} stroke="#94A3B8" strokeWidth="1" />
            <rect x={boxX} y={boxY} width={boxW} height={boxH} rx="6" fill="#0F172A" fillOpacity="0.92" />
            <text x={boxX + 10} y={boxY + 16} style={{ fill: "#fff", fontWeight: 600 }}>
              {fmtDate(hoverDate)}
            </text>
            {rows.map((row, i) => (
              <text
                key={row.s.plan}
                x={boxX + 10}
                y={boxY + 16 + (i + 1) * lineH}
                style={{ fill: "#E2E8F0" }}
              >
                {lineTexts[i]}
              </text>
            ))}
          </g>
        );
      })()}
    </svg>
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
  const chartPoints = useMemo(() => (data ? seriesFor(data, plan, model, range) : []), [data, plan, model, range]);
  const weeklySeries = useMemo(() => (data ? weeklySeriesFor(data) : []), [data]);
  const weeklyEvents = useMemo(() => (data ? weeklyEventsFor(data) : []), [data]);
  const h = data ? headline(data) : null;
  // Localise only after mount: the prerender must emit the same text the first client render produces.
  const [localTime, setLocalTime] = useState<string | null>(null);
  // The stale flag depends on the clock, so it is also decided after mount, never in the prerender.
  const [stale, setStale] = useState(false);
  useEffect(() => {
    setStale(data ? Date.now() - new Date(data.generated_at).getTime() > 3 * 86400e3 : false);
    setLocalTime(
      data?.last_sample_at
        ? new Date(data.last_sample_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
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
          {!unavailable && data && localTime && (
            <div className="pill">
              <i />
              <span>Last sample {localTime}</span>
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
              {(r.sessionsPerWindow !== null || r.apiValueUsdPerWeek !== null) && (
                <div className="quiet">
                  {r.sessionsPerWindow !== null && r.sessionsPerWeek !== null && (
                    <>
                      <span>
                        about {Math.round(r.sessionsPerWindow)} sessions<em>·</em>{Math.round(r.sessionsPerWeek)} per week
                      </span>
                      {r.apiValueUsdPerWeek !== null && <em className="brk">·</em>}
                    </>
                  )}
                  {r.apiValueUsdPerWeek !== null && <span>{fmtUsd(r.apiValueUsdPerWeek)} of API value per week</span>}
                </div>
              )}
              {data.weekly_windows?.[plan] && (
                <div className="quiet">
                  A week holds about {data.weekly_windows[plan]!.current.toFixed(1)} five-hour windows, measured from a
                  real account.
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
          </section>
        )}

        {!unavailable && data && (
          <section>
            <h2>Weekly limit, 5-hour windows per week</h2>
            <p className="sub">
              How many 5-hour windows fit in one week, read from the usage meter. Full history.
            </p>
            <WeeklyChart series={weeklySeries} events={weeklyEvents} selectedPlan={plan} />
            {weeklySeries.some((s) => s.points.length >= 2) && (
              <p className="sub chart-legend">
                Solid: selected plan. Grey: the other. Dashed: inferred from the other line by the ratio of their weekly figures, not measured. Pro is assumed from Max 5x. Hollow: week in progress.
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

        <section>
          <details>
            <summary>How we measure this</summary>
            <p>
              A small fixed prompt is run repeatedly on an otherwise idle Max 20x account until Anthropic's own usage meter
              ticks from one whole percent to the next, twice. The tokens spent between the two ticks are one percent of the
              5-hour window. That runs twice a day, rotating across Sonnet 5, Opus 5 and Fable 5.1.
            </p>
            <p>
              The split between input, output and cache tokens comes from real working sessions on a second Max 20x account,
              joined against the same usage meter. Effort figures come from one calibration task run at every effort level on
              every model.
            </p>
          </details>
          <details>
            <summary>Caveats</summary>
            <p>
              This is one account running one workload mix; your split of input, output and cache tokens will differ. The
              usage meter reports whole percent, so every probe carries about one small prompt's worth of rounding error.
              Effort figures describe one calibration task shape, not your actual work. Pro and Max 5x are scaled from Max
              20x using Anthropic's published plan ratios, not measured directly &mdash; the passive-observed ratio between
              Max 5x and Max 20x on Jonathan's own account history came out at roughly 2.5x, well below the published 4x,
              most likely because some of that usage happened off this machine and wasn't captured by the probe.
            </p>
            <p>
              Probes run on{" "}
              {data?.probe_accounts?.length
                ? `two Max 20x accounts (${data.probe_accounts.join(" and ")})`
                : "two Max 20x accounts"}
              ; their readings feed into one shared median, not a per-account figure.
            </p>
            {(() => {
              // "probe" is a raw JSON key alongside the Plan keys, not itself a Plan the page
              // lets you select — read it loosely rather than widening the Plan union for it.
              const probeWeekly = (data?.weekly_windows as Record<string, { history: unknown[] } | null> | undefined)?.probe;
              return !probeWeekly || probeWeekly.history.length === 0;
            })() && (
              <p>
                The weekly-limit chart above comes from passive observation of one account's real use, not from probes.
              </p>
            )}
            <p>The most recent week on that chart is still in progress and its figure will keep moving until the week ends.</p>
            <p>
              Methodology: probes are fixed-size prompts run on an idle account until the usage meter ticks; every number
              on this page is derived from the JSON at{" "}
              <a href="/data/claude-usage.json">/data/claude-usage.json</a>.
            </p>
            <p>
              Source code and raw data: <a href="https://github.com/jonathanavis96/claude-usage-tracker">github.com/jonathanavis96/claude-usage-tracker</a>.
            </p>
          </details>
        </section>

        <p className="sub" style={{ textAlign: "center", padding: "24px 0 8px" }}>
          All Done Sites measures before it claims. Want a site that does the same? <a href="/#getquote">Get in touch</a> &middot;{" "}
          <a href="https://github.com/jonathanavis96/claude-usage-tracker">Source code and raw data</a>
        </p>
      </div>
    </PageShell>
  );
}
