// website/src/pages/ClaudeUsageTracker.tsx
import { useEffect, useMemo, useState } from "react";
import Seo from "@/components/Seo";
import { PageShell } from "@/components/redesign/RedesignChrome";
import {
  EFFORTS,
  MODEL_LABELS,
  PLAN_LABELS,
  compute,
  fmtDate,
  fmtTokens,
  headline,
  seriesFor,
  type Effort,
  type Plan,
  type UsageJson,
} from "@/lib/claudeUsage";
import "@/styles/home.css";
import "@/styles/claude-usage.css";

const SITE = "https://alldonesites.com";

function Chart({
  points,
  change,
}: {
  points: { date: string; value: number; interpolated: boolean }[];
  change: { date: string; direction: string; percent: number } | null;
}) {
  if (points.length < 2) return <p className="sub">Not enough history yet.</p>;
  const W = 840, H = 260, L = 44, R = 820, T = 20, B = 200;
  const vals = points.map((p) => p.value);
  const lo = Math.min(...vals) * 0.9, hi = Math.max(...vals) * 1.05;
  const x = (i: number) => L + (i / (points.length - 1)) * (R - L);
  const y = (v: number) => B - ((v - lo) / (hi - lo)) * (B - T);
  const path = points.map((p, i) => `${x(i)},${y(p.value)}`).join(" ");
  const ticks = [0, 1, 2, 3].map((k) => lo + ((hi - lo) * k) / 3);
  const ci = change ? points.findIndex((p) => p.date >= change.date) : -1;
  const labelEvery = Math.max(1, Math.floor(points.length / 5));
  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Effective window size over time">
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
      <polygon fill="url(#cutfill)" points={`${L},${B} ${path} ${R},${B}`} />
      <polyline fill="none" stroke="#0EA5E9" strokeWidth="2.5" strokeLinejoin="round" points={path} />
      {points.map(
        (p, i) =>
          p.interpolated && <circle key={p.date} cx={x(i)} cy={y(p.value)} r="3" fill="#fff" stroke="#0EA5E9" strokeWidth="2" />
      )}
      {ci >= 0 && (
        <g>
          <line x1={x(ci)} x2={x(ci)} y1={T} y2={B} stroke="#B42318" strokeWidth="1.5" strokeDasharray="5 4" />
          <rect x={Math.min(x(ci) + 7, R - 120)} y={T + 4} width="112" height="22" rx="6" fill="#B42318" />
          <text x={Math.min(x(ci) + 15, R - 112)} y={T + 19} style={{ fill: "#fff", fontWeight: 600 }}>
            {fmtDate(change!.date).slice(0, 6)} · {change!.direction === "decreased" ? "down" : "up"} {change!.percent}%
          </text>
        </g>
      )}
      <circle cx={R} cy={y(points[points.length - 1].value)} r="4.5" fill="#0EA5E9" stroke="#fff" strokeWidth="2" />
      <g style={{ fill: "#0277B5", fontWeight: 500 }}>
        {points.map(
          (p, i) => i % labelEvery === 0 && <text key={p.date} x={x(i)} y={B + 36}>{fmtDate(p.date).slice(0, 6)}</text>
        )}
      </g>
    </svg>
  );
}

export default function ClaudeUsageTracker() {
  const [data, setData] = useState<UsageJson | null>(null);
  const [failed, setFailed] = useState(false);
  const [plan, setPlan] = useState<Plan>("max20");
  const [model, setModel] = useState("claude-sonnet-5");
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
  const h = data ? headline(data) : null;
  const stale = data ? Date.now() - new Date(data.generated_at).getTime() > 3 * 86400e3 : false;
  const localTime = data?.last_sample_at
    ? new Date(data.last_sample_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : null;
  const unavailable = failed || (data !== null && r === null);

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
                  .replace(/(\d+%)/, `<span class="${h.tone === "down" ? "down" : "up"}">$1</span>`),
              }}
            />
          )}
          {!unavailable && data && (
            <div className="pill">
              <i />
              <span>Measured daily from a real account</span>
              <em className="dot">·</em>
              <span>last sample {localTime} local</span>
            </div>
          )}
          {!unavailable && data && r && (
            <>
              <div className="sentence">
                On{" "}
                <span className="sel">
                  <select value={plan} onChange={(e) => setPlan(e.target.value as Plan)}>
                    {(Object.keys(PLAN_LABELS) as Plan[]).map((p) => (
                      <option key={p} value={p}>{PLAN_LABELS[p]}</option>
                    ))}
                  </select>
                </span>
                , running{" "}
                <span className="sel">
                  <select value={model} onChange={(e) => setModel(e.target.value)}>
                    {Object.keys(data.rates).map((m) => (
                      <option key={m} value={m}>{MODEL_LABELS[m] ?? m}</option>
                    ))}
                  </select>
                </span>{" "}
                at{" "}
                <span className="sel">
                  <select value={effort} onChange={(e) => setEffort(e.target.value as Effort)}>
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
              <div className="quiet">
                <span>
                  about {Math.round(r.tasksPerWindow)} tasks<em>·</em>{Math.round(r.tasksPerWeek)} per week
                </span>
                <em className="brk">·</em>
                <span>roughly ${Math.round(r.apiValueUsd)} of API value</span>
              </div>
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
            <h2>Effective window size, last 90 days</h2>
            <div className="sub">
              {PLAN_LABELS[plan]} · {MODEL_LABELS[model] ?? model} tokens per 5-hour window
            </div>
            <Chart points={seriesFor(data, plan, model)} change={data.last_change} />
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
                      "Tasks per 5-hour window",
                      (c: ReturnType<typeof compute>) => (c!.tasksPerWindow < 1 ? "< 1" : String(Math.round(c!.tasksPerWindow))),
                    ],
                    ["Tasks per week", (c: ReturnType<typeof compute>) => String(Math.round(c!.tasksPerWeek))],
                    ["API value per week", (c: ReturnType<typeof compute>) => "~$" + Math.round(c!.apiValueUsd * 28)],
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
          </details>
        </section>

        <p className="sub" style={{ textAlign: "center", padding: "24px 0 8px" }}>
          All Done Sites measures before it claims. Want a site that does the same? <a href="/#contact">Get in touch</a>
        </p>
      </div>
    </PageShell>
  );
}
