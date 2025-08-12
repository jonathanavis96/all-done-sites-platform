import Seo from "@/components/Seo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import React from "react";

export default function Contact() {
  const { toast } = useToast();
  const [status, setStatus] = React.useState<"idle" | "sending">("idle");

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
      const res = await fetch("https://formspree.io/f/manbvoja", {
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

      <form onSubmit={onSubmit} className="mt-8 grid md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Name</label>
            <Input name="name" placeholder="Jane Doe" required disabled={status === "sending"} />
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
          <input type="hidden" name="_subject" value="All Done Sites — New enquiry" />
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
