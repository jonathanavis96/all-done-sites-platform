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

  // Inspect the current URL query parameters to determine if this is an
  // enterprise enquiry.  When the subject includes the word "enterprise"
  // we route submissions to a dedicated Formspree endpoint and prefill
  // the hidden _subject field accordingly.  Otherwise we use the default
  // contact endpoint and subject.
  const location = useLocation();
  const params = React.useMemo(() => new URLSearchParams(location.search), [location.search]);
  const rawSubject = params.get("subject") || "";
  // Extract a plan identifier (launch, business, premium, enterprise) from the query.
  const planParam = params.get("plan") || "";
  // decode any + signs and percent encoding
  const decodedSubject = React.useMemo(() => {
    try {
      return decodeURIComponent(rawSubject.replace(/\+/g, " "));
    } catch {
      return rawSubject;
    }
  }, [rawSubject]);
  // State for the selected plan.  If a plan parameter is present in the URL
  // then initialise with that value; otherwise the user can choose one.
  const [selectedPlan, setSelectedPlan] = React.useState<string>(planParam);
  // Determine whether this enquiry is for an enterprise plan.  We treat a
  // selected plan of "enterprise" as enterprise, otherwise we fall back to
  // inspecting the subject query for the word "enterprise".
  const isEnterprise = selectedPlan.toLowerCase() === "enterprise" || decodedSubject.toLowerCase().includes("enterprise");
  // Choose the appropriate Formspree endpoint
  const formEndpoint = isEnterprise
    ? "https://formspree.io/f/meoznyeg"
    : "https://formspree.io/f/manbvoja";

  // Compute the email subject for the Formspree submission.  We prioritise an
  // explicit subject query, then derive one from the selected plan, and
  // finally fall back to a generic new enquiry subject.  This memoised
  // computation updates when either `decodedSubject` or `selectedPlan` changes.
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
      toast({ title: "Thanks!", description: "We’ll get back to you shortly." });
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
        toast({ title: "Thanks!", description: "We’ll get back to you within one business day." });
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
        title="Contact | All Done Sites"
        description="Get in touch to start your hassle-free website subscription. Book a call or send us a message."
      />
      <header className="max-w-2xl">
        <h1 className="text-3xl font-bold">Let’s build your website</h1>
        <p className="mt-2 text-muted-foreground">
          Tell us about your business and we’ll reach out shortly.
        </p>
      </header>

      {/* Provide quick contact information for users who prefer to speak directly. */}
      <div className="mt-8 space-y-1 text-sm">
        <p>
          Prefer to speak to us first?{' '}
          <a href="tel:+27822227457" className="text-primary underline">
            Call us&nbsp;+27&nbsp;82&nbsp;222&nbsp;7457
          </a>{' '}
          or{' '}
          <a
            href="https://wa.me/27765864469"
            className="text-primary underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            WhatsApp&nbsp;us&nbsp;+27&nbsp;76&nbsp;586&nbsp;4469
          </a>
        </p>
      </div>

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
            <Input
              name="phone"
              type="tel"
              placeholder="(555) 000-0000"
              disabled={status === "sending"}
            />
          </div>

          {/* Plan selection: if a plan was provided in the URL then display it as
              read‑only; otherwise show a dropdown for the user to pick one.  This
              helps us understand which package the user is interested in. */}
          <div>
            <label className="text-sm font-medium">Plan</label>
            {selectedPlan ? (
              <>
                <Input
                  value={selectedPlan.charAt(0).toUpperCase() + selectedPlan.slice(1)}
                  readOnly
                  className="cursor-not-allowed"
                />
                {/* preserve the plan value in a hidden field so it is submitted with the form */}
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
          {/*
            Hidden subject field: when a subject query parameter is present it
            pre‑fills this value so our email includes the plan or enterprise
            intent.  Otherwise it defaults to a generic enquiry subject.
          */}
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
