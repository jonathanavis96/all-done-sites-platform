// @vitest-environment jsdom
//
// useLocalPrices rewrites text nodes in the rendered article, so React must never
// reconcile those nodes afterwards. This renders the real article pages under
// real React, for a viewer outside the rand, and moves between slugs the way a
// related-guide link does.
import { act, type ComponentType } from "react";
import { createRoot, type Root } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter, Route, Routes, useNavigate } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// Block 0 of "mixed" gives React a <p> with text nodes around a link, the only
// shape where React holds its own reference to the text the hook replaces.
const FIXTURES = vi.hoisted(() => {
  const base = { description: "d", metaTitle: "t", metaDescription: "m", category: "c", readMinutes: 1, faqs: [], author: { name: "A" } };
  return [
    { ...base, slug: "mixed", title: "Mixed", intro: "Intro.", blocks: [{ p: "A site costs R800 a month, see [pricing](/pricing/) for more." }] },
    { ...base, slug: "plain", title: "Plain", intro: "Intro.", blocks: [{ p: "Plain text with no price." }] },
    { ...base, slug: "same-shape", title: "Same", intro: "Intro.", blocks: [{ p: "Now it costs R900 a month, see [plans](/plans/) for more." }] },
  ];
});

vi.mock("@/content/guides", async () => {
  const shared = await vi.importActual<typeof import("@/content/shared")>("@/content/shared");
  return {
    GUIDES_PUBLISHED: "2026-01-01",
    GUIDES_UPDATED: "2026-01-01",
    getGuide: (slug?: string) => FIXTURES.find((f) => f.slug === slug),
    getRelatedSlugs: () => [],
    renderInline: shared.renderInline,
    stripInline: shared.stripInline,
  };
});
vi.mock("@/content/articles", () => ({
  getArticle: (slug?: string) => FIXTURES.find((f) => f.slug === slug),
  getRelatedSlugs: () => [],
}));

const { default: GuideArticle } = await import("@/pages/GuideArticle");
const { default: ArticleArticle } = await import("@/pages/ArticleArticle");

let goTo: (slug: string) => void = () => {};
function Nav({ prefix }: { prefix: string }) {
  const navigate = useNavigate();
  goTo = (slug) => navigate(`${prefix}/${slug}/`);
  return null;
}

async function settle() {
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0));
  });
}

const body = () => document.querySelector("article.guide-body")?.textContent ?? "";

describe.each([
  ["guides", GuideArticle as ComponentType],
  ["articles", ArticleArticle as ComponentType],
])("moving between %s", (prefix, Page) => {
  let host: HTMLElement;
  let root: Root;
  const errors: unknown[] = [];

  beforeEach(async () => {
    errors.length = 0;
    window.addEventListener("error", (e) => errors.push(e.error), { once: false });
    window.localStorage.clear();
    vi.spyOn(console, "error").mockImplementation((...a) => void errors.push(a[0]));
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) =>
        String(url).includes("cdn-cgi")
          ? new Response("loc=US\n")
          : new Response(JSON.stringify({ rates: { ZAR: 20, USD: 1 } })),
      ),
    );
    host = document.createElement("div");
    document.body.appendChild(host);
    root = createRoot(host);
    await act(async () => {
      root.render(
        <HelmetProvider>
          <MemoryRouter initialEntries={[`/${prefix}/mixed/`]}>
            <Nav prefix={`/${prefix}`} />
            <Routes>
              <Route path={`/${prefix}/:slug`} element={<Page />} />
            </Routes>
          </MemoryRouter>
        </HelmetProvider>,
      );
    });
    await settle();
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    host.remove();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("annotates the price for a viewer outside the rand", () => {
    expect(body()).toContain("R800 (≈ $40) a month");
  });

  it("survives a move to a slug with a plain string in the same place", async () => {
    await act(async () => goTo("plain"));
    await settle();
    expect(body()).toContain("Plain text with no price.");
    expect(body()).not.toContain("R800");
    expect(host.textContent).not.toBe("");
    expect(errors).toEqual([]);
  });

  it("shows the new text after a move to a slug of the same shape", async () => {
    await act(async () => goTo("same-shape"));
    await settle();
    expect(body()).toContain("Now it costs R900 (≈ $45) a month");
    expect(body()).not.toContain("R800");
    expect(errors).toEqual([]);
  });
});
