import { describe, expect, it } from "vitest";
import { articles as us } from "./us/articles";
import { articles as uk } from "./uk/articles";
import { prerenderRoutes, llmsSections } from "../entry-server";

// The committed section files ship empty; publishing fills them. Until then the
// build must not prerender, sitemap or llms.txt-list anything under /us or /uk.
describe("the committed US and UK sections", () => {
  it("are empty", () => {
    expect(us).toEqual([]);
    expect(uk).toEqual([]);
  });

  it("add nothing to the prerendered routes or llms.txt", () => {
    expect(prerenderRoutes.filter((r) => /^\/(us|uk)\//.test(r))).toEqual([]);
    expect(prerenderRoutes).toContain("/articles");
    expect(llmsSections).toEqual([]);
  });
});
