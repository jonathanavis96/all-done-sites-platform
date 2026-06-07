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

export const TERMS_VERSION = "2026-06-07";

export function detectRegion(): RegionKey {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
    const lang = (navigator.language || "").toLowerCase();
    if (tz.includes("Johannesburg")) return "ZA";
    if (tz.startsWith("Africa/")) return "ZA";
    if (tz.includes("London")) return "UK";
    if (tz.startsWith("Europe/")) return "EU";
    if (tz.startsWith("America/")) return "US";
    if (lang.endsWith("-za")) return "ZA";
    if (lang.endsWith("-gb")) return "UK";
    if (lang.startsWith("fr-") || lang.startsWith("de-") || lang.startsWith("es-") || lang.startsWith("it-")) return "EU";
    if (lang.startsWith("en-")) return "US";
  } catch {
    // ignore
  }
  return "OTHER";
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
