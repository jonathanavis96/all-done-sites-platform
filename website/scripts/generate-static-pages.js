#!/usr/bin/env node

/**
 * Generate static HTML pages for the standalone utility/legal routes.
 *
 * This runs after `vite build` and writes a `route/index.html` for each entry
 * below so Cloudflare Pages returns HTTP 200 (with the right <title>/meta) for
 * those deep links.
 *
 * IMPORTANT — do NOT add the homepage-anchor routes here (how-it-works, pricing,
 * portfolio, faq, contact). Those are client-side <Navigate> redirects to
 * homepage anchors in App.tsx, and they are 301-redirected server-side via
 * `public/_redirects`. Emitting standalone shells for them produced "zombie"
 * pages that Google reported as "Discovered – currently not indexed".
 *
 * The homepage ("/") and /guides/* are handled by prerender.js (real content).
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.join(__dirname, '..', 'dist');

const SITE = 'https://alldonesites.com';

// Real standalone routes (utility / legal). These are genuine pages, not
// homepage anchors. Canonical URLs use a trailing slash to match the directory
// form Cloudflare Pages actually serves.
const routes = [
  {
    path: 'contact-enterprise',
    title: 'Enterprise Contact',
    description: 'Contact All Done Sites for enterprise solutions. Manage multiple websites with dedicated support and custom solutions.',
    ogTitle: 'Enterprise Solutions - All Done Sites'
  },
  {
    path: 'thank-you',
    title: 'Thank You',
    description: 'Thanks for getting in touch with All Done Sites. We will reply within one business day.',
    ogTitle: 'Thank You - All Done Sites'
  },
  {
    path: 'terms',
    title: 'Terms',
    description: 'All Done Sites terms of service, including our refund and cancellation policies.',
    ogTitle: 'Terms - All Done Sites'
  },
  {
    path: 'terms/full',
    title: 'Subscription Agreement',
    description: 'The full All Done Sites website subscription agreement.',
    ogTitle: 'Subscription Agreement - All Done Sites'
  },
  {
    path: 'privacy',
    title: 'Privacy Policy',
    description: 'How All Done Sites collects, uses, and protects your personal information.',
    ogTitle: 'Privacy Policy - All Done Sites'
  }
];

console.log('\n🚀 Generating static pages for SEO...\n');

// Read the base index.html
const indexPath = path.join(distDir, 'index.html');
if (!fs.existsSync(indexPath)) {
  console.error('❌ Error: dist/index.html not found. Run `vite build` first.');
  process.exit(1);
}

const indexHtml = fs.readFileSync(indexPath, 'utf-8');

// Generate a static page for each route
routes.forEach(route => {
  const routeDir = path.join(distDir, route.path);
  fs.mkdirSync(routeDir, { recursive: true });

  // Canonical/OG URL for this route — trailing slash to match what Cloudflare serves.
  const canonicalUrl = `${SITE}/${route.path}/`;

  // Update meta tags for this specific route
  let html = indexHtml;

  // Update title
  html = html.replace(
    /<title>.*?<\/title>/i,
    `<title>${route.title} | All Done Sites</title>`
  );

  // Update description
  html = html.replace(
    /<meta name="description" content="[^"]*"/i,
    `<meta name="description" content="${route.description}"`
  );

  // Update Open Graph URL
  html = html.replace(
    /<meta property="og:url" content="[^"]*"/i,
    `<meta property="og:url" content="${canonicalUrl}"`
  );

  // Update Open Graph title
  html = html.replace(
    /<meta property="og:title" content="[^"]*"/i,
    `<meta property="og:title" content="${route.ogTitle}"`
  );

  // Update Open Graph description
  html = html.replace(
    /<meta property="og:description" content="[^"]*"/i,
    `<meta property="og:description" content="${route.description}"`
  );

  // Update Twitter title
  html = html.replace(
    /<meta name="twitter:title" content="[^"]*"/i,
    `<meta name="twitter:title" content="${route.ogTitle}"`
  );

  // Update Twitter description
  html = html.replace(
    /<meta name="twitter:description" content="[^"]*"/i,
    `<meta name="twitter:description" content="${route.description}"`
  );

  // Set the canonical to THIS route (always replace; the template now carries a
  // homepage canonical that must not leak onto sub-pages).
  if (/<link rel="canonical"[^>]*>/i.test(html)) {
    html = html.replace(
      /<link rel="canonical"[^>]*>/i,
      `<link rel="canonical" href="${canonicalUrl}" />`
    );
  } else {
    const headCloseTag = html.indexOf('</head>');
    html = html.slice(0, headCloseTag) +
           `    <link rel="canonical" href="${canonicalUrl}" />\n` +
           html.slice(headCloseTag);
  }

  // Write the customized HTML to route/index.html
  const outputPath = path.join(routeDir, 'index.html');
  fs.writeFileSync(outputPath, html);

  console.log(`✓ Created /${route.path}/index.html (canonical ${canonicalUrl})`);
});

console.log('\n✅ Static pages generated successfully!\n');
