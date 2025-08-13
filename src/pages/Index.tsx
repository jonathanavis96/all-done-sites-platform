// src/pages/Index.tsx
import React, { useEffect, useRef } from "react";
import Seo from "@/components/Seo";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Rocket, Shield, Smartphone, Sparkles, Timer } from "lucide-react";
import { NavLink } from "react-router-dom";

export default function Index() {
  // Base path so assets work on GitHub Pages (subfolder) and locally
  const base = import.meta.env.BASE_URL || "/";

  // Force the card video to autoplay once metadata is ready (mobile-friendly)
  const cardVideoRef = useRef<HTMLVideoElement | null>(null);
  useEffect(() => {
    const v = cardVideoRef.current;
    if (!v) return;
    v.muted = true; // required for autoplay on iOS
    const tryPlay = async () => {
      try {
        await v.play();
      } catch {
        /* ignore; poster remains until user interacts */
      }
    };
    if (v.readyState >= 2) tryPlay();
    else v.addEventListener("loadeddata", tryPlay, { once: true });
  }, []);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "All Done Sites",
    url: typeof window !== "undefined" ? window.location.origin : "",
    slogan: "Your website, done for you — for one monthly fee",
    sameAs: [],
  };

  return (
    <div>
      <Seo
        title="All Done Sites | Hassle-free website subscription"
        description="We build, host, and maintain your business website for one simple monthly fee. No upfront cost, fast turnaround, SEO-friendly designs."
        jsonLd={jsonLd}
      />

      {/* Top headline (centered) */}
      <section className="container py-10 md:py-14">
        <div className="mx-auto max-w-4xl text-center">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
            Websites built, hosted,
            <br className="hidden md:block" />
            <span className="block">and done for you.</span>
          </h1>

          <p className="mt-3 text-lg md:text-xl text-muted-foreground">
            All Done Sites — one simple monthly fee. No hassles.
          </p>

          {/* CTA row */}
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-4">
            {/* See Pricing — glassy/transparent with blur */}
            <Button
              asChild
              size="lg"
              className="rounded-2xl bg-white/20 text-white border border-white/30 backdrop-blur-md shadow-sm hover:bg-white/30 hover:border-white/40 transition"
            >
              <NavLink to="/pricing">See Pricing</NavLink>
            </Button>

            {/* Book a Call — purple */}
            <Button
              asChild
              size="lg"
              className="rounded-2xl bg-indigo-500 hover:bg-indigo-600 text-white shadow transition"
            >
              <NavLink to="/contact">Book a Call</NavLink>
            </Button>
          </div>
        </div>
      </section>

      {/* First content section: gradient ONLY behind left column; video in right card */}
      <section className="relative overflow-hidden">
        <div className="container py-12 md:py-20 grid md:grid-cols-2 gap-10 items-center">
          {/* LEFT: text column with scoped gradient */}
          <div className="relative">
            <div
              className="absolute inset-0 -z-10 pointer-events-none"
              style={{
                background:
                  "radial-gradient(900px 450px at 10% -10%, hsl(var(--primary)/0.15), transparent), radial-gradient(800px 400px at 70% 0%, hsl(var(--accent)/0.12), transparent)",
              }}
              aria-hidden="true"
            />

            {/* Sub-heading as requested */}
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
              Your website, done for you — for one monthly fee
            </h2>

            <p className="text-lg text-muted-foreground mb-8">
              We design, host, maintain, and update your site. No upfront costs. Just a friendly
              monthly subscription so you can focus on your business.
            </p>

            {/* Buttons under the sentence */}
            <div className="mb-8 flex flex-col sm:flex-row gap-4">
              {/* Get Started (primary) */}
              <Button
                asChild
                size="lg"
                className="rounded-2xl bg-indigo-500 hover:bg-indigo-600 text-white shadow transition"
              >
                <NavLink to="/pricing">Get Started</NavLink>
              </Button>

              {/* See how it works — outline with green hover */}
              <Button
                asChild
                size="lg"
                variant="outline"
                className="rounded-2xl border-emerald-500 text-emerald-600 hover:bg-emerald-500 hover:text-white transition"
              >
                <NavLink to="/how-it-works">See how it works</NavLink>
              </Button>
            </div>

            {/* Feature bullets */}
            <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="text-primary" /> No upfront cost
              </div>
              <div className="flex items-center gap-2">
                <Shield className="text-primary" /> Hosting &amp; security
              </div>
              <div className="flex items-center gap-2">
                <Smartphone className="text-primary" /> Mobile-friendly
              </div>
              <div className="flex items-center gap-2">
                <Sparkles className="text-primary" /> SEO-friendly
              </div>
            </div>
          </div>

          {/* RIGHT: video card (no gradients) */}
          <div className="md:justify-self-end w-full max-w-xl">
            <div className="relative rounded-xl border bg-card p-6 shadow-sm">
              <video
                ref={cardVideoRef}
                className="aspect-[4/3] rounded-lg object-cover"
                src={`${base}hero.mp4`}
                poster={`${base}hero-poster.png`}
                autoPlay
                loop
                muted
                playsInline
                preload="metadata"
              />
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

      {/* Features summary */}
      <section className="container py-16">
        <div className="text-center mb-10">
          <h2 className="text-2xl md:text-3xl font-semibold">Everything included</h2>
          <p className="text-muted-foreground mt-2">Simple, transparent, and designed to save you time.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { title: "One simple monthly fee", desc: "No surprises. Cancel anytime." },
            { title: "Hosting, maintenance, updates", desc: "We handle it all so you don’t have to." },
            { title: "1 free small update/month", desc: "Keep content fresh without extra charges." },
          ].map((f, i) => (
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
