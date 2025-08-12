import Seo from "@/components/Seo";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

const tiers = [
  {
    name: "Basic",
    price: "$99/mo",
    features: [
      "Single-page website",
      "Mobile-friendly design",
      "Hosting & SSL included",
      "1 free small update/mo",
    ],
  },
  {
    name: "Standard",
    price: "$199/mo",
    features: [
      "Up to 5 pages",
      "Custom branding setup",
      "Hosting, SSL & backups",
      "1 free small update/mo",
      "Basic SEO setup",
    ],
    highlighted: true,
  },
  {
    name: "Premium",
    price: "$399/mo",
    features: [
      "Up to 12 pages",
      "Advanced sections & components",
      "Priority support",
      "1 free small update/mo",
      "SEO enhancements",
    ],
  },
];

export default function Pricing() {
  const offersLd = {
    "@context": "https://schema.org",
    "@type": "OfferCatalog",
    name: "All Done Sites Plans",
    itemListElement: tiers.map((t) => ({
      "@type": "Offer",
      name: t.name,
      price: t.price,
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
    })),
  };

  return (
    <div className="container py-16">
      <Seo
        title="Pricing | All Done Sites"
        description="Simple monthly plans: Basic, Standard, and Premium. Hosting, maintenance, and updates included. No upfront costs."
        jsonLd={offersLd}
      />
      <header className="text-center max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold">Simple pricing, everything included</h1>
        <p className="mt-2 text-muted-foreground">Pick a plan that fits your business. Upgrade or cancel anytime.</p>
      </header>

      <div className="mt-10 grid md:grid-cols-3 gap-6">
        {tiers.map((tier) => (
          <div key={tier.name} className={`rounded-lg border p-6 ${tier.highlighted ? "ring-2 ring-[hsl(var(--primary))]" : ""}`}>
            <h3 className="text-xl font-semibold">{tier.name}</h3>
            <p className="mt-2 text-3xl font-bold">{tier.price}</p>
            <ul className="mt-6 space-y-2">
              {tier.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm"><Check className="text-primary mt-0.5" /> {f}</li>
              ))}
            </ul>
            <Button variant={tier.highlighted ? "hero" : "default"} size="lg" className="mt-6 w-full">Get Started</Button>
          </div>
        ))}
      </div>
    </div>
  );
}
