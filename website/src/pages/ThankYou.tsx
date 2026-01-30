import React from "react";
import Seo from "@/components/Seo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "react-router-dom";

/**
 * ThankYou page shown after a successful subscription payment.
 * The page thanks the customer and collects a few onboarding details
 * (business name, website/content link, and email) via Formspree.
 */
export default function ThankYou() {
  const { toast } = useToast();
  const [status, setStatus] = React.useState<"idle" | "sending">("idle");
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  // Extract plan and region from query parameters.  Paystack appends a
  // `?reference=...` after our own query string which can leave a
  // stray question mark in the `region` value (e.g. region=za?reference=123).
  // Split at the first question mark to avoid leaking the reference into
  // region or plan.
  const rawPlan = params.get("plan") ?? "";
  const rawRegion = params.get("region") ?? "";
  const plan = rawPlan.split("?")[0];
  const region = rawRegion.split("?")[0];

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("sending");
    const form = e.currentTarget;
    const data = new FormData(form);

    // Honeypot field for spam bots
    const gotcha = (data.get("_gotcha") as string) || "";
    if (gotcha.trim() !== "") {
      toast({ title: "Thanks!", description: "We’ve received your details." });
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
        toast({ title: "Thank you!", description: "We’ll get started and reach out shortly." });
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

  // Compute the public URL for the PDF subscription agreement.  We use
  // import.meta.env.BASE_URL so that the link works correctly when the
  // site is served from a subdirectory (e.g. GitHub Pages).  The file
  // lives in the `public` folder and will be copied to the root of
  // the built site during the build.
  const agreementHref = `${import.meta.env.BASE_URL ?? "/"}AllDoneSites_Subscription_Agreement.pdf`;

  return (
    <div className="container py-16" id="thank-you">
      <Seo
        title="Thank You | All Done Sites"
        description="Thanks for subscribing. Provide a few details so we can start building your site."
      />
      <header className="max-w-2xl">
        <h1 className="text-3xl font-bold">Thanks for subscribing!</h1>
        {plan && region && (
          <p className="mt-2 text-muted-foreground">
            You’ve selected the {plan.charAt(0).toUpperCase() + plan.slice(1)} plan ({region.toUpperCase()}).
          </p>
        )}
        <p className="mt-2 text-muted-foreground">
          Please share a couple of details to help us get started.
        </p>
        <p className="mt-4 text-sm text-muted-foreground">
          Need a copy of the agreement? You can download our All&nbsp;Done&nbsp;Sites&nbsp;Subscription&nbsp;Agreement as a PDF&nbsp;
          <a
            href={agreementHref}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline"
          >
            here
          </a>
          .
        </p>
      </header>

      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <div>
          <label className="text-sm font-medium">Business Name</label>
          <Input name="businessName" placeholder="Your Company" required disabled={status === "sending"} />
        </div>
        <div>
          <label className="text-sm font-medium">Website or content link (optional)</label>
          <Input name="website" placeholder="https://example.com" disabled={status === "sending"} />
        </div>
        <div>
          <label className="text-sm font-medium">Your email</label>
          <Input
            name="email"
            type="email"
            placeholder="you@business.com"
            required
            disabled={status === "sending"}
          />
        </div>
        {/* Hidden fields to set a subject and spam catcher */}
        <input type="hidden" name="_subject" value="All Done Sites — Subscriber onboarding" />
        <input type="text" name="_gotcha" className="hidden" tabIndex={-1} autoComplete="off" />

        {/* Include terms acceptance details if present.  These are
            populated when the user accepted the Master Subscription
            Agreement during checkout.  We read them from
            localStorage.  They are optional and will be blank if the
            terms were not presented or accepted yet. */}
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

        <Button
          type="submit"
          size="lg"
          variant="hero"
          className="mt-4"
          disabled={status === "sending"}
        >
          {status === "sending" ? "Submitting…" : "Submit"}
        </Button>
      </form>
    </div>
  );
}
