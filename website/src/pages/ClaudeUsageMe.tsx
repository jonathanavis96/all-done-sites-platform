// website/src/pages/ClaudeUsageMe.tsx — a contributor's personal page,
// /claude-usage-tracker/me/<contributor id>. Client-rendered only: the id is in the
// URL and the samples come from /api/contribute/me, so there is nothing to prerender.
// The fleet reference comes from the same published JSON the tracker page uses.
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Seo from "@/components/Seo";
import { PageShell } from "@/components/redesign/RedesignChrome";
import { MODEL_LABELS, PLAN_LABELS, fmtTokens, fmtUsd2, type UsageJson } from "@/lib/claudeUsage";
import {
  COARSE_BELOW,
  fleetTokensPerPercent,
  fleetUsdPerPercent,
  isContributorId,
  mainModel,
  modelsIn,
  sampleValue,
  shareTokensPerPercent,
  usdPerPercent,
  type PublicSample,
} from "@/lib/contrib";
import "@/styles/home.css";
import "@/styles/claude-usage.css";
import initialJson from "../../public/data/claude-usage.json";
const initialUsage = initialJson as unknown as UsageJson;

const SITE = "https://alldonesites.com";

// Legend/bar colors for up to a handful of models. Repeats if there are more than this many,
// which is not expected in practice (MAX_MODELS in contrib.ts is 12, but real mixes are small).
const MODEL_COLORS = ["var(--ads-ac)", "var(--claude)", "#7C6FE0", "#059669", "#D97757", "#0EA5E9"];

function fmtWhen(iso: string): string {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return iso;
  return new Date(t).toLocaleString([], { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

function fmtDay(t: number): string {
  return new Date(t).toLocaleDateString([], { day: "numeric", month: "short" });
}

function modelColor(i: number): string {
  return MODEL_COLORS[i % MODEL_COLORS.length];
}

function modelLabel(m: string): string {
  return MODEL_LABELS[m] ?? m;
}

/** Horizontal stacked bar of one sample's per-model dollar shares, plus a legend. */
function ShareBar({ perModel, total, models }: { perModel: Record<string, number>; total: number; models: string[] }) {
  const rows = models.filter((m) => (perModel[m] ?? 0) > 0);
  if (rows.length === 0 || total <= 0) return <p className="sub">No priced tokens in the newest sample yet.</p>;
  const W = 840, H = 40;
  let x = 0;
  const segments = rows.map((m, i) => {
    const usd = perModel[m] ?? 0;
    const w = (usd / total) * W;
    const seg = { m, i, x, w, usd, pct: (usd / total) * 100 };
    x += w;
    return seg;
  });
  return (
    <div>
      <svg className="chart share-bar" viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Dollar share by model in the newest sample">
        {segments.map((s) => (
          <rect key={s.m} x={s.x} y={0} width={Math.max(s.w, 0)} height={H} fill={modelColor(s.i)} />
        ))}
      </svg>
      <ul className="share-legend">
        {segments.map((s) => (
          <li key={s.m}>
            <span className="swatch" style={{ background: modelColor(s.i) }} />
            {modelLabel(s.m)} · {s.pct.toFixed(0)}% · {fmtUsd2(s.usd)}
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Grouped horizontal bars, one row per model: your share tokens per 1% vs the fleet's. Bars are
 * plain SVG rectangles on a 0-100 viewBox (percent-of-max width, no embedded text — an SVG's
 * text scales with the viewBox, which gets illegible once the page shrinks to phone width), with
 * the model name and both values as ordinary HTML text alongside so labels never overflow.
 */
function TokensPerPctBars({
  rows,
}: {
  rows: { model: string; mine: number | null; fleet: number | null }[];
}) {
  if (rows.length === 0) return <p className="sub">No priced tokens in the newest sample yet.</p>;
  const maxVal = Math.max(1, ...rows.flatMap((r) => [r.mine ?? 0, r.fleet ?? 0]));
  const pct = (v: number) => Math.max(1, (v / maxVal) * 100);
  return (
    <div className="tp-bars">
      {rows.map((r) => (
        <div className="tp-row" key={r.model}>
          <div className="tp-label">{modelLabel(r.model)}</div>
          <div className="tp-bar-line">
            <svg className="tp-bar fleet" viewBox="0 0 100 10" preserveAspectRatio="none" role="presentation">
              <rect x={0} y={0} width={r.fleet !== null ? pct(r.fleet) : 0} height={10} />
            </svg>
            <span className="tp-val muted">{r.fleet !== null ? `fleet ${fmtTokens(r.fleet)}` : "fleet —"}</span>
          </div>
          <div className="tp-bar-line">
            <svg className="tp-bar mine" viewBox="0 0 100 10" preserveAspectRatio="none" role="presentation">
              <rect x={0} y={0} width={r.mine !== null ? pct(r.mine) : 0} height={10} />
            </svg>
            <span className="tp-val">{r.mine !== null ? `you ${fmtTokens(r.mine)}` : "you —"}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

/** Combined $ per 1% over time, one point per sample, against the fleet dashed line. */
function UsdChart({ points, fleet }: { points: { t: number; value: number }[]; fleet: number | null }) {
  if (points.length === 0) return <p className="sub">No priced sample with a non-zero five-hour meter yet.</p>;
  const W = 840, H = 260, L = 64, R = 820, T = 20, B = 200;
  const vals = points.map((p) => p.value).concat(fleet !== null ? [fleet] : []);
  const hi = Math.max(...vals) * 1.15 || 1;
  const lo = 0;
  const t0 = points[0].t;
  const t1 = points[points.length - 1].t;
  const span = Math.max(1, t1 - t0);
  const x = (t: number) => (points.length === 1 ? (L + R) / 2 : L + ((t - t0) / span) * (R - L));
  const y = (v: number) => B - ((v - lo) / (hi - lo)) * (B - T);
  const ticks = [0, 1, 2, 3].map((k) => lo + ((hi - lo) * k) / 3);
  const path = points.map((p) => `${x(p.t)},${y(p.value)}`).join(" ");
  const desc =
    `${points.length} sample${points.length === 1 ? "" : "s"}, latest ${fmtUsd2(points[points.length - 1].value)} per 1%` +
    (fleet !== null ? `, fleet ${fmtUsd2(fleet)}` : "");
  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={desc}>
      {ticks.map((v) => (
        <g key={v}>
          <line x1={L} x2={R} y1={y(v)} y2={y(v)} stroke="var(--ads-line)" />
          <text x={L - 8} y={y(v) + 4} textAnchor="end">{fmtUsd2(v)}</text>
        </g>
      ))}
      {fleet !== null && (
        <g>
          <line x1={L} x2={R} y1={y(fleet)} y2={y(fleet)} stroke="var(--ads-mut)" strokeDasharray="6 5" strokeWidth="1.5" />
          <text x={R} y={y(fleet) - 6} textAnchor="end">fleet {fmtUsd2(fleet)} per 1%</text>
        </g>
      )}
      {points.length > 1 && <polyline points={path} fill="none" stroke="var(--ads-ac)" strokeWidth="2" />}
      {points.map((p) => (
        <circle key={p.t} cx={x(p.t)} cy={y(p.value)} r="4" fill="var(--ads-ac)" />
      ))}
      <text x={x(t0)} y={B + 18} textAnchor={points.length === 1 ? "middle" : "start"}>{fmtDay(t0)}</text>
      {points.length > 1 && (
        <text x={x(t1)} y={B + 18} textAnchor="end">{fmtDay(t1)}</text>
      )}
    </svg>
  );
}

type Me = { id: string; samples: PublicSample[] };

export default function ClaudeUsageMe() {
  const { id = "" } = useParams();
  const [me, setMe] = useState<Me | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [usage, setUsage] = useState<UsageJson>(initialUsage);

  useEffect(() => {
    setMe(null);
    setError(null);
    if (!id) {
      setError("This page needs your personal link, the one the script or the paste box gave you.");
      return;
    }
    if (!isContributorId(id.toLowerCase())) {
      setError("That is not a contributor id.");
      return;
    }
    let cancelled = false;
    fetch(`/api/contribute/me?id=${encodeURIComponent(id)}`)
      .then(async (r) => {
        const j = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(typeof j.error === "string" ? j.error : `The server answered ${r.status}.`);
        return j as Me;
      })
      .then((j) => !cancelled && setMe(j))
      .catch((e: Error) => !cancelled && setError(e.message));
    fetch("/data/claude-usage.json")
      .then((r) => (r.ok ? r.json() : null))
      .then((j: UsageJson | null) => j && !cancelled && setUsage(j))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [id]);

  const samples = useMemo(() => me?.samples ?? [], [me]);
  const models = useMemo(() => modelsIn(samples), [samples]);
  const main = useMemo(() => mainModel(samples), [samples]);
  const plan = samples[0]?.plan ?? null;
  const prices = useMemo(() => usage.api_price_per_mtok ?? {}, [usage]);

  const newest = samples[0] ?? null;
  const newestValue = newest ? sampleValue(newest, prices) : null;
  const newestUsdPerPct = newest ? usdPerPercent(newest, prices) : null;
  const fleetUsd = plan ? fleetUsdPerPercent(usage, plan) : null;
  const newestCoarse = newest ? newest.five_hour.utilization < COARSE_BELOW : false;
  const newestModels = useMemo(() => (newest ? modelsIn([newest]) : []), [newest]);

  const tokensRows = useMemo(() => {
    if (!newest || !plan) return [];
    return newestModels.map((m) => ({
      model: m,
      mine: shareTokensPerPercent(newest, m, prices),
      fleet: fleetTokensPerPercent(usage, plan, m),
    }));
  }, [newest, newestModels, plan, prices, usage]);

  const chartPoints = useMemo(() => {
    return samples.filter((s) => s.plan === plan)
      .map((s) => ({ t: Date.parse(s.ts), value: usdPerPercent(s, prices) }))
      .filter((p): p is { t: number; value: number } => Number.isFinite(p.t) && p.value !== null)
      .sort((a, b) => a.t - b.t);
  }, [samples, prices, plan]);

  return (
    <PageShell>
      <Seo
        title="Your Claude meter | All Done Sites"
        description="Your own contributed Claude usage meter samples, priced and drawn against everyone else's."
        canonical={`${SITE}/claude-usage-tracker/me`}
        noindex
      />
      <div className="cut">
        <div className="hero">
          <div className="lockup">
            <svg viewBox="0 0 24 24">
              <path d="M12 1.5l1.6 6.2 4.6-4.4-3 5.6 6.3-.4-5.8 2.5 5.8 2.5-6.3-.4 3 5.6-4.6-4.4L12 22.5l-1.6-6.2-4.6 4.4 3-5.6-6.3.4 5.8-2.5-5.8-2.5 6.3.4-3-5.6 4.6 4.4z" />
            </svg>
            <b>Claude</b> <small>usage tracker · your meter</small>
          </div>
          {error && <h1>{error}</h1>}
          {!error && !me && <h1>Loading your samples…</h1>}
          {me && plan && (
            <>
              <h1>
                Your meter on <span className="claude">{PLAN_LABELS[plan] ?? plan}</span>
              </h1>
              <div className="quiet">
                {samples.length} sample{samples.length === 1 ? "" : "s"} · newest {fmtWhen(samples[0].ts)}
                {newestUsdPerPct !== null && (
                  <>
                    <em>·</em>{fmtUsd2(newestUsdPerPct)}/1%
                  </>
                )}
                {fleetUsd !== null && (
                  <>
                    <em>·</em>vs fleet {fmtUsd2(fleetUsd)}/1%
                  </>
                )}
              </div>
              {newestCoarse && newest && (
                <div className="quiet warn">
                  Your meter read {newest.five_hour.utilization}%. Below {COARSE_BELOW}% the whole-number percent is too
                  coarse for a firm figure, so treat this as a rough first reading. Sample again when the meter is higher.
                </div>
              )}
            </>
          )}
          <p className="sub" style={{ marginTop: 18 }}>
            <Link to="/claude-usage-tracker">Back to the tracker</Link>
          </p>
        </div>

        {me && newest && newestValue && newestValue.total > 0 && (
          <section>
                <h2>Estimated meter work in your newest sample</h2>
            <p className="sub">
              This is an estimated subscription-meter cost from local transcript capture, split by model using published
              weighting assumptions. It does not establish complete account capture, included billing, API spend, or a bill.
            </p>
            <ShareBar perModel={newestValue.perModel} total={newestValue.total} models={newestModels} />
          </section>
        )}

        {me && newest && plan && tokensRows.length > 0 && (
          <section>
            <h2>Tokens per 1% by model, you vs the fleet</h2>
            <p className="sub">
              Your tokens are share-attributed: the newest sample's whole-number meter percent split across models by
              dollar value, not divided raw against the whole percent. Fleet bars are the tracker's own measurement for{" "}
              {PLAN_LABELS[plan] ?? plan}.
            </p>
            <TokensPerPctBars rows={tokensRows} />
          </section>
        )}

        {me && samples.length >= 2 && (
          <section>
            <h2>Over time</h2>
            <p className="sub">
              Estimated meter dollars per 1% across all your models, one point per sample, against the fleet reference.
            </p>
            <UsdChart points={chartPoints} fleet={fleetUsd} />
          </section>
        )}

        {me && (
          <section>
            <h2>Samples</h2>
            <p className="sub">
              Estimated meter dollars per 1% combine every model in that sample. Per-model columns are share-attributed
              tokens per 1%, blank when a model is unpriced or the meter is below the 5% precision floor.
            </p>
            <div style={{ overflowX: "auto" }}>
              <table>
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>5-hour</th>
                    <th>7-day</th>
                    <th>$ per 1%</th>
                    {models.map((m) => (
                      <th key={m} className={m === main ? "hl" : ""}>
                        {modelLabel(m)} per 1%
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {samples.map((s) => {
                    const coarse = s.five_hour.utilization < COARSE_BELOW;
                    const usd = usdPerPercent(s, prices);
                    return (
                      <tr key={s.ts} title={coarse ? "meter under 5%" : undefined}>
                        <td>{fmtWhen(s.ts)}</td>
                        <td>{s.five_hour.utilization}%</td>
                        <td>{s.seven_day.utilization}%</td>
                        <td>{usd === null ? "" : fmtUsd2(usd)}</td>
                        {models.map((m) => {
                          const v = shareTokensPerPercent(s, m, prices);
                          return (
                            <td key={m} className={m === main ? "hl" : ""}>
                              {v === null ? "" : fmtTokens(v)}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}

        <p className="sub" style={{ textAlign: "center", padding: "24px 0 8px" }}>
          This page is not indexed and holds only what your script sent: meter percentages and token counts. Anyone with
          the link can see it. <Link to="/claude-usage-tracker">How the fleet figure is measured</Link>
        </p>
      </div>
    </PageShell>
  );
}
