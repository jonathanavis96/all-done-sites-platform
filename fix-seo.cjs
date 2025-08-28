// fix-seo.js
const fs = require('fs');
const path = require('path');

const pages = [
  ['src/pages/Index.tsx', {
    title: 'All Done Sites | Hassle-Free Website Subscription for SMEs',
    desc: 'We design, host, and maintain your site for one simple monthly fee. No upfront costs—just fast setup, pro support, and ongoing updates.'
  }],
  ['src/pages/Pricing.tsx', {
    title: 'Pricing & Plans | All Done Sites Monthly Website Packages',
    desc: 'Choose a simple monthly plan that includes design, hosting, maintenance, and support. Transparent pricing with no surprises.'
  }],
  ['src/pages/Faq.tsx', {
    title: 'FAQ | All Done Sites Website Subscriptions Explained',
    desc: 'Answers to setup time, hosting, email, support, and cancellations. See how our monthly website model works.'
  }],
  ['src/pages/Portfolio.tsx', {
    title: 'Portfolio | Recent Websites by All Done Sites',
    desc: 'Browse real client sites built and maintained by our team. See styles, features, and results.'
  }],
  ['src/pages/ContactEnterprise.tsx', {
    title: 'Enterprise & Custom Websites | Talk to All Done Sites',
    desc: 'Need a custom build, integrations, or advanced support? Tell us about your project and we’ll propose the right plan.'
  }],
  ['src/pages/HowItWorks.tsx', {
    title: 'How It Works | From Brief to Live Site with All Done Sites',
    desc: 'Simple process: brief, design, launch, and ongoing updates—all in one monthly subscription. No upfront fees.'
  }],
  ['src/pages/Contact.tsx', {
    title: 'Contact | Talk to All Done Sites',
    desc: 'Have a question about plans, billing, or support? Send us a message and we’ll get back to you fast.'
  }],
];

function ensureSeoImport(src) {
  if (src.includes('import Seo from "@/components/Seo";')) return src;

  // Find last import line and insert after it
  const importRegex = /^import .*;.*$/gm;
  let lastMatch = null;
  for (const m of src.matchAll(importRegex)) lastMatch = m;
  if (lastMatch) {
    const idx = lastMatch.index + lastMatch[0].length;
    return src.slice(0, idx) + '\nimport Seo from "@/components/Seo";' + src.slice(idx);
  }
  return 'import Seo from "@/components/Seo";\n' + src;
}

function insertSeoBlock(src, title, desc) {
  // If a Seo component is already present, skip
  if (/\b<Seo\b/.test(src)) return src;

  const block =
`      <Seo
        title="${title.replace(/"/g, '\\"')}"
        description="${desc.replace(/"/g, '\\"')}"
      />`;

  // Prefer: transform first <h2> to <h1> and insert block above it
  let out = src;

  if (/<h2\b[^>]*>/.test(out)) {
    out = out.replace(/<h2([^>]*)>/, '<h1$1>');
    out = out.replace(/<\/h2>/, '</h1>');
    out = out.replace(/<h1\b/, m => `${block}\n${m}`);
    return out;
  }

  // Otherwise, insert above first <h1>
  if (/<h1\b[^>]*>/.test(out)) {
    out = out.replace(/<h1\b/, m => `${block}\n${m}`);
    return out;
  }

  // Fallback: drop near the first opening tag in the body
  return out.replace(/(\n\s*<)/, `\n${block}\n$1`);
}

let changed = 0;
for (const [rel, meta] of pages) {
  const file = path.resolve(process.cwd(), rel);
  if (!fs.existsSync(file)) {
    console.warn('Skip (missing):', rel);
    continue;
  }
  const before = fs.readFileSync(file, 'utf8');
  let after = before;

  after = ensureSeoImport(after);
  after = insertSeoBlock(after, meta.title, meta.desc);

  if (after !== before) {
    fs.writeFileSync(file, after, 'utf8');
    console.log('Updated:', rel);
    changed++;
  } else {
    console.log('No change needed:', rel);
  }
}

console.log(`Done. Files changed: ${changed}`);
