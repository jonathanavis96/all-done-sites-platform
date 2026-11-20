// The article sections the site serves, and everything that differs between them.
//
// Every section shares one entry shape (content/articles.tsx's `Article`) and is
// rendered by the same two pages (pages/ArticlesIndex.tsx, pages/ArticleArticle.tsx),
// so a section is just a base path, its language tags, its copy and its entries:
//
//   /articles/       content/articles.tsx      the original section (en-ZA, x-default)
//   /us/articles/    content/us/articles.tsx   written for US readers (en-US)
//   /uk/articles/    content/uk/articles.tsx   written for UK readers (en-GB)
//
// The build (entry-server.tsx -> scripts/prerender.js) reads the same table, so a
// section's routes, sitemap entries and llms.txt lines always follow its content.

import * as defaultSection from "./articles";
import * as usSection from "./us/articles";
import * as ukSection from "./uk/articles";
import type { Article } from "./articles";

export type ArticleSectionKey = "default" | "us" | "uk";

export interface ArticleSection {
  key: ArticleSectionKey;
  /** Path of the section index, without a trailing slash (e.g. "/us/articles"). */
  basePath: string;
  /**
   * BCP 47 tag for `<html lang>` and og:locale. Undefined for the original section,
   * which keeps the site-wide `<html lang="en">` and emits no og:locale.
   */
  lang?: string;
  /** schema.org Article.inLanguage. */
  inLanguage: string;
  /** hreflang value used when an article's slug also exists in another section. */
  hreflang: string;
  articles: Article[];
  getArticle: (slug: string | undefined) => Article | undefined;
  getRelatedSlugs: (slug: string) => string[];
  copy: {
    eyebrow: string;
    title: string;
    sub: string;
    seoTitle: string;
    /** Meta description and the index's ItemList name source. */
    description: string;
    itemListName: string;
    /** Shown on the index while the section has no articles. Inline markup allowed. */
    empty: string;
    /** Heading of this section's block in llms.txt. */
    llmsHeading: string;
  };
}

export const ARTICLE_SECTIONS: Record<ArticleSectionKey, ArticleSection> = {
  default: {
    key: "default",
    basePath: "/articles",
    inLanguage: "en-ZA",
    hreflang: "x-default",
    articles: defaultSection.articles,
    getArticle: defaultSection.getArticle,
    getRelatedSlugs: defaultSection.getRelatedSlugs,
    copy: {
      eyebrow: "Articles",
      title: "Articles from All Done Sites",
      sub: "News, updates and longer-form writing from the All Done Sites team.",
      seoTitle: "Articles | All Done Sites",
      description: "News, updates and longer-form writing from the All Done Sites team.",
      itemListName: "All Done Sites articles",
      empty:
        "We have not published any articles yet. In the meantime, our [guides](/guides/) answer the questions small business owners most often ask about getting a website in South Africa.",
      llmsHeading: "Articles",
    },
  },
  us: {
    key: "us",
    basePath: "/us/articles",
    lang: "en-US",
    inLanguage: "en-US",
    hreflang: "en-US",
    articles: usSection.articles,
    getArticle: usSection.getArticle,
    getRelatedSlugs: usSection.getRelatedSlugs,
    copy: {
      eyebrow: "US articles",
      title: "Articles for US small businesses",
      sub: "Longer-form writing from the All Done Sites team for small business owners in the United States.",
      seoTitle: "US Articles | All Done Sites",
      description:
        "Longer-form writing from the All Done Sites team for small business owners in the United States.",
      itemListName: "All Done Sites articles for the US",
      empty:
        "We have not published any articles for US readers yet. In the meantime, our [other articles](/articles/) and [guides](/guides/) cover getting and running a small business website.",
      llmsHeading: "US articles",
    },
  },
  uk: {
    key: "uk",
    basePath: "/uk/articles",
    lang: "en-GB",
    inLanguage: "en-GB",
    hreflang: "en-GB",
    articles: ukSection.articles,
    getArticle: ukSection.getArticle,
    getRelatedSlugs: ukSection.getRelatedSlugs,
    copy: {
      eyebrow: "UK articles",
      title: "Articles for UK small businesses",
      sub: "Longer-form writing from the All Done Sites team for small business owners in the United Kingdom.",
      seoTitle: "UK Articles | All Done Sites",
      description:
        "Longer-form writing from the All Done Sites team for small business owners in the United Kingdom.",
      itemListName: "All Done Sites articles for the UK",
      empty:
        "We have not published any articles for UK readers yet. In the meantime, our [other articles](/articles/) and [guides](/guides/) cover getting and running a small business website.",
      llmsHeading: "UK articles",
    },
  },
};

/** Sections in a fixed order: the original first, then the sectioned ones. */
export const ARTICLE_SECTION_LIST: ArticleSection[] = [
  ARTICLE_SECTIONS.default,
  ARTICLE_SECTIONS.us,
  ARTICLE_SECTIONS.uk,
];

export const SITE = "https://alldonesites.com";

/** The canonical URL of an article: full path, trailing slash (the form Pages serves). */
export function articleUrl(section: ArticleSection, slug: string): string {
  return `${SITE}${section.basePath}/${slug}/`;
}

/** The section whose index or articles live at `path`, if any. */
export function sectionForPath(path: string): ArticleSection | undefined {
  const clean = path.split(/[?#]/)[0];
  return ARTICLE_SECTION_LIST.find(
    (s) => clean === s.basePath || clean.startsWith(`${s.basePath}/`),
  );
}

export interface HreflangAlternate {
  hreflang: string;
  href: string;
}

/**
 * hreflang alternates for an article: one per section that has an article with the
 * same slug (this one included), the original /articles/ section as x-default. A
 * slug that exists in only one section gets none.
 */
export function hreflangAlternates(slug: string): HreflangAlternate[] {
  const holders = ARTICLE_SECTION_LIST.filter((s) => s.getArticle(slug));
  if (holders.length < 2) return [];
  return holders.map((s) => ({ hreflang: s.hreflang, href: articleUrl(s, slug) }));
}

/**
 * Routes to prerender for every article section: the index plus each article, and
 * nothing at all for a section with no articles (an empty index is thin content
 * that does not belong in the sitemap). Same form as the guide routes: no slash.
 */
export function articleRoutes(): string[] {
  return ARTICLE_SECTION_LIST.flatMap((s) =>
    s.articles.length > 0 ? [s.basePath, ...s.articles.map((a) => `${s.basePath}/${a.slug}`)] : [],
  );
}

/** The sectioned (non-original) sections' articles, for build-time llms.txt lines. */
export function llmsArticleSections(): Array<{
  heading: string;
  entries: Array<{ title: string; url: string; summary: string }>;
}> {
  return ARTICLE_SECTION_LIST.filter((s) => s.key !== "default" && s.articles.length > 0).map((s) => ({
    heading: s.copy.llmsHeading,
    entries: s.articles.map((a) => ({ title: a.title, url: articleUrl(s, a.slug), summary: a.summary })),
  }));
}
