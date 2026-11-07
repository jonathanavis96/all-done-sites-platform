import { describe, expect, it, vi } from "vitest";
import { onRequest } from "./_middleware";

function run(url, { method = "GET" } = {}) {
  const next = vi.fn(async () => new Response("from the site"));
  return onRequest({ request: new Request(url, { method }), next }).then((res) => ({ res, next }));
}

describe("legacy ?/ shim redirect", () => {
  it("keeps the old query string as a query string", async () => {
    const { res } = await run("https://alldonesites.com/?/guides&utm_source=x~and~b=2");
    expect(res.status).toBe(301);
    expect(res.headers.get("location")).toBe("https://alldonesites.com/guides/?utm_source=x&b=2");
  });

  it("redirects a shim URL with no query string", async () => {
    const { res } = await run("https://alldonesites.com/?/guides/some-guide");
    expect(res.headers.get("location")).toBe("https://alldonesites.com/guides/some-guide/");
  });

  it("decodes an ampersand inside the path after splitting off the query", async () => {
    const { res } = await run("https://alldonesites.com/?/a~and~b&x=1");
    expect(res.headers.get("location")).toBe("https://alldonesites.com/a&b/?x=1");
  });

  it("sends a page folded into the homepage straight to /, query included", async () => {
    const { res } = await run("https://alldonesites.com/?/pricing&utm_source=x");
    expect(res.headers.get("location")).toBe("https://alldonesites.com/?utm_source=x");
  });
});

describe("pages.dev duplicate of the site", () => {
  it("moves a page view on the production pages.dev host to the real domain", async () => {
    const { res, next } = await run("https://alldonesites.pages.dev/guides/x/?utm_source=y");
    expect(res.status).toBe(301);
    expect(res.headers.get("location")).toBe("https://alldonesites.com/guides/x/?utm_source=y");
    expect(next).not.toHaveBeenCalled();
  });

  it("leaves preview deployments alone", async () => {
    const { res, next } = await run("https://abc123.alldonesites.pages.dev/guides/x/");
    expect(res.status).toBe(200);
    expect(next).toHaveBeenCalledOnce();
  });

  it("does not redirect a POST, which would lose its body", async () => {
    const { next } = await run("https://alldonesites.pages.dev/api/notify/send", { method: "POST" });
    expect(next).toHaveBeenCalledOnce();
  });

  it("serves the real domain untouched", async () => {
    const { res, next } = await run("https://alldonesites.com/guides/x/");
    expect(res.status).toBe(200);
    expect(next).toHaveBeenCalledOnce();
  });
});
