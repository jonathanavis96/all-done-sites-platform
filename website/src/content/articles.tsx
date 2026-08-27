// Single source of truth for the /articles section.
//
// Mirrors content/guides.tsx: each article is authored as structured data (no
// JSX in the content) so the same objects power the rendered article, the
// Article (+ FAQPage, when it has FAQs) JSON-LD, the articles index cards and
// the sitemap. Block/FAQ shapes and the inline markdown-link helpers are
// shared with the guides collection via content/shared.tsx.
//
// There is no published content yet — the collection starts empty rather than
// shipping placeholder copy onto a live client site. The index page renders a
// real "nothing here yet" state instead of a blank shell, and adding the first
// article is just pushing an entry into `articles` below.

import { ContentBlock, ContentFaq } from "./shared";

export type ArticleBlock = ContentBlock;
export type ArticleFaq = ContentFaq;

export interface Article {
  slug: string;
  title: string;
  metaTitle: string;
  description: string;
  summary: string;
  category: string;
  readMins: number;
  intro: string;
  /** ISO date (YYYY-MM-DD) the article first went live; Article datePublished. */
  publishedAt: string;
  /** ISO date (YYYY-MM-DD) of the last content review; Article dateModified. */
  updatedAt: string;
  blocks: ArticleBlock[];
  faqs: ArticleFaq[];
}

export const articles: Article[] = [
  {
    slug: "ai-search-optimisation-services-and-specialists",
    title: "AI Search Optimisation Services and Specialists",
    metaTitle: "AI Search Optimisation Services and Specialists",
    description:
      "What an AI search optimisation service does, agency vs specialist vs startup, what it costs, and what to check before hiring, in any city, before you pay.",
    summary:
      "Explains what AI search optimisation providers do, how agencies, specialists and startups differ, what they cost, and what to check before hiring one.",
    category: "Getting started",
    readMins: 9,
    intro:
      "Search is not just Google anymore. Customers now ask ChatGPT, Perplexity or an AI Overview for a recommendation before they ever open a search results page. Getting mentioned in that answer takes a different kind of work to ranking a webpage. This article is for a small-business owner working out whether an AI search optimisation provider is worth paying for. It also covers what kind of provider to look for, and how providers charge. Below: agencies, solo specialists and startups, pricing shapes, hiring across cities from Boston to Mumbai, and the questions worth asking a consultant.",
    publishedAt: "2026-08-27",
    updatedAt: "2026-08-27",
    blocks: [
      { h2: "The short answer: what an AI search optimisation service actually does" },
      { p: "An AI search optimisation service gets your business found when people ask ChatGPT, Google's AI Overviews or Perplexity a question. That is different work to ranking when someone types a keyword into a search box. It covers technical setup, content structure and the off-site signals these tools read to decide who to mention by name." },
      { h3: "The short answer" },
      { p: "In practice this means writing content that answers real questions directly. It also means structuring your site so AI crawlers can parse it cleanly. And it means building the citations and reviews that AI models treat as proof you exist and are trustworthy. It is not a plug-in or a one-off setting. It is ongoing work, closer to traditional SEO than to paid ads." },
      { p: "Providers selling this service range from one-person specialists to full agencies. Pricing and scope vary a lot between them. Which kind of provider fits you is covered below, and so is what these services cost and what you get for the money." },
      { p: "As a rough guide, treat any provider promising guaranteed rankings in AI answers with suspicion. Nobody controls what a language model says. The honest version of this work improves your odds, it does not fix an outcome. A specialist who says \"it depends\" and explains what it depends on is telling you the truth." },
      { h2: "Agency, specialist or startup: which kind of provider fits you" },
      { p: "Three kinds of provider answer to \"AI search optimisation\": full-service agencies, solo specialists or consultants, and startups built specifically around AI search tools." },
      { p: "An agency suits you if you already run a website with ongoing SEO or content work and want AI search folded into that existing relationship. You get a team, a project manager and usually a broader service list, but slower turnaround on small requests and a higher monthly retainer." },
      { p: "A specialist or independent consultant suits a narrower brief. That might be an audit of how your site shows up in AI answers, a rewrite of a handful of pages, or advice without a long contract. You deal with one person directly. That is faster, but it means less capacity if the work grows." },
      { p: "A startup pitching itself purely as an AI search optimisation shop suits businesses that want a modern, tool-heavy approach. Those often come with dashboards tracking mentions across ChatGPT, Perplexity and Google's AI Overviews. Check how long the company has actually operated. This is a young field, and a startup founded in the last year has not yet had time to prove its methods hold up." },
      { p: "None of the three is automatically right. Match the provider's size to the size of the job. A one-off audit does not need an agency, and an ongoing content programme across many pages usually outgrows a single consultant." },
      { h2: "What AI search engine optimisation services cost, and what you get" },
      { p: "There is no published, verifiable rate card for AI search optimisation in any of these markets, so treat any number a provider quotes as a starting offer, not a market rate. What decides the cost is scope. A one-off content and structure review costs less than an open-ended monthly retainer. A provider auditing one location page charges less than one rewriting a whole site for AI crawlers." },
      { p: "Most providers sell one of two shapes. The first is a project fee: an audit of your existing content, a rewrite of key pages, and a report on how AI tools currently describe your business. The second is a retainer: ongoing content, monitoring of how ChatGPT, AI Overviews and Perplexity cite you, and adjustments as those systems change. A retainer costs more over a year. It also keeps someone watching results you would otherwise notice only after they had slipped." },
      { p: "Either way, ask what is actually included before you compare two quotes. \"AI SEO\" from one provider might mean structured data and page rewrites. From another it might mean a single strategy document. The same question matters for [website hosting and maintenance](/guides/whats-included-in-website-hosting-and-maintenance/). A monthly fee that only covers uptime is a different product to one that includes content updates, and AI search work is no different." },
      { h2: "Hiring by city: Boston, Dallas, Houston, Toronto, Sydney, Mumbai and India" },
      { p: "If you have searched for AI search optimisation near me, the honest answer is that location matters less here than it does for a plumber or an electrician. AI answer engines pull from the web, not from a local directory. A specialist in Mumbai can optimise a site for a client in Boston without ever visiting. What actually changes by city is who is available to hire and how they price." },
      { p: "In large English-speaking markets like Boston, Dallas, Houston, Toronto and Sydney, you will mostly find full agencies and established specialists. Most have folded AI search work into an existing SEO offering. That gives you a track record to check. It also means you compete for their time with every other client on the roster." },
      { p: "Search interest from Mumbai and across India tends to point at a different pool. There you find specialists and small startups building a service around this specifically, often at lower rates than an equivalent US, Canadian or Australian agency. Lower cost does not mean lower skill. It usually means lower overheads and a newer business trying to build a portfolio." },
      { p: "Whichever city you search in, the checks that matter are the same. What have they done before, can they show it, and do they answer real questions about your business the way you would want an AI tool to answer them. A provider's location tells you about their price and their time zone. It does not tell you whether their work is any good." },
      { h2: "How to check an AI search SEO consultant before you pay" },
      { p: "Before you sign anything, ask to see work on a real site, not a slide deck. A consultant who has actually done this can point to a page they rewrote and explain why it changed. A screenshot of a chatbot mentioning a client is not that." },
      { p: "Ask three things directly:" },
      { ul: [
        "**Show me a before-and-after page.** The rewrite should read like a clear answer to a real question, not a keyword stuffed into a paragraph.",
        "**What tools do you use to check AI visibility, and what did they show for my business last month?** If they cannot answer this, they have not been tracking it.",
        "**What happens if ChatGPT or Google's answer engines change how they rank content?** A one-off rewrite with no plan for revisiting it is a project, not a service.",
      ] },
      { p: "Watch for vague promises. \"Guaranteed AI ranking\" and \"instant visibility\" are not things any consultant controls. AI tools decide what to surface, not the person you are paying. A specialist, an agency or a startup can all do this work well. The difference is whether they show you evidence rather than assurances." },
      { p: "If your site itself needs work before any of this is worth paying for, that is a separate job. [How to get a website for your South African small business](/guides/how-to-get-a-website-for-your-small-business/) covers what comes first. All Done Sites builds and maintains that kind of site if you would rather have it handled." },
      { h2: "Where this leaves you" },
      { p: "AI search optimisation is real, ongoing work, not a setting you switch on. The right provider might be a full agency, an independent specialist or a startup built around AI tools. That depends on the size of the job, not the city you are hiring in. What separates a provider worth paying from one to walk away from is evidence. Look for a real page they rewrote, a tool they use to track mentions, and a straight answer about what happens when ChatGPT or Google change how they rank content." },
      { p: "Before you pay anyone for AI search work, make sure the site itself is worth optimising. If you would rather talk to All Done Sites about getting that foundation right first, get in touch and we will tell you plainly what your site needs." },
    ],
    faqs: [
      {
        q: "What does an AI search optimisation service actually do?",
        a: "It gets your business mentioned when someone asks an AI tool a question instead of typing a keyword. That covers content written to answer real questions and a site structure AI crawlers can parse. It also covers citations and reviews that build the tool's confidence you exist and are trustworthy.",
      },
      {
        q: "Should I hire an agency, a specialist or a startup?",
        a: "Match the provider to the job. An agency suits ongoing work folded into an existing SEO relationship, and a specialist suits a narrower one-off brief. A startup suits businesses wanting a tool-heavy approach, provided you check how long it has actually operated.",
      },
      {
        q: "How much does AI search optimisation cost?",
        a: "There is no published, verifiable rate card for AI search optimisation in any of these markets, so treat any number a provider quotes as a starting offer, not a market rate. Cost depends on scope. A one-off content review costs less than an open-ended monthly retainer, and most providers sell one or the other.",
      },
      {
        q: "Does it matter where the provider is based?",
        a: "Less than you would think. AI answer engines pull from the web, not a local directory, so location mostly affects who is available and how they price, not whether the work is any good.",
      },
      {
        q: "What should I ask before hiring a consultant?",
        a: "Ask to see a real page they rewrote and why it changed. Ask what tool they use to track your AI visibility and what it showed last month. Ask what their plan is for when AI tools change how they rank content. Be wary of anyone promising guaranteed rankings.",
      },
      {
        q: "Is AI search optimisation worth it if my website itself needs work first?",
        a: "No. Fix the site first. [How to get a website for your South African small business](/guides/how-to-get-a-website-for-your-small-business/) covers what comes before any AI search spend.",
      },
    ],
  },
];

export function getArticle(slug: string | undefined): Article | undefined {
  return articles.find((a) => a.slug === slug);
}

/**
 * Related articles, mirroring guides.tsx's ring layout once there is more
 * than one article to relate. With zero (or one) articles there is nothing
 * to link, so this simply returns an empty list.
 */
export function getRelatedSlugs(_slug: string): string[] {
  return [];
}
