// src/pages/ArticleArticle.tsx
import { Link, Navigate, useParams } from "react-router-dom";
import Seo from "@/components/Seo";
import { PageShell } from "@/components/redesign/RedesignChrome";
import { getArticle, getRelatedSlugs } from "@/content/articles";
import ContentBlockView from "@/components/ContentBlockView";
import { absoluteImage, headingId, imageSrcs, stripInline } from "@/content/shared";
import "@/styles/home.css";

const SITE = "https://alldonesites.com";
const OG_IMAGE = `${SITE}/og1200x630_v2.jpg`;

export default function ArticleArticle() {
  const { slug } = useParams();
  const article = getArticle(slug);

  // Unknown slug: send back to the articles index (valid slugs are prerendered).
  if (!article) return <Navigate to="/articles/" replace />;

  // Trailing slash to match the URL Cloudflare Pages actually serves
  // (it 308-redirects the no-slash form to the directory form).
  const url = `${SITE}/articles/${article.slug}/`;
  const toc = article.blocks.filter((b): b is { h2: string } => "h2" in b).map((b) => b.h2);
  const related = getRelatedSlugs(article.slug)
    .map((s) => getArticle(s))
    .filter(Boolean) as NonNullable<ReturnType<typeof getArticle>>[];

  // Prefer the article's own images for structured data (all of them, in order);
  // fall back to the site-wide OG image when the article is text-only.
  const bodyImages = imageSrcs(article.blocks).map((s) => absoluteImage(s, SITE));
  const schemaImage = bodyImages.length > 0 ? bodyImages : OG_IMAGE;

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: stripInline(article.description),
    inLanguage: "en-ZA",
    datePublished: article.publishedAt,
    dateModified: article.updatedAt,
    author: { "@type": "Organization", name: "All Done Sites", url: SITE },
    publisher: {
      "@type": "Organization",
      name: "All Done Sites",
      url: SITE,
      logo: { "@type": "ImageObject", url: `${SITE}/logo.png` },
    },
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    image: schemaImage,
  };

  // Only emit FAQPage structured data when the article actually has FAQs.
  const faqSchema =
    article.faqs.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: article.faqs.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: stripInline(f.a) },
          })),
        }
      : undefined;

  return (
    <PageShell
      eyebrow={article.category}
      title={article.title}
      sub={
        <span className="guide-meta">
          <span className="mono">{article.readMins} min read</span>
          <span aria-hidden="true"> · </span>
          <span className="mono">Updated {article.updatedAt}</span>
        </span>
      }
    >
      <Seo
        title={article.metaTitle}
        description={article.description}
        canonical={url}
        image={OG_IMAGE}
        jsonLd={faqSchema ? [articleSchema, faqSchema] : articleSchema}
      />

      <div className="guide-layout">
        <article className="legal guide-body">
          <p className="intro">{article.intro}</p>

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

          {article.blocks.map((block, i) => (
            <ContentBlockView key={i} block={block} />
          ))}

          {article.faqs.length > 0 && (
            <section className="guide-faqs" aria-label="Frequently asked questions">
              <h2 id="faqs">Frequently asked questions</h2>
              {article.faqs.map((f) => (
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
            <section className="guide-related" aria-label="Related articles">
              <h2>Related articles</h2>
              <div className="guide-related-grid">
                {related.map((r) => (
                  <Link to={`/articles/${r.slug}/`} className="guide-related-card" key={r.slug}>
                    <span className="eyebrow kicker">{r.category}</span>
                    <span className="grtitle">{r.title}</span>
                  </Link>
                ))}
              </div>
            </section>
          )}

          <p className="guide-back">
            <Link to="/articles/">← All articles</Link>
          </p>
        </article>
      </div>
    </PageShell>
  );
}
