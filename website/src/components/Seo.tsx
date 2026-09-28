import { Helmet } from "react-helmet-async";

interface SeoProps {
  title: string;
  description: string;
  canonical?: string;
  jsonLd?: object;
  /**
   * Optional image URL for social previews (Open Graph & Twitter).
   * If omitted, we compute a sensible default: <origin>/<base>/og.png
   */
  image?: string;
  /**
   * Keep the page out of search results. Use for pages that exist only as a
   * step in a flow (payment confirmation, client-only documents) — they are
   * crawlable but have no search value, and leaving them indexable is what
   * produces "Crawled – currently not indexed" noise in Search Console.
   */
  noindex?: boolean;
}

/** Normalize spa-github-pages URLs:
 * - Turn https://example.com/?/pricing → https://example.com/pricing
 * - Drop tracking query params (keep hash)
 */
function normalizeCanonical(raw: string): string {
  try {
    const u = new URL(raw);
    // If query starts with "/": it's the rafgraph shim style (/?/path)
    if (u.search && u.search.startsWith("?/")) {
      const cleanPath = u.search.slice(2); // remove "?/"
      // restore "&" that might have been ~and~ (shim behavior)
      const restored = cleanPath.replace(/~and~/g, "&");
      // Build a new URL with the clean path and no query
      u.search = "";
      // Ensure leading slash
      u.pathname = restored.startsWith("/") ? restored : `/${restored}`;
    }
    // Strip any leftover "clean" query params; canonical shouldn’t include them
    // (keep hash if present)
    return `${u.origin}${u.pathname}${u.hash || ""}`;
  } catch {
    return raw;
  }
}

/** `jsonLd` is engine-generated content, not raw user input, but it still lands inside a
 * `<script>` tag react-helmet-async serialises as literal HTML (unescaped, the same way
 * `dangerouslySetInnerHTML` would) -- a `</script>` (or a U+2028/U+2029 line separator,
 * valid inside a JSON string but not inside a <script> body) in a headline or description
 * would otherwise break out of the structured-data block. Same escaping Next.js's own
 * JSON-LD helper and the OWASP XSS cheat sheet recommend. */
function safeJsonLd(data: object): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

export default function Seo({ title, description, canonical, jsonLd, image, noindex }: SeoProps) {
  // 1) Decide canonical: explicit prop wins; else compute from window.location
  let computedCanonical = canonical;
  if (!computedCanonical && typeof window !== "undefined") {
    computedCanonical = window.location.href;
  }
  if (computedCanonical) {
    computedCanonical = normalizeCanonical(computedCanonical);
  }

  // 2) Compute default og:image if not provided
  let computedImage: string | undefined = image;
  if (!computedImage) {
    try {
      if (typeof window !== "undefined" && window.location) {
        const base = import.meta.env.BASE_URL || "/";
        const basePath = base.endsWith("/") ? base : `${base}/`;
        computedImage = `${window.location.origin}${basePath}og.png`;
      }
    } catch {
      // ignore
    }
  }

  return (
    <Helmet>
      {/* Basic SEO */}
      <title>{title}</title>
      <meta name="description" content={description} />
      {noindex && <meta name="robots" content="noindex, follow" />}
      {computedCanonical && <link rel="canonical" href={computedCanonical} />}

      {/* Open Graph (lightweight, no overkill) */}
      <meta property="og:type" content="website" />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      {computedCanonical && <meta property="og:url" content={computedCanonical} />}
      {computedImage && <meta property="og:image" content={computedImage} />}

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      {computedImage && <meta name="twitter:image" content={computedImage} />}

      {/* Structured data */}
      {jsonLd && <script type="application/ld+json">{safeJsonLd(jsonLd)}</script>}
    </Helmet>
  );
}
