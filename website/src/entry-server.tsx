// src/entry-server.tsx (build-time prerender entry)
import { renderToString } from "react-dom/server";
import { StaticRouter } from "react-router-dom/server";
import { HelmetProvider } from "react-helmet-async";
import App from "./App";
import { guides } from "./content/guides";
import { articles } from "./content/articles";

/**
 * Render a route to static HTML for build-time prerendering.
 * Returns the #root inner HTML plus the head pieces react-helmet collected:
 *  - `head`     = <title> + JSON-LD only (used for the homepage, where we keep the
 *                 template's default meta tags untouched to preserve its tuned head).
 *  - `headFull` = <title> + meta + link(canonical) + JSON-LD (used for content
 *                 pages like /guides/*, where we want page-specific meta + canonical
 *                 baked into the static HTML; prerender strips the template defaults).
 */
export function render(url: string): { html: string; head: string; headFull: string } {
  const helmetContext: { helmet?: Record<string, { toString(): string }> } = {};
  const html = renderToString(
    <HelmetProvider context={helmetContext}>
      <StaticRouter location={url}>
        <App />
      </StaticRouter>
    </HelmetProvider>
  );
  const h = helmetContext.helmet;
  const join = (parts: Array<{ toString(): string } | undefined>) =>
    parts.map((x) => (x ? x.toString() : "")).filter(Boolean).join("\n");
  const head = h ? join([h.title, h.script]) : "";
  const headFull = h ? join([h.title, h.meta, h.link, h.script]) : "";
  return { html, head, headFull };
}

/**
 * Routes (besides "/") to prerender into their own dist/<route>/index.html.
 * This list also drives sitemap.xml (see scripts/prerender.js), so a route only
 * belongs here if it is a real, indexable page.
 *
 * The articles index is deliberately withheld while the collection is empty:
 * prerendering it would put a "nothing here yet" page in the sitemap, which is
 * exactly the thin-content shell that got the old anchor routes reported as
 * "Discovered – currently not indexed". Publishing the first article brings the
 * index and that article in together.
 */
export const prerenderRoutes: string[] = [
  "/guides",
  ...guides.map((g) => `/guides/${g.slug}`),
  ...(articles.length > 0 ? ["/articles", ...articles.map((a) => `/articles/${a.slug}`)] : []),
];
