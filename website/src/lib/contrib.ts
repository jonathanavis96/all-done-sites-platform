// website/src/lib/contrib.ts — pure helpers shared by the "Contribute your own meter"
// section, the personal page, and the Pages Functions under
// website/functions/api/contribute/. Kept free of DOM and of Workers APIs so both
// runtimes and vitest can import it.
//
// A contributed sample is the body `contrib/sample.py` in the tracker repo posts:
// the reader's own meter percentages plus token counts since each window started.
// The validator here is the whole privacy guarantee: it rejects any key it does not
// know at every level, so nothing beyond the documented fields can ever be stored.
import { CLASSES, type Plan, type TokenClass, type UsageJson } from "./claudeUsage";

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

/**
 * Tokens per 1% of the five-hour meter for one model in one sample: tokens since the
 * window started over the meter's current percent. Null when the meter reads 0, since
 * dividing by zero says nothing.
 */
export function tokensPerPercent(sample: PublicSample, model: string): number | null {
  const u = sample.five_hour.utilization;
  if (!(u > 0)) return null;
  return totalTokens(sample.tokens_since_five_hour_reset[model]) / u;
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
