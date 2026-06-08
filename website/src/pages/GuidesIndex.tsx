// src/pages/GuidesIndex.tsx
import { Link } from "react-router-dom";
import Seo from "@/components/Seo";
import { PageShell } from "@/components/redesign/RedesignChrome";
import { guides } from "@/content/guides";
import "@/styles/home.css";

const SITE = "https://alldonesites.com";
const OG_IMAGE = `${SITE}/og1200x630_v2.jpg`;

export default function GuidesIndex() {
  const itemListSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "All Done Sites guides",
    itemListElement: guides.map((g, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `${SITE}/guides/${g.slug}`,
      name: g.title,
    })),
  };

  return (
    <PageShell
      eyebrow="Guides"
      title="Website guides for South African businesses"
      sub="Plain, honest answers to the questions small business owners ask about getting a website: what it costs, how long it takes, and what is actually included."
    >
      <Seo
        title="Website Guides for South African Businesses | All Done Sites"
        description="Honest, practical guides on website cost, hosting, build times and getting your first small business website in South Africa."
        canonical={`${SITE}/guides`}
        image={OG_IMAGE}
        jsonLd={itemListSchema}
      />

      <div className="guidegrid">
        {guides.map((g) => (
          <Link to={`/guides/${g.slug}`} className="guidecard" key={g.slug}>
            <span className="eyebrow kicker">{g.category}</span>
            <h2>{g.title}</h2>
            <p>{g.summary}</p>
            <span className="guidecard-meta mono">
              {g.readMins} min read <span className="arrow" aria-hidden="true">→</span>
            </span>
          </Link>
        ))}
      </div>
    </PageShell>
  );
}
