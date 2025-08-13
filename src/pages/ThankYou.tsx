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
  const plan = params.get("plan") ?? "";
  const region = params.get("region") ?? "";

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
      const res = await fetch("https://formspree.io/f/xpwlbglb", {
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