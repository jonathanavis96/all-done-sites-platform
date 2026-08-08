// src/components/ContentBlockView.tsx
//
// Renders one block of an article body. Every content collection (guides,
// articles, ...) renders through this single component, so a block type added
// to ContentBlock in content/shared.tsx works everywhere at once instead of
// rendering in one collection and silently disappearing from another.
//
// It lives here rather than beside the shapes in content/shared.tsx because a
// module that exports both components and plain helpers breaks Fast Refresh.

import { ContentBlock, headingId, renderInline } from "@/content/shared";

export default function ContentBlockView({ block }: { block: ContentBlock }) {
  if ("h2" in block) return <h2 id={headingId(block.h2)}>{block.h2}</h2>;
  if ("h3" in block) return <h3>{block.h3}</h3>;
  if ("p" in block) return <p>{renderInline(block.p)}</p>;
  if ("ul" in block)
    return (
      <ul>
        {block.ul.map((item, i) => (
          <li key={i}>{renderInline(item)}</li>
        ))}
      </ul>
    );
  if ("ol" in block)
    return (
      <ol>
        {block.ol.map((item, i) => (
          <li key={i}>{renderInline(item)}</li>
        ))}
      </ol>
    );
  if ("callout" in block)
    return (
      <div className="callout">
        {block.callout.title && <h3>{block.callout.title}</h3>}
        <p>{renderInline(block.callout.body)}</p>
      </div>
    );
  if ("img" in block) {
    const { src, alt, caption, width, height } = block.img;
    return (
      <figure className="content-figure">
        <img src={src} alt={alt} width={width} height={height} loading="lazy" decoding="async" />
        {caption && <figcaption>{renderInline(caption)}</figcaption>}
      </figure>
    );
  }
  if ("table" in block) {
    const { headers, rows } = block.table;
    return (
      // Focusable and labelled because the wrapper is what scrolls. Chrome and
      // Firefox make a scroll container keyboard-reachable on their own; Safari
      // does not, so without tabIndex a narrow-viewport reader on Safari cannot
      // reach the columns that are off-screen. The name comes from the headers
      // rather than a fixed string, since not every table is a comparison.
      <div
        className="content-table"
        tabIndex={0}
        role="region"
        aria-label={headers.filter(Boolean).join(", ") || "Table"}
      >
        <table>
          <thead>
            <tr>
              {headers.map((h, i) => (
                <th key={i} scope="col">
                  {renderInline(h)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i}>
                {row.map((cell, j) => (
                  <td key={j}>{renderInline(cell)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
  return null;
}
