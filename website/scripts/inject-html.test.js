import { describe, expect, it } from "vitest";
import { appendToHead, fillRoot } from "./inject-html";

const TEMPLATE = '<html><head></head><body><div id="root"></div></body></html>';

describe("inject-html", () => {
  it("keeps dollar sequences in rendered text literally", () => {
    const html = "<p>Tiers: $$, $& and $' pricing</p>";
    expect(fillRoot(TEMPLATE, html)).toBe(`<html><head></head><body><div id="root">${html}</div></body></html>`);
    expect(appendToHead(TEMPLATE, "<title>$$ off</title>")).toContain("<title>$$ off</title>\n  </head>");
  });
});
