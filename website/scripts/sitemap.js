/**
 * sitemap.xml building, kept apart from prerender.js (which runs the whole build
 * on import) so it can be tested. prerender.js passes the homepage plus every
 * prerendered route; each becomes one <url> in the trailing-slash form Cloudflare
 * Pages actually serves.
 */

export const SITE = "https://alldonesites.com";

// Article sections (src/content/sections.ts): the index path and the content file
// its articles live in. Longest prefix first, so /us/articles is not read as /articles.
const ARTICLE_SECTIONS = [
  { base: "/us/articles", file: "src/content/us/articles.tsx" },
  { base: "/uk/articles", file: "src/content/uk/articles.tsx" },
  { base: "/articles", file: "src/content/articles.tsx" },
];

const articleSectionFor = (route) =>
  ARTICLE_SECTIONS.find((s) => route === s.base || route.startsWith(`${s.base}/`));

/** The file a route's content comes from; its last commit date is the route's lastmod. */
export function contentFileFor(route) {
  if (route.startsWith("/guides")) return "src/content/guides.tsx";
  const section = articleSectionFor(route);
  if (section) return section.file;
  if (route === "/claude-usage-tracker") return "public/data/claude-usage.json";
  return "src/pages/Index.tsx";
}

export function toUrl(route) {
  if (route === "/") return `${SITE}/`;
  const clean = route.replace(/^\//, "").replace(/\/$/, "");
  return `${SITE}/${clean}/`;
}

/** Build sitemap.xml for `routes` ("/" included by the caller), dating each with `lastmodFor`. */
export function sitemapXml(routes, lastmodFor) {
  const entries = routes.map((r) => {
    const loc = toUrl(r);
    const isIndex = r === "/guides" || ARTICLE_SECTIONS.some((s) => s.base === r);
    const priority = r === "/" ? "1.0" : isIndex ? "0.8" : "0.7";
    const changefreq = r === "/" ? "weekly" : r === "/claude-usage-tracker" ? "daily" : "monthly";
    return `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${lastmodFor(r)}</lastmod>\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`;
  });
  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    `${entries.join("\n")}\n` +
    `</urlset>\n`;
  return { xml, count: entries.length };
}
