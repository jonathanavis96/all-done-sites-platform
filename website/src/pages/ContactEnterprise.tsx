import React from "react";
import Seo from "@/components/Seo";
import { useToast } from "@/hooks/use-toast";
import { PageShell } from "@/components/redesign/RedesignChrome";
import { WHATSAPP, WHATSAPP_DISPLAY, PHONE_TEL, PHONE_DISPLAY } from "@/lib/site";

/** Enterprise contact page. Tailored for large or custom projects. */
export default function ContactEnterprise() {
  const { toast } = useToast();
  const [status, setStatus] = React.useState<"idle" | "sending">("idle");

  const formEndpoint = "https://formspree.io/f/xblaryol";
  const selectedPlan = "enterprise";
  const computedSubject = "All Done Sites — Enterprise plan enquiry";

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("sending");
    const form = e.currentTarget;
    const data = new FormData(form);

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
    <PageShell
      eyebrow="Custom / Enterprise"
      title={<>Bigger or bespoke? <span className="acc">Let's scope it.</span></>}
      sub="For e-commerce, bookings, integrations or multi-site setups, tell us about your project and we'll propose a tailored monthly plan."
    >
      <Seo
        title="Enterprise & Custom Websites | All Done Sites"
        description="Need custom builds, integrations, or advanced support? Tell us about your project and we'll propose the right enterprise plan."
      />

      <div className="pagecols">
        <form className="form" onSubmit={onSubmit}>
          <input type="text" name="_gotcha" tabIndex={-1} autoComplete="off" style={{ display: "none" }} aria-hidden="true" />
          <input type="hidden" name="_subject" value={computedSubject} />
          <input type="hidden" name="plan" value={selectedPlan} />

          <div className="frow2">
            <div className="field"><label htmlFor="e-name">Name</label><input id="e-name" name="name" placeholder="Jane Doe" required disabled={status === "sending"} /></div>
            <div className="field"><label htmlFor="e-company">Company</label><input id="e-company" name="company" placeholder="Your Company" disabled={status === "sending"} /></div>
          </div>
          <div className="frow2">
            <div className="field"><label htmlFor="e-email">Email</label><input id="e-email" name="email" type="email" placeholder="you@business.com" required disabled={status === "sending"} /></div>
            <div className="field"><label htmlFor="e-phone">Phone</label><input id="e-phone" name="phone" type="tel" placeholder="072 000 0000" disabled={status === "sending"} /></div>
          </div>
          <div className="field">
            <label htmlFor="e-plan">Plan</label>
            <input id="e-plan" value="Enterprise" readOnly className="readonly" />
          </div>
          <div className="field">
            <label htmlFor="e-msg">Tell us about your project</label>
            <textarea id="e-msg" name="message" placeholder="What you're building, key features, timelines, anything else." required disabled={status === "sending"} />
          </div>
          <button className="btn lg formbtn" type="submit" disabled={status === "sending"}>
            {status === "sending" ? "Sending…" : "Send message"}
          </button>
        </form>

        <aside className="alts">
          <h4>Prefer to talk first?</h4>
          <a className="chip" href={PHONE_TEL}><span className="cyandot" />Call {PHONE_DISPLAY}</a>
          <a className="chip" href={WHATSAPP} target="_blank" rel="noopener noreferrer"><span className="cyandot" />WhatsApp {WHATSAPP_DISPLAY}</a>
          <div className="reassure">
            We reply within one business day. Custom builds are scoped up front, then run on a flat monthly fee like every other plan.
          </div>
        </aside>
      </div>
    </PageShell>
  );
}
