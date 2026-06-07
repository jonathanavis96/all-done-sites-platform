import React from "react";
import Seo from "@/components/Seo";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "react-router-dom";
import { PageShell } from "@/components/redesign/RedesignChrome";

/**
 * ThankYou page shown after a successful subscription payment.
 * Thanks the customer and collects a few onboarding details via Formspree.
 */
export default function ThankYou() {
  const { toast } = useToast();
  const [status, setStatus] = React.useState<"idle" | "sending">("idle");
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  // Paystack appends `?reference=...` after our query string, which can leave a
  // stray `?` in the value; split at the first `?` to avoid leaking it.
  const rawPlan = params.get("plan") ?? "";
  const rawRegion = params.get("region") ?? "";
  const plan = rawPlan.split("?")[0];
  const region = rawRegion.split("?")[0];

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("sending");
    const form = e.currentTarget;
    const data = new FormData(form);

    const gotcha = (data.get("_gotcha") as string) || "";
    if (gotcha.trim() !== "") {
      toast({ title: "Thanks!", description: "We've received your details." });
      setStatus("idle");
      form.reset();
      return;
    }

    try {
      const res = await fetch("https://formspree.io/f/mrbazkqg", {
        method: "POST",
        body: data,
        headers: { Accept: "application/json" },
      });
      if (res.ok) {
        toast({ title: "Thank you!", description: "We'll get started and reach out shortly." });
        form.reset();
      } else {
        toast({ title: "Error", description: "Something went wrong. Please try again." });
      }
    } catch {
      toast({ title: "Error", description: "Network error. Please try again." });
    } finally {
      setStatus("idle");
    }
  }

  const agreementHref = `${import.meta.env.BASE_URL ?? "/"}AllDoneSites_Subscription_Agreement.pdf`;
  const planLabel = plan ? plan.charAt(0).toUpperCase() + plan.slice(1) : "";

  return (
    <PageShell eyebrow="You're in" title="Thanks for subscribing!">
      <Seo
        title="Thank You | All Done Sites"
        description="Thanks for subscribing. Provide a few details so we can start building your site."
      />
      <div className="pageform">
        <div className="confirm">
          <span className="tick">✓</span>
          <p>
            Payment received{planLabel && region ? ` — ${planLabel} plan (${region.toUpperCase()})` : ""}. Share a couple
            of details below and we'll start building your site.
          </p>
        </div>

        <p className="pagenote">
          Need a copy of the agreement? Download our All&nbsp;Done&nbsp;Sites Subscription Agreement as a PDF{" "}
          <a href={agreementHref} target="_blank" rel="noopener noreferrer" style={{ color: "var(--ads-acd)", fontWeight: 600 }}>
            here
          </a>
          .
        </p>

        <form className="form" onSubmit={onSubmit} style={{ marginTop: "18px" }}>
          <input type="text" name="_gotcha" tabIndex={-1} autoComplete="off" style={{ display: "none" }} aria-hidden="true" />
          <input type="hidden" name="_subject" value="All Done Sites — Subscriber onboarding" />

          <div className="field">
            <label htmlFor="ty-business">Business name</label>
            <input id="ty-business" name="businessName" placeholder="Your Company" required disabled={status === "sending"} />
          </div>
          <div className="field">
            <label htmlFor="ty-website">Website or content link (optional)</label>
            <input id="ty-website" name="website" placeholder="https://example.com" disabled={status === "sending"} />
          </div>
          <div className="field">
            <label htmlFor="ty-email">Your email</label>
            <input id="ty-email" name="email" type="email" placeholder="you@business.com" required disabled={status === "sending"} />
          </div>

          {/* Terms-acceptance details captured at checkout (if present). */}
          {(() => {
            try {
              const stored = localStorage.getItem("termsAccepted");
              if (!stored) return null;
              const details = JSON.parse(stored);
              return (
                <>
                  <input type="hidden" name="termsAcceptedAt" value={details.acceptedAt || ""} />
                  <input type="hidden" name="termsIP" value={details.ip || ""} />
                  <input type="hidden" name="termsPlan" value={details.plan || plan} />
                  <input type="hidden" name="termsRegion" value={details.region || region} />
                  <input type="hidden" name="termsVersion" value={details.termsVersion || ""} />
                </>
              );
            } catch {
              return null;
            }
          })()}

          <button className="btn lg formbtn" type="submit" disabled={status === "sending"}>
            {status === "sending" ? "Submitting…" : "Submit details"}
          </button>
        </form>
      </div>
    </PageShell>
  );
}
