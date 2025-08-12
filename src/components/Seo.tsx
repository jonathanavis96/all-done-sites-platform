import { Helmet } from "react-helmet-async";

interface SeoProps {
  title: string;
  description: string;
  canonical?: string;
  jsonLd?: object;
}

export default function Seo({ title, description, canonical, jsonLd }: SeoProps) {
  const computedCanonical = typeof window !== "undefined" ? window.location.href : canonical;
  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={computedCanonical || canonical} />
      {jsonLd && (
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      )}
    </Helmet>
  );
}
