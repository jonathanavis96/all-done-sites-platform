import Seo from "@/components/Seo";

import plumber from "@/assets/portfolio/plumber.jpg";
import electrician from "@/assets/portfolio/electrician.jpg";
import salon from "@/assets/portfolio/salon.jpg";
import consultant from "@/assets/portfolio/consultant.jpg";
import cafe from "@/assets/portfolio/cafe.jpg";
import fitness from "@/assets/portfolio/fitness.jpg";

const items = [
  { src: plumber, alt: "Plumber website mockup – clean and trustworthy design" },
  { src: electrician, alt: "Electrician website mockup – bold calls to action" },
  { src: salon, alt: "Salon website mockup – elegant and modern layout" },
  { src: consultant, alt: "Consultant website mockup – professional and clear messaging" },
  { src: cafe, alt: "Cafe website mockup – cozy and inviting visuals" },
  { src: fitness, alt: "Fitness studio website mockup – energetic and dynamic" },
];

export default function Portfolio() {
  return (
    <div className="container py-16">
      <Seo
        title="Portfolio | All Done Sites"
        description="A selection of modern, mobile-friendly small business website designs built to convert."
      />
      <header className="max-w-2xl">
        <h1 className="text-3xl font-bold">Recent work & examples</h1>
        <p className="mt-2 text-muted-foreground">Designs tailored for service businesses — fast, clear, and easy to update.</p>
      </header>

      <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {items.map((it) => (
          <figure key={it.alt} className="group rounded-lg border overflow-hidden">
            <img src={it.src} alt={it.alt} loading="lazy" width={768} height={512} className="aspect-[3/2] object-cover transition-transform duration-300 group-hover:scale-[1.03]" />
            <figcaption className="p-3 text-sm text-muted-foreground">{it.alt}</figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}
