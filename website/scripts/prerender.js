#!/usr/bin/env node
/**
 * Build-time prerender.
 *
 * Homepage: renders "/" and injects the rendered markup into #root of
 * dist/index.html, plus the rendered <title> + JSON-LD and a hero preload.
 *
 * Guides (and any other route in prerenderRoutes): renders each route and writes
 * a full dist/<route>/index.html with the markup in #root and page-specific head
 * (title + meta + canonical + JSON-LD). This makes the article content + structured
 * data visible in the raw HTML for search engines and AI crawlers that do not run
 * JavaScript, and means GitHub Pages serves a real 200 for each deep link. The
 * client then hydrates.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

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

const { render, prerenderRoutes = [] } = await import(pathToFileURL(serverEntry).href);

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
  out = out.replace("</head>", `${heroPreload}\n  ${head}\n  </head>`);
  out = out.replace('<div id="root"></div>', `<div id="root">${html}</div>`);
  fs.writeFileSync(distIndex, out);
  console.log(`✓ / (${html.length.toLocaleString()} chars)`);
}

// ---- Other prerendered routes (guides) --------------------------------------
// For these we replace the template's default meta with the page-specific head
// that <Seo> produced (title, description, canonical, OG/Twitter, JSON-LD).
function stripTemplateMeta(htmlStr) {
  return htmlStr
    .replace(/<title>[\s\S]*?<\/title>/i, "")
    .replace(/<meta[^>]*name="description"[^>]*>/i, "")
    .replace(/<meta[^>]*property="og:[^"]*"[^>]*>/gi, "")
    .replace(/<meta[^>]*name="twitter:[^"]*"[^>]*>/gi, "");
}

for (const route of prerenderRoutes) {
  const { html, headFull } = render(route);
  if (!html || html.length < 50) {
    console.warn(`⚠️  ${route} rendered almost no content (${html.length} chars). Skipping write.`);
    continue;
  }

  let out = stripTemplateMeta(template);
  out = out.replace("</head>", `${headFull}\n  </head>`);
  out = out.replace('<div id="root"></div>', `<div id="root">${html}</div>`);

  const outDir = path.join(distDir, route.replace(/^\//, ""));
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, "index.html"), out);
  console.log(`✓ ${route} (${html.length.toLocaleString()} chars)`);
}

console.log("\n✅ Prerender complete.\n");
