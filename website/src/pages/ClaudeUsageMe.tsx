// website/src/pages/ClaudeUsageMe.tsx — a contributor's personal page,
// /claude-usage-tracker/me/<contributor id>. Client-rendered only: the id is in the
// URL and the samples come from /api/contribute/me, so there is nothing to prerender.
// The fleet reference comes from the same published JSON the tracker page uses.
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Seo from "@/components/Seo";
import { PageShell } from "@/components/redesign/RedesignChrome";
import { MODEL_LABELS, PLAN_LABELS, fmtTokens, type UsageJson } from "@/lib/claudeUsage";
import {
  fleetTokensPerPercent,
  isContributorId,
  mainModel,
  modelsIn,
  tokensPerPercent,
  type PublicSample,
} from "@/lib/contrib";
import "@/styles/home.css";
import "@/styles/claude-usage.css";
import initialJson from "../../public/data/claude-usage.json";
const initialUsage = initialJson as unknown as UsageJson;

const SITE = "https://alldonesites.com";

function fmtWhen(iso: string): string {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return iso;
  return new Date(t).toLocaleString([], { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

function fmtDay(t: number): string {
  return new Date(t).toLocaleDateString([], { day: "numeric", month: "short" });
}

/** Five-hour tokens per 1% over time for one model, one point per sample, against the fleet line. */
function MeChart({ points, fleet, model }: { points: { t: number; value: number }[]; fleet: number | null; model: string }) {
  if (points.length === 0) return <p className="sub">No sample with a non-zero five-hour meter yet.</p>;
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
  const label = MODEL_LABELS[model] ?? model;
  const desc =
    `${label}: ${points.length} sample${points.length === 1 ? "" : "s"}, latest ${fmtTokens(points[points.length - 1].value)} tokens per 1%` +
    (fleet !== null ? `, fleet ${fmtTokens(fleet)}` : "");
  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={desc}>
      {ticks.map((v) => (
        <g key={v}>
          <line x1={L} x2={R} y1={y(v)} y2={y(v)} stroke="var(--ads-line)" />
          <text x={L - 8} y={y(v) + 4} textAnchor="end">{fmtTokens(v)}</text>
        </g>
      ))}
      {fleet !== null && (
        <g>
          <line x1={L} x2={R} y1={y(fleet)} y2={y(fleet)} stroke="var(--ads-mut)" strokeDasharray="6 5" strokeWidth="1.5" />
          <text x={R} y={y(fleet) - 6} textAnchor="end">fleet {fmtTokens(fleet)} per 1%</text>
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
  const fleet = main && plan ? fleetTokensPerPercent(usage, plan, main) : null;
  const chartPoints = useMemo(() => {
    if (!main) return [];
    return samples
      .map((s) => ({ t: Date.parse(s.ts), value: tokensPerPercent(s, main) }))
      .filter((p): p is { t: number; value: number } => Number.isFinite(p.t) && p.value !== null)
      .sort((a, b) => a.t - b.t);
  }, [samples, main]);

  return (
    <PageShell>
      <Seo
        title="Your Claude meter | All Done Sites"
        description="Your own contributed Claude usage meter samples, drawn against everyone else's."
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
                {main && (
                  <>
                    <em>·</em>main model {MODEL_LABELS[main] ?? main}
                  </>
                )}
              </div>
            </>
          )}
          <p className="sub" style={{ marginTop: 18 }}>
            <Link to="/claude-usage-tracker">Back to the tracker</Link>
          </p>
        </div>

        {me && main && plan && (
          <section>
            <h2>Five-hour tokens per 1%, {MODEL_LABELS[main] ?? main}</h2>
            <p className="sub">
              Each point is one sample: your {MODEL_LABELS[main] ?? main} tokens since the five-hour window started, over
              the meter percent at that moment. The dashed line is the fleet figure for {PLAN_LABELS[plan] ?? plan} from
              the tracker's probes
              {fleet === null ? " (none published for this model yet)" : ""}.
            </p>
            <MeChart points={chartPoints} fleet={fleet} model={main} />
          </section>
        )}

        {me && (
          <section>
            <h2>Samples</h2>
            <p className="sub">
              Tokens per 1% is per model for the five-hour window: tokens since reset over utilization, blank when the meter
              read 0.
            </p>
            <div style={{ overflowX: "auto" }}>
              <table>
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>5-hour</th>
                    <th>7-day</th>
                    {models.map((m) => (
                      <th key={m} className={m === main ? "hl" : ""}>
                        {MODEL_LABELS[m] ?? m} per 1%
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {samples.map((s) => (
                    <tr key={s.ts}>
                      <td>{fmtWhen(s.ts)}</td>
                      <td>{s.five_hour.utilization}%</td>
                      <td>{s.seven_day.utilization}%</td>
                      {models.map((m) => {
                        const v = tokensPerPercent(s, m);
                        return (
                          <td key={m} className={m === main ? "hl" : ""}>
                            {v === null ? "" : fmtTokens(v)}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
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
