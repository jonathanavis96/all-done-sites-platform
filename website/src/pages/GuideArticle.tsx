// src/pages/GuideArticle.tsx
import { Link, Navigate, useParams } from "react-router-dom";
import Seo from "@/components/Seo";
import { PageShell } from "@/components/redesign/RedesignChrome";
import {
  GUIDES_PUBLISHED,
  GUIDES_UPDATED,
  GuideBlock,
  getGuide,
  renderInline,
  stripInline,
} from "@/content/guides";
import "@/styles/home.css";

const SITE = "https://alldonesites.com";
const OG_IMAGE = `${SITE}/og1200x630_v2.jpg`;

function headingId(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

function Block({ block }: { block: GuideBlock }) {
  if ("h2" in block) return <h2 id={headingId(block.h2)}>{block.h2}</h2>;
  if ("h3" in block) return <h3>{block.h3}</h3>;
  if ("p" in block) return <p>{renderInline(block.p)}</p>;
  if ("ul" in block)
    return (
      <ul>
        {block.ul.map((item, i) => (
          <li key={i}>{renderInline(item)}</li>
        ))}
      </ul>
    );
  if ("ol" in block)
    return (
      <ol>
        {block.ol.map((item, i) => (
          <li key={i}>{renderInline(item)}</li>
        ))}
      </ol>
    );
  if ("callout" in block)
    return (
      <div className="callout">
        {block.callout.title && <h3>{block.callout.title}</h3>}
        <p>{renderInline(block.callout.body)}</p>
      </div>
    );
  return null;
}

export default function GuideArticle() {
  const { slug } = useParams();
  const guide = getGuide(slug);

  // Unknown slug: send back to the guides index (valid slugs are prerendered).
  if (!guide) return <Navigate to="/guides" replace />;

  const url = `${SITE}/guides/${guide.slug}`;
  const toc = guide.blocks.filter((b): b is { h2: string } => "h2" in b).map((b) => b.h2);
  const related = guide.relatedSlugs.map((s) => getGuide(s)).filter(Boolean) as NonNullable<
    ReturnType<typeof getGuide>
  >[];

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: guide.title,
    description: stripInline(guide.description),
    inLanguage: "en-ZA",
    datePublished: GUIDES_PUBLISHED,
    dateModified: GUIDES_UPDATED,
    author: { "@type": "Organization", name: "All Done Sites", url: SITE },
    publisher: {
      "@type": "Organization",
      name: "All Done Sites",
      url: SITE,
      logo: { "@type": "ImageObject", url: `${SITE}/logo.png` },
    },
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    image: OG_IMAGE,
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: guide.faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: stripInline(f.a) },
    })),
  };

  return (
    <PageShell
      eyebrow={guide.category}
      title={guide.title}
      sub={
        <span className="guide-meta">
          <span className="mono">{guide.readMins} min read</span>
          <span aria-hidden="true"> · </span>
          <span className="mono">Updated {GUIDES_UPDATED}</span>
        </span>
      }
    >
      <Seo
        title={guide.metaTitle}
        description={guide.description}
        canonical={url}
        image={OG_IMAGE}
        jsonLd={[articleSchema, faqSchema]}
      />

      <div className="guide-layout">
        <article className="legal guide-body">
          <p className="intro">{guide.intro}</p>

          {toc.length > 2 && (
            <nav className="toc" aria-label="On this page">
              <h3>On this page</h3>
              <ol>
                {toc.map((h) => (
                  <li key={h}>
                    <a href={`#${headingId(h)}`}>{h}</a>
                  </li>
                ))}
              </ol>
            </nav>
          )}

          {guide.blocks.map((block, i) => (
            <Block key={i} block={block} />
          ))}

          {guide.faqs.length > 0 && (
            <section className="guide-faqs" aria-label="Frequently asked questions">
              <h2 id="faqs">Frequently asked questions</h2>
              {guide.faqs.map((f) => (
                <div className="qa" key={f.q}>
                  <h3>{f.q}</h3>
                  <p>{f.a}</p>
                </div>
              ))}
            </section>
          )}

          <aside className="guide-cta">
            <h3>Want it handled for you?</h3>
            <p>
              All Done Sites designs, builds, hosts and maintains your website for one simple monthly
              fee, with no big upfront cost. Plans start at R799 a month.
            </p>
            <div className="guide-cta-actions">
              <Link to="/#getquote" className="btn">
                Get a quote
              </Link>
              <Link to="/#pricing" className="btn-ghost">
                See pricing
              </Link>
            </div>
          </aside>

          {related.length > 0 && (
            <section className="guide-related" aria-label="Related guides">
              <h2>Related guides</h2>
              <div className="guide-related-grid">
                {related.map((r) => (
                  <Link to={`/guides/${r.slug}`} className="guide-related-card" key={r.slug}>
                    <span className="eyebrow kicker">{r.category}</span>
                    <span className="grtitle">{r.title}</span>
                  </Link>
                ))}
              </div>
            </section>
          )}

          <p className="guide-back">
            <Link to="/guides">← All guides</Link>
          </p>
        </article>
      </div>
    </PageShell>
  );
}
