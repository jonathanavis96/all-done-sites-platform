// src/entry-server.tsx (build-time prerender entry)
import { renderToString } from "react-dom/server";
import { StaticRouter } from "react-router-dom/server";
import { HelmetProvider, type HelmetServerState } from "react-helmet-async";
import App from "./App";
import { guides } from "./content/guides";
import { articleRoutes, llmsArticleSections, sectionForPath } from "./content/sections";
import { loadTracker } from "./pages/TrackerRoute";
import type { UsageJson } from "./lib/claudeUsage";
// Build-time snapshot so the prerendered tracker carries real figures. Imported here
// and never by a module the browser loads: see TrackerRoute.tsx.
import usageSnapshot from "../public/data/claude-usage.json";

/** renderToString cannot wait for a lazy route, so await this before any render. */
export const ready = loadTracker(usageSnapshot as unknown as UsageJson);

/**
 * Render a route to static HTML for build-time prerendering.
 * Returns the #root inner HTML plus the head pieces react-helmet collected, and
 * `lang` (the `<html lang>` for a market-specific article section; undefined
 * everywhere else, where the template's own lang stays):
 *  - `head`     = <title> + JSON-LD only (used for the homepage, where we keep the
 *                 template's default meta tags untouched to preserve its tuned head).
 *  - `headFull` = <title> + meta + link(canonical) + JSON-LD (used for content
 *                 pages like /guides/*, where we want page-specific meta + canonical
 *                 baked into the static HTML; prerender strips the template defaults).
 */
export function render(url: string): { html: string; head: string; headFull: string; lang?: string } {
  const helmetContext: { helmet?: HelmetServerState } = {};
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
  return { html, head, headFull, lang: sectionForPath(url)?.lang };
}

/**
 * Routes (besides "/") to prerender into their own dist/<route>/index.html.
 * This list also drives sitemap.xml (see scripts/prerender.js), so a route only
 * belongs here if it is a real, indexable page.
 *
 * Each article section's index (/articles, /us/articles, /uk/articles) is
 * deliberately withheld while that section is empty: prerendering it would put a
 * "nothing here yet" page in the sitemap, which is exactly the thin-content shell
 * that got the old anchor routes reported as "Discovered – currently not indexed".
 * Publishing a section's first article brings its index and that article in
 * together (see articleRoutes in content/sections.ts).
 */
export const prerenderRoutes: string[] = [
  "/claude-usage-tracker",
  "/guides",
  ...guides.map((g) => `/guides/${g.slug}`),
  ...articleRoutes(),
];

/**
 * llms.txt lines for the market-specific article sections, appended at build time
 * by scripts/prerender.js. Empty while those sections are empty.
 */
export const llmsSections = llmsArticleSections();
