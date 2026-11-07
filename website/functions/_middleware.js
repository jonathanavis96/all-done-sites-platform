/**
 * Two redirects that `_redirects` cannot express, because one needs the host and
 * the other the query string.
 *
 * 1. The Pages project's own hostname serves the whole site with a 200, and a
 * search engine has listed guides under it even though the canonical tag names
 * the real domain. Only that exact host moves: preview deployments are
 * `<hash>.alldonesites.pages.dev` and stay reachable. Only GET and HEAD move: a
 * 301 would drop the body of anything posted to the API on that host.
 *
 * 2. The legacy spa-github-pages shim URLs go to their real path.
 *
 * The old GitHub Pages deploy used the rafgraph 404 shim, which encoded a deep
 * link into the query string: `/?/pricing`, `/?/portfolio`, `/?/contact`. Those
 * URLs still serve 200 with the homepage in them, so Google holds them as
 * separate, duplicate-looking pages — all three showed up under "Crawled –
 * currently not indexed" in Search Console, last crawled between February and
 * May 2026.
 *
 * `_redirects` cannot match on a query string, so this runs as a Pages Function
 * instead. Each case is a single cheap check with an early return, since this
 * sits in front of every request to the site.
 */

const CANONICAL_ORIGIN = "https://alldonesites.com";
const PAGES_DEV_HOST = "alldonesites.pages.dev";

// Routes that were folded into the homepage in the redesign and are already
// 301'd there by `public/_redirects`. Sending the shim URL straight to `/`
// keeps it to one hop instead of `/?/pricing -> /pricing -> /`.
const FOLDED_INTO_HOMEPAGE = new Set([
  "/how-it-works",
  "/pricing",
  "/portfolio",
  "/faq",
  "/contact",
]);

export async function onRequest(context) {
  const url = new URL(context.request.url);

  if (url.hostname === PAGES_DEV_HOST && (context.request.method === "GET" || context.request.method === "HEAD")) {
    return Response.redirect(`${CANONICAL_ORIGIN}${url.pathname}${url.search}`, 301);
  }

  if (url.search.startsWith("?/")) {
    // The shim encoded /path?a=1&b=2 as ?/path&a=1~and~b=2, so the first `&` ends
    // the path. `~and~` is the shim's escaped `&`, so it is undone only after that
    // split, or the query's own separators would be taken for the end of the path.
    const shim = url.search.slice(2);
    const end = shim.search(/[&?]/);
    const rawPath = (end === -1 ? shim : shim.slice(0, end)).replace(/~and~/g, "&");
    const rawQuery = end === -1 ? "" : shim.slice(end + 1).replace(/~and~/g, "&");
    const target = new URL(url.origin);
    const path = rawPath.startsWith("/") ? rawPath : `/${rawPath}`;
    if (FOLDED_INTO_HOMEPAGE.has(path.replace(/\/$/, ""))) {
      target.pathname = "/";
    } else {
      // Pages serves the directory form, so land on it directly rather than
      // handing the crawler a second 308 on the way.
      target.pathname = path.endsWith("/") ? path : `${path}/`;
    }
    if (rawQuery) target.search = rawQuery;
    target.hash = url.hash;
    return Response.redirect(target.toString(), 301);
  }

  return context.next();
}
