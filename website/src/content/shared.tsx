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
//
// Every string a reader sees goes through renderInline(), and every string a
// crawler sees goes through stripInline(). Those two sets have to stay in
// step: a field rendered raw but stripped for JSON-LD puts literal asterisks
// on the page and clean text in the structured data, which is exactly the
// disagreement between visible and machine-readable content to avoid.
//
// ⚠ `title`, `metaTitle` and `summary` are OUTSIDE the vocabulary -- they are
// plain text, passed raw to every consumer. That is consistent today, so there
// is no divergence, but they are the next fields a content generator reaches
// for: `title` alone is displayed in the <h1> AND emitted as Article.headline
// and ItemList.name, so the day one of them carries a `**` the asterisks show
// up in the largest text on the page and in the structured data at once. Add
// them to renderInline/stripInline before allowing markup in them, never after.

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
//   1. [label](href)         -- label in group 1, href in group 2
//   2. **bold text**         -- opening boundary in group 3, inner text in 4
//   3. *italic text*         -- opening boundary in group 5, inner text in 6
// Bold is listed before italic so "**bold**" resolves as one <strong> rather
// than an empty <em> hugging a "*bold*" leftover -- if italic were tried
// first it would happily match the inner "*bold*" and strand the outer pair
// of asterisks as literal text.
//
// An emphasis run may only OPEN at the start of the string or straight after
// whitespace, "(" or "[" -- optionally with one opening quote in between, so
// that A "**done-for-you**" site emphasises rather than showing its asterisks.
// That restriction is the whole defence against the
// asterisk's other job in prose: the footnote marker. This content is pricing
// copy, and a marker is glued to the end of a word -- so in
//
//     Includes hosting*, domain*, and email.
//
// both asterisks have a partner on the same string, and both are preceded by a
// letter. Without the boundary rule the pair matches and the rendered sentence
// reads "Includes hosting, domain, and email." -- the markers are DELETED, not
// merely decorated, so the pointer to the "*Prices exclude VAT" line below is
// gone from the page, from <meta description> and from the JSON-LD at once.
// Requiring a leading space/paren/bracket makes every WORD-GLUED marker
// literal, because a marker attached to the end of a word is never preceded by
// a space.
//
// ⚠ That is the exact guarantee, and it is narrower than "footnote markers are
// safe". A marker at the START of a sentence -- the disclaimer's own marker --
// IS preceded by a space, so it can still open a run and pair with a later
// word-glued one. Confirmed:
//
//     "*Prices exclude VAT. Plans start at R799*."
//        -> "Prices exclude VAT. Plans start at R799."
//
// Both markers deleted, in the render and the strip alike. The reverse order,
// "Plans start at R799* a month. *Prices exclude VAT.", is safe -- so it is
// disclaimer-FIRST, in the same string, that collapses. No boundary rule can
// reject this without also rejecting a legitimate sentence-initial *italic*,
// and CommonMark resolves it the same way, so it is inherent ambiguity rather
// than a defect here. Keep a disclaimer sentence in its own string, or out of
// a string that also carries a glued marker.
//
// It is NOT enough that the inner text rejects a leading or trailing space.
// That rule alone saves "R799* a month. *Prices exclude VAT." (the space after
// the first marker stops it opening) but not the comma-separated form above,
// which is why the boundary is spelled out separately here.
//
// The optional quote is deliberately only honoured when the quote ITSELF sits
// at an opening position -- i.e. the sequence is space-then-quote, never
// word-then-quote. A bare quote in the class would re-open the same deletion
// bug one step along, because a footnote marker can follow a CLOSING quote:
//
//     He said "hello"*, and "goodbye"*.
//
// there the first "*" is preceded by a quote, the pair would match, and both
// markers would vanish. Requiring the quote to be preceded by whitespace or
// "(" keeps that string literal while still emphasising a quoted phrase.
// Straight and curly quotes are both accepted; the closing curly quotes are
// not in the class, as they can only ever appear at the wrong end.
//
// The boundary is a captured group rather than a lookbehind on purpose. This
// RegExp is constructed at render time, so an engine that cannot parse it
// throws instead of degrading -- and a SyntaxError here takes out the entire
// article body. Lookbehind needs Safari 16.4+ (March 2023), which is younger
// than plenty of phones still reading this site, so the boundary is consumed
// and re-emitted by the two callers below instead.
//
// This is exported as a source string, not a compiled RegExp: renderInline
// recurses to parse the content it captures (a link label may hide **bold**,
// bold/italic content may hide a [link]), and a regex literal re-evaluated
// inside a function body is a fresh object per call, but a single shared
// module-level RegExp would have its `lastIndex` clobbered by the recursive
// call before the outer loop reads it back.
const EMPHASIS_OPEN = "(?:^|[\\s([])[\"'\\u201C\\u2018]?";
const TOKEN_SOURCE =
  "\\[([^\\]]+)\\]\\(([^)]+)\\)" +
  "|(" + EMPHASIS_OPEN + ")\\*\\*([^\\s*](?:[^*]*[^\\s*])?)\\*\\*" +
  "|(" + EMPHASIS_OPEN + ")\\*([^\\s*](?:[^*]*[^\\s*])?)\\*(?!\\*)";

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
    // The emphasis alternatives consume their opening boundary -- the space or
    // "(" that proves the run is not a footnote marker glued to a word -- so it
    // has to be put back. It is concatenated onto the preceding literal chunk
    // rather than pushed as its own node: two adjacent strings in one React
    // array are serialised with a "<!-- -->" separator between them, and that
    // marker would land in the prerendered HTML of every emphasised sentence.
    const boundary = m[3] ?? m[5] ?? "";
    const literal = text.slice(last, m.index) + boundary;
    if (literal) out.push(literal);
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
    } else if (m[4] !== undefined) {
      out.push(<strong key={key++}>{renderInline(m[4])}</strong>);
    } else if (m[6] !== undefined) {
      out.push(<em key={key++}>{renderInline(m[6])}</em>);
    }
    last = re.lastIndex;
  }
  if (last < text.length) out.push(text.slice(last));
  return out.length === 1 ? out[0] : out;
}

/** Flatten the article inline vocabulary to plain text, for JSON-LD / meta. */
export function stripInline(text: string): string {
  const re = new RegExp(TOKEN_SOURCE, "g");
  return text.replace(re, (_match, label, _href, boldOpen, bold, italicOpen, italic) => {
    if (label !== undefined) return stripInline(label);
    // The opening boundary is re-emitted for the same reason renderInline puts
    // it back: it is the separating whitespace, not part of the emphasis. Drop
    // it and "cost you **more** later" would flatten to "cost youmore later".
    if (bold !== undefined) return boldOpen + stripInline(bold);
    if (italic !== undefined) return italicOpen + stripInline(italic);
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
