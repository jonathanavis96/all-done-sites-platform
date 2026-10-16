// Region detection, currency, Paystack subscription links, and terms-acceptance
// recording. Ported from the original Pricing page so the redesigned homepage can
// take payments directly (region-aware prices -> terms modal -> Paystack).

export type RegionKey = "ZA" | "US" | "UK" | "EU" | "OTHER";
export type PlanId = "launch" | "business" | "premium";

export const REGION_LABELS: Record<RegionKey, string> = {
  ZA: "South Africa (ZAR)",
  US: "United States (USD)",
  UK: "United Kingdom (GBP)",
  EU: "Europe (EUR)",
  OTHER: "Other (USD)",
};

export const REGION_ORDER: RegionKey[] = ["ZA", "US", "UK", "EU", "OTHER"];

const REGION_CURRENCY: Record<RegionKey, { symbol: string; code: string }> = {
  ZA: { symbol: "R", code: "ZAR" },
  US: { symbol: "$", code: "USD" },
  UK: { symbol: "£", code: "GBP" },
  EU: { symbol: "€", code: "EUR" },
  OTHER: { symbol: "$", code: "USD" },
};

const PAYSTACK_BASE = "https://paystack.com/pay/";
export const PAYSTACK_PAGES: Record<RegionKey, Record<PlanId, string>> = {
  EU: {
    launch: `${PAYSTACK_BASE}alldonesites-launch-eu`,
    business: `${PAYSTACK_BASE}alldonesites-business-eu`,
    premium: `${PAYSTACK_BASE}alldonesites-premium-eu`,
  },
  UK: {
    launch: `${PAYSTACK_BASE}alldonesites-launch-uk`,
    business: `${PAYSTACK_BASE}alldonesites-business-uk`,
    premium: `${PAYSTACK_BASE}alldonesites-premium-uk`,
  },
  US: {
    launch: `${PAYSTACK_BASE}alldonesites-launch-us`,
    business: `${PAYSTACK_BASE}alldonesites-business-us`,
    premium: `${PAYSTACK_BASE}alldonesites-premium-us`,
  },
  ZA: {
    launch: `${PAYSTACK_BASE}alldonesites-launch-za`,
    business: `${PAYSTACK_BASE}alldonesites-business-za`,
    premium: `${PAYSTACK_BASE}alldonesites-premium-za`,
  },
  OTHER: {
    launch: `${PAYSTACK_BASE}alldonesites-launch-us`,
    business: `${PAYSTACK_BASE}alldonesites-business-us`,
    premium: `${PAYSTACK_BASE}alldonesites-premium-us`,
  },
};

export const PRICES: Record<RegionKey, Record<PlanId, number>> = {
  ZA: { launch: 799, business: 2200, premium: 3600 },
  US: { launch: 89, business: 229, premium: 389 },
  UK: { launch: 69, business: 179, premium: 269 },
  EU: { launch: 69, business: 179, premium: 289 },
  OTHER: { launch: 89, business: 229, premium: 389 },
};

/** Monthly price for an extra professional mailbox alias, by region. */
export const MAILBOX_PRICE: Record<RegionKey, number> = {
  ZA: 40,
  US: 3,
  UK: 3,
  EU: 3,
  OTHER: 3,
};

/** Typical upfront agency quote we beat, by region (rounded marketing anchor). */
export const OLD_WAY_QUOTE: Record<RegionKey, string> = {
  ZA: "R30k",
  US: "$5k+",
  UK: "£4k+",
  EU: "€5k+",
  OTHER: "$5k+",
};

export const TERMS_VERSION = "2026-09-17";

/**
 * The TERMS_VERSION date as clients read it. Derived rather than written out, so
 * a version bump cannot leave the terms pages advertising the previous version
 * of wording a client has already accepted under the new one.
 */
export const TERMS_UPDATED_LABEL = new Date(TERMS_VERSION + "T00:00:00Z").toLocaleDateString("en-US", {
  year: "numeric",
  month: "long",
  day: "numeric",
  timeZone: "UTC",
});

/**
 * Countries priced in rand. South Africa, plus the Common Monetary Area members
 * whose currencies are pegged one-to-one to the rand (Namibia, Lesotho,
 * Eswatini). Every other African country gets international (USD) pricing.
 */
const RAND_COUNTRIES = new Set(["ZA", "NA", "LS", "SZ"]);

/** EU member states plus the euro-using non-members, priced in euro. */
const EURO_COUNTRIES = new Set([
  "AT", "BE", "BG", "CY", "CZ", "DE", "DK", "EE", "ES", "FI", "FR", "GR", "HR",
  "HU", "IE", "IT", "LT", "LU", "LV", "MT", "NL", "PL", "PT", "RO", "SE", "SI",
  "SK", "AD", "MC", "SM", "VA", "ME", "XK",
]);

/** Pricing region for an ISO 3166-1 alpha-2 country code, or null if unusable. */
export function regionForCountry(country: string | null | undefined): RegionKey | null {
  const cc = (country || "").trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(cc)) return null;
  // Cloudflare's placeholders: XX = unknown, T1 = Tor. Neither is a real country.
  if (cc === "XX" || cc === "T1") return null;
  if (RAND_COUNTRIES.has(cc)) return "ZA";
  if (cc === "GB" || cc === "IM" || cc === "JE" || cc === "GG") return "UK";
  if (cc === "US") return "US";
  if (EURO_COUNTRIES.has(cc)) return "EU";
  return "OTHER";
}

/** Reads the visitor's country from a Cloudflare /cdn-cgi/trace body. */
export function countryFromTrace(text: string): string | null {
  const loc = /(?:^|\n)loc=([A-Z0-9]{2})/.exec(text);
  return loc ? loc[1] : null;
}

/**
 * Best guess from the browser alone: timezone first, then language. Used before
 * the IP lookup answers, and when it cannot (local dev, blocked request).
 *
 * Only the rand-zone timezones map to ZA. Any other "Africa/" zone (Lagos,
 * Nairobi, Cairo) used to land on rand pricing too, which is how a Lagos visitor
 * reached a ZAR checkout on 2026-06-11.
 */
export function regionFromBrowser(tz: string, language: string): RegionKey {
  const lang = language.toLowerCase();
  if (/^Africa\/(Johannesburg|Maseru|Mbabane|Windhoek)$/.test(tz)) return "ZA";
  if (tz.startsWith("Africa/")) return "OTHER";
  if (tz === "Europe/London" || tz === "Europe/Isle_of_Man" || tz === "Europe/Jersey" || tz === "Europe/Guernsey") return "UK";
  if (tz.startsWith("Europe/")) return "EU";
  if (tz.startsWith("America/")) return "US";
  if (lang.endsWith("-za")) return "ZA";
  if (lang.endsWith("-gb")) return "UK";
  if (lang.startsWith("fr-") || lang.startsWith("de-") || lang.startsWith("es-") || lang.startsWith("it-")) return "EU";
  if (lang.startsWith("en-")) return "US";
  return "OTHER";
}

export function detectRegion(): RegionKey {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
    return regionFromBrowser(tz, navigator.language || "");
  } catch {
    return "OTHER";
  }
}

/**
 * The visitor's region from their IP address, via Cloudflare's same-origin trace
 * endpoint (free, no third party). Resolves null when the lookup is unavailable,
 * so the caller keeps its browser-based guess.
 */
export async function detectRegionFromIp(signal?: AbortSignal): Promise<RegionKey | null> {
  try {
    const res = await fetch("/cdn-cgi/trace", { signal });
    if (!res.ok) return null;
    return regionForCountry(countryFromTrace(await res.text()));
  } catch {
    return null;
  }
}

/** Currency-formatted amount with symbol, no "/mo" suffix (e.g. "R2,200", "$89"). */
export function formatAmount(region: RegionKey, amount: number): string {
  const { symbol } = REGION_CURRENCY[region];
  const n = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(amount);
  return `${symbol}${n}`;
}

/** Records terms acceptance (IP + timestamp) to Formspree and localStorage. */
export async function recordTermsAcceptance(planId: PlanId, region: RegionKey): Promise<void> {
  const acceptedAt = new Date().toISOString();
  let ip = "";
  try {
    const res = await fetch("https://api.ipify.org?format=json");
    if (res.ok) {
      const data = await res.json();
      ip = data.ip || "";
    }
  } catch {
    // ignore
  }
  const details = { plan: planId, region, acceptedAt, ip, termsVersion: TERMS_VERSION };
  try {
    await fetch("https://formspree.io/f/mwpneboe", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ _subject: "Terms acceptance record", ...details }),
    });
  } catch {
    // ignore
  }
  try {
    localStorage.setItem("termsAccepted", JSON.stringify(details));
  } catch {
    // ignore
  }
}
