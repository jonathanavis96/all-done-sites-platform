import fs from "fs";
import path from "path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Article } from "./articles";
import { SHARED_SLUG, UK_FIXTURE, US_FIXTURE, fixtureArticle } from "./__fixtures__/sectionArticles";

// The real section files are empty; each test fills these arrays with fixtures.
const fixtures = vi.hoisted(() => ({ us: [] as Article[], uk: [] as Article[] }));

function sectionModule(list: Article[]) {
  return {
    articles: list,
    getArticle: (slug: string | undefined) => list.find((a) => a.slug === slug),
    getRelatedSlugs: () => [],
  };
}
vi.mock("./us/articles", () => sectionModule(fixtures.us));
vi.mock("./uk/articles", () => sectionModule(fixtures.uk));

const { render } = await import("../entry-server");
const { articleRoutes, llmsArticleSections, hreflangAlternates } = await import("./sections");
const { sitemapXml, contentFileFor } = await import("../../scripts/sitemap.js");
const { addSectionArticles } = await import("../../scripts/llms.js");

const SITE = "https://alldonesites.com";
const publicLlms = fs.readFileSync(path.join(__dirname, "../../public/llms.txt"), "utf-8");

beforeEach(() => {
  fixtures.us.splice(0);
  fixtures.uk.splice(0);
});

const canonicalOf = (head: string) => head.match(/rel="canonical" href="([^"]+)"/)?.[1];
const alternatesOf = (head: string) =>
  [...head.matchAll(/<link[^>]*rel="alternate"[^>]*>/gi)].map((m) => ({
    hreflang: m[0].match(/hreflang="([^"]+)"/i)?.[1],
    href: m[0].match(/href="([^"]+)"/)?.[1],
  }));

describe("empty article sections", () => {
  it.each(["us", "uk"])("/%s/articles renders the empty state, in its own language", (s) => {
    const { html, headFull, lang } = render(`/${s}/articles`);
    expect(html).toContain(`We have not published any articles for ${s.toUpperCase()} readers yet.`);
    expect(html).toContain('href="/guides/"');
    expect(canonicalOf(headFull)).toBe(`${SITE}/${s}/articles/`);
    expect(headFull).toContain(`<title data-rh="true">${s.toUpperCase()} Articles | All Done Sites</title>`);
    expect(lang).toBe(s === "us" ? "en-US" : "en-GB");
    // No ItemList for an empty index.
    expect(headFull).not.toContain("ItemList");
  });

  it("are left out of the prerendered routes, the sitemap and llms.txt", () => {
    expect(articleRoutes().some((r) => r.startsWith("/us/") || r.startsWith("/uk/"))).toBe(false);
    const { xml } = sitemapXml(["/", ...articleRoutes()], () => "2026-11-20");
    expect(xml).not.toContain("/us/articles");
    expect(xml).not.toContain("/uk/articles");
    expect(llmsArticleSections()).toEqual([]);
    expect(addSectionArticles(publicLlms, llmsArticleSections())).toBe(publicLlms);
  });

  it("leave the original /articles/ pages without a lang, og:locale or hreflang of their own", () => {
    const { headFull, lang } = render(`/articles/${SHARED_SLUG}`);
    expect(lang).toBeUndefined();
    expect(headFull).not.toContain("og:locale");
    expect(alternatesOf(headFull)).toEqual([]);
    expect(render("/articles").lang).toBeUndefined();
  });
});

describe("a sample article in each section", () => {
  beforeEach(() => {
    fixtures.us.push(US_FIXTURE);
    fixtures.uk.push(UK_FIXTURE);
  });

  it.each([
    ["us", US_FIXTURE, "en-US", "en_US"],
    ["uk", UK_FIXTURE, "en-GB", "en_GB"],
  ] as const)("/%s/articles/<slug> renders the article", (s, article, bcp47, ogLocale) => {
    const { html, headFull, lang } = render(`/${s}/articles/${article.slug}`);
    expect(html).toContain(article.title);
    expect(canonicalOf(headFull)).toBe(`${SITE}/${s}/articles/${article.slug}/`);
    expect(headFull).toContain(`<title data-rh="true">${article.metaTitle}</title>`);
    expect(headFull).toContain(`property="og:locale" content="${ogLocale}"`);
    expect(headFull).toContain(`"inLanguage":"${bcp47}"`);
    expect(headFull).toContain(`"@id":"${SITE}/${s}/articles/${article.slug}/"`);
    expect(lang).toBe(bcp47);
    // Back link stays in the section; internal /articles/ links in the body are untouched.
    expect(html).toContain(`href="/${s}/articles/"`);
    expect(html).toContain('href="/articles/what-does-a-website-cost-in-south-africa/"');
    // A slug in only one section gets no alternates.
    expect(alternatesOf(headFull)).toEqual([]);
  });

  it.each(["us", "uk"] as const)("/%s/articles lists the article", (s) => {
    const article = s === "us" ? US_FIXTURE : UK_FIXTURE;
    const { html, headFull } = render(`/${s}/articles`);
    expect(html).toContain(`href="/${s}/articles/${article.slug}/"`);
    expect(html).not.toContain("We have not published");
    expect(headFull).toContain(`"url":"${SITE}/${s}/articles/${article.slug}/"`);
  });

  it("is prerendered and in the sitemap at its full path, with its section index", () => {
    const routes = articleRoutes();
    expect(routes).toEqual(
      expect.arrayContaining([
        "/articles",
        "/us/articles",
        `/us/articles/${US_FIXTURE.slug}`,
        "/uk/articles",
        `/uk/articles/${UK_FIXTURE.slug}`,
      ]),
    );
    const { xml } = sitemapXml(["/", ...routes], () => "2026-11-20");
    expect(xml).toContain(
      `<loc>${SITE}/us/articles/</loc>\n    <lastmod>2026-11-20</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.8</priority>`,
    );
    expect(xml).toContain(
      `<loc>${SITE}/us/articles/${US_FIXTURE.slug}/</loc>\n    <lastmod>2026-11-20</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.7</priority>`,
    );
    expect(xml).toContain(`<loc>${SITE}/uk/articles/${UK_FIXTURE.slug}/</loc>`);
    expect(contentFileFor(`/us/articles/${US_FIXTURE.slug}`)).toBe("src/content/us/articles.tsx");
    expect(contentFileFor("/uk/articles")).toBe("src/content/uk/articles.tsx");
  });

  it("is listed in llms.txt under its section, ahead of Contact", () => {
    const out = addSectionArticles(publicLlms, llmsArticleSections());
    const usLine = `- [${US_FIXTURE.title}](${SITE}/us/articles/${US_FIXTURE.slug}/): what a fixture US website costs.`;
    expect(out).toContain(`## US articles\n\n${usLine}\n\n`);
    expect(out).toContain(`## UK articles\n\n- [${UK_FIXTURE.title}](${SITE}/uk/articles/${UK_FIXTURE.slug}/)`);
    expect(out.indexOf("## US articles")).toBeLessThan(out.indexOf("## Contact"));
    // Everything already in the file is kept as it was.
    expect(out.replace(/## US articles[\s\S]*?(?=## Contact)/, "")).toBe(publicLlms);
  });

  it("only the non-empty section is added when one section is empty", () => {
    fixtures.uk.splice(0);
    expect(articleRoutes().some((r) => r.startsWith("/uk/"))).toBe(false);
    const out = addSectionArticles(publicLlms, llmsArticleSections());
    expect(out).toContain("## US articles");
    expect(out).not.toContain("## UK articles");
  });
});

describe("hreflang between sections", () => {
  it("links articles that share a slug, /articles/ as x-default, from every copy", () => {
    fixtures.us.push(fixtureArticle({ slug: SHARED_SLUG, title: "Fixture US version" }));
    const expected = [
      { hreflang: "x-default", href: `${SITE}/articles/${SHARED_SLUG}/` },
      { hreflang: "en-US", href: `${SITE}/us/articles/${SHARED_SLUG}/` },
    ];
    expect(hreflangAlternates(SHARED_SLUG)).toEqual(expected);
    expect(alternatesOf(render(`/us/articles/${SHARED_SLUG}`).headFull)).toEqual(expected);
    expect(alternatesOf(render(`/articles/${SHARED_SLUG}`).headFull)).toEqual(expected);
    // The UK section does not have it, and the other /articles/ pages are untouched.
    expect(alternatesOf(render("/articles/ai-search-vs-seo-what-actually-changes").headFull)).toEqual([]);
  });

  it("links US and UK copies without x-default when /articles/ has no such slug", () => {
    fixtures.us.push(US_FIXTURE);
    fixtures.uk.push({ ...UK_FIXTURE, slug: US_FIXTURE.slug });
    expect(alternatesOf(render(`/uk/articles/${US_FIXTURE.slug}`).headFull)).toEqual([
      { hreflang: "en-US", href: `${SITE}/us/articles/${US_FIXTURE.slug}/` },
      { hreflang: "en-GB", href: `${SITE}/uk/articles/${US_FIXTURE.slug}/` },
    ]);
  });

  it("emits none for a slug that exists in one section only", () => {
    fixtures.us.push(US_FIXTURE);
    expect(hreflangAlternates(US_FIXTURE.slug)).toEqual([]);
    expect(hreflangAlternates(SHARED_SLUG)).toEqual([]);
  });
});
