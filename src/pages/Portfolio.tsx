import Seo from "@/components/Seo";

// Replace JPEG mockups with optimized WebP images
import plumber from "@/assets/portfolio/plumber.webp";
import electrician from "@/assets/portfolio/electrician.webp";
import salon from "@/assets/portfolio/salon.webp";
import consultant from "@/assets/portfolio/consultancy.webp";
import cafe from "@/assets/portfolio/cafe.webp";
import fitness from "@/assets/portfolio/fitness.webp";

const items = [
  {
    src: plumber,
    alt: "Plumbing website mockup – clean professional layout",
  },
  {
    src: electrician,
    alt: "Electrician website mockup – bold service layout",
  },
  {
    src: salon,
    alt: "Hair salon website mockup – airy minimalist style",
  },
  {
    src: consultant,
    alt: "Consultancy website mockup – modern professional design",
  },
  {
    src: cafe,
    alt: "Cafe website mockup – cozy and inviting visuals",
  },
  {
    src: fitness,
    alt: "Fitness website mockup – energetic gym theme",
  },
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
