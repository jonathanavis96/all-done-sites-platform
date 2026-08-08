// Shared building blocks for content collections (guides, articles, ...).
//
// Each collection (see content/guides.tsx, content/articles.tsx) authors its
// items as structured data using these same block/FAQ shapes, so there is one
// definition of "what an article body looks like" no matter how many
// collections the site grows to. Paragraph/list strings may use a tiny
// markdown-style inline link, [text](/path), which renderInline() turns into
// a router <Link> (internal) or <a> (external); stripInline() flattens it to
// plain text for structured data.

import { ReactNode } from "react";
import { Link } from "react-router-dom";

export type ContentBlock =
  | { h2: string }
  | { h3: string }
  | { p: string }
  | { ul: string[] }
  | { ol: string[] }
  | { callout: { title?: string; body: string } }
  | { img: ContentImage }
  | { table: ContentTable };

/**
 * An image inside an article body.
 *
 * `alt` is required, not optional: a decorative image has no place in the
 * middle of an article, and search engines read the alt text as content.
 * `width`/`height` are the image's intrinsic pixel size — supplying them lets
 * the browser reserve the space before the file loads, so an image part-way
 * down the page cannot shove the text around it (cumulative layout shift).
 */
export type ContentImage = {
  src: string;
  alt: string;
  caption?: string;
  width?: number;
  height?: number;
};

/**
 * A table inside an article body.
 *
 * `headers` and `rows` are both required, and both plain string grids —
 * no per-cell alignment, no colspans, no optional caption. A comparison
 * table only needs the data; the rest is presentation the renderer already
 * owns, and every field left unpopulated is a field someone has to notice
 * is dead before they can trust the shape again. Every row is expected to
 * have the same length as `headers`; the renderer does not pad or truncate.
 */
export type ContentTable = { headers: string[]; rows: string[][] };

export type ContentFaq = { q: string; a: string };

const LINK_RE = /\[([^\]]+)\]\(([^)]+)\)/g;

/** Turn [text](/path) markdown into router <Link>s (internal) or <a>s (external). */
export function renderInline(text: string): ReactNode {
  const out: ReactNode[] = [];
  let last = 0;
  let key = 0;
  let m: RegExpExecArray | null;
  LINK_RE.lastIndex = 0;
  while ((m = LINK_RE.exec(text)) !== null) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const label = m[1];
    const href = m[2];
    if (href.startsWith("/")) {
      out.push(
        <Link key={key++} to={href}>
          {label}
        </Link>
      );
    } else {
      out.push(
        <a key={key++} href={href} target="_blank" rel="noopener noreferrer">
          {label}
        </a>
      );
    }
    last = LINK_RE.lastIndex;
  }
  if (last < text.length) out.push(text.slice(last));
  return out.length === 1 ? out[0] : out;
}

/** Flatten [text](/path) markdown to plain text, for JSON-LD / meta. */
export function stripInline(text: string): string {
  return text.replace(LINK_RE, "$1");
}

/** Slug for an h2, so the on-this-page nav can link to it. */
export function headingId(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

/**
 * Every body image, in document order. An article may carry as many as it likes.
 * Article JSON-LD takes `image` as an array, and Google asks for several images
 * where they exist, so all of them are offered rather than only the first.
 */
export function imageSrcs(blocks: ContentBlock[]): string[] {
  return blocks.flatMap((b) => ("img" in b ? [b.img.src] : []));
}

/**
 * Structured data needs an absolute image URL, but body images are authored as
 * site-root paths ("/assets/x.webp"). Leave an already-absolute URL alone.
 */
export function absoluteImage(src: string, site: string): string {
  return /^https?:\/\//i.test(src) ? src : `${site}${src}`;
}
