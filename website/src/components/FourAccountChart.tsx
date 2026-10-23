// The four-account chart: each Max account's own readings on the two lines the detector searches,
// each indexed to what that account gets now, with the step all of them took drawn bold and each
// change the rule found marked with its size and interval on the line that found it. One time axis
// for both panels, so a change on one line can be read against the other at the same instant.
//
// The SVG is drawn at the width it is shown at (measured after mount), not scaled down from a
// desktop viewBox, so its text stays the same size on a phone.
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { accountColor } from "@/components/SpeedChart";
import {
  accountKey,
  accountsPhrase,
  fourAccountChart,
  offScale,
  pctTicks,
  seriesAt,
  sharedAt,
  shortDay,
  tickText,
  type ChangeMark,
  type FourAccountPanel,
  type FourAccountsBlock,
} from "@/lib/fourAccounts";

const DAY_MS = 86400e3;
// The width the prerender draws at, before the page has measured its column.
const SSR_WIDTH = 760;
const RED = "#B42318";
// The page's darker green, not its #059669, which is also Max account 2's line colour.
const GREEN = "#047857";
const GREY = "#94A3B8";

// A fall is red and a rise green, as on the page's other change markers.
const changeColour = (pct: number) => (pct < 0 ? RED : pct > 0 ? GREEN : GREY);

// Rough widths of the label text, enough to keep two labels from overlapping.
const SIZE_CHAR_PX = 8.2; // 14px bold
const NOTE_CHAR_PX = 6.6; // 12px
const LINE_PX = 15; // one line of label
const ROW_AIR_PX = 6;

interface PlacedLabel extends ChangeMark {
  x: number;
  anchor: "start" | "end";
  tx: number;
  row: number;
  note: string;
  rates: string | null;
}

function placeLabels(
  marks: ChangeMark[],
  x: (t: number) => number,
  left: number,
  right: number,
): { rows: number; rowPx: number; labels: PlacedLabel[] } {
  const placed: { lo: number; hi: number; row: number }[] = [];
  const out: PlacedLabel[] = [];
  // Newest first, so the newest change keeps the row next to the plot.
  for (const m of [...marks].sort((a, b) => b.t - a.t)) {
    const note = [m.interval, m.date, m.unconfirmed ? m.state : null].filter(Boolean).join(" · ");
    const rates = m.ratesInterval ? `with model rates ${m.ratesInterval}` : null;
    const w = Math.max(m.size.length * SIZE_CHAR_PX, note.length * NOTE_CHAR_PX, (rates ?? "").length * NOTE_CHAR_PX);
    const mx = x(m.t);
    let anchor: "start" | "end" = mx + 6 + w <= right ? "start" : "end";
    let lo = anchor === "start" ? mx + 6 : mx - 6 - w;
    if (lo < left) {
      anchor = "start";
      lo = Math.max(left, Math.min(mx + 6, right - w));
    }
    const hi = lo + w;
    let row = 0;
    while (placed.some((p) => p.row === row && lo < p.hi + 8 && p.lo < hi + 8)) row++;
    placed.push({ lo, hi, row });
    out.push({ ...m, x: mx, anchor, tx: anchor === "start" ? lo : hi, row, note, rates });
  }
  const rows = out.length > 0 ? Math.max(...out.map((l) => l.row)) + 1 : 0;
  // Two lines (size, then interval and date), three where a size states its rate range.
  const rowPx = (out.some((l) => l.rates) ? 3 : 2) * LINE_PX + ROW_AIR_PX;
  return { rows, rowPx, labels: out };
}

function stepPath(segments: { t0: number; t1: number; v: number }[], x: (t: number) => number, y: (v: number) => number): string {
  return segments
    .map((s, i) => {
      const prev = segments[i - 1];
      const join = prev && Math.abs(prev.t1 - s.t0) < 1 ? `L ${x(s.t0)},${y(s.v)}` : `M ${x(s.t0)},${y(s.v)}`;
      return `${join} L ${x(s.t1)},${y(s.v)}`;
    })
    .join(" ");
}

export default function FourAccountChart({ block }: { block: FourAccountsBlock | null | undefined }) {
  const chart = useMemo(() => fourAccountChart(block), [block]);
  const wrap = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(SSR_WIDTH);
  // False until the column is measured: the prerender's width is a guess, and on a phone it would
  // draw the text scaled down until the page hydrates (the CSS hides it there until measured).
  const [measured, setMeasured] = useState(false);
  const [hoverT, setHoverT] = useState<number | null>(null);
  const [pointerX, setPointerX] = useState(0);
  // The reading's measured width, so it can be kept inside the plot on a narrow phone.
  const [tipW, setTipW] = useState(0);
  const tipRef = useCallback((el: HTMLDivElement | null) => {
    if (el) setTipW((w) => (w === el.offsetWidth ? w : el.offsetWidth));
  }, []);
  const [highlight, setHighlight] = useState<string | null>(null);
  const clipBase = `fa-clip-${useId().replace(/[^A-Za-z0-9_-]/g, "")}`;
  const drawn = chart !== null;

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const measure = () => {
      setWidth(Math.max(240, Math.round(el.getBoundingClientRect().width)));
      setMeasured(true);
    };
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [drawn]);

  if (!chart) return null;

  const narrow = width < 560;
  const L = narrow ? 44 : 52;
  const R = width - (narrow ? 8 : 16);
  const plotH = narrow ? 150 : 180;
  const x = (t: number) => L + ((t - chart.t0) / (chart.t1 - chart.t0)) * (R - L);
  const tAt = (px: number) => chart.t0 + ((px - L) / (R - L)) * (chart.t1 - chart.t0);

  // Each panel: its title, a band for its change labels, then its plot.
  let top = 0;
  const layout = chart.panels.map((p) => {
    const { rows, rowPx, labels } = placeLabels(p.changes, x, 0, width);
    const titleY = top + 16;
    const plotTop = titleY + 10 + rows * rowPx + (rows > 0 ? 6 : 8);
    const plotBottom = plotTop + plotH;
    const [lo, hi] = p.domain;
    const y = (v: number) => plotBottom - ((Math.log(v) - Math.log(lo)) / (Math.log(hi) - Math.log(lo))) * plotH;
    top = plotBottom + 22;
    return { p, labels, rows, rowPx, titleY, plotTop, plotBottom, y, ticks: pctTicks(p.domain, narrow ? 3 : 5) };
  });
  const axisY = layout[layout.length - 1].plotBottom;
  const H = axisY + 30;

  // Month starts on a phone, every other Monday-ish fortnight on a wide screen: at most one label
  // per ~90px.
  const xTicks: number[] = [];
  {
    const first = new Date(chart.t0);
    const maxTicks = Math.max(2, Math.floor((R - L) / 90));
    const spanDays = (chart.t1 - chart.t0) / DAY_MS;
    if (spanDays / 14 + 1 <= maxTicks) {
      for (let d = Date.UTC(first.getUTCFullYear(), first.getUTCMonth(), first.getUTCDate() + 1); d <= chart.t1; d += 14 * DAY_MS)
        xTicks.push(d);
    } else {
      for (let m = first.getUTCMonth() + 1; ; m++) {
        const d = Date.UTC(first.getUTCFullYear(), m, 1);
        if (d > chart.t1) break;
        xTicks.push(d);
      }
    }
  }

  const accountOpacity = (a: string) => (highlight === null ? 1 : highlight === a ? 1 : 0.15);
  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - box.left;
    if (px < L || px > R) {
      setHoverT(null);
      return;
    }
    const t = tAt(px);
    // Snap to the reading days (midday UTC), the dots' own instants.
    const snapped = Math.floor(t / DAY_MS) * DAY_MS + DAY_MS / 2;
    setHoverT(Math.min(chart.t1, Math.max(chart.t0, snapped)));
    setPointerX(px);
  };

  const pctAgainstNow = (v: number | null) => (v === null ? "–" : tickText(v) === "now" ? "0%" : tickText(v));
  const ariaLabel = [
    `${accountsPhrase(chart.accounts.length).replace(/^./, (c) => c.toUpperCase())}, each against its own level now`,
    ...chart.panels.map(
      (p) =>
        `${p.title}: ${p.changes.length > 0 ? p.changes.map((c) => `${c.date} ${c.size}${c.interval ? ` (${c.interval})` : ""}${c.ratesInterval ? `, with model rates ${c.ratesInterval}` : ""}${c.unconfirmed ? ` ${c.state}` : ""}`).join(", ") : "no change found"}`,
    ),
  ].join(". ");
  // The states of the dashed steps, for the legend: "Provisional", "Candidate", or both.
  const dashedStates = [
    ...new Set(chart.panels.flatMap((p) => p.shared.filter((s) => s.unconfirmed).map((s) => s.state ?? "candidate"))),
  ];
  const dashedLabel = dashedStates.map((st, i) => (i === 0 ? st.charAt(0).toUpperCase() + st.slice(1) : st)).join(" or ");
  const toggle = (a: string) => setHighlight((cur) => (cur === a ? null : a));

  return (
    <div className={measured ? "fa-chart-wrap" : "fa-chart-wrap fa-unmeasured"} ref={wrap}>
      <div className="fa-chart-plot">
        <svg
          className="chart fa-chart"
          width={width}
          height={H}
          viewBox={`0 0 ${width} ${H}`}
          role="img"
          aria-label={ariaLabel}
          onPointerMove={onMove}
          onPointerDown={onMove}
          // A finger lifting fires pointerleave: keep a tap's reading up until the next tap.
          onPointerLeave={(e) => e.pointerType !== "touch" && setHoverT(null)}
        >
          <defs>
            {layout.map((l, i) => (
              <clipPath key={i} id={`${clipBase}-${i}`}>
                <rect x={L} y={l.plotTop} width={R - L} height={l.plotBottom - l.plotTop} />
              </clipPath>
            ))}
          </defs>
          {layout.map((l, i) => {
            const { p, y } = l;
            return (
              <g key={p.line} data-line={p.line}>
                <text x={0} y={l.titleY} className="fa-title">
                  {p.title}
                </text>
                <g stroke="#E6E9EE" strokeWidth="1">
                  {l.ticks.map((t) => (
                    <line key={t} x1={L} x2={R} y1={y(t)} y2={y(t)} />
                  ))}
                </g>
                {l.ticks.map((t) => (
                  <text key={t} x={L - 6} y={y(t) + 4} textAnchor="end" className={t === 1 ? "fa-tick fa-now" : "fa-tick"}>
                    {tickText(t)}
                  </text>
                ))}
                {/* Where each change this line found could have happened, then its instant. */}
                {p.changes.map((c) => (
                  <rect
                    key={`band-${c.t}`}
                    x={x(c.lo)}
                    y={l.plotTop}
                    width={Math.max(1, x(c.hi) - x(c.lo))}
                    height={l.plotBottom - l.plotTop}
                    fill={changeColour(c.pct)}
                    opacity=".07"
                  />
                ))}
                {p.guides.map((t) => (
                  <line key={`guide-${t}`} x1={x(t)} x2={x(t)} y1={l.plotTop} y2={l.plotBottom} stroke={GREY} strokeWidth="1" strokeDasharray="2 4" />
                ))}
                {p.changes.map((c) => (
                  <line
                    key={`mark-${c.t}`}
                    x1={x(c.t)}
                    x2={x(c.t)}
                    y1={l.plotTop - (l.rows > 0 ? 4 : 0)}
                    y2={l.plotBottom}
                    stroke={changeColour(c.pct)}
                    strokeWidth="1.5"
                    strokeDasharray="5 4"
                  />
                ))}
                {l.labels.map((c) => {
                  const base = l.plotTop - 8 - c.row * l.rowPx;
                  const lines = c.rates ? 3 : 2;
                  return (
                    <g key={`label-${c.t}`} className="fa-label">
                      <text x={c.tx} y={base - (lines - 1) * LINE_PX} textAnchor={c.anchor} className="fa-size" style={{ fill: changeColour(c.pct) }}>
                        {c.size}
                      </text>
                      <text x={c.tx} y={base - (lines - 2) * LINE_PX} textAnchor={c.anchor} className="fa-note">
                        {c.note}
                      </text>
                      {c.rates && (
                        <text x={c.tx} y={base} textAnchor={c.anchor} className="fa-note">
                          {c.rates}
                        </text>
                      )}
                    </g>
                  );
                })}
                <g clipPath={`url(#${clipBase}-${i})`}>
                  {p.series.map((s) => (
                    <g key={s.account} data-account={s.account} className="level-account" style={{ opacity: accountOpacity(s.account) }}>
                      {s.dots.map((d, j) => (
                        <circle key={j} cx={x(d.t)} cy={y(d.v)} r="2" fill={accountColor(accountKey(s.account))} opacity=".28" />
                      ))}
                      {s.runs.map((run, j) =>
                        run.length === 1 ? (
                          <circle key={`r${j}`} cx={x(run[0].t)} cy={y(run[0].v)} r="2.5" fill={accountColor(accountKey(s.account))} opacity=".8" />
                        ) : (
                          <polyline
                            key={`r${j}`}
                            points={run.map((pt) => `${x(pt.t)},${y(pt.v)}`).join(" ")}
                            fill="none"
                            stroke={accountColor(accountKey(s.account))}
                            strokeWidth={highlight === s.account ? 2.25 : 1.5}
                            strokeLinejoin="round"
                            strokeLinecap="round"
                            opacity=".8"
                          />
                        ),
                      )}
                    </g>
                  ))}
                  {/* Where an account's line runs off the panel's range: a mark along that edge. */}
                  {p.series.map((s) =>
                    offScale(s, p.domain).map((o) => {
                      const ey = o.side === "below" ? l.plotBottom - 1.5 : l.plotTop + 1.5;
                      const tip = o.side === "below" ? 5 : -5;
                      return (
                        <g key={`off-${s.account}-${o.t0}`} className="fa-off" style={{ opacity: accountOpacity(s.account) }}>
                          <line x1={x(o.t0)} x2={Math.max(x(o.t1), x(o.t0) + 1)} y1={ey} y2={ey} stroke={accountColor(accountKey(s.account))} strokeWidth="3" />
                          <path
                            d={`M ${x(o.t0) - 4},${ey - tip} L ${x(o.t0) + 4},${ey - tip} L ${x(o.t0)},${ey} Z`}
                            fill={accountColor(accountKey(s.account))}
                          />
                        </g>
                      );
                    }),
                  )}
                  {/* The step every account took: measured segments solid, a step a change not yet
                      measured drew dashed. */}
                  <path
                    d={stepPath(p.shared.filter((s) => !s.unconfirmed), x, y)}
                    fill="none"
                    stroke="var(--ads-ac)"
                    strokeWidth="3"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />
                  {p.shared.map((s, j) => {
                    if (!s.unconfirmed) return null;
                    const prev = p.shared[j - 1];
                    return (
                      <path
                        key={`prov-${j}`}
                        d={`${prev ? `M ${x(s.t0)},${y(prev.v)} L ${x(s.t0)},${y(s.v)}` : `M ${x(s.t0)},${y(s.v)}`} L ${x(s.t1)},${y(s.v)}`}
                        fill="none"
                        stroke="var(--ads-ac)"
                        strokeWidth="3"
                        strokeDasharray="7 5"
                        strokeLinecap="round"
                      />
                    );
                  })}
                </g>
                {hoverT !== null && (
                  <line x1={x(hoverT)} x2={x(hoverT)} y1={l.plotTop} y2={l.plotBottom} stroke="var(--ads-tx)" strokeWidth="1" opacity=".35" />
                )}
              </g>
            );
          })}
          <g className="fa-axis">
            {xTicks.map((t) => {
              const xx = x(t);
              const anchor = xx < L + 20 ? "start" : xx > R - 20 ? "end" : "middle";
              return (
                <text key={t} x={xx} y={axisY + 20} textAnchor={anchor}>
                  {shortDay(t)}
                </text>
              );
            })}
          </g>
        </svg>
        {hoverT !== null && (
          <div
            className="fa-tip"
            role="presentation"
            ref={tipRef}
            // Beside the pointer, on the side with more room, and never past either edge of the plot.
            style={{
              left: Math.max(0, Math.min(pointerX > width / 2 ? pointerX - 12 - tipW : pointerX + 12, width - tipW)),
            }}
          >
            <div className="fa-tip-day">{shortDay(hoverT)}</div>
            <table>
              <thead>
                <tr>
                  <th />
                  {chart.panels.map((p) => (
                    <th key={p.line}>{p.line === "seven_day" ? "7-day" : "5h / 7d"}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {chart.accounts.map((a) => (
                  <tr key={a}>
                    <td>
                      <span className="fa-swatch" style={{ background: accountColor(accountKey(a)) }} />
                      {a.replace(/^Max account /, "")}
                    </td>
                    {chart.panels.map((p) => {
                      const s = p.series.find((ss) => ss.account === a);
                      return <td key={p.line}>{pctAgainstNow(s ? seriesAt(s, hoverT) : null)}</td>;
                    })}
                  </tr>
                ))}
                <tr className="fa-tip-shared">
                  <td>
                    <span className="fa-swatch fa-swatch-shared" />
                    Shared
                  </td>
                  {chart.panels.map((p) => (
                    <td key={p.line}>{pctAgainstNow(sharedAt(p.shared, hoverT))}</td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
      <ul className="share-legend fa-legend">
        {chart.accounts.map((a) => (
          <li
            key={a}
            className="level-account-key"
            role="button"
            tabIndex={0}
            aria-pressed={highlight === a}
            aria-label={`Highlight ${a}`}
            data-account={a}
            onPointerEnter={(e) => e.pointerType !== "touch" && setHighlight(a)}
            onPointerLeave={(e) => e.pointerType !== "touch" && setHighlight((cur) => (cur === a ? null : cur))}
            onPointerDown={(e) => e.pointerType === "touch" && toggle(a)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                toggle(a);
              }
            }}
            onBlur={() => setHighlight((cur) => (cur === a ? null : cur))}
          >
            <span className="fa-key" style={{ background: accountColor(accountKey(a)) }} />
            {a}
          </li>
        ))}
        <li>
          <span className="fa-key fa-key-shared" />
          Shared step
        </li>
        {dashedStates.length > 0 && (
          <li>
            <span className="fa-key fa-key-provisional" />
            {dashedLabel}
          </li>
        )}
      </ul>
      <div className="sr-only">
      <table>
        <caption>Changes found</caption>
        <thead>
          <tr>
            <th>Line</th>
            <th>Date</th>
            <th>Change</th>
            <th>Interval</th>
            <th>With model rates</th>
          </tr>
        </thead>
        <tbody>
          {chart.panels.flatMap((p: FourAccountPanel) =>
            p.changes.map((c) => (
              <tr key={`${p.line}-${c.t}`}>
                <td>{p.title}</td>
                <td>{c.date}</td>
                <td>
                  {c.size}
                  {c.unconfirmed ? ` ${c.state}` : ""}
                </td>
                <td>{c.interval ?? ""}</td>
                <td>{c.ratesInterval ?? ""}</td>
              </tr>
            )),
          )}
        </tbody>
      </table>
      </div>
    </div>
  );
}
