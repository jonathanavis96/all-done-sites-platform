import Seo from "@/components/Seo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import React from "react";
import { useLocation } from "react-router-dom";

export default function Contact() {
  const { toast } = useToast();
  const [status, setStatus] = React.useState<"idle" | "sending">("idle");

  // Inspect the current URL query parameters to determine if this is an enterprise enquiry.
  const location = useLocation();
  const params = React.useMemo(() => new URLSearchParams(location.search), [location.search]);
  const rawSubject = params.get("subject") || "";
  const planParam = params.get("plan") || "";

  // Decode subject
  const decodedSubject = React.useMemo(() => {
    try {
      return decodeURIComponent(rawSubject.replace(/\+/g, " "));
    } catch {
      return rawSubject;
    }
  }, [rawSubject]);

  // Derive plan id from subject (e.g. "Launch Plan Enquiry")
  const subjectPlan = React.useMemo(() => {
    const match = decodedSubject.match(/^(Launch|Business|Premium|Enterprise)/i);
    return match ? match[0].toLowerCase() : "";
  }, [decodedSubject]);

  const [selectedPlan, setSelectedPlan] = React.useState<string>(planParam || subjectPlan);

  // Update selected plan once if URL params change and user hasn't chosen manually
  React.useEffect(() => {
    const initial = planParam || subjectPlan;
    if (initial && !selectedPlan) setSelectedPlan(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planParam, subjectPlan]);

  // Enterprise detection
  const isEnterprise =
    selectedPlan.toLowerCase() === "enterprise" || decodedSubject.toLowerCase().includes("enterprise");

  // Formspree endpoint selection
  const formEndpoint = isEnterprise
    ? "https://formspree.io/f/xblaryol"
    : "https://formspree.io/f/mnnbavdj";

  // Compute email subject
  const computedSubject = React.useMemo(() => {
    if (decodedSubject) return decodedSubject;
    if (selectedPlan) {
      const name = selectedPlan.charAt(0).toUpperCase() + selectedPlan.slice(1);
      return `All Done Sites — ${name} plan enquiry`;
    }
    return "All Done Sites — New enquiry";
  }, [decodedSubject, selectedPlan]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("sending");

    const form = e.currentTarget;
    const data = new FormData(form);

    // Honeypot field for spam bots
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
    <div className="container py-16" id="contact">
      <Seo
        title="Let's Build Your Website | All Done Sites"
        description="Have questions about plans, billing, or support? Send us a message and we'll get back to you fast to help you get online."
      />

      <header className="max-w-2xl">
        <h1 className="text-3xl font-bold">Let’s build your website</h1>
        <p className="mt-2 text-muted-foreground">
          Tell us about your business and we’ll reach out shortly.
        </p>
      </header>

      <form onSubmit={onSubmit} className="mt-8 grid md:grid-cols-2 gap-6">
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
            <Input name="phone" type="tel" placeholder="(555) 000-0000" disabled={status === "sending"} />
          </div>

          {/* Plan selection */}
          <div>
            <label className="text-sm font-medium">Plan</label>
            {selectedPlan ? (
              <>
                <Input
                  value={selectedPlan.charAt(0).toUpperCase() + selectedPlan.slice(1)}
                  readOnly
                  className="cursor-not-allowed"
                />
                <input type="hidden" name="plan" value={selectedPlan} />
              </>
            ) : (
              <select
                name="plan"
                value={selectedPlan}
                onChange={(e) => setSelectedPlan(e.target.value)}
                className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                required
                disabled={status === "sending"}
              >
                <option value="">Select a plan</option>
                <option value="launch">Launch</option>
                <option value="business">Business</option>
                <option value="premium">Premium</option>
                <option value="enterprise">Enterprise</option>
              </select>
            )}
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

          {/* Hidden fields */}
          <input type="hidden" name="_subject" value={computedSubject} />
          <input type="text" name="_gotcha" className="hidden" tabIndex={-1} autoComplete="off" />

          <Button
            type="submit"
            size="lg"
            variant="hero"
            className="mt-4 self-start"
            disabled={status === "sending"}
          >
            {status === "sending" ? "Sending…" : "Send Message"}
          </Button>
        </div>
      </form>
    </div>
  );
}
