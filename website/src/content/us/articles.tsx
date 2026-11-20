// Single source of truth for the /us/articles section.
//
// Same shape and exports as content/articles.tsx (the /articles section), for
// articles written for small business owners in the United States. The section's
// routing, language tags and build output are described in content/sections.ts;
// this file only holds the entries. Block/FAQ shapes and the inline
// markdown-link helpers are shared with every collection via content/shared.tsx.
//
// The collection starts empty. While it is empty the section index renders a
// "nothing here yet" state and is left out of prerendering and the sitemap, and
// adding the first article is just pushing an entry into `articles` below.

import { ContentBlock, ContentFaq } from "../shared";
import type { Article as BaseArticle } from "../articles";

export type ArticleBlock = ContentBlock;
export type ArticleFaq = ContentFaq;

/** The same entry shape as the /articles section (see content/articles.tsx). */
export type Article = BaseArticle;

export const articles: Article[] = [
];

export function getArticle(slug: string | undefined): Article | undefined {
  return articles.find((a) => a.slug === slug);
}

/**
 * Related articles, mirroring content/articles.tsx. With zero (or one) articles
 * there is nothing to link, so this simply returns an empty list.
 */
export function getRelatedSlugs(_slug: string): string[] {
  return [];
}
