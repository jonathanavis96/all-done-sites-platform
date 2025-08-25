import React, { useMemo, useState, useEffect } from "react";
import Seo from "@/components/Seo";
import { Check, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";

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

// -----------------------------
// Paystack subscription pages
// -----------------------------
const PAYSTACK_BASE = "https://paystack.com/pay/";
const PAYSTACK_PAGES: Record<RegionKey, { launch: string; business: string; premium: string }> = {
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

// -----------------------------
// Pricing (decoy/anchor)
// -----------------------------
const PRICES: Record<RegionKey, { launch: number; business: number; premium: number }> = {
  ZA: { launch: 799, business: 2200, premium: 3600 },
  US: { launch: 89, business: 229, premium: 389 },
  UK: { launch: 69, business: 179, premium: 269 },
  EU: { launch: 69, business: 179, premium: 289 },
  OTHER: { launch: 89, business: 229, premium: 389 },
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
  return `${symbol}${new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(amount)}/mo`;
}

function routeWithBase(path: string): string {
  const base = import.meta.env.BASE_URL || "/";
  const cleanedBase = base.endsWith("/") ? base.slice(0, -1) : base;
  const cleanedPath = path.startsWith("/") ? path : `/${path}`;
  return `${cleanedBase}${cleanedPath}`;
}

/**
 * Build a link to the contact page (React Router handles basename).
 */
function contactHref(planId: string, region: RegionKey): string {
  const params = new URLSearchParams();
  params.set("plan", planId);
  params.set("region", region);
  return `/contact?${params.toString()}`;
}

// -----------------------------
// Page
// -----------------------------
export default function PricingPage() {
  const [region, setRegion] = useState<RegionKey>("OTHER");
  const [activePlan, setActivePlan] = useState<{
    id: "launch" | "business" | "premium";
    name: string;
    price: string;
    payLink: string;
  } | null>(null);

  // Terms dialog state
  const [showTerms, setShowTerms] = useState(false);
  const [pendingPlan, setPendingPlan] = useState<{
    id: "launch" | "business" | "premium";
    name: string;
    payLink: string;
  } | null>(null);
  const [termsChecked, setTermsChecked] = useState(false);
  const [termsText, setTermsText] = useState<string>("");

  useEffect(() => {
    const base = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");
    fetch(`${base}/terms.txt`)
      .then((res) => res.text())
      .then((txt) => setTermsText(txt))
      .catch(() => {
        setTermsText(
          "All Done Sites Subscription Agreement could not be loaded. Please visit our website to read the latest terms."
        );
      });
  }, []);

  async function recordTermsAcceptance(planId: string) {
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
    const details = {
      plan: planId,
      region,
      acceptedAt,
      ip,
      termsVersion: "2025-08-13",
    };
    try {
      await fetch("https://formspree.io/f/mwpneboe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          _subject: "Terms acceptance record",
          ...details,
        }),
      });
    } catch {
      // ignore
    }
    localStorage.setItem("termsAccepted", JSON.stringify(details));
  }

  useEffect(() => {
    setRegion(detectRegion());
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
    payLink: string;
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
          "2 professional mailboxes @yourdomain included",
        ],
        payLink: PAYSTACK_PAGES[region].launch,
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
          "6 professional mailboxes @yourdomain included",
        ],
        payLink: PAYSTACK_PAGES[region].business,
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
          "14 professional mailboxes @yourdomain included",
        ],
        highlight: true,
        badge: "Most Popular",
        payLink: PAYSTACK_PAGES[region].premium,
      },
    ];
  }, [region, prices]);

  function handleCall() {
    const phone = "+27822227457";
    const isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
    if (isMobile) {
      window.location.href = `tel:${phone}`;
    } else {
      (async () => {
        try {
          await navigator.clipboard?.writeText?.(phone);
          alert(`Call us at ${phone}.\n\nThe number has been copied to your clipboard.`);
        } catch {
          alert(`Call us at ${phone}`);
        }
      })();
    }
  }

  return (
    <>
      <Seo
        title="Simple Monthly Pricing | All Done Sites"
        description="Pick a monthly website plan that includes design, hosting, security, email, and updates. Clear pricing with no hidden fees or long contracts."
      />

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
        <header className="mb-8 text-center">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Simple monthly pricing</h1>
          <p className="mt-3 text-muted-foreground">
            No big upfront fees. Hosting, SSL, automated backups, professional enterprise-grade email, and monthly
            updates included.
          </p>
        </header>

        <div className="grid gap-6 md:grid-cols-3">
          {plans.map((plan) => (
            <article
              key={plan.id}
              className={[
                "relative rounded-2xl border p-6",
                plan.highlight ? "border-primary/30" : "border-muted",
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
                <Button
                  className="w-full rounded-xl"
                  variant={plan.highlight ? "hero" : "outline"}
                  onClick={() =>
                    setActivePlan({
                      id: plan.id,
                      name: plan.name,
                      price: plan.price,
                      payLink: plan.payLink,
                    })
                  }
                >
                  Get Started
                </Button>
              </div>

              {plan.highlight && (
                <div className="pointer-events-none absolute inset-x-0 -bottom-6 h-6 rounded-b-2xl bg-gradient-to-b from-primary/15 to-transparent" />
              )}
            </article>
          ))}
        </div>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Need more? Additional professional mailboxes can be added at <strong>R40/month each</strong>.
        </p>

        {/* Custom / Enterprise */}
        <div className="mt-10 rounded-2xl border bg-card p-6 shadow-sm">
          <h3 className="text-lg font-medium">Custom / Enterprise</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            For very large or complex projects, we’ll scope a tailored monthly plan. A partial upfront may apply to cover
            heavy initial development, then an ongoing subscription for maintenance and enhancements.
          </p>
          <div className="mt-4">
            <Button asChild variant="default" className="rounded-xl">
              <Link to="/contact-enterprise">Talk to us</Link>
            </Button>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          All plans include hosting, SSL and automated backups. Prices shown are per month and based on your region.
          International customers will be charged in South African rand (ZAR); your bank converts the amount at the
          prevailing exchange rate, so the final price in your currency may vary.
        </p>
      </section>

      {/* Get Started modal */}
      {activePlan && (
        <Dialog open={true} onOpenChange={() => setActivePlan(null)}>
          <DialogContent className="max-w-md sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{activePlan.name} Plan – Get Started</DialogTitle>
              <DialogDescription>
                Choose how you’d like to get started with the {activePlan.name} plan.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-3 mt-4">
              {/* Pay Now */}
              <Button
                variant="default"
                onClick={() => {
                  setPendingPlan({ id: activePlan.id, name: activePlan.name, payLink: activePlan.payLink });
                  setShowTerms(true);
                  setTermsChecked(false);
                  setActivePlan(null);
                }}
              >
                Pay&nbsp;Now
              </Button>
              {/* WhatsApp */}
              <Button variant="outline" asChild>
                <a href="https://wa.me/27765864469" target="_blank" rel="noopener noreferrer">
                  WhatsApp&nbsp;us
                </a>
              </Button>
              {/* Call */}
              <Button variant="outline" onClick={handleCall}>
                Call&nbsp;us
              </Button>
              {/* Email */}
              <Button variant="outline" asChild>
                <Link to={contactHref(activePlan.id, region)}>Email&nbsp;us</Link>
              </Button>
            </div>
            <DialogFooter className="mt-6">
              <DialogClose asChild>
                <Button variant="ghost">Cancel</Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Terms dialog */}
      {showTerms && pendingPlan && (
        <Dialog open={showTerms} onOpenChange={(open) => setShowTerms(open)}>
          <DialogContent className="max-w-2xl sm:max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl sm:text-2xl font-bold">
                All&nbsp;Done&nbsp;Sites Subscription Agreement
              </DialogTitle>
              <DialogDescription>
                Please review the agreement below. You must accept the terms before proceeding to payment.
              </DialogDescription>
            </DialogHeader>

            <div className="mt-4 overflow-y-auto whitespace-pre-wrap text-sm leading-relaxed space-y-3 max-h-[50vh] pr-4">
              {termsText || "Loading…"}
            </div>

            <div className="mt-6 flex items-start gap-2">
              <input
                id="termsCheckbox"
                type="checkbox"
                checked={termsChecked}
                onChange={(e) => setTermsChecked(e.target.checked)}
                className="mt-1 h-4 w-4 border rounded"
              />
              <label htmlFor="termsCheckbox" className="text-sm leading-snug">
                I have read, understood and agree to be bound by the All&nbsp;Done&nbsp;Sites Subscription Agreement.
              </label>
            </div>

            <DialogFooter className="mt-6">
              <Button
                onClick={async () => {
                  if (!pendingPlan) return;
                  await recordTermsAcceptance(pendingPlan.id);
                  setShowTerms(false);
                  window.location.href = pendingPlan.payLink;
                }}
                disabled={!termsChecked}
              >
                Accept&nbsp;&amp;&nbsp;Continue
              </Button>
              <DialogClose asChild>
                <Button variant="ghost" onClick={() => setShowTerms(false)}>
                  Cancel
                </Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
