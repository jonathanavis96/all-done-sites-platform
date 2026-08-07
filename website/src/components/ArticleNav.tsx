// src/components/ArticleNav.tsx
import { useRef } from "react";
import { headingId } from "@/content/shared";

interface ArticleNavProps {
  toc: string[];
}

// Collapsed-by-default table of contents for long-form guides/articles. Uses a
// native <details>/<summary> disclosure so it renders correctly in the static
// prerendered HTML with no JavaScript (search crawlers and no-JS readers see it
// closed) and is keyboard/screen-reader accessible out of the box. The only bit
// of JS enhancement is closing the disclosure after a link is clicked, so the
// reader lands on their section with the menu out of the way; without JS the
// links still navigate, they just leave the disclosure open.
export default function ArticleNav({ toc }: ArticleNavProps) {
  const detailsRef = useRef<HTMLDetailsElement>(null);

  if (toc.length <= 2) return null;

  return (
    <nav className="toc" aria-label="Table of contents">
      <details ref={detailsRef}>
        <summary>Jump to a section</summary>
        <ol
          onClick={(event) => {
            // Only a real link click should collapse the menu. The list carries
            // enough padding that a stray tap on its background would otherwise
            // close the disclosure without navigating anywhere, which reads as
            // the menu dismissing itself.
            if (!(event.target as HTMLElement).closest("a")) return;
            if (detailsRef.current) detailsRef.current.open = false;
          }}
        >
          {toc.map((h) => (
            <li key={h}>
              <a href={`#${headingId(h)}`}>{h}</a>
            </li>
          ))}
        </ol>
      </details>
    </nav>
  );
}
