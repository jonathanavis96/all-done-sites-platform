// src/entry-server.tsx (build-time prerender entry)
import { renderToString } from "react-dom/server";
import { StaticRouter } from "react-router-dom/server";
import { HelmetProvider } from "react-helmet-async";
import App from "./App";

/**
 * Render a route to static HTML for build-time prerendering.
 * Returns the #root inner HTML plus the <title> and JSON-LD that react-helmet
 * collected (the title is better than the template's, and the structured data is
 * the key piece we want in the raw HTML for AI crawlers and search engines).
 */
export function render(url: string): { html: string; head: string } {
  const helmetContext: { helmet?: Record<string, { toString(): string }> } = {};
  const html = renderToString(
    <HelmetProvider context={helmetContext}>
      <StaticRouter location={url}>
        <App />
      </StaticRouter>
    </HelmetProvider>
  );
  const h = helmetContext.helmet;
  const head = h ? [h.title, h.script].map((x) => (x ? x.toString() : "")).join("\n") : "";
  return { html, head };
}
