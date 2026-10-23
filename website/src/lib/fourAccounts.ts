// The four-account detector's block (`four_accounts`, tracker four_accounts_page.public_block):
// each Max account's own readings on the two searched lines, indexed to what that account gets
// now, the shared step all of them took, and every change the rule found. The page draws it as
// one chart of two panels on one time axis; everything the chart needs is shaped here so it can
// be tested without rendering.

// One account-day: [UTC day, the day's level, meter points, the level pooled over seven days].
// A day a change splits appears twice, one row per side, in time order.
export type FourAccountRow = [string, number, number, number];

export type FourAccountLine = "seven_day" | "ratio" | "five_hour";

export interface FourAccountSize {
  change_pct?: number | null;
  interval_pct?: [number, number] | null;
  excludes_no_change?: boolean;
  agree?: boolean;
  accounts?: string[];
}

export interface FourAccountChange {
  at: string;
  found_on: FourAccountLine;
  state: "measured" | "provisional" | string;
  change_pct?: number | null;
  interval_pct?: [number, number] | null;
  instant_range?: [string, string] | null;
  accounts?: string[];
  sizes?: Partial<Record<FourAccountLine, FourAccountSize>>;
  held_days?: number | null;
  p?: number | null;
}

export interface FourAccountLevel {
  from: string | null;
  to: string | null;
  index: number;
  opened_by: string | null;
}

export interface FourAccountsBlock {
  schema?: number;
  day?: string;
  data_until?: string;
  accounts?: string[];
  lines_searched?: FourAccountLine[];
  line_columns?: string[];
  lines?: Partial<Record<FourAccountLine, Record<string, FourAccountRow[]>>>;
  levels?: Partial<Record<FourAccountLine, FourAccountLevel[]>>;
  changes?: FourAccountChange[];
  [k: string]: unknown;
}

// The two lines the rule searches, in the order the chart stacks them, and each panel's title.
export const FOUR_ACCOUNT_PANELS: { line: "seven_day" | "ratio"; title: string }[] = [
  { line: "seven_day", title: "Seven-day meter: credits per 1%" },
  { line: "ratio", title: "Five-hour points per seven-day point" },
];

const DAY_MS = 86400e3;
// Two readings further apart than this are not joined: the account had no reading in between.
const JOIN_GAP_DAYS = 3;

export const dayMs = (day: string) => Date.parse(`${day}T12:00:00Z`);
const stamp = (iso: string) => Date.parse(iso.length === 10 ? `${iso}T00:00:00Z` : iso);

export interface AccountSeries {
  account: string;
  // The seven-day pooled level, split wherever the account has no reading for a while or a
  // change splits a day; each run is drawn as one line.
  runs: { t: number; v: number }[][];
  // Each day's own level, drawn as faint dots beneath the line.
  dots: { t: number; v: number }[];
}

export interface SharedSegment {
  t0: number;
  t1: number;
  v: number;
  // The segment a provisional change opened: drawn dashed until the change is measured.
  provisional: boolean;
}

export interface ChangeMark {
  t: number;
  lo: number;
  hi: number;
  pct: number;
  // "−17.4%" and "−25.7 to −8.1": the size and interval on the line that found the change.
  size: string;
  interval: string | null;
  date: string;
  provisional: boolean;
}

export interface FourAccountPanel {
  line: "seven_day" | "ratio";
  title: string;
  series: AccountSeries[];
  shared: SharedSegment[];
  // Changes this line found, labelled with their size and interval.
  changes: ChangeMark[];
  // Changes the other line found: a faint guide at the same instant, no label.
  guides: number[];
  domain: [number, number];
}

export interface FourAccountChart {
  t0: number;
  t1: number;
  accounts: string[];
  panels: FourAccountPanel[];
}

const minus = (s: string) => s.replace(/-/g, "−");

// "+18.3%", "−17.4%": one decimal, as the tracker publishes it, with a true minus sign.
export function signedPct(pct: number): string {
  return minus(`${pct > 0 ? "+" : ""}${pct.toFixed(1)}%`);
}

// "−25.7 to −8.1", or null without a two-sided interval.
export function intervalText(iv: (number | null)[] | null | undefined): string | null {
  if (!iv || typeof iv[0] !== "number" || typeof iv[1] !== "number") return null;
  return minus(`${iv[0].toFixed(1)} to ${iv[1].toFixed(1)}`);
}

const SHORT_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
// "14 Sep" from any ISO stamp, by its UTC day.
export function shortDay(t: number): string {
  const d = new Date(t);
  return `${d.getUTCDate()} ${SHORT_MONTHS[d.getUTCMonth()]}`;
}

function seriesOf(account: string, rows: FourAccountRow[]): AccountSeries {
  const runs: { t: number; v: number }[][] = [];
  const dots: { t: number; v: number }[] = [];
  let prevDay: string | null = null;
  let prevT = -Infinity;
  for (const r of rows) {
    if (!Array.isArray(r) || typeof r[0] !== "string") continue;
    const [day, level, , pooled] = r;
    const t = dayMs(day);
    if (!Number.isFinite(t)) continue;
    if (typeof level === "number" && Number.isFinite(level) && level > 0) dots.push({ t, v: level });
    if (typeof pooled !== "number" || !Number.isFinite(pooled) || pooled <= 0) continue;
    // A second row on the same day is the other side of a change: start a new run there.
    const split = day === prevDay || t - prevT > JOIN_GAP_DAYS * DAY_MS;
    if (split || runs.length === 0) runs.push([]);
    runs[runs.length - 1].push({ t, v: pooled });
    prevDay = day;
    prevT = t;
  }
  return { account, runs, dots };
}

function sharedOf(levels: FourAccountLevel[] | undefined, t0: number, t1: number): SharedSegment[] {
  return (levels ?? []).flatMap((l) => {
    const a = l.from ? Math.max(stamp(l.from), t0) : t0;
    const b = l.to ? Math.min(stamp(l.to), t1) : t1;
    if (!(typeof l.index === "number" && l.index > 0) || !(b > a)) return [];
    return [{ t0: a, t1: b, v: l.index, provisional: l.opened_by === "provisional" }];
  });
}

const quantile = (xs: number[], q: number) => {
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.max(0, Math.round(q * (s.length - 1))))];
};

// The panel's vertical range, on a log scale: the accounts' pooled levels from the 3rd to the
// 97th percentile (a day or two at an account's start pools almost nothing and would squash the
// rest), always the shared step and the level now, with a little air. Readings beyond it are
// clipped at the plot's edge.
export function panelDomain(series: AccountSeries[], shared: SharedSegment[]): [number, number] {
  const pooled = series.flatMap((s) => s.runs.flat().map((p) => p.v));
  const anchors = [1, ...shared.map((s) => s.v)];
  let lo = Math.min(...anchors);
  let hi = Math.max(...anchors);
  if (pooled.length > 0) {
    lo = Math.min(lo, quantile(pooled, 0.03));
    hi = Math.max(hi, quantile(pooled, 0.97));
  }
  const pad = (Math.log(hi) - Math.log(lo)) * 0.08 || 0.05;
  return [Math.exp(Math.log(lo) - pad), Math.exp(Math.log(hi) + pad)];
}

// Ticks in percent against now (1.0), at a round step that gives at most `max` ticks.
export function pctTicks(domain: [number, number], max: number): number[] {
  const [lo, hi] = domain;
  for (const step of [5, 10, 20, 25, 50, 100]) {
    const ticks: number[] = [];
    for (let p = Math.ceil((lo - 1) * 100 / step) * step; p <= (hi - 1) * 100 + 1e-9; p += step) {
      if (1 + p / 100 > 0) ticks.push(1 + p / 100);
    }
    if (ticks.length <= max) return ticks;
  }
  return [1];
}

// "+20%", "now", "−20%": a tick's level against what the account gets now.
export function tickText(v: number): string {
  const p = Math.round((v - 1) * 100);
  return p === 0 ? "now" : minus(`${p > 0 ? "+" : ""}${p}%`);
}

// The chart's whole shape from the block, or null where the file publishes no block (every file
// before the four-account detector) or nothing to draw.
export function fourAccountChart(block: FourAccountsBlock | null | undefined): FourAccountChart | null {
  if (!block || typeof block !== "object" || !block.lines) return null;
  const accounts = (block.accounts ?? []).filter((a) => typeof a === "string");
  const allRows = FOUR_ACCOUNT_PANELS.flatMap(({ line }) => Object.values(block.lines?.[line] ?? {}).flat());
  const days = allRows.flatMap((r) => (Array.isArray(r) && typeof r[0] === "string" ? [dayMs(r[0])] : [])).filter(Number.isFinite);
  if (days.length === 0 || accounts.length === 0) return null;
  const t0 = Math.min(...days) - DAY_MS / 2;
  const until = block.data_until ? stamp(block.data_until) : NaN;
  const t1 = Math.max(Number.isFinite(until) ? until : -Infinity, Math.max(...days) + DAY_MS / 2);
  const changes = (block.changes ?? []).filter((c) => c && typeof c.at === "string" && Number.isFinite(stamp(c.at)));
  const panels = FOUR_ACCOUNT_PANELS.map(({ line, title }) => {
    const byAccount = block.lines?.[line] ?? {};
    const series = accounts.flatMap((a) => (byAccount[a]?.length ? [seriesOf(a, byAccount[a])] : []));
    const shared = sharedOf(block.levels?.[line], t0, t1);
    const marks = changes
      .filter((c) => c.found_on === line)
      .flatMap((c): ChangeMark[] => {
        const own = c.sizes?.[line];
        const pct = typeof own?.change_pct === "number" ? own.change_pct : c.change_pct;
        if (typeof pct !== "number" || !Number.isFinite(pct)) return [];
        const t = stamp(c.at);
        const range = c.instant_range;
        const lo = range && Number.isFinite(stamp(range[0])) ? stamp(range[0]) : t;
        const hi = range && Number.isFinite(stamp(range[1])) ? stamp(range[1]) : t;
        return [
          {
            t,
            lo: Math.min(lo, t),
            hi: Math.max(hi, t),
            pct,
            size: signedPct(pct),
            interval: intervalText(own?.interval_pct ?? c.interval_pct),
            date: shortDay(t),
            provisional: c.state !== "measured",
          },
        ];
      })
      .sort((a, b) => a.t - b.t);
    const guides = changes.filter((c) => c.found_on !== line).map((c) => stamp(c.at));
    return { line, title, series, shared, changes: marks, guides, domain: panelDomain(series, shared) };
  }).filter((p) => p.series.length > 0);
  return panels.length > 0 ? { t0, t1, accounts, panels } : null;
}

// The value of a run or a shared step at time `t`: the run's nearest reading within a day and a
// half, the shared segment that covers `t`. Null where there is none. The hover reads these.
export function seriesAt(s: AccountSeries, t: number): number | null {
  let best: { d: number; v: number } | null = null;
  for (const run of s.runs)
    for (const p of run) {
      const d = Math.abs(p.t - t);
      if (d <= 1.5 * DAY_MS && (!best || d < best.d)) best = { d, v: p.v };
    }
  return best ? best.v : null;
}

export function sharedAt(shared: SharedSegment[], t: number): number | null {
  return shared.find((s) => s.t0 <= t && t <= s.t1)?.v ?? null;
}

// "Max account 2" -> "a2", the key the page's account colours are keyed on.
export function accountKey(label: string): string {
  const n = /(\d+)\s*$/.exec(label)?.[1];
  return n ? `a${n}` : label;
}
