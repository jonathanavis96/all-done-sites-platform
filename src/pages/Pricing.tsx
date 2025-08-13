import React, { useEffect, useMemo, useState } from "react";
import Seo from "@/components/Seo";
import { Check, Star } from "lucide-react";
import { Button } from "@/components/ui/button";

// -----------------------------
// Region & currency config
// -----------------------------
type RegionKey = "ZA" | "US" | "UK" | "EU" | "OTHER";

const REGION_LABELS: Record<RegionKey, string> = {
  ZA: "South Africa (ZAR)",
  US: "United States (USD)",
  UK: "United Kingdom (GBP)",
  EU: "Europe (EUR)",
  OTHER: "Other (USD)",
};

const REGION_CURRENCY: Record<RegionKey, { symbol: string; code: string }> = {
  ZA: { symbol: "R", code: "ZAR" },
  US: { symbol: "$", code: "USD" },
  UK: { symbol: "£", code: "GBP" },
  EU: { symbol: "€", code: "EUR" },
  OTHER: { symbol: "$", code: "USD" },
};

// Pricing from our decoy/anchor setup
const PRICES: Record<RegionKey, { launch: number; business: number; premium: number }> = {
  ZA: { launch: 799, business: 2200, premium: 3600 },
  US: { launch: 89, business: 229, premium: 389 },
  UK: { launch: 69, business: 179, premium: 269 },
  EU: { launch: 69, business: 179, premium: 289 },
  OTHER: { launch: 89, business: 229, premium: 389 }, // default USD
};

// -----------------------------
// Utilities
// -----------------------------
function detectInitialRegion(): RegionKey {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
    const lang = navigator.language?.toLowerCase() || "";

    // Timezone-based guesses
    if (tz.includes("Johannesburg")) return "ZA";
    if (tz.includes("Africa/") && !tz.includes("Johannesburg")) return "ZA";
    if (tz.includes("London")) return "UK";
    if (tz.includes("Europe/")) return "EU";
    if (tz.includes("America/")) return "US";

    // Language-based hints
    if (lang.endsWith("-za")) return "ZA";
    if (lang.endsWith("-gb")) return "UK";
    if (lang.startsWith("en-")) return "US";
    if (lang.startsWith("fr-") || lang.startsWith("de-") || lang.startsWith("es-") || lang.startsWith("it-")) return "EU";
  } catch {
    // fall through
  }
  return "OTHER";
}

function formatPrice(region: RegionKey, amount: number): string {
  const { symbol, code } = REGION_CURRENCY[region];
  // Keep it simple and consistent (no decimals for ZAR/GBP/EUR; USD without decimals as we set clean ints)
  if (region === "ZA") return `${symbol}${amount.toLocaleString("en-ZA")}/mo`;
  if (region === "UK") return `${symbol}${amount}/mo`;
  if (region === "EU") return `${symbol}${amount}/mo`;
  // US + OTHER -> USD
  try {
    return `${symbol}${new Intl.NumberFormat("en-US", {
      style: "decimal",
      maximumFractionDigits: 0,
    }).format(amount)}/mo`;
  } catch {
    return `${symbol}${amount}/mo`;
  }
}

function mailtoForPlan(planName: string, region: RegionKey) {
  const subject = encodeURIComponent(`All Done Sites — Get Started (${planName}, ${REGION_LABELS[region]})`);
  const body = encodeURIComponent(
    [
      `Hi team,`,
      ``,
      `I'd like to get started with the **${planName}** plan.`,
      `Region: ${REGION_LABELS[region]}`,
      `Page: ${typeof window !== "undefined" ? window.location.href : ""}`,
      ``,
      `Please let me know next steps.`,
      ``,
      `Thanks!`,
    ].join("\n")
  );

  // TODO: Replace with your preferred sales email
  const salesEmail = "hello@alldonesites.com";
  return `mailto:${salesEmail}?subject=${subject}&body=${body}`;
}

// -----------------------------
// Page
// -----------------------------
export default function PricingPage() {
  const [region, setRegion] = useState<RegionKey>(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem("ads_region") : null;
    return (saved as RegionKey) || detectInitialRegion();
  });

  useEffect(() => {
    try {
      localStorage.setItem("ads_region", region);
    } catch {
      // ignore
    }
  }, [region]);

  const prices = useMemo(() => PRICES[region], [region]);

  const plans: Array<{
    id: "launch" | "business" | "premium";
    name: string;
    subtitle: string;
    pages: string;
    price: string;
    features: string[];
    inherits?: string; // textual cue for "includes everything in ..."
    highlight?: boolean;
    badge?: string;
    ctaHref: string;
  }> = useMemo(() => {
    return [
      {
        id: "launch",
        name: "Launch",
        subtitle: "Your digital starting point",
        pages: "Single-page website",
        price: formatPrice(region, prices.launch),
        features: [
          "Mobile-friendly responsive design",
          "Hosting, SSL & automated backups",
          "1 small update per month included",
          "Basic SEO setup",
        ],
        ctaHref: mailtoForPlan("Launch", region),
      },
      {
        id: "business",
        name: "Business",
        subtitle: "Grow your online presence",
        pages: "Up to 5 pages",
        price: formatPrice(region, prices.business),
        features: [
          "Everything in Launch",
          "Custom branding & styling",
          "2 small updates per month included",
          "Priority response window",
        ],
        ctaHref: mailtoForPlan("Business", region),
      },
      {
        id: "premium",
        name: "Premium",
        subtitle: "Advanced features & priority care",
        pages: "Up to 12 pages",
        price: formatPrice(region, prices.premium),
        features: [
          "Everything in Launch & Business",
          "Advanced sections & interactive components",
          "3 small updates + 1 normal update per month",
          "SEO enhancements & analytics insights",
          "Priority support & faster turnaround",
        ],
        highlight: true,
        badge: "Most Popular",
        ctaHref: mailtoForPlan("Premium", region),
      },
    ];
  }, [region, prices]);

  return (
    <>
      <Seo
        title="Pricing — All Done Sites"
        description="Simple, subscription-first website packages. No big upfront cost. Pick Launch, Business, or Premium with hosting, SSL, backups, and monthly updates included."
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "ProductCollection",
          name: "All Done Sites Plans",
          url: typeof window !== "undefined" ? window.location.href : "https://example.com/pricing",
          hasOfferCatalog: {
            "@type": "OfferCatalog",
            name: "Website plans",
            itemListElement: Object.values(plans).map((p) => ({
              "@type": "Offer",
              name: p.name,
              price: p.price.replace(/[^0-9.]/g, ""),
              priceCurrency: REGION_CURRENCY[region].code,
            })),
          },
        }}
      />

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
        <header className="mb-8 text-center">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Simple monthly pricing</h1>
          <p className="mt-3 text-muted-foreground">
            No big upfront fees. Hosting, SSL, backups, and monthly updates included.
          </p>

          {/* Region selector */}
          <div className="mt-6 inline-flex items-center gap-3 rounded-xl border bg-card p-2 shadow-sm">
            <span className="text-sm text-muted-foreground">Region:</span>
            <select
              className="rounded-lg border bg-background px-3 py-2 text-sm"
              value={region}
              onChange={(e) => setRegion(e.target.value as RegionKey)}
            >
              <option value="ZA">{REGION_LABELS.ZA}</option>
              <option value="US">{REGION_LABELS.US}</option>
              <option value="UK">{REGION_LABELS.UK}</option>
              <option value="EU">{REGION_LABELS.EU}</option>
              <option value="OTHER">{REGION_LABELS.OTHER}</option>
            </select>
          </div>
        </header>

        <div className="grid gap-6 md:grid-cols-3">
          {plans.map((plan) => (
            <article
              key={plan.id}
              className={[
                "relative rounded-2xl border p-6 shadow-sm transition",
                plan.highlight
                  ? "border-primary/70 ring-2 ring-primary/30"
                  : "border-muted",
                "bg-card"
              ].join(" ")}
            >
              {/* Badge for highlighted plan */}
              {plan.highlight && plan.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground shadow">
                    <Star className="h-3 w-3" /> {plan.badge}
                  </span>
                </div>
              )}

              <h2 className="text-xl font-semibold">{plan.name}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{plan.subtitle}</p>

              <div className="mt-4 text-3xl font-bold">{plan.price}</div>
              <div className="mt-1 text-sm text-muted-foreground">{plan.pages}</div>

              <ul className="mt-6 space-y-2 text-sm">
                {plan.features.map((f, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 flex-none" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-8">
                {plan.highlight ? (
                  <a
                    href={plan.ctaHref}
                    className="inline-flex w-full items-center justify-center rounded-xl border border-primary bg-primary/95 px-4 py-2 text-sm font-medium text-primary-foreground shadow-md transition hover:bg-primary"
                  >
                    Get Started
                  </a>
                ) : (
                  <Button
                    asChild
                    className="w-full rounded-xl border px-4 py-2 text-sm font-medium shadow-sm"
                    variant="secondary"
                  >
                    <a href={plan.ctaHref}>Get Started</a>
                  </Button>
                )}
              </div>

              {/* Subtle gradient under highlight card */}
              {plan.highlight && (
                <div className="pointer-events-none absolute inset-x-0 -bottom-6 h-6 rounded-b-2xl bg-gradient-to-b from-primary/15 to-transparent" />
              )}
            </article>
          ))}
        </div>

        {/* Custom / Enterprise */}
        <div className="mt-10 rounded-2xl border bg-card p-6 shadow-sm">
          <h3 className="text-lg font-medium">Custom / Enterprise</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            For very large or complex projects, we’ll scope a tailored monthly plan. A partial upfront may apply to
            cover heavy initial development, then an ongoing subscription for maintenance and enhancements.
          </p>
          <div className="mt-4">
            <Button asChild className="rounded-xl">
              <a href={mailtoForPlan("Custom / Enterprise", region)}>Talk to us</a>
            </Button>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          All plans include hosting, SSL, and automated backups. Prices shown are per month. Change region to see local currency.
        </p>
      </section>
    </>
  );
}
