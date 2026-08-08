// Shared building blocks for content collections (guides, articles, ...).
//
// Each collection (see content/guides.tsx, content/articles.tsx) authors its
// items as structured data using these same block/FAQ shapes, so there is one
// definition of "what an article body looks like" no matter how many
// collections the site grows to. Paragraph/list strings may use a tiny
// markdown-style inline vocabulary -- [text](/path) links, **bold**, and
// *italic* -- which renderInline() turns into a router <Link> (internal) or
// <a> (external) plus <strong>/<em>; stripInline() flattens all of it to
// plain text for structured data. That vocabulary is deliberately small: no
// underscores, no inline code, no strikethrough. Every construct added here
// is one the content generator has to be taught and the content gates have
// to be taught to measure, so it stays link + bold + italic only.

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

// One alternative per construct, tried in this order at every position:
//   1. [label](href)         -- captures label in group 1, href in group 2
//   2. **bold text**         -- captures the inner text in group 3
//   3. *italic text*         -- captures the inner text in group 4
// Bold is listed before italic so "**bold**" resolves as one <strong> rather
// than an empty <em> hugging a "*bold*" leftover -- if italic were tried
// first it would happily match the inner "*bold*" and strand the outer pair
// of asterisks as literal text. The inner-content groups reject a leading or
// trailing space and any nested "*", so "R5 * 3" (one asterisk, no partner)
// and a sentence trailing off with a lone "*" never pair up into emphasis;
// a delimiter with nothing to close it on the same string just stays literal.
//
// This is exported as a source string, not a compiled RegExp: renderInline
// recurses to parse the content it captures (a link label may hide **bold**,
// bold/italic content may hide a [link]), and a regex literal re-evaluated
// inside a function body is a fresh object per call, but a single shared
// module-level RegExp would have its `lastIndex` clobbered by the recursive
// call before the outer loop reads it back.
const TOKEN_SOURCE =
  "\\[([^\\]]+)\\]\\(([^)]+)\\)" +
  "|\\*\\*([^\\s*](?:[^*]*[^\\s*])?)\\*\\*" +
  "|\\*([^\\s*](?:[^*]*[^\\s*])?)\\*(?!\\*)";

/**
 * Turn the article inline vocabulary -- [text](/path) links, **bold**,
 * *italic* -- into React nodes: router <Link>s (internal href) or <a>s
 * (external), <strong>, <em>. All three interleave in one tokenising pass,
 * in any order, and nest inside one another (a link label may contain
 * **bold**; **bold** may wrap a [link]).
 */
export function renderInline(text: string): ReactNode {
  const re = new RegExp(TOKEN_SOURCE, "g");
  const out: ReactNode[] = [];
  let last = 0;
  let key = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push(text.slice(last, m.index));
    if (m[1] !== undefined) {
      const href = m[2];
      const children = renderInline(m[1]);
      out.push(
        href.startsWith("/") ? (
          <Link key={key++} to={href}>
            {children}
          </Link>
        ) : (
          <a key={key++} href={href} target="_blank" rel="noopener noreferrer">
            {children}
          </a>
        )
      );
    } else if (m[3] !== undefined) {
      out.push(<strong key={key++}>{renderInline(m[3])}</strong>);
    } else if (m[4] !== undefined) {
      out.push(<em key={key++}>{renderInline(m[4])}</em>);
    }
    last = re.lastIndex;
  }
  if (last < text.length) out.push(text.slice(last));
  return out.length === 1 ? out[0] : out;
}

/** Flatten the article inline vocabulary to plain text, for JSON-LD / meta. */
export function stripInline(text: string): string {
  const re = new RegExp(TOKEN_SOURCE, "g");
  return text.replace(re, (_match, label, _href, bold, italic) => {
    if (label !== undefined) return stripInline(label);
    if (bold !== undefined) return stripInline(bold);
    if (italic !== undefined) return stripInline(italic);
    return _match;
  });
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
