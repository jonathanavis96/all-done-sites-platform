import { Helmet } from "react-helmet-async";

interface SeoProps {
  title: string;
  description: string;
  canonical?: string;
  jsonLd?: object;
  /**
   * Optional image URL for social previews (Open Graph & Twitter).  If not
   * provided, a sensible default pointing to the og.png in the repository
   * root is computed based on the current origin and Vite base URL.  This
   * ensures that pages like /pricing or /contact still specify an og:image
   * so link previews display correctly when shared.
   */
  image?: string;
}

export default function Seo({ title, description, canonical, jsonLd, image }: SeoProps) {
  const computedCanonical = typeof window !== "undefined" ? window.location.href : canonical;
  // Compute a default og:image based on the current origin and Vite base URL.
  // When running in the browser, window.location.origin is available.  When
  // rendering server-side or in static builds, fall back to the provided
  // canonical or omit the image meta.
  let computedImage: string | undefined = image;
  if (!computedImage) {
    try {
      if (typeof window !== "undefined" && window.location) {
        const base = import.meta.env.BASE_URL || "/";
        // Ensure base ends with a slash
        const basePath = base.endsWith("/") ? base : `${base}/`;
        computedImage = `${window.location.origin}${basePath}og.png`;
      }
    } catch {
      // ignore
    }
  }
  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={computedCanonical || canonical} />
      {/* Social preview tags */}
      {computedImage && <meta property="og:image" content={computedImage} />}
      {computedImage && <meta name="twitter:image" content={computedImage} />}
      {jsonLd && (
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      )}
    </Helmet>
  );
}
