export type Plan = "pro" | "max5" | "max20";
export type Effort = "low" | "medium" | "high" | "xhigh" | "max";
export type TokenClass = "input" | "output" | "cache_read" | "cache_write";

// Two shapes of the published JSON are live at once. Schema 1 (no `schema_version`) is what
// the collector published before the 2026-09-16 audit; schema 2 is tracker PR #57, which adds
// evidence, quality and freshness to every figure and renames the units. Every schema 2 field
// is optional here so the page renders either file, and the helpers below decide what a
// schema 1 file can and cannot support.

// The meter charges each token class at API list price times a class weight, then the whole
// thing by a meter weight; older JSON predates both fields, so they are optional. Schema 2 adds
// the price of the one-hour cache write, charged on the `cache_write_1h` subset of cache_write
// (absent means 2x input, the published API rule).
export interface ApiPrice extends Record<TokenClass, number> {
  cache_write_1h?: number;
  meter_weight?: number;
  // The collector's rule: a class missing from class_weight weighs 1, and the one-hour cache
  // write weighs as cache_write unless it has its own entry.
  class_weight?: Partial<Record<TokenClass | "cache_write_1h", number>>;
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
// Schema 1 points also carry `windows`, a quotient of two token estimates that the audit
// (finding 7) showed is not a weekly limit; nothing reads it and schema 2 no longer publishes it.
export interface ContribPoint {
  t: string;
  usd_per_pct: number | null;
  // Published since the contributor tabs landed; older JSON has none of them.
  tokens_per_pct?: number | null;
  tokens_per_pct_week?: number | null;
  // Absent whenever the collector could not attribute the reading to models: an unpriced model,
  // or no model with at least 5% of the meter. Absent means no per-model figure (finding 8).
  tokens_per_pct_by_model?: Record<string, number>;
  tokens_per_pct_week_by_model?: Record<string, number>;
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
    // Always null in schema 2: each source's paired week is its own entry in `estimates`.
    measured: number | null;
    reason: string | null;
    contributors: number;
    with_complete_week?: number;
    dropped: number;
    weeks: number;
    estimates?: {
      value: number;
      interval?: (number | null)[] | null;
      five_hour_pct: number;
      seven_day_pct: number;
      pieces?: number | null;
      through: string;
      partial: boolean;
    }[];
    quality?: string;
  };
  // Schema 2: what the contributor figures rest on. Sources are unverified ids, not accounts.
  quality?: string;
  identity_basis?: string;
  missing_reasons?: string[];
  evidence?: {
    as_of?: string;
    current_since?: string;
    freshest_sample_at?: string | null;
    stale?: boolean;
    samples_without_capture?: number;
  };
}
export interface ContributedBlock {
  updated_at: string;
  min_utilization: number;
  // Schema 1 only; schema 2 neither drops nor pools contributors, so it publishes neither.
  max_deviation?: number;
  min_contributors?: number;
  evidence_window_days?: number;
  max20?: PlanContrib;
  max5?: PlanContrib;
  pro?: PlanContrib;
}
export type EventKind = "plan" | "change";
// Absent scope means "window" (the 5-hour rolling limit); "weekly" events carry a week-ending
// date instead of a day the limit itself moved.
export type EventScope = "window" | "weekly";

// A detected change. Schema 1 publishes only date, direction, percent, model and scope. Schema 2
// adds what the detection rests on: it is a change in one account's observed metric, with bounds
// on when it happened and how it was confirmed, not a dated policy change (audit finding 4).
export interface ChangeRecord {
  date: string;
  direction: "increased" | "decreased";
  percent: number;
  model: string;
  scope?: EventScope;
  metric?: string;
  observation_scope?: string;
  attribution?: string;
  onset?: { earliest: string | null; latest: string };
  confirmation?: { at: string | null; evidence_points?: number; seven_day_pct?: number | null };
  rounding_interval_before?: (number | null)[] | null;
  rounding_interval_after?: (number | null)[] | null;
  evidence_quality?: string;
  provisional?: boolean;
  legacy_uncertain?: boolean;
}
export interface UsageEvent extends Partial<Omit<ChangeRecord, "date" | "scope">> {
  date: string;
  kind: EventKind;
  scope?: EventScope;
  label: string;
}

export interface Freshness {
  as_of?: string | null;
  stale_after?: string | null;
  stale?: boolean | null;
}

export interface Rate {
  // Null in schema 2 when there is no eligible passive measurement.
  tokens_per_window: number | null;
  // Schema 2: meter dollars (list price x class weight x meter weight) one Max 20x window holds.
  meter_budget_per_window?: number | null;
  // Schema 1: the meter budget, under a name that said API value (audit finding 1). Schema 2:
  // the API list value of the reference-mix token bundle, the same as api_list_value_per_window.
  api_value_per_window?: number | null;
  api_list_value_per_window?: number | null;
  // "passive" or "probe" in schema 1; "derived_reference_mix" or "unavailable" in schema 2.
  source: string;
  // ISO timestamp of this model's latest probe, when it has one of its own. Null/absent for
  // a model whose figures are derived from another model's probe rather than probed directly.
  probed_at?: string | null;
  // Newest passive measurement this figure rests on.
  measured_at?: string | null;
  probe_effort?: string | null;
  split: Record<TokenClass, number>;
  reference_mix?: { id?: string; kind?: string; source?: string; as_of?: string | null; cache_write_duration?: string };
  evidence?: {
    source?: string | null;
    reset_verified?: boolean;
    observed_from?: string | null;
    observed_to?: string | null;
    readings?: number;
    account_count?: number;
    stretches?: number;
    meter_movement_pct?: number;
    window_pieces?: number;
    rounding_relative?: number | null;
    capture_diagnosed?: number;
  };
  quality?: { status?: string; reasons?: string[]; capture_complete?: boolean | null; unpriced_work?: boolean | null };
  freshness?: Freshness;
}

export interface HistoryRow {
  date: string;
  tokens_per_window: number | null;
  meter_budget_per_window?: number | null;
  api_value_per_window?: number | null;
  api_list_value_per_window?: number | null;
  // Schema 1: "passive", "probe", or "held" for a day backfilled with the first real reading.
  source: string;
  // Schema 2: "measured", or "legacy_reset_unverified" for a day read from a reset-less log.
  quality?: string;
  readings?: number;
  interpolated: boolean;
}

// The one dated weekly estimate a plan's hero sentence, table and chart all draw (finding 6).
export interface WeeklyEstimate {
  value: number;
  rounding_interval?: (number | null)[];
  five_hour_pct?: number;
  seven_day_pct?: number;
  points?: number;
  pieces?: number;
  from?: string;
  as_of?: string;
  stale?: boolean;
  source?: string;
  assumed?: boolean;
  quality?: string;
  reasons?: string[];
}

export interface WeeklyPlan {
  // Schema 1 publishes a number for every plan, including Max 5x's frozen August median and
  // Pro's copy of it. Schema 2 publishes null wherever the plan has no current measurement.
  current: number | null;
  current_estimate?: WeeklyEstimate | null;
  history: {
    week_ending: string;
    windows: number;
    five_hour_pct: number;
    seven_day_pct: number;
    // True when this week is still in progress. Optional: older JSON omits it, in which
    // case it's inferred from week_ending falling after the last sample date.
    partial?: boolean;
    source?: string;
    assumed?: boolean;
    quality?: string;
    reasons?: string[];
  }[];
  // True when this plan's figures are borrowed from another plan rather than measured on it.
  // Only schema 1 sets it (Pro carried Max 5x's numbers); nothing borrowed is drawn.
  assumed?: boolean;
  // Levels, oldest first: what the detector found, each held flat between steps. Optional:
  // older JSON has only the rows.
  regimes?: {
    start: string;
    end: string;
    windows: number;
    seven_day_pct: number;
    points: number;
    pieces?: number;
    rounding_interval?: (number | null)[];
    quality?: string;
    source?: string;
    assumed?: boolean;
  }[];
  availability?: { status: string; reason: string | null };
  plan_change?: { date: string; source: string; independently_verified: boolean };
}

export interface PlanLimit {
  included: boolean;
  weekly_fraction: number;
  source_url?: string;
  as_of?: string;
}

export interface UsageJson {
  schema_version?: number;
  rate_basis?: string;
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
  // Schema 1: a cross-period quotient of two plans' weekly levels, used to draw one plan's
  // line from another's. The audit (finding 6) showed it cannot tell a plan difference from a
  // limit change, so nothing reads it; schema 2 publishes it empty.
  weekly_window_ratios?: Partial<Record<Plan, number>>;
  availability?: { rates?: string; evidence?: string; reason?: string | null };
  rates: Record<string, Rate>;
  effort: Record<string, Record<Effort, number>>;
  // Meter dollars one calibration task costs at each effort level. Optional: older JSON omits
  // it. This is the effort series to scale by, not `effort` above -- see compute().
  effort_usd?: Record<string, Record<Effort, number>>;
  api_price_per_mtok: Record<string, ApiPrice>;
  history: Record<string, HistoryRow[]>;
  last_change: ChangeRecord | null;
  events?: UsageEvent[];
  // Schema 1 only: median tokens of one session on another account. The page never divides by
  // it: those sessions do not share the reference mix (audit finding 11).
  session_tokens?: Record<string, number>;
  // How many accounts the passive readings rest on. Counts only: the JSON is public and the
  // account names are real people's logins. Optional: older JSON omits it.
  passive_account_count?: number;
  // Contributed-sample aggregate, once at least one contributor has posted. Optional: older
  // JSON and a freshly-deployed collector with zero contributors omit it.
  contributed?: ContributedBlock;
  // How many 5-hour windows a real account's seven-day limit holds, keyed by plan. A plan entry
  // of null (or a null current) means no current figure, in which case every per-week figure
  // the page derives from a window figure for that plan comes back null rather than guessed.
  weekly_windows?: Partial<Record<Plan, WeeklyPlan | null>>;
  // Schema 2: which plans include each model, and what share of the weekly limit it may use.
  model_plan_limits?: Record<string, Partial<Record<Plan, PlanLimit>>>;
}

export function isSchema2(j: UsageJson): boolean {
  return (j.schema_version ?? 1) >= 2;
}

// The meter budget of one Max 20x window. Schema 1 published it as api_value_per_window.
export function meterBudgetPerWindow(j: UsageJson, rate: Rate): number | null {
  const v = isSchema2(j) ? rate.meter_budget_per_window : rate.api_value_per_window;
  return typeof v === "number" ? v : null;
}

// The API list value of the tokens one Max 20x window holds. Schema 1 has no such figure: its
// only dollar field is the meter budget, so this is null rather than that number relabelled.
export function apiListValuePerWindow(j: UsageJson, rate: Rate): number | null {
  if (!isSchema2(j)) return null;
  const v = rate.api_list_value_per_window ?? rate.api_value_per_window;
  return typeof v === "number" ? v : null;
}

// Mirrors tracker/publish.py's _model_plan_limits, for JSON published before it existed: the
// eligibility rule is published policy, not a measurement, so it holds for either schema.
const PLAN_LIMIT_SOURCE_URL = "https://support.claude.com/en/articles/15424964-claude-fable-models-on-your-plan";

export function modelPlanLimit(j: UsageJson, model: string, plan: Plan): PlanLimit {
  const published = j.model_plan_limits?.[model]?.[plan];
  if (published) return published;
  if (model.startsWith("claude-fable-")) {
    return plan === "pro"
      ? { included: false, weekly_fraction: 0, source_url: PLAN_LIMIT_SOURCE_URL }
      : { included: true, weekly_fraction: 0.5, source_url: PLAN_LIMIT_SOURCE_URL };
  }
  return { included: true, weekly_fraction: 1 };
}

// A plan's current windows per week, or null when the plan has no current measurement of its
// own. Schema 2 publishes it as `current_estimate`, and a stale or assumed estimate is not
// current. Schema 1 measured only `plan_measured`: every other plan's `current` is either a
// frozen median from before the account moved plans (Max 5x) or a copy of one (Pro).
export function currentWeeklyEstimate(j: UsageJson, plan: Plan): WeeklyEstimate | null {
  const w = j.weekly_windows?.[plan];
  if (!w || w.assumed) return null;
  if (isSchema2(j)) {
    const e = w.current_estimate;
    if (!e || e.assumed || e.stale === true || typeof e.value !== "number") return null;
    return e;
  }
  if (plan !== j.plan_measured || typeof w.current !== "number") return null;
  return { value: w.current };
}

export interface RegimeLevel {
  start: string;
  end: string;
  windows: number;
  // True when this level is not this plan's own measurement for that span.
  inferred: boolean;
  plan: Plan;
}

// One plan's own regime levels, oldest first. Nothing is scaled across from another plan and
// nothing borrowed is drawn: a cross-period plan ratio cannot tell a plan difference from a
// limit change (audit finding 6). The newest level is drawn at the plan's current estimate, so
// the chart ends on the figure the hero sentence and the table use.
export function weeklyRegimeLevelsFor(j: UsageJson, plan: Plan): RegimeLevel[] {
  const w = j.weekly_windows?.[plan];
  if (!w?.regimes || w.assumed) return [];
  const levels = w.regimes
    .filter((r) => Number.isFinite(r.windows))
    .map((r) => ({ start: r.start, end: r.end, windows: r.windows, inferred: r.assumed === true, plan }))
    .sort((a, b) => Date.parse(a.start) - Date.parse(b.start));
  const current = currentWeeklyEstimate(j, plan);
  if (current && levels.length > 0) levels[levels.length - 1].windows = current.value;
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

// A contributed reading's figure for the selected model: its own entry in the per-model map, or
// null. Never the reading's combined figure, which mixes every model it used (finding 8).
export function contributorModelValue(
  byModel: Record<string, number> | undefined,
  model: string,
  scale = 1,
): number | null {
  const value = byModel?.[model];
  return typeof value === "number" ? value * scale : null;
}

export function compute(j: UsageJson, plan: Plan, model: string, effort: Effort) {
  const rate = j.rates[model];
  if (!rate) return null; // no probe data for this model yet: the page shows its unavailable state
  const limit = modelPlanLimit(j, model, plan);
  const ratio = j.plan_ratios[plan];
  // A model the plan does not include has no subscription capacity to scale (finding 2).
  const scaled = (v: number | null | undefined) => (limit.included && typeof v === "number" ? v * ratio : null);
  const tokensPerWindow = scaled(rate.tokens_per_window);
  const split =
    tokensPerWindow === null
      ? null
      : (Object.fromEntries(CLASSES.map((c) => [c, tokensPerWindow * (rate.split?.[c] ?? 0)])) as Record<TokenClass, number>);
  // Two dollar figures in two units (finding 1): the meter budget is what the meter charges and
  // the API list value is what the same tokens cost at list price, cache reads included.
  const meterBudgetUsd = scaled(meterBudgetPerWindow(j, rate));
  const apiListValueUsd = scaled(apiListValuePerWindow(j, rate));
  // Tasks divide like units: meter dollars a window holds over meter dollars one calibration
  // task cost. Never the token totals, which carry the cache state of the run behind them.
  const perTaskUsd = j.effort_usd?.[model]?.[effort];
  const tasksPerWindow =
    meterBudgetUsd !== null && typeof perTaskUsd === "number" && perTaskUsd > 0 ? meterBudgetUsd / perTaskUsd : null;
  // No session count: one needs a measured meter cost per session, and the only session figure
  // ever published was another account's token total on a different mix (finding 11).
  const planWindowsPerWeek = currentWeeklyEstimate(j, plan)?.value ?? null;
  // The windows of the plan's week this model may use: Fable is capped at half on Max.
  const windowsPerWeek = limit.included && planWindowsPerWeek !== null ? planWindowsPerWeek * limit.weekly_fraction : null;
  const perWeek = (v: number | null) => (v === null || windowsPerWeek === null ? null : v * windowsPerWeek);
  return {
    included: limit.included,
    weeklyFraction: limit.weekly_fraction,
    tokensPerWindow,
    split,
    meterBudgetUsd,
    apiListValueUsd,
    tasksPerWindow,
    tasksPerWeek: perWeek(tasksPerWindow),
    tokensPerWeek: perWeek(tokensPerWindow),
    apiListValueUsdPerWeek: perWeek(apiListValueUsd),
    planWindowsPerWeek,
    windowsPerWeek,
  };
}

// Short label for a model's rate source: "the account's own meter, newest reading 15 Sep" dated
// by the passive reading itself (measured_at), "probe, 8 Sep" by the model's own probe, or the
// plain source when no date is available. A passive figure must never carry a probe's date.
// Schema 2 adds the figure's quality status and staleness in the collector's own words.
export function fmtSource(
  rate: Pick<Rate, "source" | "probed_at" | "measured_at" | "evidence" | "quality" | "freshness"> | undefined,
): string | null {
  if (!rate) return null;
  const day = (iso: string) => {
    const d = new Date(iso);
    return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
  };
  const qualifiers = [
    rate.quality?.status && rate.quality.status !== "measured" && rate.quality.status !== rate.source ? rate.quality.status : null,
    rate.freshness?.stale === true ? "stale" : null,
  ].filter(Boolean);
  const suffix = qualifiers.length > 0 ? `, ${qualifiers.join(", ")}` : "";
  // A passive figure is pooled over every account's meter readings; measured_at is the newest
  // of those, not anything this model did on its own. Say so in the fold-out's own words rather
  // than the collector's name for the instrument.
  if (rate.source === "passive" || rate.evidence?.source === "passive") {
    const n = rate.evidence?.account_count;
    const meter = typeof n === "number" && n > 1 ? `${n} accounts' own meters` : "the account's own meter";
    return (rate.measured_at ? `${meter}, newest reading ${day(rate.measured_at)}` : meter) + suffix;
  }
  if (rate.source === "probe" && rate.probed_at) return `probe, ${day(rate.probed_at)}${suffix}`;
  return rate.source + suffix;
}

// The newest evidence behind one model's figure: its own freshness date, else its own
// measured_at, else the file's last_sample_at for JSON that dates neither.
export function rateEvidenceAt(j: UsageJson, model: string): string | null {
  const rate = j.rates[model];
  return rate?.freshness?.as_of ?? rate?.measured_at ?? j.last_sample_at ?? null;
}

// When a model's rate stops being current evidence. Schema 2 publishes it per figure; schema 1
// holds the model's own evidence date for three days. Deliberately not generated_at, and not the
// file-wide last_sample_at when the model has its own date: a rebuilt file, or a fresh reading on
// another model, does not make this figure's evidence newer (finding 16).
export function rateStaleAfter(j: UsageJson, model: string): string | null {
  const f = j.rates[model]?.freshness;
  if (f?.stale === true) return f.as_of ?? j.generated_at;
  if (f?.stale_after) return f.stale_after;
  if (isSchema2(j)) return null;
  const at = rateEvidenceAt(j, model);
  const t = at ? Date.parse(at) : NaN;
  return Number.isFinite(t) ? new Date(t + 3 * 86400e3).toISOString() : null;
}

// The date the page's "Last measured" line shows at `now`, or null while the figure is current.
// One function decides both whether the line shows and which date it gives, so the two cannot
// come from different evidence.
export function staleEvidenceAt(j: UsageJson, model: string, now: number): string | null {
  const after = rateStaleAfter(j, model);
  if (after === null || !(now > Date.parse(after))) return null;
  return rateEvidenceAt(j, model);
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

// The headline states what was observed on the watched account, never that Anthropic changed a
// limit: a change in one account's metric does not establish a policy change, or which cap moved
// (audit finding 4). Schema 2 bounds the onset; schema 1 has only the detection's date.
export function headline(j: UsageJson): { text: string; tone: "up" | "down" | "flat" } {
  const c = j.last_change;
  if (!c) {
    // "held" rows are backfilled with the first real reading, not measured on that day, so
    // the "since" date must come from the first genuinely measured row.
    const rows = Object.values(j.history ?? {}).flat();
    const firstReal = rows.filter((h) => h.source !== "held").map((h) => h.date).sort()[0];
    const first = firstReal ?? rows.map((h) => h.date).sort()[0];
    if (!first) return { text: "No change in Claude's limits detected since we started measuring.", tone: "flat" };
    return { text: `No change in Claude's limits detected since ${fmtDate(first)}.`, tone: "flat" };
  }
  const tone = c.direction === "increased" ? "up" : "down";
  const metric = c.scope === "weekly" ? "weekly-to-window ratio" : "5-hour window budget";
  const earliest = c.onset?.earliest?.slice(0, 10);
  const latest = c.onset?.latest?.slice(0, 10);
  const when =
    earliest && latest && earliest !== latest ? `between ${fmtDate(earliest)} and ${fmtDate(latest)}` : `on ${fmtDate(latest ?? c.date)}`;
  return { text: `Claude's observed ${metric} ${c.direction} by ${c.percent}% ${when}.`, tone };
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

// The history rows the window chart can plot. Schema 2 publishes a day with no priced reference
// mix as tokens_per_window null; the series and its markers both anchor on the last plotted row.
function plottedRows(j: UsageJson, model: string): (HistoryRow & { tokens_per_window: number })[] {
  return (j.history[model] ?? []).filter((h): h is HistoryRow & { tokens_per_window: number } => typeof h.tokens_per_window === "number");
}

export function seriesFor(j: UsageJson, plan: Plan, model: string, days: number = 90) {
  if (!modelPlanLimit(j, model, plan).included) return [];
  const ratio = j.plan_ratios[plan];
  const hist = plottedRows(j, model);
  if (hist.length === 0) return [];
  const cutoff = daysBefore(hist[hist.length - 1].date, days);
  return hist
    .filter((h) => h.date >= cutoff)
    .map((h) => ({ date: h.date, value: h.tokens_per_window * ratio, interpolated: h.interpolated, held: h.source === "held" }));
}

export function eventsFor(j: UsageJson, model: string, days: number = 90): UsageEvent[] {
  const hist = plottedRows(j, model);
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
  // True when this row is flagged assumed rather than measured on this plan.
  inferred: boolean;
  // Tokens a full week of windows buys, only populated by weeklyTokenSeriesFor. Undefined
  // (never a wrong number) whenever there is no dated window figure for that week.
  tokens?: number;
}

export interface WeeklySeries {
  plan: Plan;
  assumed: boolean;
  label: string;
  points: WeeklyPoint[];
}

// Unlike seriesFor/eventsFor, the weekly chart is not scoped to the 30/90/180-day range
// selector: it needs only meter readings (not probes), so its full history is cheap and the
// range picker would otherwise hide the very history (months back) that justifies the chart.
//
// Each plan's series holds only its own weeks. Gaps stay gaps: until issue #54 they were filled
// by scaling another plan's weeks by the quotient of the two plans' `current` figures, and after
// it by `weekly_window_ratios`. Both are cross-period quotients that make the plan seam continuous
// by construction, so a limit change at the seam disappears into them (audit finding 6). A plan
// flagged assumed has no weeks of its own and draws no series.
export function weeklySeriesFor(j: UsageJson): WeeklySeries[] {
  const lastSampleDate = j.last_sample_at ? j.last_sample_at.slice(0, 10) : null;
  const out: WeeklySeries[] = [];
  for (const p of Object.keys(PLAN_LABELS) as Plan[]) {
    const w = j.weekly_windows?.[p];
    if (!w || w.assumed || w.history.length === 0) continue;
    const points = w.history.map((h) => ({
      date: h.week_ending,
      windows: h.windows,
      partial: typeof h.partial === "boolean" ? h.partial : lastSampleDate !== null && h.week_ending > lastSampleDate,
      inferred: h.assumed === true,
    }));
    out.push({ plan: p, assumed: false, label: PLAN_LABELS[p], points });
  }
  return out;
}

// A window figure that is evidence for its own date: not a day backfilled with a later reading
// ("held") or interpolated, and with a token figure at all.
function datedWindowRows(j: UsageJson, model: string): (HistoryRow & { tokens_per_window: number })[] {
  return (j.history[model] ?? [])
    .filter((h): h is HistoryRow & { tokens_per_window: number } =>
      typeof h.tokens_per_window === "number" && h.source !== "held" && !h.interpolated,
    )
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

// Same series as weeklySeriesFor, with each point's tokens-per-week added: windows times the
// tokens a single window bought at that week_ending, scaled by the plan's ratio and the share of
// the week the model may use. The per-window figure is the LAST dated history row at or before
// week_ending. A week before the first dated row has no figure: the earliest row is not backdated
// and the current rate is not projected into the past (audit finding 12).
export function weeklyTokenSeriesFor(j: UsageJson, model: string): WeeklySeries[] {
  const rows = datedWindowRows(j, model);
  const tokensPerWindowAt = (weekEnding: string): number | undefined => {
    const atOrBefore = rows.filter((h) => h.date <= weekEnding);
    return atOrBefore.length > 0 ? atOrBefore[atOrBefore.length - 1].tokens_per_window : undefined;
  };
  return weeklySeriesFor(j)
    .filter((s) => modelPlanLimit(j, model, s.plan).included)
    .map((s) => {
      const scale = j.plan_ratios[s.plan] * modelPlanLimit(j, model, s.plan).weekly_fraction;
      return {
        ...s,
        points: s.points.map((p) => {
          const perWindow = tokensPerWindowAt(p.date);
          return { ...p, tokens: typeof perWindow === "number" ? p.windows * perWindow * scale : undefined };
        }),
      };
    });
}

// The same levels priced in tokens: each span's windows times what one window bought during it,
// on the plan's own token ratio and the model's share of the week. The product changes when
// either factor does, so each weekly level is split wherever the dated window figure changes
// inside it: a five-hour change inside a flat weekly level is a step here (audit finding 12).
// Spans before the first dated window figure are left out rather than backdated. A span is
// inferred when its weekly level is, or when its window figure is not marked measured.
export function weeklyTokenRegimeLevelsFor(
  j: UsageJson,
  plan: Plan,
  model: string,
): (RegimeLevel & { tokens: number })[] {
  const limit = modelPlanLimit(j, model, plan);
  if (!limit.included) return [];
  const scale = j.plan_ratios[plan] * limit.weekly_fraction;
  const rows = datedWindowRows(j, model).map((h) => ({ ...h, t: Date.parse(`${h.date}T00:00:00Z`) }));
  const out: (RegimeLevel & { tokens: number })[] = [];
  for (const r of weeklyRegimeLevelsFor(j, plan)) {
    const t0 = Date.parse(r.start), t1 = Date.parse(r.end);
    const cuts = [t0, ...rows.map((h) => h.t).filter((t) => t > t0 && t < t1), t1];
    for (let i = 0; i < cuts.length - 1; i++) {
      const atOrBefore = rows.filter((h) => h.t <= cuts[i]);
      const h = atOrBefore[atOrBefore.length - 1];
      if (!h) continue;
      const tokens = r.windows * h.tokens_per_window * scale;
      const inferred = r.inferred || (h.quality !== undefined && h.quality !== "measured");
      const iso = (t: number, original: string) => (t === t0 || t === t1 ? original : new Date(t).toISOString());
      const prev = out[out.length - 1];
      // Consecutive days at the same figure are one span, not a run of identical steps.
      if (prev && prev.end === iso(cuts[i], r.start) && prev.tokens === tokens && prev.inferred === inferred) {
        prev.end = iso(cuts[i + 1], r.end);
        continue;
      }
      out.push({ ...r, start: iso(cuts[i], r.start), end: iso(cuts[i + 1], r.end), inferred, tokens });
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
