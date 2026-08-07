// src/pages/ArticlesIndex.tsx
import { Link } from "react-router-dom";
import Seo from "@/components/Seo";
import { PageShell } from "@/components/redesign/RedesignChrome";
import { articles } from "@/content/articles";
import "@/styles/home.css";

const SITE = "https://alldonesites.com";
const OG_IMAGE = `${SITE}/og1200x630_v2.jpg`;

export default function ArticlesIndex() {
  const itemListSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "All Done Sites articles",
    itemListElement: articles.map((a, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `${SITE}/articles/${a.slug}/`,
      name: a.title,
    })),
  };

  return (
    <PageShell
      eyebrow="Articles"
      title="Articles from All Done Sites"
      sub="News, updates and longer-form writing from the All Done Sites team."
    >
      <Seo
        title="Articles | All Done Sites"
        description="News, updates and longer-form writing from the All Done Sites team."
        canonical={`${SITE}/articles/`}
        image={OG_IMAGE}
        jsonLd={articles.length > 0 ? itemListSchema : undefined}
      />

      {articles.length === 0 ? (
        <div className="legal">
          <p>
            We have not published any articles yet. In the meantime, our{" "}
            <Link to="/guides/">guides</Link> answer the questions small business owners most often
            ask about getting a website in South Africa.
          </p>
        </div>
      ) : (
        <div className="guidegrid">
          {articles.map((a) => (
            <Link to={`/articles/${a.slug}/`} className="guidecard" key={a.slug}>
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
