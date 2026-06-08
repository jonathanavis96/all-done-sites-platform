#!/usr/bin/env node
/**
 * Notify IndexNow (Bing, Yandex, and others) of our URLs so they crawl/refresh
 * quickly. ChatGPT browsing uses Bing, so this is the fastest path to getting new
 * content (e.g. the /guides section) discoverable in AI answers + Bing search.
 *
 * Usage: node scripts/ping-indexnow.js
 * Requires the key file public/<key>.txt to be LIVE first (deploy before pinging).
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, "..", "public");
const HOST = "alldonesites.com";

// Find the IndexNow key file: a 32-hex-char .txt in public/.
const keyFile = fs.readdirSync(publicDir).find((f) => /^[a-f0-9]{32}\.txt$/.test(f));
if (!keyFile) {
  console.error("❌ No IndexNow key file (public/<32-hex>.txt) found.");
  process.exit(1);
}
const key = keyFile.replace(/\.txt$/, "");

// Pull URLs from the sitemap.
const sitemap = fs.readFileSync(path.join(publicDir, "sitemap.xml"), "utf-8");
const urlList = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
if (!urlList.length) {
  console.error("❌ No <loc> URLs found in sitemap.xml.");
  process.exit(1);
}

const body = {
  host: HOST,
  key,
  keyLocation: `https://${HOST}/${keyFile}`,
  urlList,
};

console.log(`📡 IndexNow: submitting ${urlList.length} URLs with key ${key}...`);
const res = await fetch("https://api.indexnow.org/indexnow", {
  method: "POST",
  headers: { "Content-Type": "application/json; charset=utf-8" },
  body: JSON.stringify(body),
});
console.log(`   HTTP ${res.status} ${res.statusText}`);
if (res.status === 200 || res.status === 202) {
  console.log("✅ Accepted. Bing/Yandex will crawl these shortly.");
} else {
  console.log("⚠️  Non-success status. Body:", await res.text().catch(() => ""));
  console.log("   (Common cause: key file not live yet at keyLocation — deploy first.)");
}
