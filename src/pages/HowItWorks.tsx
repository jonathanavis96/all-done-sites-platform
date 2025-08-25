import Seo from "@/components/Seo";
import { CheckCircle2, Edit3, MonitorSmartphone, Rocket, Server, Shield } from "lucide-react";

export default function HowItWorks() {
  return (
    <div className="container py-16">
      <Seo
        title="How It Works: 3 Easy Steps | All Done Sites"
        description="Brief, design, launch — then ongoing updates. Our monthly website subscription makes professional sites simple from day one."
      />

      <header className="max-w-2xl">
        <h1 className="text-3xl font-bold">Get started in 3 easy steps</h1>
        <p className="mt-2 text-muted-foreground">
          We make professional websites effortless from day one.
        </p>
      </header>

      <ol className="mt-10 grid md:grid-cols-3 gap-6">
        {[
          {
            title: "We design",
            icon: MonitorSmartphone,
            desc: "Share your business info and preferences. We craft a modern, mobile-first website.",
          },
          {
            title: "You approve",
            icon: Edit3,
            desc: "Review the draft, request tweaks, and approve when you love it.",
          },
          {
            title: "We launch & maintain",
            icon: Rocket,
            desc: "We host, secure, and keep it updated. 1 free small content update every month.",
          },
        ].map((s, i) => (
          <li key={i} className="rounded-lg border p-6">
            <s.icon className="text-primary" />
            <h3 className="mt-4 font-semibold">{s.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{s.desc}</p>
          </li>
        ))}
      </ol>

      <section className="mt-14 grid md:grid-cols-3 gap-6">
        {[
          {
            title: "Hosting included",
            icon: Server,
            desc: "Fast, reliable hosting with SSL and backups.",
          },
          {
            title: "Security handled",
            icon: Shield,
            desc: "We monitor and protect your site so you don’t have to.",
          },
          {
            title: "SEO-friendly",
            icon: CheckCircle2,
            desc: "Clean structure, best practices, and fast performance.",
          },
        ].map((f, i) => (
          <div key={i} className="rounded-lg border p-6">
            <f.icon className="text-primary" />
            <div className="mt-4">
              <h3 className="font-semibold">{f.title}</h3>
              <p className="text-sm text-muted-foreground mt-1">{f.desc}</p>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
