/**
 * 301 the legacy spa-github-pages shim URLs to their real path.
 *
 * The old GitHub Pages deploy used the rafgraph 404 shim, which encoded a deep
 * link into the query string: `/?/pricing`, `/?/portfolio`, `/?/contact`. Those
 * URLs still serve 200 with the homepage in them, so Google holds them as
 * separate, duplicate-looking pages — all three showed up under "Crawled –
 * currently not indexed" in Search Console, last crawled between February and
 * May 2026.
 *
 * `_redirects` cannot match on a query string, so this runs as a Pages Function
 * instead. It is deliberately a single cheap check with an early return, since
 * it sits in front of every request to the site.
 */

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

  if (url.search.startsWith("?/")) {
    // The shim wrote `&` as `~and~`; undo that before rebuilding the path.
    const [rawPath, rawQuery] = url.search.slice(2).replace(/~and~/g, "&").split("?");
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
