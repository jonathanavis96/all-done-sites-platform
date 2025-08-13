import React, { useMemo, useState, useEffect } from "react";
import Seo from "@/components/Seo";
import { Check, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

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

// Pricing (decoy/anchor)
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
function detectRegion(): RegionKey {
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

function formatPrice(region: RegionKey, amount: number): string {
  const { symbol } = REGION_CURRENCY[region];
  if (region === "ZA") return `${symbol}${amount.toLocaleString("en-ZA")}/mo`;
  if (region === "UK" || region === "EU") return `${symbol}${amount}/mo`;
  // US + OTHER
  return `${symbol}${new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(amount)}/mo`;
}

function routeWithBase(path: string): string {
  // Ensure internal routes work on GitHub Pages subfolder
  const base = import.meta.env.BASE_URL || "/";
  // Guarantee exactly one slash between base and path
  const cleanedBase = base.endsWith("/") ? base.slice(0, -1) : base;
  const cleanedPath = path.startsWith("/") ? path : `/${path}`;
  return `${cleanedBase}${cleanedPath}`;
}

function contactHref(planName: string, region: RegionKey): string {
  const params = new URLSearchParams({
    plan: planName.toLowerCase(),
    region: region,
  });
  return `${routeWithBase("/contact")}?${params.toString()}`;
}

// -----------------------------
// Page
// -----------------------------
export default function PricingPage() {
  const [region, setRegion] = useState<RegionKey>("OTHER");

  useEffect(() => {
    // One-time auto-detection (no manual override UI)
    const r = detectRegion();
    setRegion(r);
  }, []);

  const prices = useMemo(() => PRICES[region], [region]);

  const plans: Array<{
    id: "launch" | "business" | "premium";
    name: string;
    subtitle: string;
    pages: string;
    price: string;
    features: string[];
    highlight?: boolean;
    badge?: string;
    ctaTo: string;
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
        ctaTo: contactHref("Launch", region),
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
        ctaTo: contactHref("Business", region),
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
        ctaTo: contactHref("Premium", region),
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
        </header>

        <div className="grid gap-6 md:grid-cols-3">
          {plans.map((plan) => (
            <article
              key={plan.id}
              className={[
                "relative rounded-2xl border p-6 shadow-sm transition",
                plan.highlight ? "border-primary/70 ring-2 ring-primary/30" : "border-muted",
                "bg-card",
              ].join(" ")}
            >
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
                  <Link
                    to={plan.ctaTo}
                    className="inline-flex w-full items-center justify-center rounded-xl border border-primary bg-primary/95 px-4 py-2 text-sm font-medium text-primary-foreground shadow-md transition hover:bg-primary"
                  >
                    Get Started
                  </Link>
                ) : (
                  <Button asChild className="w-full rounded-xl border px-4 py-2 text-sm font-medium shadow-sm" variant="secondary">
                    <Link to={plan.ctaTo}>Get Started</Link>
                  </Button>
                )}
              </div>

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
            For very large or complex projects, we’ll scope a tailored monthly plan. A partial upfront may apply to cover
            heavy initial development, then an ongoing subscription for maintenance and enhancements.
          </p>
          <div className="mt-4">
            <Button asChild className="rounded-xl">
              <Link to={contactHref("Custom / Enterprise", region)}>Talk to us</Link>
            </Button>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          All plans include hosting, SSL, and automated backups. Prices shown are per month and based on your region.
        </p>
      </section>
    </>
  );
}
