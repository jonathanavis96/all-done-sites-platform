export type Plan = "pro" | "max5" | "max20";
export type Effort = "low" | "medium" | "high" | "xhigh" | "max";
export type TokenClass = "input" | "output" | "cache_read" | "cache_write";
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
  plan_measured: Plan;
  plan_ratios: Record<Plan, number>;
  rates: Record<
    string,
    {
      tokens_per_window: number;
      // Dollars of API value one full Max 20x window buys, held at the current regime's
      // level like tokens_per_window; the same for every model. Older JSON omits it.
      api_value_per_window?: number;
      source: string;
      probe_effort: string;
      split: Record<TokenClass, number>;
    }
  >;
  effort: Record<string, Record<Effort, number>>;
  api_price_per_mtok: Record<string, Record<TokenClass, number>>;
  history: Record<
    string,
    { date: string; tokens_per_window: number; api_value_per_window?: number; source: string; interpolated: boolean }[]
  >;
  last_change: { date: string; direction: "increased" | "decreased"; percent: number; model: string; scope?: EventScope } | null;
  events?: UsageEvent[];
  // Median total tokens of one real session, per model. Optional: older JSON and models not
  // yet calibrated omit it, in which case sessionsPerWindow/sessionsPerWeek come back null.
  session_tokens?: Record<string, number>;
  // How many 5-hour windows a real account's seven-day limit actually holds, measured (never
  // assumed) from live usage, keyed by plan since the ratio differs per plan. Optional until
  // the daily job populates a plan; a plan entry of null (e.g. "pro", not yet measured) means
  // every per-week figure the page derives from a window figure for that plan comes back null
  // rather than guessing at a windows-per-week ratio.
  weekly_windows?: Record<
    Plan,
    { current: number; history: { week_ending: string; windows: number; five_hour_pct: number; seven_day_pct: number }[] } | null
  >;
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
  const tasksPerWindow = tokensPerWindow / perTask;
  const prices = j.api_price_per_mtok[model];
  // The publisher's dollar figure is the measured invariant the tokens figure is derived
  // from, so it is the one shown; list-price arithmetic over the split is only a fallback
  // for JSON published before the figure existed.
  const apiValueUsd =
    typeof rate.api_value_per_window === "number"
      ? rate.api_value_per_window * j.plan_ratios[plan]
      : CLASSES.reduce((s, c) => s + (split[c] / 1e6) * (prices?.[c] ?? 0), 0);
  // Sessions per window: tokensPerWindow divided by one real session's token cost, scaled from
  // its medium-effort baseline to the selected effort. Null (not a wrong number) whenever the
  // session_tokens calibration for this model hasn't landed yet.
  const sessionBase = j.session_tokens?.[model];
  const mediumEffort = j.effort[model]?.medium;
  const sessionsPerWindow =
    typeof sessionBase === "number" && typeof mediumEffort === "number" && mediumEffort > 0 && !Number.isNaN(perTask)
      ? tokensPerWindow / (sessionBase * (perTask / mediumEffort))
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

export function fmtUsd(n: number): string {
  return "$" + Math.round(n).toLocaleString("en-US");
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
    return { text: `Anthropic last ${c.direction} Claude's weekly limit by ${c.percent}% in the week ending ${fmtDate(c.date)}.`, tone };
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
