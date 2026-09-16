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
  contributorModelValue,
  meterBudgetPerWindow,
  modelPlanLimit,
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
export type TokenCounts = Record<TokenClass, number> & { cache_write_1h?: number };
export type TokenMap = Record<string, TokenCounts>;
export interface Capture {
  collected_at: string;
  five_hour_started_at: string;
  seven_day_started_at: string;
  ownership: "local_transcripts_unverified" | "filtered_local_transcripts";
}

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
  /** v2 capture metadata; optional only so old retained samples remain readable. */
  capture?: Capture;
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
  "capture",
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
  "capture",
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
      if (k !== "cache_write_1h" && !(CLASSES as string[]).includes(k)) return { ok: false, reason: `${name}.${m}.${k} is not a token class` };
    }
    const row = {} as TokenCounts;
    for (const c of CLASSES) {
      const n = counts[c];
      if (typeof n !== "number" || !Number.isInteger(n) || n < 0 || n > Number.MAX_SAFE_INTEGER) {
        return { ok: false, reason: `${name}.${m}.${c} must be a non-negative integer` };
      }
      row[c] = n;
    }
    if (counts.cache_write_1h !== undefined) {
      const n = counts.cache_write_1h;
      if (typeof n !== "number" || !Number.isSafeInteger(n) || n < 0 || n > row.cache_write) {
        return { ok: false, reason: `${name}.${m}.cache_write_1h must be a subset of cache_write` };
      }
      row.cache_write_1h = n;
    }
    out[m] = row;
  }
  return { ok: true, value: out };
}

function validateCapture(v: unknown, now: number): { ok: true; value: Capture } | { ok: false; reason: string } {
  if (!isPlainObject(v)) return { ok: false, reason: "capture must be an object" };
  const allowed = ["collected_at", "five_hour_started_at", "seven_day_started_at", "ownership"];
  for (const k of Object.keys(v)) if (!allowed.includes(k)) return { ok: false, reason: `capture.${k} is not a known field` };
  for (const k of allowed) if (!(k in v)) return { ok: false, reason: `capture.${k} is missing` };
  for (const k of ["collected_at", "five_hour_started_at", "seven_day_started_at"] as const) {
    const t = parseIso(v[k]);
    if (t === null || Math.abs(t - now) > RESETS_WINDOW_MS) return { ok: false, reason: `capture.${k} must be a recent ISO timestamp` };
  }
  if (v.ownership !== "local_transcripts_unverified" && v.ownership !== "filtered_local_transcripts") {
    return { ok: false, reason: "capture.ownership must describe local transcript coverage" };
  }
  return { ok: true, value: v as unknown as Capture };
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
    if (k !== "capture" && !(k in body)) return { ok: false, reason: `${k} is missing` };
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
  for (const [meter, duration] of [[fh.value, 5 * 3600e3], [sd.value, 7 * 86400e3]] as const) {
    const delta = Date.parse(meter.resets_at) - ts;
    if (delta < -120e3 || delta > duration + 120e3) {
      return { ok: false, reason: "reset time is inconsistent with the sampled window" };
    }
  }
  const t5 = validateTokens(body.tokens_since_five_hour_reset, "tokens_since_five_hour_reset");
  if (t5.ok === false) return { ok: false, reason: t5.reason };
  const t7 = validateTokens(body.tokens_since_seven_day_reset, "tokens_since_seven_day_reset");
  if (t7.ok === false) return { ok: false, reason: t7.reason };
  const capture = body.capture === undefined ? null : validateCapture(body.capture, now);
  if (capture && capture.ok === false) return { ok: false, reason: capture.reason };
  if (capture && capture.ok) {
    const c = capture.value;
    if (Math.abs(Date.parse(c.collected_at) - ts) > 120e3 ||
        Math.abs(Date.parse(c.five_hour_started_at) + 5 * 3600e3 - Date.parse(fh.value.resets_at)) > 120e3 ||
        Math.abs(Date.parse(c.seven_day_started_at) + 7 * 86400e3 - Date.parse(sd.value.resets_at)) > 120e3) {
      return { ok: false, reason: "capture timestamps must match the sample and reset windows" };
    }
  }
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
      ...(capture && capture.ok === true ? { capture: capture.value } : {}),
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
  if (!rate || typeof ratio !== "number" || typeof rate.tokens_per_window !== "number") return null;
  if (!modelPlanLimit(j, model, plan).included) return null;
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
 * / 1e6, plus the one-hour cache write's difference from a five-minute one, scaled by
 * price.meter_weight. Null when the price has no class_weight/meter_weight (older published JSON,
 * before the meter was priced this way). Within a class_weight, the weights default as the
 * collector's tracker/publish.py `class_weight` does: a missing class weighs 1, and the one-hour
 * write weighs as cache_write unless it has its own entry.
 */
export function meterUsd(counts: TokenCounts | undefined, price: ApiPrice | undefined): number | null {
  if (!price || !price.class_weight || typeof price.meter_weight !== "number") return null;
  const weights = price.class_weight;
  let sum = 0;
  for (const c of CLASSES) {
    const tokens = counts?.[c] ?? 0;
    sum += tokens * (price[c] ?? 0) * (weights[c] ?? 1);
  }
  const oneHour = counts?.cache_write_1h ?? 0;
  if (oneHour < 0 || oneHour > (counts?.cache_write ?? 0)) return null;
  // The one-hour difference needs the five-minute write price and the input price its default is
  // built from (the collector reads both); without them there is no figure, never NaN.
  if (oneHour > 0 && (typeof price.cache_write !== "number" || typeof price.input !== "number")) return null;
  const writeWeight = weights.cache_write ?? 1;
  const oneHourWeight = weights.cache_write_1h ?? writeWeight;
  sum += oneHour * ((price.cache_write_1h ?? price.input * 2) * oneHourWeight - price.cache_write * writeWeight);
  return (sum / 1e6) * price.meter_weight;
}

/** A transcript model id as the collector's contrib/sample.py `normalize_model` records it: a
 * trailing `[1m]` marker, then a trailing -YYYYMMDD date, removed; anything that is then not a
 * claude- id becomes claude-unknown. */
export function normalizeModelId(model: string): string {
  const m = model.replace(/\s*\[1m\]$/, "").replace(/-\d{8}$/, "");
  return /^claude-[a-z0-9-]+$/.test(m) ? m : "claude-unknown";
}

/** The price a model id is valued at: the price of its normalised id, or Fable 5.1's for the old
 * Fable id. Normalising and aliasing only pick a price; the sample keeps the id it was observed
 * under. The same rule as the collector's sampler `normalize_model` followed by
 * tracker/contributed.py `_price`, so the personal page and the published contributor figures
 * price a sample alike (audit finding 9). */
export function priceForModel(model: string, prices: Record<string, ApiPrice>): ApiPrice | undefined {
  const m = normalizeModelId(model);
  if (Object.prototype.hasOwnProperty.call(prices, m)) return prices[m];
  return m === "claude-fable-5" ? prices["claude-fable-5-1"] : undefined;
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
    const usd = meterUsd(counts, priceForModel(model, prices));
    if (usd === null) return null;
    perModel[model] = usd;
    total += usd;
  }
  return Object.keys(perModel).length > 0 && total > 0 ? { perModel, total } : null;
}

/** Total meter dollars in the sample over its five-hour percent. Null when the percent is 0 or
 * unpriced. A reading under COARSE_BELOW still has a figure, marked coarse by isCoarse, as the
 * published contributor points do. */
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
 * percent covers every model at once). Null when the model's value is 0, either is unpriced, or
 * the model's slice of the meter is under COARSE_BELOW: dividing by a slice near zero runs away.
 * That is the collector's rule for the published per-model figures, so the personal page and
 * the public chart attribute a reading alike (audit finding 8).
 */
export function shareTokensPerPercent(sample: PublicSample, model: string, prices: Record<string, ApiPrice>): number | null {
  const u = sample.five_hour.utilization;
  if (!(u >= COARSE_BELOW)) return null;
  const v = sampleValue(sample, prices);
  if (v === null) return null;
  const valueM = v.perModel[model];
  if (!valueM || (u * valueM) / v.total < COARSE_BELOW) return null;
  const tokensM = totalTokens(sample.tokens_since_five_hour_reset[model]);
  return (tokensM * v.total) / (valueM * u);
}

/**
 * The tracker's meter dollars per 1%: a model's meter budget per window (preferring one whose
 * rate source is literally "probe"), scaled by the plan ratio, over 100 percent. Never the
 * schema 2 API list value, which is another unit (audit finding 1). Null when no rate carries
 * a meter budget yet.
 */
export function fleetUsdPerPercent(j: UsageJson, plan: Plan): number | null {
  const ratio = j.plan_ratios?.[plan];
  if (typeof ratio !== "number") return null;
  const withValue = Object.values(j.rates ?? {}).filter((r) => meterBudgetPerWindow(j, r) !== null);
  if (withValue.length === 0) return null;
  const rate = withValue.find((r) => r.source === "probe") ?? withValue[0];
  return (meterBudgetPerWindow(j, rate)! * ratio) / 100;
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
  tokens_per_pct?: number | null;
  tokens_per_pct_week?: number | null;
  tokens_per_pct_by_model?: Record<string, number>;
  tokens_per_pct_week_by_model?: Record<string, number>;
  c: number;
  coarse: boolean;
}

/** Which figure a tab of the contributor chart plots. */
export type ContribMetric = "usd" | "window" | "weekly";

/**
 * The figure one contributed reading carries for a chart tab. Dollars per 1% combine every
 * model and so compare with the tracker's meter budget per 1%. Tokens for a full window or week
 * are the selected model's own figure, or null: a reading without a per-model figure for that
 * model is missing data, never its combined total drawn under the model's name (audit finding 8).
 */
export function contribPointValue(p: ContribPointLike, metric: ContribMetric, model: string): number | null {
  if (metric === "usd") return p.usd_per_pct ?? null;
  return contributorModelValue(metric === "window" ? p.tokens_per_pct_by_model : p.tokens_per_pct_week_by_model, model, 100);
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
export function contribYMax(
  points: ContribPointLike[],
  fleetUsd: number | null,
  // Which figure to scale to. Defaults to the dollar one, so the cost chart and its
  // tests read exactly as before; the other contributor tabs pass their own.
  value: (p: ContribPointLike) => number | null = (p) => p.usd_per_pct,
): number {
  const vals = points.map(value).filter((v): v is number => typeof v === "number");
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
 * The sentences for the "From contributors" section on one plan: who has shared their meter, and
 * what a percent of it cost them against the tracker's own figure. Short and plain; the reader is
 * not expected to know the jargon. Returns null when there is nothing to say (no contributors on
 * this plan).
 *
 * There is no sentence for `weekly_windows.measured`. In schema 1 it is one windows-per-week
 * figure pooled across contributor IDs: an all-history weighted median with outliers dropped,
 * which the audit's finding 14 says can hide a limit change and stands in for a plan figure the
 * unverified sources cannot support. Schema 2 never publishes it (measured is always null), and no
 * chart on the page plots windows per week any more (finding 7).
 */
export function contributorSentences(
  plan: Plan,
  contrib: PlanContrib | undefined,
  fleetUsd: number | null,
): { intro: string; cost: string | null } | null {
  if (!contrib || contrib.contributors <= 0) return null;
  const planLabel = PLAN_LABELS[plan];
  const n = contrib.contributors;
  // The count is of submitted contributor IDs, not of people or accounts (audit finding 14).
  const who = n === 1 ? "One contributor ID" : `${capitalize(numberWord(n))} contributor IDs`;
  const has = n === 1 ? "has" : "have";
  const intro = `${who} on ${planLabel} ${has} shared meter readings.`;

  let cost: string | null = null;
  if (contrib.usd_per_pct === null) {
    // Not "no reading cleared 5%": an unpriced model or a missing second reading also leave it null.
    cost = "There is no cost figure to show yet.";
  } else if (isPlanContribStat(contrib.usd_per_pct)) {
    const median = contrib.usd_per_pct.median;
    // Meter dollars, not list-price work: the class and meter weights apply (audit finding 1).
    cost = `On average their use came to $${median.toFixed(2)} of meter budget per 1% of the five-hour meter.`;
    if (typeof fleetUsd === "number" && fleetUsd > 0) {
      cost += ` The tracker's own figure is $${fleetUsd.toFixed(2)}.`;
    }
  }

  return { intro, cost };
}
