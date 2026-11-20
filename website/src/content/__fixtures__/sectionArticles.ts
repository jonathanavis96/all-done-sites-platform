// Test-only articles for the /us/articles and /uk/articles sections. Never imported
// by the site itself: tests mock content/us/articles.tsx and content/uk/articles.tsx
// and push these in.
import type { Article } from "../articles";

export function fixtureArticle(overrides: Partial<Article> & Pick<Article, "slug" | "title">): Article {
  return {
    metaTitle: `${overrides.title} | All Done Sites`,
    description: "A fixture article used by the tests.",
    summary: "Fixture summary for the tests.",
    category: "Getting started",
    readMins: 3,
    intro: "Fixture intro with a [link to an article](/articles/what-does-a-website-cost-in-south-africa/).",
    publishedAt: "2026-11-01",
    updatedAt: "2026-11-02",
    blocks: [{ h2: "Fixture heading" }, { p: "Plans start at $49 a month." }],
    faqs: [],
    ...overrides,
  };
}

export const US_FIXTURE = fixtureArticle({
  slug: "fixture-us-website-costs",
  title: "Fixture US Website Costs",
  summary: "What a fixture US website costs.",
});

export const UK_FIXTURE = fixtureArticle({
  slug: "fixture-uk-website-costs",
  title: "Fixture UK Website Costs",
  summary: "What a fixture UK website costs.",
});

/** A slug that also exists in the original /articles/ section. */
export const SHARED_SLUG = "what-does-a-website-cost-in-south-africa";
