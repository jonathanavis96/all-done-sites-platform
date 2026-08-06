// Single source of truth for the /articles section.
//
// Mirrors content/guides.tsx: each article is authored as structured data (no
// JSX in the content) so the same objects power the rendered article, the
// Article (+ FAQPage, when it has FAQs) JSON-LD, the articles index cards and
// the sitemap. Block/FAQ shapes and the inline markdown-link helpers are
// shared with the guides collection via content/shared.tsx.
//
// There is no published content yet — the collection starts empty rather than
// shipping placeholder copy onto a live client site. The index page renders a
// real "nothing here yet" state instead of a blank shell, and adding the first
// article is just pushing an entry into `articles` below.

import { ContentBlock, ContentFaq } from "./shared";

export type ArticleBlock = ContentBlock;
export type ArticleFaq = ContentFaq;

export interface Article {
  slug: string;
  title: string;
  metaTitle: string;
  description: string;
  summary: string;
  category: string;
  readMins: number;
  intro: string;
  blocks: ArticleBlock[];
  faqs: ArticleFaq[];
}

/** Last content review date, used for sitemap lastmod + Article dateModified. */
export const ARTICLES_UPDATED = "2026-08-04";
export const ARTICLES_PUBLISHED = "2026-08-04";

export const articles: Article[] = [];

export function getArticle(slug: string | undefined): Article | undefined {
  return articles.find((a) => a.slug === slug);
}

/**
 * Related articles, mirroring guides.tsx's ring layout once there is more
 * than one article to relate. With zero (or one) articles there is nothing
 * to link, so this simply returns an empty list.
 */
export function getRelatedSlugs(_slug: string): string[] {
  return [];
}
