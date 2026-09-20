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
  onset?: {
    earliest: string | null;
    latest: string;
    // The pooled Max 20x regime step -- the date the windows-per-week chart itself steps on and
    // marks. `earliest`/`latest` above bound the per-account onsets instead, which can (and here
    // do) start days before the pooled regime the chart draws catches up: headline() prefers this
    // one so the sentence and the chart's own change marker never name two different days for the
    // same event.
    from_windows?: { earliest: string | null; latest: string };
  };
  confirmation?: { at: string | null; evidence_points?: number; seven_day_pct?: number | null };
  rounding_interval_before?: (number | null)[] | null;
  rounding_interval_after?: (number | null)[] | null;
  evidence_quality?: string;
  provisional?: boolean;
  legacy_uncertain?: boolean;
  // Which of the two meters moved. "unresolved" is published wherever the stretches cannot
  // separate a smaller weekly cap from a bigger five-hour window; the page says so rather than
  // picking one.
  meter_attribution?: string;
  // Anthropic's own figure for the change, quoted. A published claim shown beside the
  // measurement, never mixed into it.
  announced?: {
    date?: string;
    announced_change_pct?: number;
    quote?: string;
    also_quoted?: string;
    scope?: string;
    source?: string;
  };
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

// One five-hour window's paired reading: how far the seven-day meter moved for the window spent.
// `windows` is null when the seven-day meter did not move, so there is no ratio to plot. `account`
// is an anonymous label ("a1"), never a login.
export interface WindowReading {
  window_ending: string;
  windows: number | null;
  five_hour_pct: number;
  seven_day_pct: number;
  rounding_interval?: (number | null)[] | null;
  account?: string;
  reset_verified?: boolean;
}

// One calendar week of those readings pooled across accounts; `n` is how many went in.
export interface WeeklyPooledPoint {
  week_ending: string;
  windows: number;
  rounding_interval?: (number | null)[] | null;
  n?: number;
  five_hour_pct?: number;
  seven_day_pct?: number;
  partial?: boolean;
}

// One account's own view of the weekly level, and the step it saw, if it saw one.
export interface AccountWeekly {
  n?: number;
  current?: number | null;
  regimes?: unknown[];
  step?: { onset: string; before: number; after: number; percent: number } | null;
}

// A `current` that says where it came from. Tracker wf-50 marks Max 5x's and Pro's current figure
// as inferred from Max 20x; the brief leaves open whether the marks sit on `current` itself or
// beside it on the plan, so weeklyCurrentFor reads either.
export interface WeeklyCurrent {
  value: number | null;
  assumed?: boolean;
  inferred_from?: Plan;
  availability?: { status: string; reason?: string | null };
}

export interface WeeklyPlan {
  // Schema 1 publishes a number for every plan, including Max 5x's frozen August median and
  // Pro's copy of it. Schema 2 publishes null wherever the plan has no current measurement.
  current: number | WeeklyCurrent | null;
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
  // Only schema 1 sets it (Pro carried Max 5x's numbers); the weekly charts draw them inferred.
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
  inferred_from?: Plan;
  // Tracker wf-50, Max 20x only so far: every per-window reading with the accounts pooled, the
  // same readings pooled by calendar week, and each account's own level and step. All optional:
  // JSON published before wf-50 has none of them and the weekly chart draws its levels alone.
  by_window?: WindowReading[];
  weekly?: WeeklyPooledPoint[];
  by_account?: Record<string, AccountWeekly | null>;
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
  // What plan_ratios rests on. "credits_table" since tracker wf-50 (she-llac.com/claude-limits);
  // "published_plan_scaling" (Anthropic's 1:5:20) before it.
  plan_ratios_basis?: {
    kind?: string;
    scope?: string;
    source_url?: string;
    credits_per_window?: Partial<Record<Plan, number>>;
    // False before tracker PR #68, which dates both basis blocks from the same table the
    // `reference` block dates. The page reads the block's own date where it has one.
    dated?: boolean;
    as_of?: string | null;
  };
  weekly_window_ratios_basis?: {
    kind?: string;
    source_url?: string;
    scope?: string;
    dated?: boolean;
    as_of?: string | null;
    credits_per_week?: Partial<Record<Plan, number>>;
    documented_windows_per_week?: Partial<Record<Plan, number>>;
    // The one ratio this tracker has measured for itself, and the spans it was measured over.
    measured_confirmation?: { max5_over_max20?: number; spans?: string };
    [k: string]: unknown;
  };
  // How many five-hour windows a week's cap holds, per plan, relative to max20: a quotient of
  // two plans' weekly levels, used to draw one plan's weekly line from another's. Schema 2
  // publishes it empty, so the page derives it from the regimes; see weeklyWindowRatio.
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
  // Median tokens of one session on another account, per model. compute() divides the window
  // by it (scaled by the priced effort figures) for the sessions per window and per week lines,
  // as the page did at PR #74; audit finding 11 had dropped that and Jonathan reversed it.
  session_tokens?: Record<string, number>;
  // How many accounts the passive readings rest on. Counts only: the JSON is public and the
  // account names are real people's logins. Optional: older JSON omits it.
  passive_account_count?: number;
  // Contributed-sample aggregate, once at least one contributor has posted. Optional: older
  // JSON and a freshly-deployed collector with zero contributors omit it.
  contributed?: ContributedBlock;
  // How many 5-hour windows a real account's seven-day limit holds, keyed by plan. A plan entry
  // of null (or a null current) means no current figure, in which case every per-week figure
  // the page derives for that plan rests on the level its weekly chart ends on, flagged inferred,
  // or is null when that chart has no level for it (see compute).
  weekly_windows?: Partial<Record<Plan, WeeklyPlan | null>>;
  // Schema 2: which plans include each model, and what share of the weekly limit it may use.
  model_plan_limits?: Record<string, Partial<Record<Plan, PlanLimit>>>;
  // The meter priced in its own unit, published by the tracker from 2026-09-20. Optional: the
  // live file carries it from its next refresh, and every older file has none of it, in which
  // case the page renders exactly as it did before.
  credits?: CreditsBlock;
  // The published reference table the measurements are shown beside, with its own date and the
  // announced changes since. Never an input to a figure on this page.
  reference?: ReferenceBlock;
}

export function isSchema2(j: UsageJson): boolean {
  return (j.schema_version ?? 1) >= 2;
}

// The meter budget of one Max 20x window. Schema 1 published it as api_value_per_window.
export function meterBudgetPerWindow(j: UsageJson, rate: Rate): number | null {
  const v = isSchema2(j) ? rate.meter_budget_per_window : rate.api_value_per_window;
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

export interface RegimeLevel {
  start: string;
  end: string;
  windows: number;
  // True when this level was measured on another plan and scaled onto this one by the plan
  // ratio, rather than measured on this plan's own windows.
  inferred: boolean;
  plan: Plan;
}

// A plan's five-hour windows per week relative to Max 20x. Schema 1 publishes it directly under
// `weekly_window_ratios`. Schema 2 can publish that field empty, so this falls back to the way
// the schema 1 collector derived it (tracker/publish.py before tracker PR #57): Max 5x's first
// regime level over Max 20x's first, rounded to three places, with Pro taking Max 5x's. Null
// when neither is available -- kept as the #76 fallback so a plan is never dropped outright.
export function weeklyWindowRatio(j: UsageJson, plan: Plan): number | null {
  const published = j.weekly_window_ratios?.[plan];
  if (typeof published === "number" && published) return published;
  if (plan === "max20") return 1;
  const max5 = j.weekly_windows?.max5?.regimes?.[0]?.windows;
  const max20 = j.weekly_windows?.max20?.regimes?.[0]?.windows;
  if (typeof max5 !== "number" || typeof max20 !== "number" || !max20) return null;
  return Math.round((max5 / max20) * 1000) / 1000;
}

// Every regime level on one plan's scale, oldest first, gaps included.
//
// A plan's own regimes are used where it has them. Everywhere else the other plans' regimes
// are scaled across by weeklyWindowRatio and flagged inferred, which is how Max 20x gets a
// level for the months before the account moved onto it and Max 5x keeps one for the months
// after. Overlaps resolve in favour of the measured level.
export function weeklyRegimeLevelsFor(j: UsageJson, plan: Plan): RegimeLevel[] {
  const ratioOf = (p: Plan): number | null => weeklyWindowRatio(j, p);
  const own = ratioOf(plan);
  const out: RegimeLevel[] = [];
  for (const source of Object.keys(PLAN_LABELS) as Plan[]) {
    const regimes = j.weekly_windows?.[source]?.regimes;
    if (!regimes || regimes.length === 0) continue;
    const isOwn = source === plan;
    // Pro borrows Max 5x's measured regimes wholesale, exactly as it borrows its weekly rows,
    // so a ratio of 1 applies and the level is not flagged inferred twice over.
    const from = ratioOf(source);
    const scale = isOwn ? 1 : own !== null && from !== null ? own / from : null;
    if (scale === null) continue;
    for (const r of regimes) {
      if (!Number.isFinite(r.windows)) continue;
      out.push({ start: r.start, end: r.end, windows: r.windows * scale, inferred: !isOwn, plan: source });
    }
  }
  // A measured level wins any overlap: clip an inferred level to the parts no measured one
  // covers, rather than dropping it whole. Max 5x's regime ends on the day Max 20x's begins, so
  // the two always touch at the plan boundary; dropping on contact would lose every month
  // before the move, and the chart would bridge the gap with the wrong level.
  const t = (iso: string) => Date.parse(iso);
  const measured = out.filter((r) => !r.inferred);
  const kept: RegimeLevel[] = [];
  for (const r of out) {
    if (!r.inferred) {
      kept.push(r);
      continue;
    }
    let pieces = [r];
    for (const m of measured) {
      pieces = pieces.flatMap((p) => {
        if (t(m.start) >= t(p.end) || t(m.end) <= t(p.start)) return [p];
        const before = t(m.start) > t(p.start) ? [{ ...p, end: m.start }] : [];
        const after = t(m.end) < t(p.end) ? [{ ...p, start: m.end }] : [];
        return [...before, ...after];
      });
    }
    kept.push(...pieces);
  }
  // Scaling two plans' identical regimes onto a third yields the same level twice. Dedupe on the
  // span and the level, keeping whichever arrived first.
  const seen = new Set<string>();
  const unique = kept.filter((r) => {
    const key = `${r.start}|${r.end}|${r.windows.toFixed(4)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return unique.sort((a, b) => t(a.start) - t(b.start));
}

// The factor that puts `other`'s windows per week on `own`'s scale, for filling gaps in the
// weekly chart. weeklyWindowRatio already covers the case where `weekly_window_ratios` is
// unpublished (deriving it from the first regime level, PR #76). This adds one more fallback,
// for JSON published before either ratio or regime existed: the quotient of the two plans'
// `current` figures, which drifts with every limit change since the older one froze (issue #54)
// but is all that JSON has.
function scaleFrom(j: UsageJson, own: Plan, other: Plan): number | null {
  const ownRatio = weeklyWindowRatio(j, own);
  const otherRatio = weeklyWindowRatio(j, other);
  if (ownRatio !== null && otherRatio !== null) return ownRatio / otherRatio;
  const ownCurrent = weeklyCurrentFor(j, own)?.value ?? null;
  const otherCurrent = weeklyCurrentFor(j, other)?.value ?? null;
  if (!ownCurrent || !otherCurrent) return null;
  return ownCurrent / otherCurrent;
}

// A plan's published current windows per week, and whether the collector marks it as inferred
// from another plan: an availability status of "inferred", an `inferred_from`, or `assumed` on the
// figure itself. The plan-level `assumed` that JSON before tracker wf-50 sets on Pro is not one of
// the marks: Jonathan took the "inferred" badge off those figures on 2026-09-16 (PR #78), and the
// page keeps that presentation until the collector publishes the new marks. Null when the plan
// publishes no figure.
export function weeklyCurrentFor(
  j: UsageJson,
  plan: Plan,
): { value: number; inferred: boolean; inferredFrom: Plan | null } | null {
  const w = j.weekly_windows?.[plan];
  if (!w) return null;
  const cur = w.current;
  const own: WeeklyCurrent | null = cur !== null && typeof cur === "object" ? cur : null;
  const value = own ? own.value : cur;
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  const status = own?.availability?.status ?? w.availability?.status;
  const inferredFrom = own?.inferred_from ?? w.inferred_from ?? null;
  const inferred = own?.assumed === true || inferredFrom !== null || status === "inferred";
  return { value, inferred, inferredFrom };
}

// Documented reference levels, five-hour windows per week. Drawn beside the measured figures,
// never in their place, and never used in any arithmetic. These two are the fallback for JSON
// published before `weekly_window_ratios_basis` existed, and nothing else: a file that publishes
// the block is read from the block, so the figures on the live page are the publisher's.
const DOCUMENTED_FALLBACK: Record<Plan, number> = { pro: 9.09, max5: 12.63, max20: 7.58 };
const DOCUMENTED_FALLBACK_SOURCE = "she-llac, undated";

// Two URLs naming the same page, protocol and trailing slash apart.
function sameSourceUrl(a: string | null | undefined, b: string | null | undefined): boolean {
  const norm = (u: string) => u.replace(/^https?:\/\//, "").replace(/\/+$/, "").toLowerCase();
  return !!a && !!b && norm(a) === norm(b);
}

// The date the published reference table carries, for a source URL the page names. The tracker
// publishes two basis blocks that say this table is undated and one `reference` block that dates
// it; the date is the one fact about it the page can state, so everywhere the same URL is named
// takes the date from here rather than printing "undated" beside a dated reference.
export function referenceDateFor(j: UsageJson, url: string | null | undefined): string | null {
  const as_of = j.reference?.as_of;
  if (!as_of) return null;
  return sameSourceUrl(j.reference?.url, url) ? as_of : null;
}

// The date a basis block's source carries: the block's own `as_of` (tracker PR #68), else the
// reference block's date for the same URL. Both say the same day about the same table; a file
// published before #68 has only the second, and reads the same.
export function basisDate(
  j: UsageJson,
  basis: { as_of?: string | null; source_url?: string } | null | undefined,
): string | null {
  if (basis?.as_of) return basis.as_of;
  return referenceDateFor(j, basis?.source_url);
}

// One plan's documented windows per week, as the weekly basis block publishes it.
export function documentedWindowsPerWeek(j: UsageJson, plan: Plan): number | null {
  const published = j.weekly_window_ratios_basis?.documented_windows_per_week?.[plan];
  if (typeof published === "number") return published;
  return DOCUMENTED_FALLBACK[plan] ?? null;
}

// What to call that reference beside the level it draws: the basis block's own host, dated by the
// reference block wherever the two name the same page.
export function documentedSource(j: UsageJson): string {
  const url = j.weekly_window_ratios_basis?.source_url;
  if (!url) return DOCUMENTED_FALLBACK_SOURCE;
  const host = url.replace(/^https?:\/\//, "").split("/")[0];
  const at = basisDate(j, j.weekly_window_ratios_basis);
  return at ? `${host}, ${fmtDate(at)}` : host;
}

// Each watched account's own windows per week on this plan, where the JSON carries them: the
// figures the chart already draws as onset ticks, printed as values.
export function accountWindowsPerWeek(j: UsageJson, plan: Plan): { account: string; value: number; n: number | null }[] {
  return Object.entries(j.weekly_windows?.[plan]?.by_account ?? {})
    .flatMap(([account, a]) =>
      typeof a?.current === "number" && Number.isFinite(a.current)
        ? [{ account, value: a.current, n: typeof a.n === "number" ? a.n : null }]
        : [],
    )
    .sort((a, b) => (a.account < b.account ? -1 : a.account > b.account ? 1 : 0));
}

// A plan's five-hour windows per week and whether it is inferred from another plan: the plan's own
// `current` where it has one, else the newest level its weekly chart ends on (kept from PR #76, so
// a plan is never dropped outright). One function, so the credits route and the dollar route
// cannot put a different windows-per-week behind two figures of the same quantity.
export function planWindowsPerWeek(j: UsageJson, plan: Plan): { value: number | null; inferred: boolean } {
  const current = weeklyCurrentFor(j, plan);
  if (current !== null) return { value: current.value, inferred: current.inferred };
  const level = weeklyRegimeLevelsFor(j, plan).at(-1) ?? null;
  return { value: level?.windows ?? null, inferred: false };
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
  // A model the plan does not include has no subscription capacity to scale (audit finding 2,
  // kept: Fable is not on Pro at all, and is capped at half the week on Max).
  const scaled = (v: number | null | undefined) => (limit.included && typeof v === "number" ? v * ratio : null);
  const tokensPerWindow = scaled(rate.tokens_per_window);
  const split =
    tokensPerWindow === null
      ? null
      : (Object.fromEntries(CLASSES.map((c) => [c, tokensPerWindow * (rate.split?.[c] ?? 0)])) as Record<TokenClass, number>);
  const perTask = j.effort[model]?.[effort] ?? NaN;
  const perTaskUsd = j.effort_usd?.[model]?.[effort];
  const mediumTaskUsd = j.effort_usd?.[model]?.medium;
  // Tasks and sessions scale with effort by the PRICED calibration figures, never the raw
  // token totals. The token totals carry the cache state of the run that produced them: a
  // Sonnet cell that happened to run cold reads about twice a warm one, which put Sonnet's
  // low above its own medium and made the page claim fewer sessions at lower effort. The
  // meter does not charge cache reads, so the dollar series is free of that and rises with
  // effort on every model.
  const prices = j.api_price_per_mtok[model];
  // The dollar figure shown across the page is the meter budget: what the meter actually
  // charges for the window, the same quantity #74 called "API value" (Jonathan reversed audit
  // finding 1's rename on 2026-09-16). Schema 1 published it as api_value_per_window; schema 2
  // as meter_budget_per_window. List-price arithmetic over the split is only a fallback for
  // JSON published before either figure existed.
  const rawApiValue =
    meterBudgetPerWindow(j, rate) ?? (typeof rate.api_value_per_window === "number" ? rate.api_value_per_window : null);
  const apiValueUsd =
    rawApiValue !== null
      ? scaled(rawApiValue)
      : split === null
        ? null
        : CLASSES.reduce((s, c) => s + (split[c] / 1e6) * (prices?.[c] ?? 0), 0);
  const tasksPerWindow =
    apiValueUsd !== null && typeof perTaskUsd === "number" && perTaskUsd > 0
      ? apiValueUsd / perTaskUsd
      : tokensPerWindow !== null && Number.isFinite(perTask)
        ? tokensPerWindow / perTask
        : null;
  // Sessions per window: tokensPerWindow divided by one real session's token cost, scaled from
  // its medium-effort baseline to the selected effort. Null (not a wrong number) whenever the
  // session_tokens calibration for this model hasn't landed yet.
  const sessionBase = j.session_tokens?.[model];
  const mediumEffort = j.effort[model]?.medium;
  // The effort multiplier: priced where the JSON carries effort_usd, otherwise the old token
  // ratio, which is all older JSON has.
  const effortScale =
    typeof perTaskUsd === "number" && typeof mediumTaskUsd === "number" && mediumTaskUsd > 0
      ? perTaskUsd / mediumTaskUsd
      : typeof mediumEffort === "number" && mediumEffort > 0 && Number.isFinite(perTask)
        ? perTask / mediumEffort
        : null;
  const sessionsPerWindow =
    tokensPerWindow !== null && typeof sessionBase === "number" && effortScale !== null && effortScale > 0
      ? tokensPerWindow / (sessionBase * effortScale)
      : null;
  // Windows per week is a measured figure, not the theoretical 28 (5-hour windows fit in a
  // week); the seven-day limit holds far fewer. A plan with no `current` measurement falls back
  // to the newest level its own weekly chart ends on (kept from PR #76, so the page never loses
  // a plan outright); a plan with no level at all still has no weekly figure. `planWindowsPerWeek`
  // is the plan's own figure; `windowsPerWeek` is this model's usable share of it.
  // True when the collector marks the current figure as inferred from another plan, so every
  // per-week figure below rests on that plan's measurement. The table marks those cells. The
  // fallback level carries no mark, as before (PR #78).
  const week = planWindowsPerWeek(j, plan);
  const planWindows = week.value;
  const weeklyInferred = week.inferred;
  const windowsPerWeek = limit.included && planWindows !== null ? planWindows * limit.weekly_fraction : null;
  const sessionsPerWeek =
    sessionsPerWindow === null || windowsPerWeek === null ? null : sessionsPerWindow * windowsPerWeek;
  const tasksPerWeek = windowsPerWeek === null || tasksPerWindow === null ? null : tasksPerWindow * windowsPerWeek;
  const apiValueUsdPerWeek = windowsPerWeek === null || apiValueUsd === null ? null : apiValueUsd * windowsPerWeek;
  return {
    included: limit.included,
    weeklyFraction: limit.weekly_fraction,
    tokensPerWindow,
    split,
    tasksPerWindow,
    tasksPerWeek,
    sessionsPerWindow,
    sessionsPerWeek,
    apiValueUsd,
    apiValueUsdPerWeek,
    planWindowsPerWeek: planWindows,
    windowsPerWeek,
    weeklyInferred: planWindows !== null && weeklyInferred,
  };
}

// "1 : 6 : 20": Pro, Max 5x and Max 20x against Pro, to two places at most. Null unless every
// plan in the order has a figure: a partial ratio is not a ratio.
function ratioText(values: Partial<Record<Plan, number>> | undefined, sep: string): string | null {
  const base = values?.pro;
  if (!values || typeof base !== "number" || !(base > 0)) return null;
  const parts = (["pro", "max5", "max20"] as Plan[]).map((p) => values[p]);
  if (parts.some((v) => typeof v !== "number")) return null;
  return parts.map((v) => (v! / base).toFixed(2).replace(/\.?0+$/, "")).join(sep);
}

// The plan scaling the page applies to a five-hour window, in words, read off plan_ratios so the
// copy cannot drift from the arithmetic. `credits` says whether the collector took the ratios from
// the credits table; only then does the per-week citation apply.
export function planScaling(j: UsageJson, sep = " : "): { credits: boolean; perWindow: string | null; perWeek: string | null } {
  const credits = j.plan_ratios_basis?.kind === "credits_table";
  return {
    credits,
    perWindow: ratioText(j.plan_ratios, sep),
    // Per week is the weekly basis block's own credits, never plan_ratios times the published
    // three-place weekly ratio: that quotient comes to 8.335 for Max 5x and would print 8.34
    // against the table's own 8.33.
    perWeek: credits ? ratioText(j.weekly_window_ratios_basis?.credits_per_week, sep) : null,
  };
}

// Short label for a model's rate source: "passive, 15 Sep" dated by the passive reading
// itself (measured_at), "probe, 8 Sep" by the model's own probe, or plain "probe"/"derived"
// when no date is available. A passive figure must never carry a probe's date. Jonathan
// reversed audit finding 10 on 2026-09-16: back to the plain #74 wording, no quality/staleness
// qualifiers or account-count wording.
export function fmtSource(
  rate: Pick<Rate, "source" | "probed_at" | "measured_at"> | undefined,
): string | null {
  if (!rate) return null;
  const day = (iso: string) => {
    const d = new Date(iso);
    return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
  };
  // A passive figure is the regime median over every account's meter readings; measured_at is
  // the newest of those, not anything this model did on its own. Say so in the fold-out's own
  // words rather than the collector's name for the instrument. Schema 2 calls the same thing
  // "derived_reference_mix"; treat it the same as "passive" for this sentence.
  if (rate.source === "passive" || rate.source === "derived_reference_mix") {
    return rate.measured_at
      ? `the account's own meter, newest reading ${day(rate.measured_at)}`
      : "the account's own meter";
  }
  if (rate.probed_at) return `${rate.source}, ${day(rate.probed_at)}`;
  return rate.source;
}

// The newest evidence behind one model's figure: its own freshness date, else its own
// measured_at, else the file's last_sample_at for JSON that dates neither.
export function rateEvidenceAt(j: UsageJson, model: string): string | null {
  const rate = j.rates[model];
  const own = rate?.freshness?.as_of ?? rate?.measured_at;
  if (own) return own;
  // Schema 2 dates every figure it publishes, so a figure without a date has no evidence date.
  return isSchema2(j) ? null : j.last_sample_at ?? null;
}

// When a model's rate stops being current evidence. Schema 2 publishes it per figure, and a figure
// it marks stale has been stale since its own evidence date; schema 1 holds the model's own
// evidence date for three days. Deliberately not generated_at, and not the
// file-wide last_sample_at when the model has its own date: a rebuilt file, or a fresh reading on
// another model, does not make this figure's evidence newer (finding 16).
export function rateStaleAfter(j: UsageJson, model: string): string | null {
  const f = j.rates[model]?.freshness;
  if (f?.stale === true) return rateEvidenceAt(j, model);
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

// Jonathan reversed audit finding 4 on 2026-09-16: the headline says Anthropic changed the
// limit again, as it did at PR #74, rather than hedging to "observed ... ratio changed".
export function headline(j: UsageJson): { text: string; tone: "up" | "down" | "flat" } {
  const c = j.last_change;
  if (!c) {
    // "held" rows are backfilled with the first real reading, not measured on that day, so
    // the "hasn't changed since" date must come from the first genuinely measured row.
    const rows = Object.values(j.history ?? {}).flat();
    const firstReal = rows.filter((h) => h.source !== "held").map((h) => h.date).sort()[0];
    const first = firstReal ?? rows.map((h) => h.date).sort()[0];
    if (!first) return { text: "Anthropic hasn't changed Claude's limits since we started measuring.", tone: "flat" };
    return { text: `Anthropic hasn't changed Claude's limits since ${fmtDate(first)}.`, tone: "flat" };
  }
  const tone = c.direction === "increased" ? "up" : "down";
  // The #78 headline, restored (Jonathan's decision, 2026-09-20): "Anthropic last <direction>
  // Claude's <weekly> limit by N% on <date>", the same sentence regardless of whether the
  // credits block is published. The onset-bounded "fell by ... between ..." wording this
  // replaced moved into "The five-hour window across the change" at the bottom, where the
  // onset range and the unresolved-attribution caveat still render in full.
  //
  // The date: `c.date` is the earliest PER-ACCOUNT onset (one account can move days before the
  // rest), but the windows-per-week chart steps -- and marks its change marker -- on the pooled
  // Max 20x regime boundary, which can land later. Prefer the pooled step (`onset.from_windows`)
  // when it is published, so the headline and the chart's own marker never disagree; fall back to
  // `c.date` for older JSON that does not carry it.
  const date = c.onset?.from_windows?.earliest ?? c.date;
  if (c.scope === "weekly") {
    return { text: `Anthropic last ${c.direction} Claude's weekly limit by ${c.percent}% on ${fmtDate(date)}.`, tone };
  }
  return { text: `Anthropic last ${c.direction} Claude's limits by ${c.percent}% on ${fmtDate(date)}.`, tone };
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
  // True when this point was not measured for this plan but inferred from another series'
  // point at the same date, scaled by scaleFrom, or when its row is flagged assumed.
  inferred: boolean;
  // Tokens a full week of windows buys, only populated by weeklyTokenSeriesFor. Undefined
  // (never a wrong number) whenever there is no dated window figure for that week.
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

function samePoints(a: WeeklyPoint[], b: WeeklyPoint[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((p, i) => p.date === b[i].date && p.windows === b[i].windows);
}

// Unlike seriesFor/eventsFor, the weekly chart is not scoped to the 30/90/180-day range
// selector: it needs only meter readings (not probes), so its full history is cheap and the
// range picker would otherwise hide the very history (months back) that justifies the chart.
export function weeklySeriesFor(j: UsageJson): WeeklySeries[] {
  const lastSampleDate = j.last_sample_at ? j.last_sample_at.slice(0, 10) : null;
  const byPlan = new Map<Plan, { assumed: boolean; points: WeeklyPoint[] }>();
  for (const p of Object.keys(PLAN_LABELS) as Plan[]) {
    const w = j.weekly_windows?.[p];
    if (!w || w.history.length === 0) continue;
    const points = w.history.map((h) => ({
      date: h.week_ending,
      windows: h.windows,
      partial: typeof h.partial === "boolean" ? h.partial : lastSampleDate !== null && h.week_ending > lastSampleDate,
      inferred: h.assumed === true,
    }));
    byPlan.set(p, { assumed: !!w.assumed, points });
  }
  const max5 = byPlan.get("max5");
  // Pro has no weeks of its own. Schema 1 published a copy of Max 5x's rows under Pro, flagged
  // assumed; schema 2 publishes Pro empty, so the same copy is made here.
  if (!byPlan.has("pro") && max5) {
    byPlan.set("pro", { assumed: true, points: max5.points.map((pt) => ({ ...pt })) });
  }
  const pro = byPlan.get("pro");
  // Pro's history today is usually just a copy of Max 5x's, borrowed rather than measured. When
  // that is literally true (assumed, and every point matches), collapse the two into one labelled
  // series instead of drawing two identical overlapping lines.
  const collapse = !!pro && !!max5 && pro.assumed && samePoints(pro.points, max5.points);
  const out: WeeklySeries[] = [];
  for (const p of Object.keys(PLAN_LABELS) as Plan[]) {
    if (p === "pro" && collapse) continue;
    const w = byPlan.get(p);
    if (!w) continue;
    // No "(assumed)" in the label: the dashed stroke and the legend under each chart already
    // say which spans are inferred rather than measured.
    const label = p === "max5" && collapse ? "Max 5x and Pro" : PLAN_LABELS[p];
    out.push({ plan: p, assumed: w.assumed, label, sharedWithPro: p === "max5" && collapse, points: w.points });
  }
  // Fill gaps: each series today only spans the weeks its own plan has actually measured, so
  // two lines can each cover only part of the axis. For every date any series has, a series
  // missing that date gets an inferred point scaled from another series' point at that date,
  // so the lines stay aligned as new data lands on one side before the other.
  //
  // The scale factor is scaleFrom: the published `weekly_window_ratios`, or a derivation of it
  // derivation of the same ratio. It must NOT be the quotient of the two plans' `current` fields
  // while a ratio exists, which is what this did until issue #54: max20's current tracks the
  // newest regime while max5's is a frozen August calendar-week median, so their quotient carries
  // every limit change that has landed since. It read 2.39 against a true 1.78 -- the extra 1.43
  // being the 14 Sep -29% -- which put inferred Max 5x weeks at 15.7 windows against a measured
  // history that never left 9.5-11.0, and drew a 43% step at the plan boundary in both directions
  // at once. A plan move is not a limit move, and only the limit belongs in the data.
  const allDates = Array.from(new Set(out.flatMap((s) => s.points.map((p) => p.date)))).sort();
  for (const s of out) {
    const byDate = new Map(s.points.map((p) => [p.date, p]));
    for (const date of allDates) {
      if (byDate.has(date)) continue;
      const other = out.find((o) => o !== s && o.points.some((p) => p.date === date));
      if (!other) continue;
      const otherPoint = other.points.find((p) => p.date === date)!;
      const scale = scaleFrom(j, s.plan, other.plan);
      if (scale === null) continue;
      s.points.push({
        date,
        windows: otherPoint.windows * scale,
        partial: otherPoint.partial,
        inferred: true,
      });
    }
    s.points.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  }
  return out;
}

// Same series as weeklySeriesFor, with each point's tokens-per-week added: windows times the
// measured window in tokens for this model's family, scaled by the plan's ratio and the model's
// share of the week (audit finding 2, kept).
//
// The per-window figure is the one the page's hero states, `credits.window_tokens`, and there is
// no second route behind it: a family the block has no value for drops its series rather than
// falling back to `rates[model].tokens_per_window` or a `history` row, which price the window at
// API list price and come to 52 times this figure on Sonnet (wf-60).
export function weeklyTokenSeriesFor(j: UsageJson, model: string): WeeklySeries[] {
  const perWindow = windowTokensValueFor(j, model);
  if (perWindow === null) return [];
  const base = weeklySeriesFor(j);
  const withTokens = (s: WeeklySeries, plan: Plan, label: string): WeeklySeries[] => {
    const limit = modelPlanLimit(j, model, plan);
    if (!limit.included) return [];
    const scale = j.plan_ratios[plan] * limit.weekly_fraction;
    return [
      {
        ...s,
        plan,
        label,
        sharedWithPro: false,
        points: s.points.map((p) => ({ ...p, tokens: p.windows * perWindow * scale })),
      },
    ];
  };
  // Pro and Max 5x share one line on the windows chart because they are assumed to hold the
  // same number of windows per week. They do NOT share a tokens line: a window is worth five
  // times as much on Max 5x, so a collapsed series is expanded back into two here, each
  // priced with its own plan ratio.
  return base.flatMap((s) =>
    s.sharedWithPro
      ? [...withTokens(s, "max5", PLAN_LABELS.max5), ...withTokens(s, "pro", PLAN_LABELS.pro)]
      : withTokens(s, s.plan, s.label),
  );
}

// The same levels priced in tokens: each regime's windows times the measured window in tokens,
// on the plan's own token ratio and the model's share of the week (audit finding 2, kept). A
// family the block has no value for drops its levels rather than guessing, the same contract
// weeklyTokenSeriesFor keeps, and neither falls back to a rate or a history row (wf-60). Jonathan
// reversed audit finding 12 on 2026-09-16: one flat level per weekly regime, not a level cut at
// every daily window reading.
export function weeklyTokenRegimeLevelsFor(
  j: UsageJson,
  plan: Plan,
  model: string,
): (RegimeLevel & { tokens: number })[] {
  const limit = modelPlanLimit(j, model, plan);
  if (!limit.included) return [];
  const perWindow = windowTokensValueFor(j, model);
  if (perWindow === null) return [];
  const scale = j.plan_ratios[plan] * limit.weekly_fraction;
  return weeklyRegimeLevelsFor(j, plan).map((r) => ({ ...r, tokens: r.windows * perWindow * scale }));
}

// The window itself, held flat at the measured `credits.window_tokens` figure across the same
// regime dates the windows-per-week chart uses. There is no reading series for this figure --
// the block publishes one number, not a history -- so this is a flat line, not a stepped one:
// every level carries the same `tokens` value, on the plan's own ratio (the same scale
// `computeWindowTokens` gives `perWindow`, with no weekly-fraction split -- that split is a
// weekly-total concept, not a per-window one). A family the block has no value for, or a plan
// the model is not included on, drops the levels rather than falling back to a rate or a
// history row (wf-60).
export function windowTokenRegimeLevelsFor(
  j: UsageJson,
  plan: Plan,
  model: string,
): (RegimeLevel & { tokens: number })[] {
  const limit = modelPlanLimit(j, model, plan);
  if (!limit.included) return [];
  const perWindow = windowTokensValueFor(j, model);
  if (perWindow === null) return [];
  const scale = j.plan_ratios[plan];
  return weeklyRegimeLevelsFor(j, plan).map((r) => ({ ...r, tokens: perWindow * scale }));
}

export interface AccountOnset {
  account: string;
  onset: string;
  before: number;
  after: number;
  percent: number;
}

// What the weekly chart draws beneath a plan's levels, all of it measured on that plan: every
// per-window reading that has a ratio, the calendar-week pooled points, and each account's step
// onset. Empty arrays for JSON published before tracker wf-50, and for a plan with no readings of
// its own: another plan's readings are never scaled across to stand in for them.
export function weeklyReadingsFor(j: UsageJson, plan: Plan) {
  const w = j.weekly_windows?.[plan];
  const readings = (w?.by_window ?? []).filter(
    (r): r is WindowReading & { windows: number } => typeof r.windows === "number" && Number.isFinite(r.windows),
  );
  const weekly = (w?.weekly ?? []).filter((p) => typeof p.windows === "number" && Number.isFinite(p.windows));
  const onsets: AccountOnset[] = Object.entries(w?.by_account ?? {})
    .flatMap(([account, a]) => (a?.step?.onset ? [{ account, ...a.step }] : []))
    .sort((a, b) => Date.parse(a.onset) - Date.parse(b.onset));
  return { readings, weekly, onsets };
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

// ---------------------------------------------------------------------------
// The credits block
// ---------------------------------------------------------------------------
//
// The five-hour meter does not charge dollars. It charges an internal unit -- a credit -- at a
// small rational rate per token per model, and from 2026-09-20 the tracker publishes the whole
// measurement in that unit under `credits`. Everything here is optional: a file without the block
// renders the page exactly as it rendered before it existed.
//
// Every figure in the block is published the same way: a value, the spread of the readings behind
// it, and a status sentence saying why there is no value. A null value beside a status is not a
// missing figure -- it is one the tracker can bound but not identify -- so the page prints the
// sentence where the number would go and the interval as the range, never a dash and never a zero.

export interface CreditsFigure {
  value: number | null;
  // The cluster's own min to max: the spread of readings of the same quantity, not a confidence
  // interval. The publisher's own words; no error model is implied and none is drawn.
  interval?: (number | null)[] | null;
  status?: string | null;
}

// One watched account's own reading of the window. `n` is how many stretches survived the gate,
// and an account that contributed none still appears with n: 0 so its absence is visible.
export interface WindowCreditsAccount extends CreditsFigure {
  n: number;
}

export interface WindowCredits extends CreditsFigure {
  n?: number;
  // The model family every token in the cluster was priced at, so the figure carries no fitted
  // rate: "opus" today.
  pure_family?: string;
  credits_per_pct?: number;
  cache_read_weight?: number;
  accounts?: Record<string, WindowCreditsAccount>;
  method?: string;
}

export interface PerModelCredits {
  tokens_per_window: { input: CreditsFigure; output: CreditsFigure };
  api_value_per_window_usd: { input: CreditsFigure; output: CreditsFigure };
  credits_per_token: { input: number | null; output: number | null } | null;
  credits_per_token_interval?: { input?: (number | null)[] | null; output?: (number | null)[] | null } | null;
  status?: string | null;
  list_price_model?: string | null;
  interval_rule?: string | null;
  interval_source?: string | null;
  // Tracker PR #67: whether this family's row was priced at a rate measured on the watched
  // accounts or at the published reference table's figure, and that table's figure beside it.
  // The reference rate is drawn next to the measurement and is never an input to one.
  rate_source?: string | null;
  reference_rate?: { input: number | null; output: number | null } | null;
  reference_rate_note?: string | null;
  // The newest stretch this row's own figures rest on. Null where the row has no stretch to
  // date at all, in which case the page shows no date rather than the file's.
  as_of?: string | null;
  as_of_source?: string | null;
}

// One effort cell priced in credits (tracker PR #67): the median of the cell's own runs, and that
// median over the measured five-hour window. The only figures on the page that move with the
// effort selector, which is why they belong beside it and not in the hero.
export interface EffortCreditsCell {
  median_credits: CreditsFigure;
  percent_of_window: CreditsFigure;
  runs?: number;
  rate_source?: string | null;
  note?: string;
  derivation?: string;
}

// Sessions per window and per week, each publishing the cache mix it assumes: cache reads are
// free against the meter, so the same budget bought cold is worth far fewer tokens, and the
// figure means nothing without the split beside it.
export interface SessionCredits {
  per_window: CreditsFigure;
  per_week: CreditsFigure;
  cache_normalised?: boolean;
  split?: Partial<Record<TokenClass, number>>;
  split_source?: string;
  median_session_tokens?: number;
  windows_per_week?: number;
  status?: string | null;
  rate_source?: string | null;
}

// One effort cell's cache state: the share of its own run tokens that were cache reads, and how
// many of its runs ran cold. A cold run writes cache where a warm one reads it, which is why a
// model's low cell can read dearer than its medium one.
export interface EffortCacheCell {
  cache_read_share: number | null;
  runs: number;
  cold_cache_runs?: number;
  note?: string;
}

export interface AcrossCutAccount {
  before: number | null;
  after: number | null;
  change_pct: number | null;
  n_before: number;
  n_after: number;
  // 0 where the account has no usable capture column, so the meter movement includes work this
  // host never saw. The comparison of that account's own two sides is still its own.
  n_with_capture: number;
}

export interface AcrossCut {
  per_account: Record<string, AcrossCutAccount>;
  resolved: boolean;
  unresolved: string | null;
  spread_after_pct?: number | null;
  largest_move_pct?: number | null;
  cut_at?: string;
  unit?: string;
  method?: string;
  fable_rate_held?: { input?: number; output?: number; why?: string };
}

export interface WeeklyCrossSide {
  value: number | null;
  weekly_cap_multiplier: number;
  windows_per_week_measured: number;
  windows_per_week_rounding_interval?: (number | null)[] | null;
  announced_weekly_cap_credits: number;
  from?: string;
  to?: string;
}

// The same window anchored the other way: the announced weekly cap over this tracker's own
// measured windows per week. It shares no input with the pure-family cluster, which is the only
// reason it is worth publishing beside it -- hence `kind: "cross_check"`.
export interface WindowCreditsFromWeekly {
  before: WeeklyCrossSide;
  after: WeeklyCrossSide;
  weekly_cap_baseline_credits: number;
  weekly_cap_baseline_source: { as_of: string; url: string };
  kind?: string;
  method?: string;
  status?: string | null;
}

export interface FableInterval {
  input_low: number | null;
  input_high: number | null;
  status: string | null;
  window_credits_per_pct?: number;
  times_opus?: (number | null)[];
  output_ratio?: number[];
  unresolved?: string | null;
}

export interface HarnessRunExcluded {
  account_label: string;
  start: string;
  end: string;
  reason: string;
}

// The window measured in tokens, published under `credits.window_tokens` from 2026-09-20
// (tracker wf-59): tokens per 1% of the five-hour meter over the clean pure-Opus stretches, times
// 100, per token class. No rate and no class weight enters it, which is what separates it from a
// token figure derived by dividing the window's credits by a family's credits per token.
export interface WindowTokensAccount {
  n: number;
  all: CreditsFigure | null;
  per_class?: Partial<Record<TokenClass, CreditsFigure>> | null;
}

// One family's window. The family the stretches were pure in carries the measurement itself;
// every other family is that same window converted at its own rate, and publishes the conversion
// it rests on. A family whose rate is not identified publishes a status and no value.
export interface WindowTokensFamily {
  all: CreditsFigure;
  rate_source?: string | null;
  conversion?: string | null;
}

export interface WindowTokensPerWeek {
  // The windows per week the per-week figures below were multiplied by, published with them so a
  // plan whose own count differs is scaled rather than shown another plan's week.
  windows_per_week?: CreditsFigure & { source?: string | null };
  all?: CreditsFigure;
  per_family?: Record<string, { all: CreditsFigure }>;
}

export interface WindowTokens {
  derivation?: string;
  as_of?: string | null;
  method?: string;
  selection?: string;
  n?: number;
  accounts?: Record<string, WindowTokensAccount>;
  per_class?: Partial<Record<TokenClass, CreditsFigure>> | null;
  all: CreditsFigure;
  cache_read_share?: CreditsFigure;
  per_family?: Record<string, WindowTokensFamily>;
  per_week?: WindowTokensPerWeek;
}

export interface CreditsBlock {
  // Tracker PR #68: the newest stretch every figure in the block rests on. The block's figures
  // are measured, so they carry their own date rather than the file's build time.
  as_of?: string | null;
  as_of_source?: Record<string, string | null>;
  window_credits: WindowCredits;
  window_tokens?: WindowTokens;
  window_credits_from_weekly?: WindowCreditsFromWeekly;
  per_model?: Record<string, PerModelCredits>;
  sessions?: Record<string, SessionCredits>;
  effort_cache_mix?: Record<string, Partial<Record<Effort, EffortCacheCell>>>;
  effort_credits?: Record<string, Partial<Record<Effort, EffortCreditsCell>>>;
  five_hour_window_across_cut?: AcrossCut;
  fable_interval?: FableInterval;
  harness_runs_excluded?: HarnessRunExcluded[];
  derivation?: string;
}

// One announced change since the reference table was written, each with the sentence it was read
// from. `date_known` false means the announcement carried no date, only a span.
export interface ReferenceChange {
  date: string | null;
  date_known?: boolean;
  from?: string;
  until?: string;
  multiplier?: number;
  scope?: string;
  summary?: string;
  quote?: string;
  source?: string;
}

// One plan's row of the shortfall table: what this tracker measured, what the reference table
// lists, and what that table predicts once the announced changes since it are applied. A plan the
// tracker has never measured publishes a `status` sentence and nulls, and the page prints the
// sentence in place of the row's numbers.
export interface ShortfallPlan {
  measured_windows_per_week: number | null;
  documented_windows_per_week: number | null;
  ratio: number | null;
  expected_windows_per_week: number | null;
  ratio_to_expected: number | null;
  from: string | null;
  to: string | null;
  status?: string | null;
}

// Why the measured windows per week sit below the reference table's, published as a comparison
// with its own status: "explained" once the announced changes account for the gap, "open" while
// they do not. Never an input to a figure on this page.
export interface ReferenceShortfall {
  per_plan?: Partial<Record<Plan, ShortfallPlan>>;
  multipliers_applied?: { five_hour_window?: number | null; weekly?: number | null };
  explanation?: string;
  status?: string;
  cut_at?: string;
  what?: string;
  source?: string;
  plans_measured?: Plan[];
  ratio_range?: (number | null)[];
}

export interface ReferenceBlock {
  as_of?: string;
  url?: string;
  name?: string;
  dated?: boolean;
  describes?: string;
  note?: string;
  changes_since?: ReferenceChange[];
  shortfall?: ReferenceShortfall;
}

export function creditsOf(j: UsageJson): CreditsBlock | null {
  return j.credits ?? null;
}

// The reference table's own comparison against the measured levels, in plan order. Empty for a
// file published before the block existed, so the section it draws simply does not appear.
export function shortfallRows(j: UsageJson): { plan: Plan; row: ShortfallPlan }[] {
  const per = j.reference?.shortfall?.per_plan;
  if (!per) return [];
  return (["pro", "max5", "max20"] as Plan[]).flatMap((plan) => (per[plan] ? [{ plan, row: per[plan]! }] : []));
}

// `per_model` is keyed by family, not by model id: the meter's rates are per family and "Opus of
// any version" is one rate. Null for a model id no family can be read from, which is how a model
// the block does not price is skipped rather than mispriced.
export function modelFamily(model: string): string | null {
  return /^claude-(opus|sonnet|haiku|fable)\b/.exec(model)?.[1] ?? null;
}

export function fmtCredits(n: number): string {
  return Math.round(n).toLocaleString("en-US");
}

// A share published as a fraction, shown as a percentage: 0.9702 -> "97.0%". A share small
// enough to round to nothing at one place gets a second, so a class the meter does charge for
// never prints as 0.0%.
export function fmtShare(v: number): string {
  const pct = v * 100;
  return `${pct.toFixed(pct !== 0 && Math.abs(pct) < 0.1 ? 2 : 1)}%`;
}

function rangeText(iv: (number | null)[] | null | undefined, fmt: (n: number) => string, scale: number): string | null {
  if (!iv || typeof iv[0] !== "number" || typeof iv[1] !== "number") return null;
  return `${fmt(iv[0] * scale)} to ${fmt(iv[1] * scale)}`;
}

export interface CreditFigureText {
  // "status" means the tracker published a sentence instead of a value. The caller prints the
  // sentence where the number would go; it must never print the value slot as a number.
  kind: "value" | "status";
  text: string;
  range: string | null;
}

// One published figure turned into the text the page shows. `scale` is the plan ratio the rest of
// the page already applies to a five-hour window, so a figure measured on Max 20x is never shown
// unchanged under another plan's heading.
export function creditFigure(
  f: CreditsFigure | null | undefined,
  fmt: (n: number) => string,
  scale = 1,
): CreditFigureText | null {
  if (!f) return null;
  const range = rangeText(f.interval, fmt, scale);
  if (typeof f.value === "number" && Number.isFinite(f.value)) return { kind: "value", text: fmt(f.value * scale), range };
  if (typeof f.status === "string" && f.status) return { kind: "status", text: f.status, range };
  return null;
}

// How many watched accounts the window figure rests on: the ones that contributed a reading.
export function windowCreditAccounts(wc: WindowCredits | null | undefined): number | null {
  const accounts = wc?.accounts;
  if (!accounts) return null;
  return Object.values(accounts).filter((a) => (a?.n ?? 0) > 0).length;
}

// The watched accounts that contributed nothing to the cluster, by label. The page counts the
// accounts the figure rests on a few lines above the count of accounts the weekly figure rests
// on; without this the two counts read as a contradiction rather than as what they are.
export function windowCreditAccountsWithoutStretch(wc: WindowCredits | null | undefined): string[] {
  return Object.entries(wc?.accounts ?? {})
    .filter(([, a]) => (a?.n ?? 0) === 0)
    .map(([label]) => label)
    .sort();
}

// The cache-read share the account's own mix carries, for the charts that plot raw tokens at that
// mix rather than the credits route's priced figure. The credits block's own split first, since
// that is the split its sessions figures are normalised at.
export function cacheReadShareFor(j: UsageJson, model: string): number | null {
  const fromCredits = creditsOf(j)?.sessions?.[model]?.split?.cache_read;
  if (typeof fromCredits === "number") return fromCredits;
  const fromRate = j.rates[model]?.split?.cache_read;
  return typeof fromRate === "number" ? fromRate : null;
}

// How many runs each effort cell was measured over, distinct and ascending, so the caveat can
// name the run count instead of repeating a number typed into the page.
export function effortRunCounts(mix: Record<string, Partial<Record<Effort, EffortCacheCell>>> | null | undefined): number[] {
  const counts = new Set<number>();
  for (const byEffort of Object.values(mix ?? {})) {
    for (const cell of Object.values(byEffort ?? {})) {
      if (typeof cell?.runs === "number") counts.add(cell.runs);
    }
  }
  return [...counts].sort((a, b) => a - b);
}

// The sentence in a block's `method` that describes an empty capture column, so the page says it
// in the publisher's words rather than paraphrasing a measurement caveat into something weaker.
export function captureEmptyNote(method: string | null | undefined): string | null {
  if (!method) return null;
  const sentence = method.split(". ").find((s) => s.includes("n_with_capture"));
  return sentence ? sentence.replace(/[.;]\s*$/, "") : null;
}

// Every figure the page reads off the credits block, on the selected plan's scale and for the
// selected model. Mirrors compute(): a model the plan does not include has no capacity to scale,
// and a per-week figure carries the model's share of the week on top of the plan ratio.
//
// One quantity, one figure. The hero, the chart headlines and the plan table all read tokens per
// window, tokens per week, sessions per window and sessions per week from here whenever the block
// is published, so the page cannot state the same quantity twice at two scales (wf-57 finding 1).
// `effort` is optional and reaches only `effortCredits`: nothing else here moves with it, which
// is the whole reason the hero no longer says "at high effort" over these figures (finding 2).
export function computeCredits(j: UsageJson, plan: Plan, model: string, effort?: Effort) {
  const credits = creditsOf(j);
  if (!credits) return null;
  const limit = modelPlanLimit(j, model, plan);
  const ratio = j.plan_ratios[plan];
  const scale = limit.included ? ratio : 0;
  const family = modelFamily(model);
  const per = family ? credits.per_model?.[family] ?? null : null;
  const session = credits.sessions?.[model] ?? null;
  const wc = credits.window_credits;
  const fig = (f: CreditsFigure | undefined, fmt: (n: number) => string, s = scale) =>
    limit.included ? creditFigure(f, fmt, s) : null;
  // Tokens per week is the published per-window figure times the plan's own measured windows per
  // week, the same figure the page states in words a line below it, with the model's share of the
  // week on top. The block publishes no tokens-per-week of its own.
  const week = planWindowsPerWeek(j, plan);
  const weekScale = week.value === null ? null : scale * week.value * limit.weekly_fraction;
  // plan_ratios is a ratio between two five-hour WINDOWS. A week holds a different number of
  // windows on each plan (the credits table's own per-week ratios say so: 1 : 8.33 : 16.67, not
  // 1 : 6 : 20), so a published per-week figure carries the measured plan's window count and
  // needs the selected plan's in its place. On the measured plan the two are the same figure and
  // this factor is 1, so the published number renders unchanged.
  const publishedWindowsPerWeek = session?.windows_per_week;
  const weekRatio =
    week.value !== null && typeof publishedWindowsPerWeek === "number" && publishedWindowsPerWeek > 0
      ? week.value / publishedWindowsPerWeek
      : 1;
  const perWeek = (f: CreditsFigure | undefined, fmt: (n: number) => string) =>
    weekScale === null ? null : fig(f, fmt, weekScale);
  const count = (n: number) => Math.round(n).toLocaleString("en-US");
  const cell = effort ? credits.effort_credits?.[model]?.[effort] ?? null : null;
  return {
    included: limit.included,
    family,
    // No token figure here. `per_model[family].tokens_per_window` is the window's credits over
    // that family's credits per token -- the whole window spent on nothing but fresh input, or
    // nothing but output, and on Sonnet it carries the fitted rate's 0.33-to-0.83 interval with
    // it. The page states the measured window instead; see computeWindowTokens (wf-60).
    usdIn: fig(per?.api_value_per_window_usd?.input, fmtUsd2),
    usdOut: fig(per?.api_value_per_window_usd?.output, fmtUsd2),
    // The same window's API value a week of windows holds. The dollar route publishes its own
    // per-window figure ($144.05 against the credits block's $75.49 on the same file), so the
    // table takes this from the block too rather than putting the two side by side.
    usdInPerWeek: perWeek(per?.api_value_per_window_usd?.input, fmtUsd),
    windowCredits: fig(wc, fmtCredits),
    windowCreditsN: typeof wc?.n === "number" ? wc.n : null,
    pureFamily: wc?.pure_family ?? null,
    accountCount: windowCreditAccounts(wc),
    accountsWithoutStretch: windowCreditAccountsWithoutStretch(wc),
    // What the credits block itself says about the figures above, rather than another block's
    // date (finding 5): how the window was measured, and what this family's row was priced at.
    windowCreditsMethod: wc?.method ?? null,
    rateSource: per?.rate_source ?? null,
    creditsAsOf: credits.as_of ?? null,
    familyAsOf: per?.as_of ?? null,
    creditsPerTokenIn: per?.credits_per_token?.input ?? null,
    creditsPerTokenInInterval: per?.credits_per_token_interval?.input ?? null,
    referenceRateIn: per?.reference_rate?.input ?? null,
    sessionsPerWindow: fig(session?.per_window, count),
    // The published per-week figure already carries the measured windows per week; the model's
    // own share of that week (Fable's half on Max) is the page's rule and applies on top.
    sessionsPerWeek: fig(session?.per_week, count, scale * limit.weekly_fraction * weekRatio),
    split: session?.split ?? null,
    splitSource: session?.split_source ?? null,
    medianSessionTokens: session?.median_session_tokens ?? null,
    cacheNormalised: session?.cache_normalised === true,
    planWindowsPerWeek: week.value,
    weeklyInferred: week.value !== null && week.inferred,
    // The effort cell, on the selected plan's window: a task costs the same credits whatever the
    // plan, but it is a twentieth of a Max 20x window and a whole Pro one, so the share scales
    // the other way from every other figure here.
    effortCredits:
      cell && limit.included && ratio > 0
        ? {
            credits: creditFigure(cell.median_credits, fmtCredits),
            percentOfWindow: creditFigure(cell.percent_of_window, (n) => `${n.toFixed(2)}%`, 1 / ratio),
            runs: typeof cell.runs === "number" ? cell.runs : null,
            rateSource: cell.rate_source ?? null,
          }
        : null,
    modelStatus: per?.status ?? null,
  };
}

// The measured window in tokens for one model, on the measured plan's own scale: the family's
// own published figure and nothing else. Null where the block is absent, where the model belongs
// to no family the block prices, or where that family's value is a status rather than a number --
// in which case the caller drops the series rather than falling back to a rate or a history row.
export function windowTokensValueFor(j: UsageJson, model: string): number | null {
  const family = modelFamily(model);
  const value = family ? creditsOf(j)?.window_tokens?.per_family?.[family]?.all?.value : null;
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

// The breakdown's own order: what the meter mostly sees first, the tokens it charges most for
// last. The share beside cache reads is published, so the line never divides one figure by another.
const WINDOW_TOKEN_CLASSES: TokenClass[] = ["cache_read", "cache_write", "output", "input"];

export interface WindowTokensView {
  included: boolean;
  family: string | null;
  // The family the classes were measured on, as the block itself names it. The breakdown is shown
  // for that family alone: converted at another family's rate it would state a measurement the
  // stretches do not carry.
  measuredFamily: string | null;
  perWindow: CreditFigureText | null;
  perWindowValue: number | null;
  perWeek: CreditFigureText | null;
  perWeekValue: number | null;
  perClass: { cls: TokenClass; fig: CreditFigureText }[];
  cacheReadShare: number | null;
  conversion: string | null;
  rateSource: string | null;
  method: string | null;
  asOf: string | null;
  windowsPerWeek: number | null;
  // True when the plan's own windows per week is inferred from another plan, so the per-week
  // figure above rests on that plan's measurement. The table marks those cells, as it does the
  // credits route's.
  weeklyInferred: boolean;
  n: number | null;
}

// Every figure the page reads off `credits.window_tokens`, on the selected plan's scale and for
// the selected model. Null for a file that does not publish the block, which is the one case the
// page states in words: there is no second route to fall back to, by design.
export function computeWindowTokens(j: UsageJson, plan: Plan, model: string): WindowTokensView | null {
  const credits = creditsOf(j);
  const wt = credits?.window_tokens;
  if (!wt) return null;
  const limit = modelPlanLimit(j, model, plan);
  const ratio = j.plan_ratios[plan];
  const scale = limit.included ? ratio : 0;
  const family = modelFamily(model);
  const fam = family ? wt.per_family?.[family] ?? null : null;
  // A published sentence stands in the number's place and is the whole figure: no interval is
  // drawn beside it, so an unmeasured family is never quoted as a range the page did not measure.
  const fig = (f: CreditsFigure | undefined | null, s = scale): CreditFigureText | null => {
    if (!limit.included) return null;
    const text = creditFigure(f, fmtTokens, s);
    return text && text.kind === "status" ? { ...text, range: null } : text;
  };
  const value = (f: CreditsFigure | undefined | null, s = scale): number | null =>
    limit.included && typeof f?.value === "number" && Number.isFinite(f.value) ? f.value * s : null;
  // A week of windows on the selected plan. The block publishes its per-week figures over the
  // windows per week it names, so a plan whose own count differs is scaled to its own, the same
  // way the sessions-per-week figure is.
  const week = planWindowsPerWeek(j, plan);
  const published = wt.per_week?.windows_per_week?.value;
  const weekRatio =
    week.value !== null && typeof published === "number" && published > 0 ? week.value / published : 1;
  const weekScale = week.value === null ? null : scale * limit.weekly_fraction * weekRatio;
  const perWeekFigure = family ? wt.per_week?.per_family?.[family]?.all : undefined;
  const measuredFamily = credits?.window_credits?.pure_family ?? null;
  const perClass =
    family !== null && family === measuredFamily
      ? WINDOW_TOKEN_CLASSES.flatMap((cls) => {
          const text = fig(wt.per_class?.[cls]);
          return text ? [{ cls, fig: text }] : [];
        })
      : [];
  return {
    included: limit.included,
    family,
    measuredFamily,
    perWindow: fig(fam?.all),
    perWindowValue: value(fam?.all),
    perWeek: weekScale === null ? null : fig(perWeekFigure, weekScale),
    perWeekValue: weekScale === null ? null : value(perWeekFigure, weekScale),
    perClass,
    cacheReadShare:
      typeof wt.cache_read_share?.value === "number" ? wt.cache_read_share.value : null,
    // The conversion is what the family's own figure rests on, so it is stated only where there
    // is a figure: beside a status it would explain an unmeasured number the page does not show.
    conversion: typeof fam?.all?.value === "number" ? fam.conversion ?? null : null,
    rateSource: fam?.rate_source ?? null,
    method: wt.method ?? null,
    asOf: wt.as_of ?? null,
    windowsPerWeek: typeof published === "number" ? published : null,
    weeklyInferred: week.value !== null && week.inferred,
    n: typeof wt.n === "number" ? wt.n : null,
  };
}

// The lines under the headline once the change is published as a ratio: what the ratio was either
// side with the rounding interval each side was measured to, Anthropic's own figure for the same
// change, and -- when the tracker cannot say which meter moved -- that it cannot.
export function changeLines(j: UsageJson): string[] {
  const c = j.last_change;
  const credits = creditsOf(j);
  if (!c || !credits) return [];
  const out: string[] = [];
  const cross = credits.window_credits_from_weekly;
  const side = (s: WeeklyCrossSide | undefined, iv: (number | null)[] | null | undefined, when: string) => {
    if (!s || typeof s.windows_per_week_measured !== "number") return null;
    const range = rangeText(iv, (n) => n.toFixed(1), 1);
    return `${s.windows_per_week_measured.toFixed(1)}${range ? ` (${range})` : ""} ${when}`;
  };
  const before = side(cross?.before, c.rounding_interval_before, "before");
  const after = side(cross?.after, c.rounding_interval_after, "after");
  if (before && after) out.push(`Five-hour windows per week: ${before}, ${after}.`);
  const a = c.announced;
  if (a && typeof a.announced_change_pct === "number" && a.date) {
    out.push(`Anthropic announced ${a.announced_change_pct}% on ${fmtDate(a.date)}${a.quote ? `: “${a.quote}”` : ""}.`);
  }
  if (c.meter_attribution === "unresolved") out.push("Which meter moved is unresolved.");
  return out;
}
