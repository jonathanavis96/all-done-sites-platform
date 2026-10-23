// website/src/components/SpeedChart.tsx — median output tokens per second per day, one line per
// model, drawn the way the tracker page's LevelChart draws its plans: the selected series in the
// accent, every other one muted grey, labels on the right edge in the theme's ink.
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { accountLabel, fmtDate, modelLabel, type SpeedAccountSeries, type SpeedDay, type SpeedPoint, type SpeedSeries } from "@/lib/claudeUsage";
import { CONTRIB_PALETTE } from "@/lib/contrib";

const ACCENT = "#0EA5E9";
const MUTED = "#94A3B8";
// The accent's darker blue (the page's axis-label blue), for the selected model's end label.
const ACCENT_INK = "#0277B5";
// A muted line under the pointer, a step darker so it stands out from the other muted lines.
const MUTED_HOVER = "#64748B";
// Rough width of a character in the hover reading's 12-13px text.
const TIP_CHAR_PX = 6.6;
const DAY_MS = 86400e3;

// Right-edge labels, each as close to its own line's last value as the others allow (Jonathan,
// 2026-10-23: with Opus 5.5 selected its label sat level with Fable 5.1's line, 24 tok/s below it,
// because the whole stack had been pushed up to clear the bottom). Labels too close to share a
// height are spread as one group about the mean of their own lines, keeping the lines' top-to-bottom
// order, rather than all pushed one way; a `pinned` label (the selected model's) stays exactly at its
// line and the others move around it. Each is then joined to its line's end by a short leader.
export function placeEndLabels(
  items: { key: string; y: number; pinned?: boolean }[],
  top: number,
  bottom: number,
  gap: number,
): Map<string, number> {
  const sorted = [...items].sort((a, b) => a.y - b.y || a.key.localeCompare(b.key));
  const pin = sorted.findIndex((it) => it.pinned);
  if (pin < 0) return spread(sorted, top, bottom, gap, "top");
  // The pinned label never moves: the labels above it are spread above it and the ones below it
  // below, each side running past its outer bound if it must (the chart grows to hold them)
  // rather than over the pinned label.
  const py = sorted[pin].y;
  return new Map([
    ...spread(sorted.slice(0, pin), top, py - gap, gap, "bottom"),
    [sorted[pin].key, py] as const,
    ...spread(sorted.slice(pin + 1), py + gap, bottom, gap, "top"),
  ]);
}

// Labels in their lines' order, spread `gap` apart in groups about their own lines' mean height.
// `hard` names the bound a group never crosses where the room runs out; it may cross the other.
function spread(sorted: { key: string; y: number }[], top: number, bottom: number, gap: number, hard: "top" | "bottom") {
  // Each group: its labels in order, and the height of its first; a label sits `gap` below the one before.
  type Group = { items: typeof sorted; y0: number };
  const groups: Group[] = [];
  const fit = (g: Group) => {
    const want = g.items.reduce((sum, it, i) => sum + it.y - i * gap, 0) / g.items.length;
    const span = (g.items.length - 1) * gap;
    g.y0 = hard === "top" ? Math.max(Math.min(want, bottom - span), top) : Math.min(Math.max(want, top), bottom - span);
  };
  for (const it of sorted) {
    const g: Group = { items: [it], y0: 0 };
    fit(g);
    groups.push(g);
    // Merge back while this group overlaps the one above it.
    while (groups.length > 1) {
      const last = groups[groups.length - 1], prev = groups[groups.length - 2];
      if (prev.y0 + prev.items.length * gap <= last.y0) break;
      groups.pop();
      prev.items = [...prev.items, ...last.items];
      fit(prev);
    }
  }
  const out = new Map<string, number>();
  for (const g of groups) g.items.forEach((it, k) => out.set(it.key, g.y0 + k * gap));
  return out;
}

// The text of the hover reading: the model, the day and its median, with the day's request count.
export function speedTipLines(model: string, d: SpeedDay): [string, string] {
  return [
    `${modelLabel(model)} · ${fmtDate(d.day)}`,
    `${d.output_tokens_per_s.median.toFixed(1)} tokens/s median · ${d.n.toLocaleString("en-GB")} requests`,
  ];
}

export default function SpeedChart({ series, selectedModel }: { series: SpeedSeries[]; selectedModel: string }) {
  // A day per point is dense, so on a phone the plot keeps a legible width and scrolls inside its
  // own container, as the windows-per-week chart does, opening on the newest days at the right.
  const scroller = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, [series.length]);
  // The point under the pointer, a tap or the keyboard: a model and one of its days.
  const [hover, setHover] = useState<{ model: string; day: string } | null>(null);
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
  const labelY = placeEndLabels(
    series.map((s) => ({ key: s.model, y: y(s.last.output_tokens_per_s.median), pinned: s === selected })),
    T - 6,
    H - 30,
    14,
  );
  // The plot keeps its place; the viewBox grows where a label had to run past the usual band.
  const labelYs = [...labelY.values()];
  const vbTop = Math.min(0, Math.min(...labelYs) - 12);
  const vbH = Math.max(H, Math.max(...labelYs) + 8) - vbTop;
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
  // The hovered point and its reading, kept inside the plot.
  const hoverSeries = hover ? series.find((s) => s.model === hover.model) : undefined;
  const hoverDay = hoverSeries?.runs.flat().find((d) => d.day === hover!.day);
  const tip = hoverSeries && hoverDay ? speedTipLines(hoverSeries.model, hoverDay) : null;
  const tipW = tip ? Math.max(...tip.map((l) => l.length)) * TIP_CHAR_PX + 16 : 0;
  const tipX = hoverDay ? Math.min(Math.max(x(hoverDay.day) - tipW / 2, L), W - tipW - 2) : 0;
  const hy = hoverDay ? y(hoverDay.output_tokens_per_s.median) : 0;
  const tipY = hy - 52 >= 0 ? hy - 52 : hy + 12;
  // Arrow keys step through the selected model's days; Escape clears the reading.
  const selectedDays = (selected ?? series[0]).runs.flat();
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape") return setHover(null);
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    const model = (selected ?? series[0]).model;
    const at = hover?.model === model ? selectedDays.findIndex((d) => d.day === hover.day) : -1;
    const next = at < 0 ? selectedDays.length - 1 : Math.min(Math.max(at + (e.key === "ArrowRight" ? 1 : -1), 0), selectedDays.length - 1);
    setHover({ model, day: selectedDays[next].day });
  };
  return (
    <div
      ref={scroller}
      className="speed-chart"
      style={{ overflowX: "auto", maxWidth: "100%" }}
      tabIndex={0}
      role="group"
      aria-label="Speed chart: arrow keys read the selected model's days"
      onKeyDown={onKeyDown}
      onBlur={() => setHover(null)}
    >
      <svg
        className="chart"
        viewBox={`0 ${vbTop} ${W} ${vbH}`}
        width="100%"
        style={{ minWidth: 640, display: "block" }}
        role="img"
        aria-label={ariaLabel}
        onPointerLeave={(e) => e.pointerType === "mouse" && setHover(null)}
      >
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
          const isHovered = hover?.model === s.model;
          const color = isSelected ? ACCENT : isHovered ? MUTED_HOVER : MUTED;
          // The selected model's label is in the accent's darker blue, with its line.
          const ink = isSelected ? ACCENT_INK : "var(--ads-mut)";
          const ex = x(s.last.day), ey = y(s.last.output_tokens_per_s.median);
          const ly = labelY.get(s.model) ?? ey;
          return (
            <g key={s.model} data-model={s.model} data-selected={isSelected ? "true" : undefined}>
              {s.runs.map((run) =>
                run.length > 1 ? (
                  <path
                    key={run[0].day}
                    d={run.map((d, i) => `${i === 0 ? "M" : "L"} ${x(d.day)},${y(d.output_tokens_per_s.median)}`).join(" ")}
                    fill="none"
                    stroke={color}
                    strokeWidth={isSelected ? 3 : isHovered ? 2.5 : 1.75}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />
                ) : (
                  // A day with no neighbour is a dot: a one-point path would not show at all.
                  <circle key={run[0].day} cx={x(run[0].day)} cy={y(run[0].output_tokens_per_s.median)} r={isSelected ? 3 : 2.25} fill={color} />
                ),
              )}
              {/* The leader from the line's last day to its label, which sits at that day's value
                  unless it had to move to clear another label. */}
              <polyline
                data-leader={s.model}
                points={`${ex},${ey} ${R + 4},${ly} ${R + 8},${ly}`}
                fill="none"
                stroke={color}
                strokeWidth={isSelected ? 1.5 : 1}
                // Dashed even when selected, so a long leader is never read as a flat run of data.
                strokeDasharray={isSelected ? "4 3" : "2 3"}
                opacity={isSelected ? 1 : 0.6}
              />
              <text x={R + 11} y={ly + 4} data-end-label={s.model}>
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
        {/* Hover and tap targets, one per model per day, the selected model's on top. Invisible:
            each widens its point so a line is easy to land on. */}
        <g data-hits="">
          {ordered.map((s) =>
            s.runs.flat().map((d) => (
              <circle
                key={`${s.model}-${d.day}`}
                data-hit={d.day}
                data-hit-model={s.model}
                cx={x(d.day)}
                cy={y(d.output_tokens_per_s.median)}
                r="6"
                fill="transparent"
                style={{ cursor: "pointer" }}
                // A mouse reads on hover; a touch reads on tap (its emulated hover would undo the tap).
                onPointerEnter={(e) => e.pointerType === "mouse" && setHover({ model: s.model, day: d.day })}
                onClick={() =>
                  setHover((h) => (h && h.model === s.model && h.day === d.day ? null : { model: s.model, day: d.day }))
                }
              />
            )),
          )}
        </g>
        {tip && hoverDay && (
          <g data-tooltip="" pointerEvents="none">
            <circle cx={x(hoverDay.day)} cy={hy} r="4.5" fill="#fff" stroke={hover!.model === selected?.model ? ACCENT : MUTED_HOVER} strokeWidth="2" />
            <rect x={tipX} y={tipY} width={tipW} height={40} rx="6" fill="#0F172A" opacity=".92" />
            <text x={tipX + 8} y={tipY + 16} style={{ fill: "#fff", fontWeight: 600 }}>{tip[0]}</text>
            <text x={tipX + 8} y={tipY + 32} style={{ fill: "#E2E8F0" }}>{tip[1]}</text>
          </g>
        )}
      </svg>
    </div>
  );
}

// The account colours: the contributor palette without the two hues the plan and model lines
// use -- the accent sky blue of a selected line and the slate beside the muted grey of the
// others -- so an account line is never mistaken for a plan's or a model's.
const ACCOUNT_PALETTE = CONTRIB_PALETTE.filter((c) => c !== ACCENT && c !== "#64748B");

// One colour per account, keyed on the account's own label (a1 is always the first colour), so
// each Max account has the one colour on every chart on the page, whichever chart lists it.
export function accountColor(account: string): string {
  const n = /^a([1-9]\d*)$/.exec(account)?.[1];
  return ACCOUNT_PALETTE[n ? (Number(n) - 1) % ACCOUNT_PALETTE.length : 0];
}

// Median output tokens per second per day for one model, one line per account, charted as
// published. A missing day is a gap; an account with no rows for the model has no line, and the
// legend names it.
export function SpeedByAccountChart({
  series,
  missing,
  model,
  span: dayRange,
}: {
  series: SpeedAccountSeries[];
  missing: string[];
  model: string;
  // First and last day of the chart above, so the two share a day axis.
  span?: [string, string];
}) {
  const scroller = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, [series.length, model]);
  const colorOf = accountColor;
  const legend = (
    <ul className="share-legend speed-legend">
      {series.map((s) => (
        <li key={s.account}>
          <span className="swatch" style={{ background: colorOf(s.account) }} />
          {accountLabel(s.account)}
        </li>
      ))}
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
  const points = series.flatMap((s) => s.runs.flat());
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
    ...series.map(
      (s) => `${accountLabel(s.account)}: ${s.runs.flat().map((p) => `${fmtDate(p.day)} ${p.median.toFixed(1)}`).join(", ")}`,
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
