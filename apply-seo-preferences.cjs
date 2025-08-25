// apply-seo-preferences.cjs
const fs = require('fs');
const path = require('path');

const pages = [
  // HOME — keep two H1s, keep current SEO (you already have it)
  {
    file: 'src/pages/Index.tsx',
    h1: 'Your website, done for you — for one monthly fee',
    secondH1Keep: true, // keep “Everything included” as H1
    seo: null, // leave as-is
  },

  // PRICING — set H1 + update SEO to match “Simple monthly pricing”
  {
    file: 'src/pages/Pricing.tsx',
    h1: 'Simple monthly pricing',
    seo: {
      // Short title aligned to H1 and unique brand tail
      title: 'Simple Monthly Pricing | All Done Sites',
      // ~150 chars
      desc:
        'Pick a monthly website plan that includes design, hosting, security, email, and updates. Clear pricing with no hidden fees or long contracts.',
    },
  },

  // FAQ — more SEO-friendly H1 + keep unique title/meta
  {
    file: 'src/pages/Faq.tsx',
    h1: 'Website Subscription FAQs',
    seo: {
      title: 'Website Subscription FAQs | All Done Sites',
      desc:
        'Get answers about setup time, hosting, email, support, and cancellations. Learn how our monthly website subscription works for your business.',
    },
  },

  // PORTFOLIO — keep “Recent work & examples” H1; keep concise title/meta
  {
    file: 'src/pages/Portfolio.tsx',
    h1: 'Recent work & examples',
    seo: {
      title: 'Portfolio | Recent Websites by All Done Sites',
      desc:
        'Browse real client websites we design and maintain. See styles, features, and results built for speed, clarity, and conversions.',
    },
  },

  // ENTERPRISE — set H1 + keep strong enterprise SEO
  {
    file: 'src/pages/ContactEnterprise.tsx',
    h1: 'Enterprise & Custom Websites',
    seo: {
      title: 'Enterprise & Custom Websites | All Done Sites',
      desc:
        'Need custom builds, integrations, or advanced support? Tell us about your project and we’ll propose the right enterprise plan.',
    },
  },

  // HOW IT WORKS — set H1 + align SEO to “3 steps”
  {
    file: 'src/pages/HowItWorks.tsx',
    h1: 'Get started in 3 easy steps',
    seo: {
      title: 'How It Works: 3 Easy Steps | All Done Sites',
      desc:
        'Brief, design, launch — then ongoing updates. Our monthly website subscription makes professional sites simple from day one.',
    },
  },

  // CONTACT — keep your original H1; align SEO to match the intent
  {
    file: 'src/pages/Contact.tsx',
    h1: 'Let’s build your website',
    seo: {
      title: 'Let’s Build Your Website | All Done Sites',
      desc:
        'Have questions about plans, billing, or support? Send us a message and we’ll get back to you fast to help you get online.',
    },
  },
];

function ensureSeoImport(src) {
  if (src.includes('import Seo from "@/components/Seo";')) return src;
  const importRegex = /^import .*;.*$/gm;
  let last = null;
  for (const m of src.matchAll(importRegex)) last = m;
  if (last) {
    const idx = last.index + last[0].length;
    return src.slice(0, idx) + '\nimport Seo from "@/components/Seo";' + src.slice(idx);
  }
  return 'import Seo from "@/components/Seo";\n' + src;
}

function upsertSeoBlock(src, title, desc) {
  if (!title && !desc) {
    // no changes requested
    return src;
  }

  const block =
`      <Seo
        title="${(title ?? '').replace(/"/g, '\\"')}"
        description="${(desc ?? '').replace(/"/g, '\\"')}"
      />`;

  const seoRegex = /<Seo\b[\s\S]*?\/>/g;
  const matches = [...src.matchAll(seoRegex)];

  let out = src;

  if (matches.length > 0) {
    // Replace first, remove others
    out = out.slice(0, matches[0].index) + block + out.slice(matches[0].index + matches[0][0].length);
    let offset = 0;
    for (let i = 1; i < matches.length; i++) {
      const m = matches[i];
      const start = m.index + offset;
      const end = start + m[0].length;
      out = out.slice(0, start) + out.slice(end);
      offset -= m[0].length;
    }
    return out;
  }

  // Insert above first <h1>, or near top as fallback
  if (/<h1\b/.test(out)) {
    out = out.replace(/<h1\b/, m => `${block}\n${m}`);
  } else {
    out = out.replace(/(\n\s*<)/, `\n${block}\n$1`);
  }
  return out;
}

function setPrimaryH1Text(src, desired, options = {}) {
  if (!desired) return src;
  // Replace the FIRST <h1>…</h1> content with plaintext desired
  // (preserves attributes but replaces inner content fully)
  let out = src.replace(/<h1([^>]*)>[\s\S]*?<\/h1>/, (_m, attrs) => {
    return `<h1${attrs}>${desired}</h1>`;
  });

  if (options.keepSecondH1) {
    // do nothing else; Index intentionally has a second H1
    return out;
  }

  // Ensure only one H1 by downgrading subsequent H1s to H2s
  let firstFound = false;
  out = out.replace(/<h1\b([^>]*)>/g, (m, attrs) => {
    if (!firstFound) {
      firstFound = true;
      return `<h1${attrs}>`; // keep first
    }
    return `<h2${attrs}>`; // demote others
  });
  out = out.replace(/<\/h1>/g, (match) => {
    if (firstFound) {
      // Replace only those closing tags that belong to demoted headings
      // Simple heuristic: after first closing </h1>, change any further </h1> to </h2>
      if (firstFound === true) {
        firstFound = 'closedFirst';
        return match; // keep first close
      }
      return '</h2>';
    }
    return match;
  });

  return out;
}

let changed = 0;
for (const p of pages) {
  const file = path.resolve(process.cwd(), p.file);
  if (!fs.existsSync(file)) {
    console.warn('Skip (missing):', p.file);
    continue;
  }
  let src = fs.readFileSync(file, 'utf8');
  const before = src;

  src = ensureSeoImport(src);
  src = upsertSeoBlock(src, p.seo?.title ?? null, p.seo?.desc ?? null);
  src = setPrimaryH1Text(src, p.h1, { keepSecondH1: !!p.secondH1Keep });

  if (src !== before) {
    fs.writeFileSync(file, src, 'utf8');
    console.log('Updated:', p.file);
    changed++;
  } else {
    console.log('No change needed:', p.file);
  }
}

console.log(`Done. Files changed: ${changed}`);
