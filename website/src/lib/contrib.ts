// website/src/lib/contrib.ts — pure helpers shared by the "Contribute your own meter"
// section, the personal page, and the Pages Functions under
// website/functions/api/contribute/. Kept free of DOM and of Workers APIs so both
// runtimes and vitest can import it.
//
// A contributed sample is the body `contrib/sample.py` in the tracker repo posts:
// the reader's own meter percentages plus token counts since each window started.
// The validator here is the whole privacy guarantee: it rejects any key it does not
// know at every level, so nothing beyond the documented fields can ever be stored.
import {
  CLASSES,
  PLAN_LABELS,
  type ApiPrice,
  type Plan,
  type PlanContrib,
  type TokenClass,
  type UsageJson,
} from "./claudeUsage";

export const PLANS: Plan[] = ["pro", "max5", "max20"];
export const PLAN_SOURCES = ["endpoint", "stored", "flag"] as const;
export type PlanSource = (typeof PLAN_SOURCES)[number];

export const MAX_BODY_BYTES = 2048;
export const MAX_MODELS = 12;
const TS_WINDOW_MS = 24 * 3600e3;
const RESETS_WINDOW_MS = 8 * 86400e3;
const MODEL_RE = /^claude-[a-z0-9-]+$/;
const UUID4_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

export interface Meter {
  utilization: number;
  resets_at: string;
}
export type TokenCounts = Record<TokenClass, number>;
export type TokenMap = Record<string, TokenCounts>;

export interface Sample {
  client_version: string;
  contributor_id: string;
  plan: Plan;
  plan_source: PlanSource;
  ts: string;
  five_hour: Meter;
  seven_day: Meter;
  tokens_since_five_hour_reset: TokenMap;
  tokens_since_seven_day_reset: TokenMap;
}

/** The subset of a stored sample the personal page is given back. */
export type PublicSample = Omit<Sample, "client_version" | "contributor_id" | "plan_source">;
export const PUBLIC_FIELDS: (keyof PublicSample)[] = [
  "ts",
  "plan",
  "five_hour",
  "seven_day",
  "tokens_since_five_hour_reset",
  "tokens_since_seven_day_reset",
];

const TOP_KEYS = [
  "client_version",
  "contributor_id",
  "plan",
  "plan_source",
  "ts",
  "five_hour",
  "seven_day",
  "tokens_since_five_hour_reset",
  "tokens_since_seven_day_reset",
] as const;

export type Validation = { ok: true; value: Sample } | { ok: false; reason: string };

export function isContributorId(s: unknown): s is string {
  return typeof s === "string" && UUID4_RE.test(s);
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function parseIso(s: unknown): number | null {
  if (typeof s !== "string" || s.length < 10 || s.length > 40) return null;
  // Date.parse accepts a lot of loose forms; require an ISO date-time shape first.
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})$/.test(s)) return null;
  const t = Date.parse(s);
  return Number.isFinite(t) ? t : null;
}

function validateMeter(v: unknown, name: string, now: number): { ok: true; value: Meter } | { ok: false; reason: string } {
  if (!isPlainObject(v)) return { ok: false, reason: `${name} must be an object` };
  for (const k of Object.keys(v)) {
    if (k !== "utilization" && k !== "resets_at") return { ok: false, reason: `${name}.${k} is not a known field` };
  }
  const u = v.utilization;
  if (typeof u !== "number" || !Number.isFinite(u) || u < 0 || u > 100) {
    return { ok: false, reason: `${name}.utilization must be a number from 0 to 100` };
  }
  const t = parseIso(v.resets_at);
  if (t === null) return { ok: false, reason: `${name}.resets_at must be an ISO timestamp` };
  if (Math.abs(t - now) > RESETS_WINDOW_MS) return { ok: false, reason: `${name}.resets_at must be within 8 days of now` };
  return { ok: true, value: { utilization: u, resets_at: v.resets_at as string } };
}

function validateTokens(v: unknown, name: string): { ok: true; value: TokenMap } | { ok: false; reason: string } {
  if (!isPlainObject(v)) return { ok: false, reason: `${name} must be an object` };
  const models = Object.keys(v);
  if (models.length > MAX_MODELS) return { ok: false, reason: `${name} lists more than ${MAX_MODELS} models` };
  const out: TokenMap = {};
  for (const m of models) {
    if (!MODEL_RE.test(m)) return { ok: false, reason: `${name}.${m} is not a model name` };
    const counts = v[m];
    if (!isPlainObject(counts)) return { ok: false, reason: `${name}.${m} must be an object` };
    for (const k of Object.keys(counts)) {
      if (!(CLASSES as string[]).includes(k)) return { ok: false, reason: `${name}.${m}.${k} is not a token class` };
    }
    const row = {} as TokenCounts;
    for (const c of CLASSES) {
      const n = counts[c];
      if (typeof n !== "number" || !Number.isInteger(n) || n < 0 || n > Number.MAX_SAFE_INTEGER) {
        return { ok: false, reason: `${name}.${m}.${c} must be a non-negative integer` };
      }
      row[c] = n;
    }
    out[m] = row;
  }
  return { ok: true, value: out };
}

/**
 * Validate a parsed body exactly. Returns a fresh object built only from the known
 * fields, so the caller stores what was validated and nothing else.
 */
export function validateSample(body: unknown, now: number = Date.now()): Validation {
  if (!isPlainObject(body)) return { ok: false, reason: "body must be a JSON object" };
  for (const k of Object.keys(body)) {
    if (!(TOP_KEYS as readonly string[]).includes(k)) return { ok: false, reason: `${k} is not a known field` };
  }
  for (const k of TOP_KEYS) {
    if (!(k in body)) return { ok: false, reason: `${k} is missing` };
  }
  const cv = body.client_version;
  if (typeof cv !== "string" || cv.length === 0 || cv.length > 64) {
    return { ok: false, reason: "client_version must be a short string" };
  }
  if (!isContributorId(body.contributor_id)) return { ok: false, reason: "contributor_id must be a UUID4" };
  if (!(PLANS as string[]).includes(body.plan as string)) return { ok: false, reason: "plan must be pro, max5 or max20" };
  if (!(PLAN_SOURCES as readonly string[]).includes(body.plan_source as string)) {
    return { ok: false, reason: "plan_source must be endpoint, stored or flag" };
  }
  const ts = parseIso(body.ts);
  if (ts === null) return { ok: false, reason: "ts must be an ISO timestamp" };
  if (Math.abs(ts - now) > TS_WINDOW_MS) return { ok: false, reason: "ts must be within 24 hours of now" };
  const fh = validateMeter(body.five_hour, "five_hour", now);
  if (fh.ok === false) return { ok: false, reason: fh.reason };
  const sd = validateMeter(body.seven_day, "seven_day", now);
  if (sd.ok === false) return { ok: false, reason: sd.reason };
  const t5 = validateTokens(body.tokens_since_five_hour_reset, "tokens_since_five_hour_reset");
  if (t5.ok === false) return { ok: false, reason: t5.reason };
  const t7 = validateTokens(body.tokens_since_seven_day_reset, "tokens_since_seven_day_reset");
  if (t7.ok === false) return { ok: false, reason: t7.reason };
  return {
    ok: true,
    value: {
      client_version: cv,
      contributor_id: body.contributor_id,
      plan: body.plan as Plan,
      plan_source: body.plan_source as PlanSource,
      ts: body.ts as string,
      five_hour: fh.value,
      seven_day: sd.value,
      tokens_since_five_hour_reset: t5.value,
      tokens_since_seven_day_reset: t7.value,
    },
  };
}

// ---------------------------------------------------------------- CUT1 lines
// `sample.py --compact` prints the minified body as url-safe base64 behind a `CUT1:`
// prefix, for pasting into the page instead of posting from the reader's machine.

const utf8 = { enc: new TextEncoder(), dec: new TextDecoder() };

function b64urlEncode(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(str: string): Uint8Array {
  const padded = str.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (str.length % 4)) % 4);
  const bin = atob(padded);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** Build the compact line for a body, the way sample.py does (sorted keys, no spaces). */
export function encodeCut1(body: object): string {
  const sorted = (v: unknown): unknown => {
    if (Array.isArray(v)) return v.map(sorted);
    if (isPlainObject(v)) return Object.fromEntries(Object.keys(v).sort().map((k) => [k, sorted(v[k])]));
    return v;
  };
  return "CUT1:" + b64urlEncode(utf8.enc.encode(JSON.stringify(sorted(body))));
}

/** Decode a CUT1 line to its JSON text, or throw with a one-line reason. */
export function decodeCut1(line: unknown): string {
  if (typeof line !== "string") throw new Error("cut1 must be a string");
  const s = line.trim();
  if (!s.startsWith("CUT1:")) throw new Error("not a CUT1 line");
  const payload = s.slice(5);
  if (payload.length === 0 || payload.length > 4096 || !/^[A-Za-z0-9_-]+=*$/.test(payload)) {
    throw new Error("CUT1 payload is not url-safe base64");
  }
  let bytes: Uint8Array;
  try {
    bytes = b64urlDecode(payload.replace(/=+$/, ""));
  } catch {
    throw new Error("CUT1 payload is not url-safe base64");
  }
  return utf8.dec.decode(bytes);
}

export function byteLength(text: string): number {
  return utf8.enc.encode(text).length;
}

// ---------------------------------------------------------------- derived figures

export function totalTokens(counts: TokenCounts | undefined): number {
  if (!counts) return 0;
  return CLASSES.reduce((s, c) => s + (counts[c] ?? 0), 0);
}

/** The model the contributor has spent the most tokens on across all their samples. */
export function mainModel(samples: PublicSample[]): string | null {
  const totals = new Map<string, number>();
  for (const s of samples) {
    for (const [m, counts] of Object.entries(s.tokens_since_five_hour_reset)) {
      totals.set(m, (totals.get(m) ?? 0) + totalTokens(counts));
    }
  }
  let best: string | null = null;
  let bestTotal = -1;
  for (const [m, t] of [...totals.entries()].sort(([a], [b]) => (a < b ? -1 : 1))) {
    if (t > bestTotal) {
      best = m;
      bestTotal = t;
    }
  }
  return best;
}

/** Every model that appears in any sample's five-hour map, sorted. */
export function modelsIn(samples: PublicSample[]): string[] {
  const set = new Set<string>();
  for (const s of samples) for (const m of Object.keys(s.tokens_since_five_hour_reset)) set.add(m);
  return [...set].sort();
}

/**
 * The fleet's tokens per 1% for a model on a plan, from the published rates: the
 * probed Max 20x window scaled by the plan ratio, over 100 percent. Null when the
 * published JSON has no rate for that model yet.
 */
export function fleetTokensPerPercent(j: UsageJson, plan: Plan, model: string): number | null {
  const rate = j.rates?.[model];
  const ratio = j.plan_ratios?.[plan];
  if (!rate || typeof ratio !== "number") return null;
  return (rate.tokens_per_window * ratio) / 100;
}

// ---------------------------------------------------------------- pricing a sample
//
// The meter is priced, not counted: each token class is charged at API list price times a
// per-class weight (cache reads currently weighted to 0, output to about 1.8x), then the whole
// total by a meter weight. This is the same pricing the daily job uses to turn the probe's
// tokens-per-window into api_value_per_window, applied here to one contributed sample so a
// single reading can be compared in dollars, the one unit that is comparable across models.

/** A sample reads a whole-number meter percent; below this the rounding error dominates any
 * dollar or token figure derived from it, so callers should show it with a caveat rather than
 * hide it. */
export const COARSE_BELOW = 5;

export function isCoarse(sample: Pick<PublicSample, "five_hour">): boolean {
  return sample.five_hour.utilization < COARSE_BELOW;
}

/**
 * Meter dollars for one model's token counts: Σ_class tokens × price[class] × class_weight[class]
 * / 1e6, scaled by price.meter_weight. Null when the price has no class_weight/meter_weight
 * (older published JSON, before the meter was priced this way).
 */
export function meterUsd(counts: TokenCounts | undefined, price: ApiPrice | undefined): number | null {
  if (!price || !price.class_weight || typeof price.meter_weight !== "number") return null;
  let sum = 0;
  for (const c of CLASSES) {
    const tokens = counts?.[c] ?? 0;
    sum += tokens * (price[c] ?? 0) * (price.class_weight[c] ?? 0);
  }
  return (sum / 1e6) * price.meter_weight;
}

/**
 * Meter dollars for every model in one sample's five-hour token map, and their total. Null
 * (the whole result, not a per-model hole) when any model with tokens > 0 has no price, since a
 * partial total would understate the sample the same way the unpriced-percent bug did.
 */
export function sampleValue(
  sample: PublicSample,
  prices: Record<string, ApiPrice>,
): { perModel: Record<string, number>; total: number } | null {
  const perModel: Record<string, number> = {};
  let total = 0;
  for (const [model, counts] of Object.entries(sample.tokens_since_five_hour_reset)) {
    if (totalTokens(counts) <= 0) continue;
    const usd = meterUsd(counts, prices[model]);
    if (usd === null) return null;
    perModel[model] = usd;
    total += usd;
  }
  return { perModel, total };
}

/** Total meter dollars in the sample over its five-hour percent. Null when the percent is 0 or
 * unpriced. */
export function usdPerPercent(sample: PublicSample, prices: Record<string, ApiPrice>): number | null {
  const u = sample.five_hour.utilization;
  if (!(u > 0)) return null;
  const v = sampleValue(sample, prices);
  if (v === null) return null;
  return v.total / u;
}

/**
 * One model's share-attributed tokens per 1%: that model's tokens, scaled by the sample's
 * total dollar value over that model's own dollar value, over the meter percent. This spreads
 * the whole-sample percent across models by their dollar share rather than dividing the model's
 * raw tokens by the whole percent (which understates every model but the priciest one, since the
 * percent covers every model at once). Null when the percent is 0, the model's value is 0, or
 * either is unpriced.
 */
export function shareTokensPerPercent(sample: PublicSample, model: string, prices: Record<string, ApiPrice>): number | null {
  const u = sample.five_hour.utilization;
  if (!(u > 0)) return null;
  const v = sampleValue(sample, prices);
  if (v === null) return null;
  const valueM = v.perModel[model];
  if (!valueM) return null;
  const tokensM = totalTokens(sample.tokens_since_five_hour_reset[model]);
  return (tokensM * v.total) / (valueM * u);
}

/**
 * The fleet's meter dollars per 1%: a probed model's api_value_per_window (preferring one whose
 * rate source is literally "probe"), scaled by the plan ratio, over 100 percent. Null when no
 * rate carries that figure yet.
 */
export function fleetUsdPerPercent(j: UsageJson, plan: Plan): number | null {
  const ratio = j.plan_ratios?.[plan];
  if (typeof ratio !== "number") return null;
  const withValue = Object.values(j.rates ?? {}).filter((r) => typeof r.api_value_per_window === "number");
  if (withValue.length === 0) return null;
  const rate = withValue.find((r) => r.source === "probe") ?? withValue[0];
  return ((rate.api_value_per_window as number) * ratio) / 100;
}

// ---------------------------------------------------------------- "from contributors" chart

/** One contributor's readings, in time order. `c` is the anonymous ordinal `ContribPoint.c`. */
export interface ContribGroup {
  c: number;
  points: ContribPointLike[];
}
export interface ContribPointLike {
  t: string;
  usd_per_pct: number | null;
  c: number;
  coarse: boolean;
}

/** Group readings by contributor, each group's own readings sorted oldest to newest. Groups
 * are returned sorted by `c` for a stable render order (and so tests are deterministic). */
export function contribGroups(points: ContribPointLike[]): ContribGroup[] {
  const byC = new Map<number, ContribPointLike[]>();
  for (const p of points) {
    const arr = byC.get(p.c);
    if (arr) arr.push(p);
    else byC.set(p.c, [p]);
  }
  return [...byC.entries()]
    .sort(([a], [b]) => a - b)
    .map(([c, pts]) => ({ c, points: [...pts].sort((a, b) => (a.t < b.t ? -1 : a.t > b.t ? 1 : 0)) }));
}

/** Six colours, cycled by contributor ordinal so any number of contributors gets a colour. */
export const CONTRIB_PALETTE = ["#0EA5E9", "#F59E0B", "#059669", "#8B5CF6", "#DB2777", "#64748B"];

export function contribColor(c: number): string {
  const n = CONTRIB_PALETTE.length;
  return CONTRIB_PALETTE[((c % n) + n) % n];
}

const CONTRIB_CHART_SPAN_MS = 30 * 86400e3;

/**
 * The chart's x scale: a fraction-of-width function over [earliest point, or 30 days ago,
 * whichever is later] to now. A single point (or none) centers at 0.5 rather than dividing by
 * a zero span, so a brand-new contributor's first reading still renders sanely.
 */
export function contribXScale(
  points: ContribPointLike[],
  now: number = Date.now(),
): { t0: number; t1: number; frac: (t: string) => number } {
  const times = points.map((p) => Date.parse(p.t)).filter((t) => Number.isFinite(t));
  const t1 = now;
  if (times.length <= 1) {
    const t0 = times.length === 1 ? Math.min(times[0], now - 1) : now - CONTRIB_CHART_SPAN_MS;
    return { t0, t1, frac: () => 0.5 };
  }
  const earliest = Math.min(...times);
  const t0 = Math.max(earliest, now - CONTRIB_CHART_SPAN_MS);
  const span = Math.max(1, t1 - t0);
  return { t0, t1, frac: (t: string) => (Date.parse(t) - t0) / span };
}

/**
 * The chart's y max: 1.15x the largest of the points' dollar figures and the probe's own
 * figure, so the probe's dashed line and every reading always sit inside the axis. Points with
 * a null usd_per_pct (below the coarse floor) are excluded, same as they are from the plot.
 */
export function contribYMax(points: ContribPointLike[], fleetUsd: number | null): number {
  const vals = points.map((p) => p.usd_per_pct).filter((v): v is number => typeof v === "number");
  if (typeof fleetUsd === "number") vals.push(fleetUsd);
  const max = vals.length > 0 ? Math.max(...vals) : 0;
  return max > 0 ? max * 1.15 : 1;
}

// ---------------------------------------------------------------- "from contributors" copy

/** A `usd_per_pct`/tokens_per_pct stat with a numeric median, the shape the aggregator's PR
 * publishes. The live JSON still sometimes carries the old per-model record instead, so this
 * guard is what keeps the page from crashing on it. */
function isPlanContribStat(v: unknown): v is { median: number; spread: number | null } {
  return !!v && typeof v === "object" && typeof (v as { median?: unknown }).median === "number";
}

const NUMBER_WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];

/** Spell out small counts (matches how a person would read the sentence aloud); falls back to
 * the numeral once it gets past ten. */
function numberWord(n: number): string {
  return n >= 0 && n < NUMBER_WORDS.length ? NUMBER_WORDS[n] : String(n);
}

function capitalize(s: string): string {
  return s.length === 0 ? s : s[0].toUpperCase() + s.slice(1);
}

/**
 * Plain-English sentence for the weekly-limit block: whether a weekly figure could be shown,
 * and if not, why, in terms of the people involved rather than the raw `reason` string.
 */
function weeklySentence(w: PlanContrib["weekly_windows"] | undefined): string | null {
  if (typeof w?.measured === "number") {
    return `Across their weeks that comes to about ${w.measured.toFixed(1)} five-hour windows of use per week.`;
  }
  return null;
}

/**
 * The sentences for the "From contributors" section on one plan: who has shared their meter,
 * what a percent of it cost them against the tracker's own figure, and, only once measured,
 * what their weeks say about the weekly limit. Short and plain; the reader is not expected to
 * know the jargon. Returns null when there is nothing to say (no contributors on this plan).
 */
export function contributorSentences(
  plan: Plan,
  contrib: PlanContrib | undefined,
  fleetUsd: number | null,
): { intro: string; cost: string | null; weekly: string | null } | null {
  if (!contrib || contrib.contributors <= 0) return null;
  const planLabel = PLAN_LABELS[plan];
  const n = contrib.contributors;
  const who = n === 1 ? "One reader" : `${capitalize(numberWord(n))} readers`;
  const has = n === 1 ? "has" : "have";
  const intro = `${who} on ${planLabel} ${has} shared their meter so far, measured from their own use of Claude Code.`;

  let cost: string | null = null;
  if (contrib.usd_per_pct === null) {
    cost = "None of their readings had the meter above 5% yet, so there is no figure to show.";
  } else if (isPlanContribStat(contrib.usd_per_pct)) {
    const median = contrib.usd_per_pct.median;
    cost = `On average their use came to $${median.toFixed(2)} of list-price work per 1% of the five-hour meter.`;
    if (typeof fleetUsd === "number" && fleetUsd > 0) {
      cost += ` The tracker's own figure is $${fleetUsd.toFixed(2)}.`;
    }
  }

  return { intro, cost, weekly: weeklySentence(contrib.weekly_windows) };
}
