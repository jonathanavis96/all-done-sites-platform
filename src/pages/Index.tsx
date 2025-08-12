import Seo from "@/components/Seo";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Rocket, Shield, Smartphone, Sparkles, Timer } from "lucide-react";
import { NavLink } from "react-router-dom";

export default function Index() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "All Done Sites",
    url: typeof window !== "undefined" ? window.location.origin : "",
    slogan: "Your website, done for you — for one monthly fee",
    sameAs: []
  };

  return (
    <div>
      <Seo
        title="All Done Sites | Hassle-free website subscription"
        description="We build, host, and maintain your business website for one simple monthly fee. No upfront cost, fast turnaround, SEO-friendly designs."
        jsonLd={jsonLd}
      />

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(1200px_600px_at_10%_-10%,hsl(var(--primary)/0.15),transparent),radial-gradient(1200px_600px_at_90%_10%,hsl(var(--accent)/0.15),transparent)]" aria-hidden="true" />
        <div className="container py-20 md:py-28 grid md:grid-cols-2 gap-10 items-center">
          <div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">
              Your website, done for you — for one monthly fee
            </h1>
            <p className="text-lg text-muted-foreground mb-8">
              We design, host, maintain, and update your site. No upfront costs. Just a friendly monthly subscription so you can focus on your business.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button asChild size="lg" variant="hero">
                <NavLink to="/pricing">Get Started</NavLink>
              </Button>
              <Button asChild size="lg" variant="outline">
                <NavLink to="/how-it-works">See how it works</NavLink>
              </Button>
            </div>
            <div className="mt-8 grid grid-cols-2 gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2"><CheckCircle2 className="text-primary" /> No upfront cost</div>
              <div className="flex items-center gap-2"><Shield className="text-primary" /> Hosting & security</div>
              <div className="flex items-center gap-2"><Smartphone className="text-primary" /> Mobile-friendly</div>
              <div className="flex items-center gap-2"><Sparkles className="text-primary" /> SEO-friendly</div>
            </div>
          </div>
          <div className="md:justify-self-end w-full max-w-xl">
            <div className="relative rounded-xl border bg-card p-6 shadow-sm">
              <div className="aspect-[4/3] rounded-lg bg-gradient-to-tr from-[hsl(var(--primary)/0.15)] to-[hsl(var(--accent)/0.15)]" />
              <div className="absolute -top-4 -left-4 rounded-md bg-background border px-3 py-2 shadow-sm flex items-center gap-2">
                <Timer className="text-primary" /> Quick turnaround
              </div>
              <div className="absolute -bottom-4 -right-4 rounded-md bg-background border px-3 py-2 shadow-sm flex items-center gap-2">
                <Rocket className="text-primary" /> Launch-ready hosting
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="container py-16">
        <div className="text-center mb-10">
          <h2 className="text-2xl md:text-3xl font-semibold">Everything included</h2>
          <p className="text-muted-foreground mt-2">Simple, transparent, and designed to save you time.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {[{
            title: "One simple monthly fee",
            desc: "No surprises. Cancel anytime.",
          },{
            title: "Hosting, maintenance, updates",
            desc: "We handle it all so you don’t have to.",
          },{
            title: "1 free small update/month",
            desc: "Keep content fresh without extra charges.",
          }].map((f, i) => (
            <div key={i} className="rounded-lg border p-6 hover:shadow-md transition-shadow">
              <h3 className="font-medium mb-2">{f.title}</h3>
              <p className="text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
