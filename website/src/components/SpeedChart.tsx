// website/src/components/SpeedChart.tsx — median output tokens per second per day, one line per
// model, drawn the way the tracker page's LevelChart draws its plans: the selected series in the
// accent, every other one muted grey, labels on the right edge in the theme's ink.
import { useEffect, useRef } from "react";
import { accountLabel, fmtDate, modelLabel, type SpeedAccountSeries, type SpeedPoint, type SpeedSeries } from "@/lib/claudeUsage";
import { CONTRIB_PALETTE } from "@/lib/contrib";

const ACCENT = "#0EA5E9";
const MUTED = "#94A3B8";
const DAY_MS = 86400e3;

// Right-edge labels pushed apart so none covers another, then pulled back inside the plot.
function stackLabels(items: { key: string; y: number }[], top: number, bottom: number, gap: number): Map<string, number> {
  const sorted = [...items].sort((a, b) => a.y - b.y);
  let prev = -Infinity;
  for (const it of sorted) {
    it.y = Math.max(it.y, prev + gap);
    prev = it.y;
  }
  const overflow = sorted.length > 0 ? sorted[sorted.length - 1].y - bottom : 0;
  if (overflow > 0) for (const it of sorted) it.y -= overflow;
  for (const it of sorted) it.y = Math.max(it.y, top);
  return new Map(sorted.map((it) => [it.key, it.y]));
}

export default function SpeedChart({ series, selectedModel }: { series: SpeedSeries[]; selectedModel: string }) {
  // A day per point is dense, so on a phone the plot keeps a legible width and scrolls inside its
  // own container, as the windows-per-week chart does, opening on the newest days at the right.
  const scroller = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, [series.length]);
  if (series.length === 0) return null;
  const W = 840, H = 260, L = 44, R = 732, T = 20, B = 200;
  const selected = series.find((s) => s.model === selectedModel);
  const days = series.flatMap((s) => s.runs.flat());
  const vals = [
    ...days.map((d) => d.output_tokens_per_s.median),
    ...(selected?.runs.flat().flatMap((d) => [d.output_tokens_per_s.q1, d.output_tokens_per_s.q3]) ?? []),
  ];
  const lo = Math.min(...vals) * 0.9, hi = Math.max(...vals) * 1.05;
  const t = (d: string) => Date.parse(`${d}T00:00:00Z`);
  const stamps = days.map((d) => t(d.day));
  const d0 = Math.min(...stamps), d1 = Math.max(...stamps);
  const span = Math.max(DAY_MS, d1 - d0);
  const x = (d: string) => L + ((t(d) - d0) / span) * (R - L);
  const y = (v: number) => B - ((v - lo) / (hi - lo)) * (B - T);
  const ticks = [0, 1, 2, 3].map((k) => lo + ((hi - lo) * k) / 3);
  const spanDays = span / DAY_MS;
  const stepDays = spanDays > 120 ? 28 : spanDays > 60 ? 14 : 7;
  const xTicks: string[] = [];
  for (let s = d0; s <= d1; s += stepDays * DAY_MS) xTicks.push(new Date(s).toISOString().slice(0, 10));
  const fmt = (v: number) => String(Math.round(v));
  // The selected model last, so its line sits on top of the muted ones.
  const ordered = [...series.filter((s) => s !== selected), ...(selected ? [selected] : [])];
  const labelY = stackLabels(
    series.map((s) => ({ key: s.model, y: y(s.last.output_tokens_per_s.median) })),
    T + 6,
    B,
    14,
  );
  const ariaLabel = [
    "Median output tokens per second by day",
    ...series.map(
      (s) =>
        `${modelLabel(s.model)}: ${s.runs
          .flat()
          .map((d) => `${fmtDate(d.day)} ${d.output_tokens_per_s.median.toFixed(1)}`)
          .join(", ")}`,
    ),
  ].join(". ");
  return (
    <div ref={scroller} className="speed-chart" style={{ overflowX: "auto", maxWidth: "100%" }}>
      <svg className="chart" viewBox={`0 0 ${W} ${H}`} width="100%" style={{ minWidth: 640, display: "block" }} role="img" aria-label={ariaLabel}>
        <g stroke="#E6E9EE" strokeWidth="1">
          {ticks.map((v) => (
            <line key={v} x1={L} x2={R} y1={y(v)} y2={y(v)} />
          ))}
        </g>
        {ticks.map((v) => (
          <text key={v} x={0} y={y(v) + 4}>{fmt(v)}</text>
        ))}
        {/* The selected model's interquartile range, one band per run of consecutive days, so a
            missing day leaves a gap in the band as it does in the line. */}
        {selected?.runs.map((run) =>
          run.length > 1 ? (
            <polygon
              key={`iqr-${run[0].day}`}
              data-iqr={selected.model}
              fill={ACCENT}
              opacity=".15"
              points={[
                ...run.map((d) => `${x(d.day)},${y(d.output_tokens_per_s.q3)}`),
                ...[...run].reverse().map((d) => `${x(d.day)},${y(d.output_tokens_per_s.q1)}`),
              ].join(" ")}
            />
          ) : (
            <line
              key={`iqr-${run[0].day}`}
              data-iqr={selected.model}
              x1={x(run[0].day)}
              x2={x(run[0].day)}
              y1={y(run[0].output_tokens_per_s.q3)}
              y2={y(run[0].output_tokens_per_s.q1)}
              stroke={ACCENT}
              strokeWidth="6"
              opacity=".15"
            />
          ),
        )}
        {ordered.map((s) => {
          const isSelected = s === selected;
          const color = isSelected ? ACCENT : MUTED;
          const ink = isSelected ? "var(--ads-tx)" : "var(--ads-mut)";
          const ly = labelY.get(s.model) ?? y(s.last.output_tokens_per_s.median);
          return (
            <g key={s.model} data-model={s.model} data-selected={isSelected ? "true" : undefined}>
              {s.runs.map((run) =>
                run.length > 1 ? (
                  <path
                    key={run[0].day}
                    d={run.map((d, i) => `${i === 0 ? "M" : "L"} ${x(d.day)},${y(d.output_tokens_per_s.median)}`).join(" ")}
                    fill="none"
                    stroke={color}
                    strokeWidth={isSelected ? 3 : 1.75}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />
                ) : (
                  // A day with no neighbour is a dot: a one-point path would not show at all.
                  <circle key={run[0].day} cx={x(run[0].day)} cy={y(run[0].output_tokens_per_s.median)} r={isSelected ? 3 : 2.25} fill={color} />
                ),
              )}
              <line
                x1={x(s.last.day)}
                x2={R + 6}
                y1={y(s.last.output_tokens_per_s.median)}
                y2={ly}
                stroke={color}
                strokeWidth="1"
                strokeDasharray="2 3"
                opacity=".6"
              />
              <text x={R + 10} y={ly + 4}>
                <tspan style={{ fill: ink, fontWeight: 700 }}>{fmt(s.last.output_tokens_per_s.median)}</tspan>
                <tspan style={{ fill: ink, fontWeight: isSelected ? 600 : 500 }}> – {modelLabel(s.model)}</tspan>
              </text>
            </g>
          );
        })}
        <g style={{ fill: "#0277B5", fontWeight: 500 }}>
          {xTicks.map((d) => {
            const xx = x(d);
            const anchor = xx < L + 20 ? "start" : xx > R - 20 ? "end" : "middle";
            return (
              <text key={d} x={xx} y={B + 36} textAnchor={anchor}>{fmtDate(d).slice(0, 6)}</text>
            );
          })}
        </g>
      </svg>
    </div>
  );
}

// One colour per account, from the palette the contributor chart already uses, keyed by the
// account's place in the block so an account keeps its colour whichever model is picked.
export function accountColor(index: number): string {
  return CONTRIB_PALETTE[index % CONTRIB_PALETTE.length];
}

// Median output tokens per second per day for one model, one line per account. Where a row
// publishes its fast sessions separately, those are drawn for the account as a dotted line in the
// same colour. A missing day is a gap; an account with no rows for the model has no line, and the
// legend names it.
export function SpeedByAccountChart({
  series,
  missing,
  accounts,
  model,
  span: dayRange,
}: {
  series: SpeedAccountSeries[];
  missing: string[];
  accounts: string[];
  model: string;
  // First and last day of the chart above, so the two share a day axis.
  span?: [string, string];
}) {
  const scroller = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, [series.length, model]);
  const colorOf = (a: string) => accountColor(Math.max(0, accounts.indexOf(a)));
  const legend = (
    <ul className="share-legend speed-legend">
      {series.map((s) => (
        <li key={s.account}>
          <span className="swatch" style={{ background: colorOf(s.account) }} />
          {accountLabel(s.account)}
        </li>
      ))}
      {series.some((s) => s.fastRuns.length > 0) && (
        <li data-legend="fast-sessions">
          <svg width="22" height="10" aria-hidden="true">
            <line x1="1" x2="21" y1="5" y2="5" stroke="var(--ads-mut)" strokeWidth="2.5" strokeDasharray="1 4" strokeLinecap="round" />
          </svg>
          fast sessions
        </li>
      )}
      {missing.length > 0 && (
        <li data-legend="no-data">
          No data for {modelLabel(model)}: {missing.map(accountLabel).join(", ")}
        </li>
      )}
    </ul>
  );
  if (series.length === 0) return <div className="speed-chart">{legend}</div>;
  // The same plot box as the chart above, so a day sits under the same day there.
  const W = 840, H = 250, L = 44, R = 732, T = 20, B = 200;
  const points = series.flatMap((s) => [...s.runs.flat(), ...s.fastRuns.flat()]);
  const vals = points.map((p) => p.median);
  const lo = Math.min(...vals) * 0.9, hi = Math.max(...vals) * 1.05;
  const t = (d: string) => Date.parse(`${d}T00:00:00Z`);
  const stamps = [...points.map((p) => p.day), ...(dayRange ?? [])].map(t);
  const d0 = Math.min(...stamps), d1 = Math.max(...stamps);
  const span = Math.max(DAY_MS, d1 - d0);
  // A single day sits in the middle rather than on the left edge.
  const x = (d: string) => (d1 === d0 ? (L + R) / 2 : L + ((t(d) - d0) / span) * (R - L));
  const y = (v: number) => B - ((v - lo) / (hi - lo || 1)) * (B - T);
  const ticks = [0, 1, 2, 3].map((k) => lo + ((hi - lo) * k) / 3);
  const spanDays = span / DAY_MS;
  const stepDays = spanDays > 120 ? 28 : spanDays > 60 ? 14 : 7;
  const xTicks: string[] = [];
  for (let s = d0; s <= d1; s += stepDays * DAY_MS) xTicks.push(new Date(s).toISOString().slice(0, 10));
  const fmt = (v: number) => String(Math.round(v));
  const line = (run: SpeedPoint[]) => run.map((p, i) => `${i === 0 ? "M" : "L"} ${x(p.day)},${y(p.median)}`).join(" ");
  const ariaLabel = [
    `Median output tokens per second by day for ${modelLabel(model)}, by account`,
    ...series.map((s) =>
      [
        `${accountLabel(s.account)}: ${s.runs.flat().map((p) => `${fmtDate(p.day)} ${p.median.toFixed(1)}`).join(", ")}`,
        s.fastRuns.length > 0
          ? `${accountLabel(s.account)} fast sessions: ${s.fastRuns.flat().map((p) => `${fmtDate(p.day)} ${p.median.toFixed(1)}`).join(", ")}`
          : null,
      ]
        .filter(Boolean)
        .join(". "),
    ),
  ].join(". ");
  return (
    <div className="speed-chart speed-by-account">
      <div ref={scroller} style={{ overflowX: "auto", maxWidth: "100%" }}>
        <svg className="chart" viewBox={`0 0 ${W} ${H}`} width="100%" style={{ minWidth: 640, display: "block" }} role="img" aria-label={ariaLabel}>
          <g stroke="#E6E9EE" strokeWidth="1">
            {ticks.map((v) => (
              <line key={v} x1={L} x2={R} y1={y(v)} y2={y(v)} />
            ))}
          </g>
          {ticks.map((v) => (
            <text key={v} x={0} y={y(v) + 4}>{fmt(v)}</text>
          ))}
          {series.map((s) => {
            const color = colorOf(s.account);
            return (
              <g key={s.account} data-account={accountLabel(s.account)}>
                {s.runs.map((run) =>
                  run.length > 1 ? (
                    <path key={run[0].day} data-run={run[0].day} d={line(run)} fill="none" stroke={color} strokeWidth="2.25" strokeLinejoin="round" strokeLinecap="round" />
                  ) : (
                    <circle key={run[0].day} data-run={run[0].day} cx={x(run[0].day)} cy={y(run[0].median)} r="3" fill={color} />
                  ),
                )}
                {s.fastRuns.map((run) =>
                  run.length > 1 ? (
                    <path key={`fast-${run[0].day}`} data-fast={run[0].day} d={line(run)} fill="none" stroke={color} strokeWidth="2.5" strokeDasharray="1 5" strokeLinecap="round" />
                  ) : (
                    <circle key={`fast-${run[0].day}`} data-fast={run[0].day} cx={x(run[0].day)} cy={y(run[0].median)} r="3.5" fill="var(--ads-bg)" stroke={color} strokeWidth="1.5" strokeDasharray="1 2" />
                  ),
                )}
              </g>
            );
          })}
          <g style={{ fill: "#0277B5", fontWeight: 500 }}>
            {xTicks.map((d) => {
              const xx = x(d);
              const anchor = xx < L + 20 ? "start" : xx > R - 20 ? "end" : "middle";
              return (
                <text key={d} x={xx} y={B + 36} textAnchor={anchor}>{fmtDate(d).slice(0, 6)}</text>
              );
            })}
          </g>
        </svg>
      </div>
      {legend}
    </div>
  );
}
