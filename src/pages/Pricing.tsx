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
    // Fallback to US links for visitors outside supported regions
    launch: `${PAYSTACK_BASE}alldonesites-launch-us`,
    business: `${PAYSTACK_BASE}alldonesites-business-us`,
    premium: `${PAYSTACK_BASE}alldonesites-premium-us`,
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

/**
 * Build a link to the contact page.  We avoid using `routeWithBase` here
 * because the React Router basename (e.g. `/all-done-sites-platform`) is
 * automatically applied by the <Link> component.  Passing the full base path
 * twice caused URLs like `/all-done-sites-platform/all-done-sites-platform/...`
 * which break on GitHub Pages.  We encode the selected plan (if any) and
 * region into query parameters so the contact form can pre‑populate fields.
 */
function contactHref(planId: string, region: RegionKey): string {
  const params = new URLSearchParams();
  // include the plan id (launch, business, premium) so the contact form
  // knows which plan the user selected; this param is optional and the
  // form will show a dropdown when omitted.
  params.set("plan", planId);
  params.set("region", region);
  // Prefix with a slash so React Router treats this as an absolute path.
  // The BrowserRouter basename (e.g. /all-done-sites-platform) will be
  // prepended automatically, resulting in URLs like
  // `/all-done-sites-platform/contact?plan=...&region=...`.  Without the
  // leading slash the path becomes relative to the current page (e.g.
  // /pricing/contact), which is why the previous version produced 404s.
  return `/contact?${params.toString()}`;
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

  // -----------------------------
  // Terms of service / master subscription agreement
  // -----------------------------
  // Whether the terms dialog is shown.  When a user clicks “Pay Now”
  // on a plan card we first show our own Get Started options (pay
  // now, WhatsApp, call, email).  If they choose Pay Now we then
  // display the terms dialog.  The user must scroll through the
  // agreement, tick the checkbox and click “Accept” before we
  // redirect them to the Paystack payment page.  This ensures they
  // actively agree to the latest agreement.  Acceptance details are
  // stored locally and sent via Formspree for record‑keeping.
  const [showTerms, setShowTerms] = useState(false);
  // Holds the plan being purchased when showing terms
  const [pendingPlan, setPendingPlan] = useState<{
    id: "launch" | "business" | "premium";
    name: string;
    payLink: string;
  } | null>(null);
  // Track whether the user has checked the acceptance box
  const [termsChecked, setTermsChecked] = useState(false);
  // Terms text loaded from the public/terms.txt file
  const [termsText, setTermsText] = useState<string>("");

  // Fetch the terms document on first render.  It lives in the
  // `public` folder as terms.txt and is served at the root of the
  // deployed site.  We prepend the `BASE_URL` when available so
  // GitHub Pages subfolder deployment works correctly.
  useEffect(() => {
    const base = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");
    fetch(`${base}/terms.txt`)
      .then((res) => res.text())
      .then((txt) => setTermsText(txt))
      .catch(() => {
        // Fallback: if fetch fails we show a short placeholder
        setTermsText(
          "All Done Sites Subscription Agreement could not be loaded. Please visit our website to read the latest terms."
        );
      });
  }, []);

  // Helper to record acceptance of the master subscription agreement.  It
  // captures the current date/time, the visitor’s IP address via a
  // simple public service, the selected plan and region, and a
  // version identifier.  These details are stored in localStorage so
  // they can be included on the thank‑you form submission.  The
  // details are also sent to a Formspree endpoint for record keeping.
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
      // ignore network errors; we’ll leave ip blank
    }
    const details = {
      plan: planId,
      region,
      acceptedAt,
      ip,
      // Update this version identifier whenever the terms change
      termsVersion: "2025-08-13",
    };
    try {
      // Send details to Formspree for your records.  Replace the
      // endpoint ID below with a dedicated form if desired.  We send
      // JSON data to keep the payload small; Formspree will include
      // these key/value pairs in the email to you.
      // Send the acceptance details to the dedicated Terms & Conditions
      // Formspree endpoint so you receive an email with the record.
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
      // ignore errors; the submission isn’t critical to the user
    }
    // Persist locally for thank‑you form
    localStorage.setItem("termsAccepted", JSON.stringify(details));
  }

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
        description="Get a modern website and enterprise-level email for one monthly fee. Hosting, SSL, backups, and updates included. Launch, Business, or Premium."
        canonical="https://alldonesites.com/pricing"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "ProductCollection",
          name: "All Done Sites Plans",
          url: "https://alldonesites.com/pricing",
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
            No big upfront fees. Hosting, SSL, automated backups, professional enterprise-grade email, and monthly updates included.
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

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Need more? Additional professional mailboxes can be added at 
          <strong> R40/month each</strong>.
        </p>
        
        {/* Custom / Enterprise */}
        <div className="mt-10 rounded-2xl border bg-card p-6 shadow-sm">
          <h3 className="text-lg font-medium">Custom / Enterprise</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            For very large or complex projects, we’ll scope a tailored monthly plan. A partial upfront may apply to cover
            heavy initial development, then an ongoing subscription for maintenance and enhancements.
          </p>
        <div className="mt-4">
          {/* The enterprise tier uses a pre‑filled contact form to capture
             details up front.  We pass a `plan=enterprise` query parameter so
             the contact page can detect enterprise leads and show the
             appropriate Formspree endpoint.  We do not call `routeWithBase`
             here because the Link component automatically handles the router
             basename. */}
          <Button asChild variant="default" className="rounded-xl">
            {/* Link to a dedicated enterprise contact page.  Prefix with a slash so
               the Router treats this as an absolute path under the basename. */}
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
                onClick={() => {
                  // When “Pay Now” is clicked we show the terms dialog
                  setPendingPlan({ id: activePlan.id, name: activePlan.name, payLink: activePlan.payLink });
                  setShowTerms(true);
                  setTermsChecked(false);
                  // Close the get‑started dialog
                  setActivePlan(null);
                }}
              >
                Pay&nbsp;Now
              </Button>
              {/* WhatsApp button */}
              <Button
                variant="outline"
                asChild
              >
                {/* Corrected WhatsApp number (076 586 4469 → +27 76 586 4469) */}
                <a href="https://wa.me/27765864469" target="_blank" rel="noopener noreferrer">
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
                <Link to={contactHref(activePlan.id, region)}>
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

      {/* Terms dialog.  When a user chooses Pay Now from the Get Started modal
          we capture the plan in `pendingPlan` and show this dialog.  They
          must scroll through the agreement and tick the checkbox before
          continuing to Paystack. */}
      {showTerms && pendingPlan && (
        <Dialog open={showTerms} onOpenChange={(open) => setShowTerms(open)}>
          <DialogContent className="max-w-2xl sm:max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
            <DialogTitle className="text-xl sm:text-2xl font-bold">All Done Sites Subscription Agreement</DialogTitle>
              <DialogDescription>
                Please review the agreement below. You must accept the terms before proceeding to payment.
              </DialogDescription>
            </DialogHeader>
            {/* Terms text scrollable area */}
            <div className="mt-4 overflow-y-auto whitespace-pre-wrap text-sm leading-relaxed space-y-3 max-h-[50vh] pr-4">
              {termsText || "Loading…"}
            </div>
            {/* Acceptance checkbox */}
            <div className="mt-6 flex items-start gap-2">
              <input
                id="termsCheckbox"
                type="checkbox"
                checked={termsChecked}
                onChange={(e) => setTermsChecked(e.target.checked)}
                className="mt-1 h-4 w-4 border rounded"
              />
              <label htmlFor="termsCheckbox" className="text-sm leading-snug">
                I have read, understood and agree to be bound by the All Done Sites Subscription Agreement.
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
                <Button variant="ghost" onClick={() => setShowTerms(false)}>Cancel</Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
