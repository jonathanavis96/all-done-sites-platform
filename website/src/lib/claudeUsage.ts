export type Plan = "pro" | "max5" | "max20";
export type Effort = "low" | "medium" | "high" | "xhigh" | "max";
export type TokenClass = "input" | "output" | "cache_read" | "cache_write";

export interface MetricEvidence {
  source?: "passive" | "probe" | "none" | string;
  observed_from?: string | null;
  observed_to?: string | null;
  measured_at?: string | null;
  account_count?: number;
  reset_verified?: boolean;
}

export interface MetricQuality {
  status?: "measured" | "conditional" | "unavailable" | string;
  reasons?: string[];
  capture_complete?: boolean | null;
  unpriced_work?: boolean;
  rounding_relative?: number | null;
}

export interface MetricFreshness {
  as_of?: string | null;
  stale_after?: string | null;
  stale?: boolean | null;
}

// The meter charges each token class at API list price times a class weight, then the whole
// thing by a meter weight; older JSON predates both fields, so they are optional.
export interface ApiPrice extends Record<TokenClass, number> {
  meter_weight?: number;
  class_weight?: Record<TokenClass, number>;
}

// One plan's contributed-sample aggregate, published under `contributed[plan]`. usd_per_pct is
// shaped this way only from the tracker PR landing alongside this one; the live JSON today still
// publishes usd_per_pct as a per-model record, so callers must treat a value without a numeric
// `median` as absent rather than crashing on it.
export interface PlanContribStat {
  median: number;
  spread: number | null;
  contributors: number;
  samples: number;
}
// One contributor's reading over time, for the "From contributors" chart. `c` is an anonymous
// per-plan contributor ordinal (not a stable identity across plans or across time); `coarse`
// mirrors contrib.ts's COARSE_BELOW (meter under 5%, so the dollar figure is unreliable).
// Optional: a tracker PR landing in parallel adds this field, so it may be absent from the live
// JSON for a while yet.
export interface ContribPoint {
  t: string;
  usd_per_pct: number | null;
  // Published since the contributor tabs landed; older JSON has none of them.
  tokens_per_pct?: number | null;
  tokens_per_pct_week?: number | null;
  tokens_per_pct_by_model?: Record<string, number>;
  tokens_per_pct_week_by_model?: Record<string, number>;
  windows?: number | null;
  c: number;
  coarse: boolean;
}
export interface PlanContrib {
  contributors: number;
  samples: number;
  usd_per_pct: PlanContribStat | null;
  tokens_per_pct: Record<string, PlanContribStat>;
  points?: ContribPoint[];
  weekly_windows: {
    measured: number | null;
    reason: string | null;
    contributors: number;
    with_complete_week?: number;
    dropped: number;
    weeks: number;
  };
}
export interface ContributedBlock {
  updated_at: string;
  min_utilization: number;
  max_deviation: number;
  min_contributors: number;
  max20?: PlanContrib;
  max5?: PlanContrib;
  pro?: PlanContrib;
}
export type EventKind = "plan" | "change";
// Absent scope means "window" (the 5-hour rolling limit); "weekly" events carry a week-ending
// date instead of a day the limit itself moved.
export type EventScope = "window" | "weekly";
export interface UsageEvent {
  date: string;
  kind: EventKind;
  scope?: EventScope;
  label: string;
  metric?: "meter_budget_per_window" | "weekly_to_five_hour_ratio" | string;
  observation_scope?: "account" | string;
  attribution?: "observed_account_metric_change" | string;
  onset?: { earliest?: string | null; latest?: string | null; estimate?: string | null };
  confirmation?: { at?: string | null; evidence_points?: number; seven_day_pct?: number | null };
  evidence_quality?: "certified" | "legacy_uncertain" | string;
  provisional?: boolean;
}

export interface UsageJson {
  schema_version?: number;
  rate_basis?: "meter_budget" | "api_value" | string;
  generated_at: string;
  last_sample_at: string | null;
  // When a watched account's meter was last read. Published since 2026-09-16; older
  // JSON has only last_sample_at, which is the newest completed measurement instead.
  meter_read_at?: string | null;
  // Newest passive (non-probe) measurement's timestamp. Optional: older JSON predates passive
  // measurement.
  passive_generated_at?: string | null;
  plan_measured: Plan;
  plan_ratios: Record<Plan, number>;
  // How many five-hour windows a week's cap holds, per plan, relative to max20. A frozen
  // measurement, not the same quantity as plan_ratios (what one window is WORTH). Optional:
  // JSON published before this field falls back to the quotient of two `current` fields,
  // which is what it replaces. See weeklySeriesFor.
  weekly_window_ratios?: Partial<Record<Plan, number>>;
  rates: Record<
    string,
    {
      tokens_per_window: number | null;
      // Schema v2 keeps like units separate. In legacy JSON api_value_per_window was actually
      // meter-weighted dollars; compute() treats it that way and reprices the declared bundle.
      meter_budget_per_window?: number | null;
      api_value_per_window?: number | null;
      api_list_value_per_window?: number | null;
      source: string;
      // ISO timestamp of this model's latest probe, when it has one of its own. Null/absent for
      // a model whose figures are derived from another model's probe rather than probed directly.
      probed_at?: string | null;
      probe_effort: string;
      split: Record<TokenClass, number>;
      reference_mix?: {
        kind?: "derived_scenario" | string;
        source?: "passive_token_mix" | "legacy_passive_token_mix" | string;
        as_of?: string | null;
        cache_write_duration?: "observed" | "legacy_assumed_5m" | string;
      };
      evidence?: MetricEvidence;
      quality?: MetricQuality;
      freshness?: MetricFreshness;
    }
  >;
  effort: Record<string, Record<Effort, number>>;
  // Meter dollars one calibration task costs at each effort level. Optional: older JSON omits
  // it. This is the effort series to scale by, not `effort` above -- see compute().
  effort_usd?: Record<string, Record<Effort, number>>;
  api_price_per_mtok: Record<string, ApiPrice>;
  history: Record<
    string,
    {
      date: string;
      tokens_per_window: number;
      api_value_per_window?: number;
      source: string;
      interpolated: boolean;
      evidence?: MetricEvidence;
      quality?: MetricQuality;
      freshness?: MetricFreshness;
      reference_mix?: { kind?: string; source?: string; as_of?: string | null };
    }[]
  >;
  last_change: ({
    date: string;
    direction: "increased" | "decreased";
    percent: number;
    model: string;
    scope?: EventScope;
  } & Partial<Omit<UsageEvent, "date" | "kind" | "label" | "scope">>) | null;
  events?: UsageEvent[];
  // Median total tokens of one real session, per model. Optional: older JSON and models not
  // yet calibrated omit it, in which case sessionsPerWindow/sessionsPerWeek come back null.
  session_tokens?: Record<string, number>;
  // How many accounts the passive readings rest on. Counts only: the JSON is public and the
  // account names are real people's logins. Optional: older JSON omits it.
  passive_account_count?: number;
  // Contributed-sample aggregate, once at least one contributor has posted. Optional: older
  // JSON and a freshly-deployed collector with zero contributors omit it.
  contributed?: ContributedBlock;
  // How many 5-hour windows a real account's seven-day limit actually holds, measured (never
  // assumed unless flagged) from live usage, keyed by plan since the ratio differs per plan.
  // Optional until the daily job populates a plan; `assumed: true` means this plan's figures
  // are borrowed from another plan's measured ratio rather than measured directly (e.g. Pro
  // carries Max 5x's numbers until Pro itself is measured). A plan entry of null means no
  // figure at all is available yet, in which case every per-week figure the page derives from
  // a window figure for that plan comes back null rather than guessing at a ratio.
  weekly_windows?: Record<
    Plan,
    | {
        current: number | null;
        current_estimate?: {
          value: number | null;
          source?: string;
          as_of?: string | null;
          stale?: boolean | null;
          assumed?: boolean;
          quality?: string;
          reasons?: string[];
        } | null;
        history: {
          week_ending: string;
          windows: number;
          five_hour_pct: number;
          seven_day_pct: number;
          // True when this week is still in progress. Optional: older JSON omits it, in which
          // case it's inferred from week_ending falling after the last sample date.
          partial?: boolean;
          source?: string;
          observed_from?: string | null;
          observed_to?: string | null;
          assumed?: boolean;
          quality?: string;
          reasons?: string[];
        }[];
        assumed?: boolean;
        // Levels, oldest first: what the detector says the limit actually was, each held flat
        // between steps. Windows per week is a plan constant, so this is the honest shape of
        // the series and the weekly rows above are estimates of it. Optional: older JSON has
        // only the rows.
        regimes?: {
          start: string;
          end: string;
          windows: number;
          seven_day_pct: number;
          points: number;
          source?: string;
          assumed?: boolean;
          quality?: string;
          reasons?: string[];
        }[];
      }
    | null
  >;
  model_plan_limits?: Record<
    string,
    Partial<Record<Plan, { included: boolean; weekly_fraction: number; source_url?: string; as_of?: string }>>
  >;
}

export interface RegimeLevel {
  start: string;
  end: string;
  windows: number;
  // True when this level was measured on another plan and scaled onto this one by the frozen
  // plan ratio, rather than measured on this plan's own windows.
  inferred: boolean;
  plan: Plan;
  provenance?: string;
}

// Every regime level actually published for one plan, oldest first. Missing spans stay missing:
// a ratio observed in a different plan/era is not historical evidence for this plan.
export function weeklyRegimeLevelsFor(j: UsageJson, plan: Plan): RegimeLevel[] {
  const weekly = j.weekly_windows?.[plan];
  if (!weekly?.regimes) return [];
  const levels = weekly.regimes
    .filter((r) => Number.isFinite(r.windows))
    .map((r) => ({
      start: r.start,
      end: r.end,
      windows: r.windows,
      inferred: r.assumed === true || weekly.assumed === true || !r.source,
      provenance: r.source ?? "legacy / provenance unavailable",
      plan,
    }))
    .sort((a, b) => (a.start < b.start ? -1 : a.start > b.start ? 1 : 0));
  const current = currentWeeklyValue(j, plan);
  if (current !== null && levels.length > 0) levels[levels.length - 1].windows = current;
  return levels;
}

export const RANGE_DAYS = [30, 90, 180] as const;
export type RangeDays = (typeof RANGE_DAYS)[number];

export const MODEL_LABELS: Record<string, string> = {
  "claude-sonnet-5": "Sonnet 5",
  "claude-opus-5": "Opus 5",
  "claude-fable-5-1": "Fable 5.1",
};
export const PLAN_LABELS: Record<Plan, string> = { pro: "Pro", max5: "Max 5x", max20: "Max 20x" };
export const EFFORTS: Effort[] = ["low", "medium", "high", "xhigh", "max"];
export const CLASSES: TokenClass[] = ["input", "output", "cache_read", "cache_write"];

export function contributorModelValue(
  byModel: Record<string, number> | undefined,
  model: string,
  scale = 1,
): number | null {
  if (!byModel) return null;
  const value = byModel[model];
  return typeof value === "number" ? value * scale : null;
}

export function modelPlanLimit(j: UsageJson, model: string, plan: Plan) {
  const published = j.model_plan_limits?.[model]?.[plan];
  if (published) return published;
  // The eligibility rule is independently known and must remain safe while an old cached JSON
  // is being replaced. Other legacy model/plan combinations remain conditional rather than
  // silently acquiring a model-specific cap we cannot reconstruct.
  if (model.toLowerCase().includes("fable")) {
    return plan === "pro"
      ? { included: false, weekly_fraction: 0 }
      : { included: true, weekly_fraction: 0.5 };
  }
  return { included: true, weekly_fraction: 1 };
}

export function currentWeeklyValue(j: UsageJson, plan: Plan): number | null {
  const weekly = j.weekly_windows?.[plan];
  if (!weekly || weekly.assumed) return null;
  const estimate = weekly.current_estimate;
  if (estimate) {
    if (estimate.assumed || estimate.stale === true || estimate.quality === "unavailable") return null;
    return typeof estimate.value === "number" ? estimate.value : null;
  }
  // v2 makes provenance mandatory for a current estimate. Legacy values are retained as
  // historical context, but are not silently upgraded into a current measurement.
  if ((j.schema_version ?? 1) >= 2) return typeof weekly.current === "number" ? weekly.current : null;
  return null;
}

export function compute(j: UsageJson, plan: Plan, model: string, effort: Effort) {
  const rate = j.rates[model];
  if (!rate) return null; // no probe data for this model yet: the page shows its unavailable state
  const limit = modelPlanLimit(j, model, plan);
  const included = limit.included;
  const baseTokens = typeof rate.tokens_per_window === "number" ? rate.tokens_per_window : null;
  const tokensPerWindow = included && baseTokens !== null ? baseTokens * j.plan_ratios[plan] : null;
  const split = tokensPerWindow === null
    ? null
    : Object.fromEntries(CLASSES.map((c) => [c, tokensPerWindow * (rate.split?.[c] ?? 0)])) as Record<TokenClass, number>;
  const perTask = j.effort[model]?.[effort] ?? NaN;
  const perTaskUsd = j.effort_usd?.[model]?.[effort];
  const prices = j.api_price_per_mtok[model];
  const planRatio = j.plan_ratios[plan];
  const meterBase = typeof rate.meter_budget_per_window === "number"
    ? rate.meter_budget_per_window
    : (j.schema_version ?? 1) < 2 && typeof rate.api_value_per_window === "number"
      ? rate.api_value_per_window
      : null;
  const meterBudgetUsd = included && meterBase !== null ? meterBase * planRatio : null;
  const publishedListBase = typeof rate.api_list_value_per_window === "number"
    ? rate.api_list_value_per_window
    : (j.schema_version ?? 1) >= 2 && typeof rate.api_value_per_window === "number"
      ? rate.api_value_per_window
      : null;
  // Old files called meter dollars `api_value_per_window`. Reprice the declared bundle for
  // display rather than relabelling those meter dollars as list value.
  const repricedList = split && prices
    ? CLASSES.reduce((sum, tokenClass) => sum + (split[tokenClass] / 1e6) * (prices[tokenClass] ?? 0), 0)
    : null;
  const apiListValueUsd = included
    ? publishedListBase !== null ? publishedListBase * planRatio : repricedList
    : null;
  const tasksPerWindow =
    meterBudgetUsd !== null && typeof perTaskUsd === "number" && perTaskUsd > 0
      ? meterBudgetUsd / perTaskUsd
      : tokensPerWindow !== null && Number.isFinite(perTask) && perTask > 0
        ? tokensPerWindow / perTask
        : null;
  // A session count needs measured meter cost per consistently defined session. The legacy
  // token quotient mixed workload/reference mixes, so it is intentionally never surfaced.
  const sessionsPerWindow = null;
  const sessionsPerWeek = null;
  const rawWeekly = included ? currentWeeklyValue(j, plan) : null;
  const weeklyFraction = Number.isFinite(limit.weekly_fraction) ? limit.weekly_fraction : 1;
  const windowsPerWeek = rawWeekly === null ? null : rawWeekly * weeklyFraction;
  const tasksPerWeek = windowsPerWeek === null || tasksPerWindow === null ? null : tasksPerWindow * windowsPerWeek;
  const apiListValueUsdPerWeek = windowsPerWeek === null || apiListValueUsd === null ? null : apiListValueUsd * windowsPerWeek;
  return {
    included,
    availabilityReason: included ? null : `${MODEL_LABELS[model] ?? model} is not included with ${PLAN_LABELS[plan]}.`,
    weeklyFraction,
    tokensPerWindow,
    split,
    tasksPerWindow,
    tasksPerWeek,
    sessionsPerWindow,
    sessionsPerWeek,
    meterBudgetUsd,
    apiListValueUsd,
    apiListValueUsdPerWeek,
    // Compatibility aliases for downstream page code while names migrate to explicit units.
    apiValueUsd: apiListValueUsd,
    apiValueUsdPerWeek: apiListValueUsdPerWeek,
    windowsPerWeek,
    rateQuality: rate.quality?.status ?? ((j.schema_version ?? 1) >= 2 ? "unknown" : "legacy / conditional"),
    rateFreshness: rate.freshness ?? null,
  };
}

// Short label for a model's rate source: "passive, 15 Sep" dated by the passive reading
// itself (measured_at), "probe, 8 Sep" by the model's own probe, or plain "probe"/"derived"
// when no date is available. A passive figure must never carry a probe's date.
export function fmtSource(
  rate: {
    source: string;
    probed_at?: string | null;
    measured_at?: string | null;
    evidence?: MetricEvidence;
    quality?: MetricQuality;
    freshness?: MetricFreshness;
  } | undefined,
): string | null {
  if (!rate) return null;
  const day = (iso: string) => {
    const d = new Date(iso);
    return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
  };
  // A passive figure is the regime median over every account's meter readings; measured_at is
  // the newest of those, not anything this model did on its own. Say so in the fold-out's own
  // words rather than the collector's name for the instrument.
  const evidenceSource = rate.evidence?.source ?? rate.source;
  const evidenceDate = rate.evidence?.measured_at ?? rate.evidence?.observed_to ?? rate.measured_at ??
    (evidenceSource === "probe" ? rate.probed_at : null);
  const base = evidenceSource === "passive" ? "account meter" : evidenceSource;
  const qualifiers = [
    evidenceDate ? `evidence to ${day(evidenceDate)}` : "evidence date unavailable",
    rate.quality?.status,
    rate.freshness?.stale === true ? "stale" : null,
  ].filter(Boolean);
  return `${base}${qualifiers.length ? ` · ${qualifiers.join(" · ")}` : ""}`;
}

export function fmtUsd(n: number): string {
  return "$" + Math.round(n).toLocaleString("en-US");
}

/** A dollar figure worth showing to the cent, such as a per-percent rate rather than a
 * per-window total. */
export function fmtUsd2(n: number): string {
  return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function fmtDate(iso: string): string {
  const d = new Date(iso + (iso.length === 10 ? "T00:00:00Z" : ""));
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

export function headline(j: UsageJson): { text: string; tone: "up" | "down" | "flat" } {
  const c = j.last_change;
  if (!c) {
    // "held" rows are backfilled with the first real reading, not measured on that day, so
    // the "hasn't changed since" date must come from the first genuinely measured row.
    const rows = Object.values(j.history ?? {}).flat();
    const firstReal = rows.filter((h) => h.source !== "held").map((h) => h.date).sort()[0];
    const first = firstReal ?? rows.map((h) => h.date).sort()[0];
    if (!first) return { text: "No account-scoped metric change is currently detected.", tone: "flat" };
    return { text: `No account-scoped metric change detected above this method's resolution since ${fmtDate(first)}.`, tone: "flat" };
  }
  const tone = c.direction === "increased" ? "up" : "down";
  const metric = c.scope === "weekly" ? "weekly-to-window ratio" : "window meter estimate";
  const earliest = c.onset?.earliest;
  const latest = c.onset?.latest;
  const onset = earliest && latest && earliest !== latest
    ? ` between ${fmtDate(earliest)} and ${fmtDate(latest)}`
    : ` around ${fmtDate(c.onset?.estimate ?? c.date)}`;
  const legacy = c.evidence_quality === "legacy_uncertain" || !c.onset
    ? " (legacy event; onset and attribution are uncertain)"
    : "";
  return { text: `The observed account's ${metric} ${c.direction} by ${c.percent}%${onset}${legacy}.`, tone };
}

export function fmtTokens(n: number): string {
  if (n >= 1e6) { const m = n / 1e6; return (m >= 10 ? m.toFixed(0) : m.toFixed(1).replace(/\.0$/, "")) + "M"; }
  if (n >= 1e3) return Math.round(n / 1e3) + "k";
  return String(Math.round(n));
}

// The window is anchored to the last recorded sample date, not the real clock: keeps the
// prerender and the first client render identical regardless of when either one runs.
function daysBefore(dateIso: string, days: number): string {
  const d = new Date(dateIso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

export function seriesFor(j: UsageJson, plan: Plan, model: string, days: number = 90) {
  if (!modelPlanLimit(j, model, plan).included) return [];
  const ratio = j.plan_ratios[plan];
  const hist = j.history[model] ?? [];
  if (hist.length === 0) return [];
  const cutoff = daysBefore(hist[hist.length - 1].date, days);
  return hist
    .filter((h) => h.date >= cutoff)
    .map((h) => ({ date: h.date, value: h.tokens_per_window * ratio, interpolated: h.interpolated, held: h.source === "held" }));
}

export function eventsFor(j: UsageJson, model: string, days: number = 90): UsageEvent[] {
  const hist = j.history[model] ?? [];
  if (hist.length === 0) return [];
  const anchor = hist[hist.length - 1].date;
  const cutoff = daysBefore(anchor, days);
  return (j.events ?? []).filter((e) => e.date >= cutoff && e.date <= anchor);
}

export interface WeeklyPoint {
  date: string;
  windows: number;
  // True when this week is still in progress: its week_ending falls after the last sample
  // date, so the figure will still move as the week completes rather than being final.
  partial: boolean;
  // True when this point was not measured for this plan but inferred from another series'
  // point at the same date, scaled by the ratio of the two plans' current windows-per-week.
  inferred: boolean;
  provenance?: string;
  // Tokens a full week of windows buys, only populated by weeklyTokenSeriesFor. Undefined
  // (never a wrong number) whenever neither history nor a current rate exists for the model.
  tokens?: number;
}

export interface WeeklySeries {
  plan: Plan;
  assumed: boolean;
  label: string;
  // True when this series stands in for both Max 5x (measured) and Pro (assumed identical to
  // it), so selecting either plan should draw this one series solid.
  sharedWithPro?: boolean;
  points: WeeklyPoint[];
}

// Unlike seriesFor/eventsFor, the weekly chart is not scoped to the 30/90/180-day range
// selector: it needs only meter readings (not probes), so its full history is cheap and the
// range picker would otherwise hide the very history (months back) that justifies the chart.
export function weeklySeriesFor(j: UsageJson): WeeklySeries[] {
  const lastSampleDate = j.last_sample_at ? j.last_sample_at.slice(0, 10) : null;
  const out: WeeklySeries[] = [];
  for (const p of Object.keys(PLAN_LABELS) as Plan[]) {
    const w = j.weekly_windows?.[p];
    if (!w || w.history.length === 0) continue;
    const points = w.history.map((h) => ({
      date: h.week_ending,
      windows: h.windows,
      partial: typeof h.partial === "boolean" ? h.partial : lastSampleDate !== null && h.week_ending > lastSampleDate,
      inferred: h.assumed === true || w.assumed === true || !h.source,
      provenance: h.source ?? "legacy / provenance unavailable",
    }));
    out.push({ plan: p, assumed: !!w.assumed, label: PLAN_LABELS[p], points });
  }
  return out;
}

// Same series as weeklySeriesFor, with each point's tokens-per-week added: windows times the
// tokens a single window bought at that week_ending, scaled by the plan's ratio. The
// per-window figure comes from the LAST history entry at or before week_ending (the earliest
// entry when week_ending predates all of them), falling back to the model's current rate when
// there is no history at all, and leaving tokens undefined when neither exists.
export function weeklyTokenSeriesFor(j: UsageJson, model: string): WeeklySeries[] {
  const base = weeklySeriesFor(j);
  const hist = j.history[model] ?? [];
  const sorted = [...hist].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  const rate = j.rates[model];
  const tokensPerWindowAt = (weekEnding: string): number | undefined => {
    if (sorted.length > 0) {
      const atOrBefore = sorted.filter((h) => h.date <= weekEnding);
      // A later observation cannot prove what an earlier period bought.
      return atOrBefore.length > 0 ? atOrBefore[atOrBefore.length - 1].tokens_per_window : undefined;
    }
    if (typeof rate?.tokens_per_window === "number" && rate.evidence?.observed_from && rate.evidence.observed_from <= weekEnding) {
      return rate.tokens_per_window;
    }
    return undefined;
  };
  const withTokens = (s: WeeklySeries, plan: Plan, label: string): WeeklySeries => {
    const planRatio = j.plan_ratios[plan];
    const fraction = modelPlanLimit(j, model, plan).weekly_fraction;
    return {
      ...s,
      plan,
      label,
      sharedWithPro: false,
      points: s.points.map((p) => {
        const perWindow = tokensPerWindowAt(p.date);
        return {
          ...p,
          tokens: typeof perWindow === "number" ? p.windows * perWindow * planRatio * fraction : undefined,
        };
      }),
    };
  };
  return base
    .filter((s) => modelPlanLimit(j, model, s.plan).included)
    .map((s) => withTokens(s, s.plan, s.label));
}

// The same levels priced in tokens: each regime's windows times what one window bought at the
// time, on the plan's own token ratio. Undefined per-window figures drop the level rather than
// guessing, the same contract weeklyTokenSeriesFor keeps.
export function weeklyTokenRegimeLevelsFor(
  j: UsageJson,
  plan: Plan,
  model: string,
): (RegimeLevel & { tokens: number })[] {
  const hist = [...(j.history[model] ?? [])].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  const planRatio = j.plan_ratios[plan];
  const limit = modelPlanLimit(j, model, plan);
  if (!limit.included) return [];
  const historyAt = (iso: string) => {
    const d = iso.slice(0, 10);
    const atOrBefore = hist.filter((h) => h.date <= d);
    return atOrBefore.length > 0 ? atOrBefore[atOrBefore.length - 1] : undefined;
  };
  const out: (RegimeLevel & { tokens: number })[] = [];
  for (const r of weeklyRegimeLevelsFor(j, plan)) {
    // The product changes when either the weekly regime or the five-hour rate changes. Split at
    // the union so a five-hour change can never be hidden inside a flat weekly line.
    const boundaries = [r.start, ...hist.map((h) => h.date).filter((d) => d > r.start && d < r.end), r.end];
    for (let i = 0; i < boundaries.length - 1; i++) {
      const h = historyAt(boundaries[i]);
      if (!h) continue;
      const historyUncertain = h.source === "held" || !h.evidence || h.quality?.status === "conditional";
      out.push({
        ...r,
        start: boundaries[i],
        end: boundaries[i + 1],
        inferred: r.inferred || historyUncertain,
        provenance: `${r.provenance ?? "weekly provenance unavailable"}; window ${h.source}${historyUncertain ? " / conditional" : ""}`,
        tokens: r.windows * h.tokens_per_window * planRatio * limit.weekly_fraction,
      });
    }
  }
  return out;
}

export function weeklyEventsFor(j: UsageJson): UsageEvent[] {
  return (j.events ?? []).filter((e) => e.scope === "weekly");
}

// The newest weekly change among the given events, by date. The published order is not
// guaranteed to be chronological, so position in the array says nothing about recency.
export function latestWeeklyChange(events: UsageEvent[]): UsageEvent | null {
  return events.reduce<UsageEvent | null>(
    (a, b) => (b.kind === "change" && (a === null || b.date > a.date) ? b : a),
    null,
  );
}
