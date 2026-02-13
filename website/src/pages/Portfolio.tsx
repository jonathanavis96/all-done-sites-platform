import Seo from "@/components/Seo";

// Portfolio images
import reachright from "@/assets/portfolio/reachright.webp";

import deeneSocial from "@/assets/portfolio/deenesocial.webp";
import jacquiHowles from "@/assets/portfolio/jacquichowles.webp";

import salon from "@/assets/portfolio/salon.webp";
import consultant from "@/assets/portfolio/consultancy.webp";
import cafe from "@/assets/portfolio/cafe.webp";

type Item = {
  src: string;
  alt: string;
  link?: string;
  live?: boolean; // highlight as a real, live site
};

const items: Item[] = [
  // Requested ordering (top-left -> bottom-right):
  // ReachRight. Deene Social. JacquiHowles. Cafe. Consultancy. Hairsalon.
  {
    src: reachright,
    alt: "ReachRight Marketing – Bold, modern, marketing design",
    link: "https://reachrightmarketing.com/", 
    live: true,
  },
  {
    src: deeneSocial,
    alt: "Deene Social – Clean, minimal, premium design",
    link: "https://deenesocial.com/", 
    live: true,
  },
  {
    src: jacquiHowles,
    alt: "Jacqui Chowles – Therapist, warm, inviting, grounded",
    link: "https://jacquichowles.com/", 
    live: true,
  },
  {
    src: cafe,
    alt: "Cafe website mockup – cozy and inviting visuals",
  },
  {
    src: consultant,
    alt: "Consultancy website mockup – modern professional design",
  },
  {
    src: salon,
    alt: "Hair salon website mockup – airy minimalist style",
  },
];

export default function Portfolio() {
  return (
    <div className="container py-16">
      <Seo
        title="Portfolio | Recent Websites by All Done Sites"
        description="Browse real client websites we design and maintain. See styles, features, and results built for speed, clarity, and conversions."
      />
      <header className="max-w-2xl">
        <h1 className="text-3xl font-bold">Recent work &amp; examples</h1>
        <p className="mt-2 text-muted-foreground">
          Designs tailored for service businesses — fast, clear, and easy to update.
        </p>
      </header>

      <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {items.map((it) => {
          const figureClasses = "group relative rounded-lg border overflow-hidden";

          const imgEl = (
            <img
              src={it.src}
              alt={it.alt}
              loading="lazy"
              width={768}
              height={512}
              className="aspect-[3/2] object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            />
          );

          return (
            <figure key={it.alt} className={figureClasses}>
              {/* If linked, wrap in anchor */}
              {it.link ? (
                <a
                  href={it.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={it.alt}
                  className="block"
                >
                  {/* Live badge (only for real site) */}
                  {it.live && (
                    <span className="absolute top-3 right-3 z-10 rounded-full bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground shadow-sm">
                      Live site
                    </span>
                  )}

                  {imgEl}

                  {/* Stronger hover CTA overlay for the live site */}
                  {it.live && (
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                      <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px]" />
                      <span className="relative z-10 rounded-md bg-background/90 px-3 py-1.5 text-sm font-medium shadow">
                        View live site →
                      </span>
                    </div>
                  )}
                </a>
              ) : (
                imgEl
              )}

              <figcaption className="p-3 text-sm text-muted-foreground">
                {it.live && it.link ? (
                  <a
                    href={it.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 font-medium hover:underline"
                    aria-label={`${it.alt} (our live site)`}
                  >
                    {it.alt}
                    <span className="sr-only">(opens in a new tab)</span>
                  </a>
                ) : (
                  it.alt
                )}
              </figcaption>
            </figure>
          );
        })}
      </div>
    </div>
  );
}
