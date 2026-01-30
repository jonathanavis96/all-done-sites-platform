#!/usr/bin/env node

/**
 * Generate static HTML pages for each route
 * This ensures GitHub Pages returns HTTP 200 for deep links (SEO requirement)
 * Runs after `vite build` to create route/index.html files
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.join(__dirname, '..', 'dist');

// Define all routes from sitemap that need static pages
const routes = [
  { 
    path: 'how-it-works', 
    title: 'How It Works', 
    description: 'Learn how All Done Sites builds, hosts, and maintains your professional website for one simple monthly fee.',
    ogTitle: 'How It Works - All Done Sites'
  },
  { 
    path: 'pricing', 
    title: 'Pricing', 
    description: 'Simple, transparent pricing for your website. One monthly fee covers everything - design, hosting, maintenance, and updates.',
    ogTitle: 'Pricing - All Done Sites'
  },
  { 
    path: 'portfolio', 
    title: 'Portfolio', 
    description: 'See examples of professional websites we\'ve built for small businesses across various industries.',
    ogTitle: 'Portfolio - All Done Sites'
  },
  { 
    path: 'faq', 
    title: 'FAQ', 
    description: 'Frequently asked questions about All Done Sites - website design, hosting, maintenance, and our subscription model.',
    ogTitle: 'FAQ - All Done Sites'
  },
  { 
    path: 'contact', 
    title: 'Contact', 
    description: 'Get in touch with All Done Sites. Let\'s discuss your website needs and how we can help your business grow online.',
    ogTitle: 'Contact Us - All Done Sites'
  },
  { 
    path: 'contact-enterprise', 
    title: 'Enterprise Contact', 
    description: 'Contact All Done Sites for enterprise solutions. Manage multiple websites with dedicated support and custom solutions.',
    ogTitle: 'Enterprise Solutions - All Done Sites'
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
    `<meta property="og:url" content="https://alldonesites.com/${route.path}"`
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
  
  // Add canonical URL if not present
  if (!html.includes('<link rel="canonical"')) {
    const headCloseTag = html.indexOf('</head>');
    html = html.slice(0, headCloseTag) + 
           `    <link rel="canonical" href="https://alldonesites.com/${route.path}" />\n` +
           html.slice(headCloseTag);
  }
  
  // Write the customized HTML to route/index.html
  const outputPath = path.join(routeDir, 'index.html');
  fs.writeFileSync(outputPath, html);
  
  console.log(`✓ Created /${route.path}/index.html`);
});

console.log('\n✅ Static pages generated successfully!');
console.log(`   GitHub Pages will now return HTTP 200 for all routes.\n`);
