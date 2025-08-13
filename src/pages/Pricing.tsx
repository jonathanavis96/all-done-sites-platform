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
// These URLs point to Paystack payment pages for each region and tier.  Each
// region defaults to its own set of links, with OTHER falling back to the US
// pages.  When users click “Pay Now” on the pricing cards the correct page
// for their detected region and selected tier is opened.  See the README or
// pricing notes for more details.
const PAYSTACK_PAGES: Record<RegionKey, { launch: string; business: string; premium: string }> = {
  ZA: {
    launch: "https://paystack.com/pay/vwmef9qepw",
    business: "https://paystack.com/pay/2vckz2kpat",
    premium: "https://paystack.com/pay/3k1lj5lg7q",
  },
  US: {
    launch: "https://paystack.com/pay/bv9n4t60qh",
    business: "https://paystack.com/pay/0o8-4eh5xd",
    premium: "https://paystack.com/pay/x90og4i8e8",
  },
  UK: {
    launch: "https://paystack.com/pay/rgzuk08ran",
    business: "https://paystack.com/pay/6ex8hpa7ad",
    premium: "https://paystack.com/pay/q30qlmtqq-",
  },
  EU: {
    launch: "https://paystack.com/pay/lh7ae1u8-t",
    business: "https://paystack.com/pay/axfspb03tv",
    premium: "https://paystack.com/pay/rpmvma15mk",
  },
  OTHER: {
    // Fallback to US links for visitors outside supported regions
    launch: "https://paystack.com/pay/bv9n4t60qh",
    business: "https://paystack.com/pay/0o8-4eh5xd",
    premium: "https://paystack.com/pay/x90og4i8e8",
  },
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
  // Build a query string that pre‑fills the contact form subject and passes
  // through the user’s region.  The subject is formatted like "Launch Plan
  // Enquiry" which helps us distinguish enquiries by tier when emails arrive.
  const params = new URLSearchParams();
  // encode spaces as plus signs for consistency with typical URL encoding
  const subject = `${planName} Plan Enquiry`.replace(/ /g, "+");
  params.set("subject", subject);
  params.set("region", region);
  return `${routeWithBase("/contact")}?${params.toString()}`;
}

// -----------------------------
// Page
// -----------------------------
export default function PricingPage() {
  const [region, setRegion] = useState<RegionKey>("OTHER");
  // Holds the selected plan for which to show the "Get Started" modal. When null no modal is open.
  const [activePlan, setActivePlan] = useState<{
    id: "launch" | "business" | "premium";
    name: string;
    price: string;
    payLink: string;
  } | null>(null);

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
    payLink: string;
  }> = useMemo(() => {
    // Build the plan list with paystack links based on region detection.  The
    // payLink property points to the Paystack subscription page for the
    // specific tier and region.
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
        ],
        highlight: true,
        badge: "Most Popular",
        payLink: PAYSTACK_PAGES[region].premium,
      },
    ];
  }, [region, prices]);

  /**
   * Handles the "Call us" action.  On mobile devices it triggers a tel: link to
   * start a phone call immediately.  On desktop browsers, tel: links often
   * don’t work so we instead show an alert with the number.  The number is
   * copied to the clipboard if available to make it easy for the user to
   * paste into their phone or dialer.
   */
  function handleCall() {
    const phone = "+27822227457";
    const isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
    if (isMobile) {
      window.location.href = `tel:${phone}`;
    } else {
      // Try to copy to clipboard; if not possible, just show alert.
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
                {/* Primary call-to-action: open a modal with multiple options */}
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

        {/* Custom / Enterprise */}
        <div className="mt-10 rounded-2xl border bg-card p-6 shadow-sm">
          <h3 className="text-lg font-medium">Custom / Enterprise</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            For very large or complex projects, we’ll scope a tailored monthly plan. A partial upfront may apply to cover
            heavy initial development, then an ongoing subscription for maintenance and enhancements.
          </p>
          <div className="mt-4">
            {/* The enterprise tier uses a pre‑filled contact form to capture
               details up front.  Link directly to the contact page with a
               subject query so the form knows it’s an enterprise enquiry.  Use
               the default button variant to emphasise this call to action. */}
            <Button asChild variant="default" className="rounded-xl">
              <Link to={routeWithBase("/contact?subject=Enterprise+Plan+Enquiry")}>Talk to us</Link>
            </Button>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          All plans include hosting, SSL and automated backups. Prices shown are per month and based on your region.
          International customers will be charged in South African rand (ZAR); your bank converts the amount at the
          prevailing exchange rate, so the final price in your currency may vary.
        </p>
      </section>

      {/* Modal for selecting how to get started.  When a plan card is clicked the
          activePlan state is set and this dialog becomes visible. */}
      {activePlan && (
        <Dialog open={true} onOpenChange={() => setActivePlan(null)}>
          <DialogContent className="max-w-md sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {activePlan.name} Plan – Get Started
              </DialogTitle>
              <DialogDescription>
                Choose how you’d like to get started with the {activePlan.name} plan.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-3 mt-4">
              {/* Pay Now button */}
              {/*
                Highlight the pay-now action by using the default button
                variant.  The default variant renders with the site’s
                primary colour and contrasts the outline buttons used for
                secondary actions.
              */}
              <Button
                variant="default"
                asChild
              >
                <a href={activePlan.payLink} target="_blank" rel="noopener noreferrer">
                  Pay&nbsp;Now
                </a>
              </Button>
              {/* WhatsApp button */}
              <Button
                variant="outline"
                asChild
              >
                <a href="https://wa.me/2765864469" target="_blank" rel="noopener noreferrer">
                  WhatsApp&nbsp;us
                </a>
              </Button>
              {/* Call us button */}
              <Button
                variant="outline"
                onClick={() => {
                  handleCall();
                }}
              >
                Call&nbsp;us
              </Button>
              {/* Email/contact button */}
              <Button
                variant="outline"
                asChild
              >
                <Link to={contactHref(activePlan.name, region)}>
                  Email&nbsp;us
                </Link>
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
    </>
  );
}
