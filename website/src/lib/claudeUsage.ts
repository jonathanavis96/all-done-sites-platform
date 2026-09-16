export type Plan = "pro" | "max5" | "max20";
export type Effort = "low" | "medium" | "high" | "xhigh" | "max";
export type TokenClass = "input" | "output" | "cache_read" | "cache_write";

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
}

export interface UsageJson {
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
      tokens_per_window: number;
      // Dollars of API value one full Max 20x window buys, held at the current regime's
      // level like tokens_per_window; the same for every model. Older JSON omits it.
      api_value_per_window?: number;
      source: string;
      // ISO timestamp of this model's latest probe, when it has one of its own. Null/absent for
      // a model whose figures are derived from another model's probe rather than probed directly.
      probed_at?: string | null;
      probe_effort: string;
      split: Record<TokenClass, number>;
    }
  >;
  effort: Record<string, Record<Effort, number>>;
  // Meter dollars one calibration task costs at each effort level. Optional: older JSON omits
  // it. This is the effort series to scale by, not `effort` above -- see compute().
  effort_usd?: Record<string, Record<Effort, number>>;
  api_price_per_mtok: Record<string, ApiPrice>;
  history: Record<
    string,
    { date: string; tokens_per_window: number; api_value_per_window?: number; source: string; interpolated: boolean }[]
  >;
  last_change: { date: string; direction: "increased" | "decreased"; percent: number; model: string; scope?: EventScope } | null;
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
        current: number;
        history: {
          week_ending: string;
          windows: number;
          five_hour_pct: number;
          seven_day_pct: number;
          // True when this week is still in progress. Optional: older JSON omits it, in which
          // case it's inferred from week_ending falling after the last sample date.
          partial?: boolean;
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
        }[];
      }
    | null
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
}

// Every regime level on one plan's scale, oldest first, gaps included.
//
// A plan's own regimes are used where it has them. Everywhere else the other plans' regimes
// are scaled across by `weekly_window_ratios` and flagged inferred, which is how Max 20x gets
// a level for the months before the account moved onto it and Max 5x keeps one for the months
// after. Overlaps resolve in favour of the measured level.
export function weeklyRegimeLevelsFor(j: UsageJson, plan: Plan): RegimeLevel[] {
  const ratioOf = (p: Plan): number | null => {
    const r = j.weekly_window_ratios?.[p];
    return typeof r === "number" && r ? r : null;
  };
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
      out.push({ start: r.start, end: r.end, windows: r.windows * scale, inferred: !isOwn, plan: source });
    }
  }
  // A measured level wins any overlap: drop an inferred level whose span a measured one covers.
  const measured = out.filter((r) => !r.inferred);
  const kept = out.filter(
    (r) => !r.inferred || !measured.some((m) => m.start <= r.end && r.start <= m.end),
  );
  // Pro publishes Max 5x's regimes verbatim, so scaling both onto a third plan yields the same
  // level twice. Dedupe on the span and the level, keeping whichever arrived first.
  const seen = new Set<string>();
  const unique = kept.filter((r) => {
    const key = `${r.start}|${r.end}|${r.windows.toFixed(4)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return unique.sort((a, b) => (a.start < b.start ? -1 : a.start > b.start ? 1 : 0));
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

export function compute(j: UsageJson, plan: Plan, model: string, effort: Effort) {
  const rate = j.rates[model];
  if (!rate) return null; // no probe data for this model yet: the page shows its unavailable state
  const tokensPerWindow = rate.tokens_per_window * j.plan_ratios[plan];
  const split = Object.fromEntries(CLASSES.map((c) => [c, tokensPerWindow * (rate.split?.[c] ?? 0)])) as Record<TokenClass, number>;
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
  // The publisher's dollar figure is the measured invariant the tokens figure is derived
  // from, so it is the one shown; list-price arithmetic over the split is only a fallback
  // for JSON published before the figure existed.
  const apiValueUsd =
    typeof rate.api_value_per_window === "number"
      ? rate.api_value_per_window * j.plan_ratios[plan]
      : CLASSES.reduce((s, c) => s + (split[c] / 1e6) * (prices?.[c] ?? 0), 0);
  const tasksPerWindow =
    typeof perTaskUsd === "number" && perTaskUsd > 0 ? apiValueUsd / perTaskUsd : tokensPerWindow / perTask;
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
      : typeof mediumEffort === "number" && mediumEffort > 0 && !Number.isNaN(perTask)
        ? perTask / mediumEffort
        : null;
  const sessionsPerWindow =
    typeof sessionBase === "number" && effortScale !== null && effortScale > 0
      ? tokensPerWindow / (sessionBase * effortScale)
      : null;
  // Windows per week is a measured figure, not the theoretical 28 (5-hour windows fit in a
  // week); the seven-day limit holds far fewer. Null until the daily job has measured it, in
  // which case every per-week figure below is null rather than guessed.
  const windowsPerWeek = j.weekly_windows?.[plan]?.current ?? null;
  const sessionsPerWeek =
    sessionsPerWindow === null || windowsPerWeek === null ? null : sessionsPerWindow * windowsPerWeek;
  const tasksPerWeek = windowsPerWeek === null ? null : tasksPerWindow * windowsPerWeek;
  const apiValueUsdPerWeek = windowsPerWeek === null ? null : apiValueUsd * windowsPerWeek;
  return {
    tokensPerWindow,
    split,
    tasksPerWindow,
    tasksPerWeek,
    sessionsPerWindow,
    sessionsPerWeek,
    apiValueUsd,
    apiValueUsdPerWeek,
    windowsPerWeek,
  };
}

// Short label for a model's rate source: "passive, 15 Sep" dated by the passive reading
// itself (measured_at), "probe, 8 Sep" by the model's own probe, or plain "probe"/"derived"
// when no date is available. A passive figure must never carry a probe's date.
export function fmtSource(
  rate: { source: string; probed_at?: string | null; measured_at?: string | null } | undefined,
): string | null {
  if (!rate) return null;
  const at = rate.source === "passive" ? rate.measured_at : rate.probed_at;
  if (at) {
    const d = new Date(at);
    return `${rate.source}, ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
  }
  return rate.source;
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
    if (!first) return { text: "Anthropic hasn't changed Claude's limits since we started measuring.", tone: "flat" };
    return { text: `Anthropic hasn't changed Claude's limits since ${fmtDate(first)}.`, tone: "flat" };
  }
  const tone = c.direction === "increased" ? "up" : "down";
  if (c.scope === "weekly") {
    return { text: `Anthropic last ${c.direction} Claude's weekly limit by ${c.percent}% on ${fmtDate(c.date)}.`, tone };
  }
  return { text: `Anthropic last ${c.direction} Claude's limits by ${c.percent}% on ${fmtDate(c.date)}.`, tone };
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
      inferred: false,
    }));
    byPlan.set(p, { assumed: !!w.assumed, points });
  }
  const pro = byPlan.get("pro");
  const max5 = byPlan.get("max5");
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
  // The scale factor is the published `weekly_window_ratios`, a frozen measurement of how many
  // windows a week holds on each plan. It must NOT be the quotient of the two plans' `current`
  // fields, which is what this did until issue #54: max20's current tracks the newest regime
  // while max5's is a frozen August calendar-week median, so their quotient carries every limit
  // change that has landed since. It read 2.39 against a true 1.78 -- the extra 1.43 being the
  // 14 Sep -29% -- which put inferred Max 5x weeks at 15.7 windows against a measured history
  // that never left 9.5-11.0, and drew a 43% step at the plan boundary in both directions at
  // once. A plan move is not a limit move, and only the limit belongs in the data.
  const allDates = Array.from(new Set(out.flatMap((s) => s.points.map((p) => p.date)))).sort();
  const scaleFrom = (own: Plan, other: Plan): number | null => {
    const ownRatio = j.weekly_window_ratios?.[own];
    const otherRatio = j.weekly_window_ratios?.[other];
    if (typeof ownRatio === "number" && typeof otherRatio === "number" && otherRatio) {
      return ownRatio / otherRatio;
    }
    // JSON published before weekly_window_ratios existed: the old drifting quotient, kept so an
    // archived file still renders rather than losing its dashed spans entirely.
    const ownCurrent = j.weekly_windows?.[own]?.current ?? null;
    const otherCurrent = j.weekly_windows?.[other]?.current ?? null;
    if (typeof ownCurrent !== "number" || !ownCurrent) return null;
    if (typeof otherCurrent !== "number" || !otherCurrent) return null;
    return ownCurrent / otherCurrent;
  };
  for (const s of out) {
    const byDate = new Map(s.points.map((p) => [p.date, p]));
    for (const date of allDates) {
      if (byDate.has(date)) continue;
      const other = out.find((o) => o !== s && o.points.some((p) => p.date === date));
      if (!other) continue;
      const otherPoint = other.points.find((p) => p.date === date)!;
      const scale = scaleFrom(s.plan, other.plan);
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
      const entry = atOrBefore.length > 0 ? atOrBefore[atOrBefore.length - 1] : sorted[0];
      return entry.tokens_per_window;
    }
    if (rate) return rate.tokens_per_window;
    return undefined;
  };
  const withTokens = (s: WeeklySeries, plan: Plan, label: string): WeeklySeries => {
    const planRatio = j.plan_ratios[plan];
    return {
      ...s,
      plan,
      label,
      sharedWithPro: false,
      points: s.points.map((p) => {
        const perWindow = tokensPerWindowAt(p.date);
        return { ...p, tokens: typeof perWindow === "number" ? p.windows * perWindow * planRatio : undefined };
      }),
    };
  };
  // Pro and Max 5x share one line on the windows chart because they are assumed to hold the
  // same number of windows per week. They do NOT share a tokens line: a window is worth five
  // times as much on Max 5x, so a collapsed series is expanded back into two here, each
  // priced with its own plan ratio.
  return base.flatMap((s) =>
    s.sharedWithPro
      ? [withTokens(s, "max5", PLAN_LABELS.max5), withTokens(s, "pro", PLAN_LABELS.pro)]
      : [withTokens(s, s.plan, s.label)],
  );
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
  const rate = j.rates[model];
  const planRatio = j.plan_ratios[plan];
  const perWindowAt = (iso: string): number | undefined => {
    const d = iso.slice(0, 10);
    if (hist.length > 0) {
      const atOrBefore = hist.filter((h) => h.date <= d);
      return (atOrBefore.length > 0 ? atOrBefore[atOrBefore.length - 1] : hist[0]).tokens_per_window;
    }
    return rate ? rate.tokens_per_window : undefined;
  };
  const out: (RegimeLevel & { tokens: number })[] = [];
  for (const r of weeklyRegimeLevelsFor(j, plan)) {
    const perWindow = perWindowAt(r.start);
    if (typeof perWindow !== "number") continue;
    out.push({ ...r, tokens: r.windows * perWindow * planRatio });
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
