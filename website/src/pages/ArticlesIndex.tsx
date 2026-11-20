// src/pages/ArticlesIndex.tsx
import { Link } from "react-router-dom";
import Seo from "@/components/Seo";
import { PageShell } from "@/components/redesign/RedesignChrome";
import { ARTICLE_SECTIONS, SITE, articleUrl, type ArticleSectionKey } from "@/content/sections";
import { renderInline } from "@/content/shared";
import "@/styles/home.css";

const OG_IMAGE = `${SITE}/og1200x630_v2.jpg`;

/** The index of one article section (/articles/, /us/articles/, /uk/articles/). */
export default function ArticlesIndex({ section: sectionKey = "default" }: { section?: ArticleSectionKey }) {
  const section = ARTICLE_SECTIONS[sectionKey];
  const { articles, copy } = section;
  const itemListSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: copy.itemListName,
    itemListElement: articles.map((a, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: articleUrl(section, a.slug),
      name: a.title,
    })),
  };

  return (
    <PageShell eyebrow={copy.eyebrow} title={copy.title} sub={copy.sub}>
      <Seo
        title={copy.seoTitle}
        description={copy.description}
        canonical={`${SITE}${section.basePath}/`}
        image={OG_IMAGE}
        jsonLd={articles.length > 0 ? itemListSchema : undefined}
        locale={section.lang}
      />

      {articles.length === 0 ? (
        <div className="legal">
          <p>{renderInline(copy.empty)}</p>
        </div>
      ) : (
        <div className="guidegrid">
          {articles.map((a) => (
            <Link to={`${section.basePath}/${a.slug}/`} className="guidecard" key={a.slug}>
              <span className="eyebrow kicker">{a.category}</span>
              <h2>{a.title}</h2>
              <p>{a.summary}</p>
              <span className="guidecard-meta mono">
                {a.readMins} min read <span className="arrow" aria-hidden="true">→</span>
              </span>
            </Link>
          ))}
        </div>
      )}
    </PageShell>
  );
}
