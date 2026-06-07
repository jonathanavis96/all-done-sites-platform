#!/usr/bin/env node
/**
 * Build-time prerender of the homepage.
 * Renders "/" with react-dom/server (via the SSR build in dist-server), then
 * injects the resulting HTML into #root of dist/index.html and adds the rendered
 * <title> + JSON-LD into the head. This makes the homepage content + structured
 * data visible in the raw HTML (fast first paint, and readable by AI crawlers /
 * search engines that don't run JavaScript). The client then hydrates it.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const distIndex = path.join(root, "dist", "index.html");
const serverEntry = path.join(root, "dist-server", "entry-server.js");

if (!fs.existsSync(serverEntry)) {
  console.error("❌ dist-server/entry-server.js not found. Run the SSR build first.");
  process.exit(1);
}

console.log("\n🧩 Prerendering the homepage...\n");

const { render } = await import(pathToFileURL(serverEntry).href);
const { html, head } = render("/");

let template = fs.readFileSync(distIndex, "utf-8");
// Drop the template's <title> (the rendered one from <Seo> is better) and inject
// the rendered head (title + JSON-LD) just before </head>.
template = template.replace(/<title>[\s\S]*?<\/title>/i, "");
template = template.replace("</head>", `${head}\n  </head>`);
// Inject the rendered app markup into #root for instant paint + hydration.
template = template.replace('<div id="root"></div>', `<div id="root">${html}</div>`);

fs.writeFileSync(distIndex, template);
console.log(`✓ Homepage prerendered (${html.length.toLocaleString()} chars of content) into dist/index.html\n`);
