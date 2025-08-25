// src/pages/Index.tsx
import React, { useEffect, useRef } from "react";
import Seo from "@/components/Seo";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  Rocket,
  Shield,
  Smartphone,
  Sparkles,
  Timer,
} from "lucide-react";
import { NavLink } from "react-router-dom";

export default function Index() {
  // Base path so assets work on GitHub Pages (subfolder) and locally
  const base = import.meta.env.BASE_URL || "/";

  // Preload the hero poster only on the home route
  useEffect(() => {
    const href = `${base}hero-poster.webp`;
    const link = document.createElement("link");
    link.rel = "preload";
    link.as = "image";
    link.href = href;
    document.head.appendChild(link);
    return () => {
      if (link.parentNode) link.parentNode.removeChild(link);
    };
  }, [base]);

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
    logo: "/favicon.png",
  };

  return (
    <div>
      <Seo
        title="Hassle-Free Website Subscription for SMEs | All Done Sites"
        description="We design, host, and maintain your site for one simple monthly fee. No upfront costs—just fast setup, pro support, and ongoing updates."
        jsonLd={jsonLd}
      />

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

            {/* Heading (single H1) */}
            <Seo
              title="Hassle-Free Website Subscription for SMEs | All Done Sites"
              description="We design, host, and maintain your site for one simple monthly fee. No upfront costs—just fast setup, pro support, and ongoing updates."
            />
            <h1 className="font-bold tracking-tight mb-4 leading-tight">
              <span className="block text-3xl sm:text-4xl md:text-5xl whitespace-nowrap">
                Your website, done for&nbsp;you
              </span>
              <br />
              <span className="inline-block text-3xl sm:text-4xl md:text-5xl whitespace-nowrap">
                — for one monthly fee
              </span>
            </h1>

            <p className="text-lg text-muted-foreground mb-8">
              We design, host, maintain, and update your site. No upfront
              costs—just a friendly monthly subscription so you can focus on
              your business.
            </p>

            {/* Buttons */}
            <div className="mb-8 flex flex-col sm:flex-row gap-4">
              <Button asChild size="lg" variant="hero" className="rounded-2xl">
                <NavLink to="/pricing">Get Started</NavLink>
              </Button>
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

          {/* RIGHT: video card */}
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
          <h1 className="text-2xl md:text-3xl font-semibold">
            Everything included
          </h1>
          <p className="text-muted-foreground mt-2">
            Simple, transparent, and designed to save you time.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              title: "One simple monthly fee",
              desc: "No surprises. Cancel anytime.",
            },
            {
              title: "Hosting, maintenance, updates",
              desc: "We handle it all so you don’t have to.",
            },
            {
              title: "1 free small update/month",
              desc: "Keep content fresh without extra charges.",
            },
          ].map((f, i) => (
            <div
              key={i}
              className="rounded-lg border p-6 hover:shadow-md transition-shadow"
            >
              <h3 className="font-medium mb-2">{f.title}</h3>
              <p className="text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
