import Seo from "@/components/Seo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import React from "react";

/**
 * Enterprise contact page. Tailored for large or custom projects.
 */
export default function ContactEnterprise() {
  const { toast } = useToast();
  const [status, setStatus] = React.useState<"idle" | "sending">("idle");

  // Enterprise-only endpoint
  const formEndpoint = "https://formspree.io/f/xblaryol";
  const selectedPlan = "enterprise";

  const computedSubject = React.useMemo(() => {
    const name = selectedPlan.charAt(0).toUpperCase() + selectedPlan.slice(1);
    return `All Done Sites — ${name} plan enquiry`;
  }, [selectedPlan]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("sending");
    const form = e.currentTarget;
    const data = new FormData(form);

    // Honeypot
    const gotcha = (data.get("_gotcha") as string) || "";
    if (gotcha.trim() !== "") {
      toast({ title: "Thanks!", description: "We'll get back to you shortly." });
      setStatus("idle");
      form.reset();
      return;
    }

    try {
      const res = await fetch(formEndpoint, {
        method: "POST",
        body: data,
        headers: { Accept: "application/json" },
      });
      if (res.ok) {
        toast({ title: "Thanks!", description: "We'll get back to you within one business day." });
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
    <section
      id="contact-enterprise"
      className="mx-auto max-w-3xl rounded-3xl border border-primary/20 bg-card p-8 shadow-lg py-16"
    >
      <Seo
        title="Enterprise & Custom Websites | All Done Sites"
        description="Need custom builds, integrations, or advanced support? Tell us about your project and we'll propose the right enterprise plan."
      />

      <header className="max-w-2xl mx-auto text-center">
        <h1 className="text-4xl font-bold tracking-tight">Enterprise &amp; Custom Websites</h1>
        <p className="mt-3 text-base text-muted-foreground">
          Tell us about your large or custom project and our team will get back to you promptly.
        </p>
      </header>

      {/* Direct contact options for enterprise leads */}
      <div className="mt-8 space-y-2 text-center">
        <p className="text-sm text-muted-foreground">Prefer to speak to us first?</p>
        <div className="flex flex-col items-center justify-center gap-2 sm:flex-row sm:gap-4">
          <a
            href="tel:+27822227457"
            className="inline-flex items-center rounded-lg border border-primary px-4 py-2 text-primary hover:bg-primary/5"
          >
            Call us&nbsp;+27&nbsp;82&nbsp;222&nbsp;7457
          </a>
          <a
            href="https://wa.me/27765864469"
            className="inline-flex items-center rounded-lg border border-primary px-4 py-2 text-primary hover:bg-primary/5"
            target="_blank"
            rel="noopener noreferrer"
          >
            WhatsApp us&nbsp;+27&nbsp;76&nbsp;586&nbsp;4469
          </a>
        </div>
      </div>

      <form onSubmit={onSubmit} className="mt-12 grid gap-6 md:grid-cols-2">
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Name</label>
            <Input name="name" placeholder="Jane Doe" required disabled={status === "sending"} />
          </div>
          <div>
            <label className="text-sm font-medium">Company</label>
            <Input name="company" placeholder="Your Company" disabled={status === "sending"} />
          </div>
          <div>
            <label className="text-sm font-medium">Email</label>
            <Input
              name="email"
              type="email"
              placeholder="you@business.com"
              required
              disabled={status === "sending"}
            />
          </div>
          <div>
            <label className="text-sm font-medium">Phone</label>
            <Input
              name="phone"
              type="tel"
              placeholder="(555) 000-0000"
              disabled={status === "sending"}
            />
          </div>
        </div>

        <div className="flex flex-col">
          <label className="text-sm font-medium">Message</label>
          <Textarea
            name="message"
            className="min-h-[180px]"
            placeholder="What do you need?"
            required
            disabled={status === "sending"}
          />

          {/* Show the plan name as read-only for enterprise */}
          <div className="mt-4">
            <label className="text-sm font-medium">Plan</label>
            <Input value="Enterprise" readOnly className="cursor-not-allowed" />
            <input type="hidden" name="plan" value={selectedPlan} />
          </div>

          <input type="hidden" name="_subject" value={computedSubject} />
          <input type="text" name="_gotcha" className="hidden" tabIndex={-1} autoComplete="off" />

          <Button
            type="submit"
            size="lg"
            variant="hero"
            className="mt-6 self-start"
            disabled={status === "sending"}
          >
            {status === "sending" ? "Sending…" : "Send Message"}
          </Button>
        </div>
      </form>
    </section>
  );
}
