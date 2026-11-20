#!/usr/bin/env node
/**
 * Build-time prerender.
 *
 * Homepage: renders "/" and injects the rendered markup into #root of
 * dist/index.html, plus the rendered <title> + JSON-LD and a hero preload.
 *
 * Guides, article sections (and any other route in prerenderRoutes): renders each route and writes
 * a full dist/<route>/index.html with the markup in #root and page-specific head
 * (title + meta + canonical + JSON-LD). This makes the article content + structured
 * data visible in the raw HTML for search engines and AI crawlers that do not run
 * JavaScript, and means GitHub Pages serves a real 200 for each deep link. The
 * client then hydrates.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import { execFileSync } from "child_process";
import { appendToHead, fillRoot } from "./inject-html.js";
import { contentFileFor, sitemapXml } from "./sitemap.js";
import { addSectionArticles } from "./llms.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const distDir = path.join(root, "dist");
const distIndex = path.join(distDir, "index.html");
const serverEntry = path.join(root, "dist-server", "entry-server.js");

if (!fs.existsSync(serverEntry)) {
  console.error("❌ dist-server/entry-server.js not found. Run the SSR build first.");
  process.exit(1);
}
if (!fs.existsSync(distIndex)) {
  console.error("❌ dist/index.html not found. Run `vite build` first.");
  process.exit(1);
}

const { render, ready, prerenderRoutes = [], llmsSections = [] } = await import(
  pathToFileURL(serverEntry).href
);
await ready;

// The pristine client template (read before we mutate dist/index.html for "/").
const template = fs.readFileSync(distIndex, "utf-8");

console.log("\n🧩 Prerendering...\n");

// ---- Homepage ("/") ---------------------------------------------------------
{
  const { html, head } = render("/");

  // Preload the hero image (LCP candidate) per viewport so it starts downloading
  // immediately: the full image on desktop, the small one on mobile.
  const heroFull = (html.match(/src="(\/assets\/pcquanti-full-(?!sm-)[^"]+\.webp)"/) || [])[1];
  const heroSm = (html.match(/(\/assets\/pcquanti-full-sm-[^"]+\.webp)/) || [])[1];
  const heroPreload = [
    heroFull ? `<link rel="preload" as="image" href="${heroFull}" media="(min-width:861px)" fetchpriority="high">` : "",
    heroSm ? `<link rel="preload" as="image" href="${heroSm}" media="(max-width:860px)" fetchpriority="high">` : "",
  ]
    .filter(Boolean)
    .join("\n  ");

  let out = template;
  out = out.replace(/<title>[\s\S]*?<\/title>/i, "");
  out = appendToHead(out, `${heroPreload}\n  ${head}`);
  out = fillRoot(out, html);
  fs.writeFileSync(distIndex, out);
  console.log(`✓ / (${html.length.toLocaleString()} chars)`);
}

// ---- Other prerendered routes (guides, article sections) --------------------
// For these we replace the template's default meta with the page-specific head
// that <Seo> produced (title, description, canonical, OG/Twitter, JSON-LD).
function stripTemplateMeta(htmlStr) {
  return htmlStr
    .replace(/<title>[\s\S]*?<\/title>/i, "")
    .replace(/<meta[^>]*name="description"[^>]*>/i, "")
    .replace(/<meta[^>]*property="og:[^"]*"[^>]*>/gi, "")
    .replace(/<meta[^>]*name="twitter:[^"]*"[^>]*>/gi, "")
    // Drop the template's homepage canonical so it can't leak onto sub-pages;
    // the page-specific canonical comes from <Seo> via headFull.
    .replace(/<link[^>]*rel="canonical"[^>]*>/gi, "");
}

for (const route of prerenderRoutes) {
  const { html, headFull, lang } = render(route);
  if (!html || html.length < 50) {
    console.warn(`⚠️  ${route} rendered almost no content (${html.length} chars). Skipping write.`);
    continue;
  }

  let out = stripTemplateMeta(template);
  // Market-specific article sections (/us/articles/, /uk/articles/) carry their
  // own language; every other route keeps the template's <html lang>.
  if (lang) out = out.replace(/<html lang="[^"]*"/i, () => `<html lang="${lang}"`);
  out = appendToHead(out, headFull);
  out = fillRoot(out, html);

  const outDir = path.join(distDir, route.replace(/^\//, ""));
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, "index.html"), out);
  console.log(`✓ ${route} (${html.length.toLocaleString()} chars)`);
}

// ---- sitemap.xml ------------------------------------------------------------
// Single source of truth for indexable URLs: homepage + every prerendered route
// (the guides index + each guide), all in the trailing-slash form Cloudflare
// Pages actually serves. Generated here so the sitemap can never drift from the
// real routes, and never advertises a URL that redirects.
{
  const today = new Date().toISOString().slice(0, 10);

  // lastmod must reflect when the content actually changed, not when we last
  // deployed. Stamping every URL with today's date on every build teaches
  // Google to ignore the field entirely, which is the opposite of what we want
  // for guides and articles we need recrawled promptly. Take the date from the
  // last commit that touched the file the route's content comes from
  // (contentFileFor in sitemap.js).
  const lastmodCache = new Map();
  const lastmodFor = (route) => {
    const file = contentFileFor(route);
    if (!lastmodCache.has(file)) {
      let date = today;
      try {
        date =
          execFileSync("git", ["log", "-1", "--format=%cs", "--", file], {
            cwd: root,
            encoding: "utf8",
          }).trim() || today;
      } catch {
        // not a git checkout (or git missing) — fall back to the build date
      }
      lastmodCache.set(file, date);
    }
    return lastmodCache.get(file);
  };
  const { xml, count } = sitemapXml(["/", ...prerenderRoutes], lastmodFor);
  fs.writeFileSync(path.join(distDir, "sitemap.xml"), xml);
  console.log(`✓ sitemap.xml (${count} URLs)`);
}

// ---- llms.txt -----------------------------------------------------------------
// public/llms.txt (copied into dist/ by vite) is maintained by hand and lists the
// original /articles/ section. Articles in the market-specific sections are added
// to the built copy here; with those sections empty the file is left untouched.
{
  const llmsPath = path.join(distDir, "llms.txt");
  if (fs.existsSync(llmsPath)) {
    const before = fs.readFileSync(llmsPath, "utf-8");
    const after = addSectionArticles(before, llmsSections);
    if (after !== before) {
      fs.writeFileSync(llmsPath, after);
      const added = llmsSections.reduce((n, s) => n + s.entries.length, 0);
      console.log(`✓ llms.txt (+${added} sectioned article${added === 1 ? "" : "s"})`);
    }
  }
}

console.log("\n✅ Prerender complete.\n");
