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
  {
    slug: "what-does-a-website-cost-in-south-africa",
    title: "What Does a Website Cost in South Africa?",
    metaTitle: "What Does a Website Cost in South Africa? | All Done Sites",
    description:
      "A basic South African website costs R5,590 to R15,000 once-off, custom sites from R16,900. See monthly hosting, quote breakdowns and city-by-city pricing.",
    summary:
      "Once-off and monthly website costs in South Africa, by site type, quote inclusions and city, from basic to custom builds.",
    category: "Pricing",
    readMins: 9,
    intro:
      "A basic small-business website in South Africa costs **R5,590** to **R15,000** once-off for a template build, and a fully custom site runs from **R16,900** upward. That is the number most people search for, but it is only the starting figure. What you actually pay depends on whether you want a brochure site or an online shop. It also depends on what a quote bundles in beyond the design, and on what hosting and maintenance add every month after launch. This article walks through each of those, band by band, so you know what a fair quote looks like before you ask for one.",
    publishedAt: "2026-09-04",
    updatedAt: "2026-09-04",
    blocks: [
      { h2: "The short answer: what a website costs in South Africa" },
      { p: "A basic small-business site in South Africa costs roughly **R5,590** to **R15,000** once-off for a template build. A fully custom site runs from **R16,900** up to **R40,000** or more for a large, multi-page build. That once-off fee is only part of the picture. Hosting typically adds **R89** to **R499** a month, and a .co.za domain carries a small annual registration fee on top." },
      { h3: "If you would rather pay monthly" },
      { p: "If you would rather not carry a big once-off fee, [monthly website plans](/guides/monthly-vs-upfront-website-cost/) start at **R799** a month here. That bundles the build, hosting and a working site into one payment instead of a separate quote for each piece." },
      { p: "These are hedged, real-world ranges. Where your site lands depends on how many pages you need, whether you are selling products, and how much of the design and copy you can supply yourself. The breakdown below covers build cost by site type, what a typical quote actually includes, ongoing monthly costs, and whether your city changes the price at all." },
      { h2: "Website design cost by type of site, from basic to online shop" },
      { p: "The template and custom bands above are the starting point for a brochure site. Beyond that, the type of site changes the number a lot." },
      { p: "An online shop costs more than a brochure site, because it has to handle products, a cart and a payment gateway. Expect roughly **R7,580** to **R20,000** once-off for a standard South African online shop. Budget or DIY-tier suppliers advertise startup stores from around **R4,500**, below the standard band and not comparable to a built store. A large catalogue with custom features can run to **R80,000** or beyond." },
      { p: "A wedding website is the other end of the scale. It is usually a single page with your date, venue and an RSVP form, so a paid build sits at or below the bottom of the template band, around **R5,590** or less. Plenty of couples skip a designer entirely and use a free DIY builder, which is a reasonable choice for a site that only has to work for a few months." },
      { p: "At the top end, a fully custom web application is built from scratch rather than assembled from a template, and those are commonly quoted well into six figures. That is a different product to a small-business brochure or shop site, and most local businesses do not need one." },
      { p: "Instead of a once-off fee, a [monthly plan](/guides/monthly-vs-upfront-website-cost/) spreads the build over the subscription, so the build, hosting and upkeep arrive as one payment. The tiers are set out in the monthly costs section below." },
      { h2: "What you are actually paying for in a web design quote" },
      { p: "A web design quote is not one line item. It usually bundles design, build, content setup and a launch check, and each of those moves the price within the bands covered in the section above." },
      { ul: [
        "**Design and layout:** how your pages look and how a visitor moves through them, from homepage to contact form.",
        "**Development:** the actual build, whether that is a template configured to your business or a fully custom site coded from scratch.",
        "**Content setup:** loading your text, images and product details so the site is ready to publish, not a shell you still have to fill in yourself.",
        "**Testing and launch:** checking the site works on phones and different browsers before it goes live.",
      ] },
      { p: "A template build sits at the lower end of a quote because most of the design work is already done. A custom build costs more because every screen is designed and coded for your business specifically. That is why it sits in the custom band above rather than the template one." },
      { p: "Two quotes for the \"same\" site can differ a lot if one includes content setup and testing and the other does not. Ask what is actually included before comparing the number at the top." },
      { h2: "Monthly costs: what a website costs in South Africa per month" },
      { p: "A website costs money every month even after the once-off build is paid. Hosting typically runs **R89** to **R499** a month, and a .co.za domain registration usually falls between **R150** and **R300** a year." },
      { p: "Maintenance is the cost most quotes leave out. A small-business site typically needs **R500** to **R1,500** a month for basic updates and support. Agencies handling more involved work - security patching, backups, content changes - typically run into the thousands a month for a fuller retainer." },
      { p: "Add those up. Even a template-built site on the cheapest hosting carries a real monthly cost once maintenance is included, and a fuller retainer costs several times that." },
      { p: "A [monthly plan](/guides/monthly-vs-upfront-website-cost/) prices that stack up front. Launch starts at **R799** a month, Business at **R2,200**, and Premium at **R3,600**, so you know the full monthly figure before you commit." },
      { callout: {
        title: "Short answer",
        body: "budget R89-R499 a month for hosting, and R500-R1,500 for basic upkeep. A full agency retainer runs into the thousands, on top of a once-off build. A bundled monthly plan folds both into a single fee.",
      } },
      { h2: "Does location change the price? Cape Town, Johannesburg and Durban compared" },
      { p: "No. Most South African web designers and agencies work remotely and quote the same price whether you are in Cape Town, Johannesburg, Durban, or a small town in between. The template and custom bands above hold wherever you are based. Hosting and a .co.za domain are not local services either, so those costs do not shift by city." },
      { p: "What can change is who you end up talking to. Cape Town and Johannesburg have more agencies to choose from, which makes it easier to get several quotes and compare them properly. Smaller centres sometimes have fewer local options, but that pushes you toward remote designers, not toward higher prices." },
      { p: "The one place location genuinely matters is if you want in-person meetings. An agency in your own city can visit your business, which suits some owners better than a video call. That is a preference, not a cost difference: paying more for a local firm buys convenience, not a better website." },
      { h2: "How to compare quotes and keep the cost of creating a website down" },
      { p: "Ask every designer for the same brief so the quotes are actually comparable: pages needed, whether you are supplying copy and images, and what happens after launch. A quote that leaves out hosting or maintenance looks cheaper than one that includes it, not better." },
      { p: "Get at least three quotes in writing, and check what each one covers beyond the build itself. As set out in the monthly costs section above, hosting typically runs **R89** to **R499** a month. A .co.za domain adds its annual registration fee on top of whatever the build itself costs." },
      { ul: [
        "**Scope:** how many pages, and whether product listings or a booking form push it toward the custom end.",
        "**Content:** who writes the copy and supplies the images changes both price and timeline.",
        "**Support:** ask what happens if something breaks after handover, and whether that is included or billed separately.",
      ] },
      { p: "Run that same checklist over a [monthly plan](/guides/monthly-vs-upfront-website-cost/) and the three tiers priced above already answer every line of it." },
      { p: "A once-off build is never the whole cost. Hosting, a domain, and ongoing maintenance keep running every month after the site goes live, and a quote that skips those looks cheaper than one that does not. Whether you pay a bigger fee upfront or spread the cost into a monthly plan, what you are buying is the same site. The difference is how and when you pay for it, and a bundled plan removes the separate hosting and maintenance invoices. Location does not move the number either. A designer in Cape Town, Johannesburg or a small town charges roughly the same, so choose on quality and clarity of scope rather than proximity." },
      { p: "All Done Sites builds and maintains exactly this kind of small-business website. That means no chasing three separate suppliers for design, hosting and upkeep. Get in touch to talk through what your site needs." },
    ],
    faqs: [
      {
        q: "How much does a basic website cost in South Africa?",
        a: "A basic template-built site typically costs **R5,590** to **R15,000** once-off, covering design, build and content setup for a standard small-business brochure site.",
      },
      {
        q: "How much does a custom website cost in South Africa?",
        a: "A fully custom site starts at **R16,900** and can run to **R40,000** or more for a large, multi-page build with custom integrations.",
      },
      {
        q: "How much does an online shop cost in South Africa?",
        a: "A standard South African online store costs roughly **R7,580** to **R20,000** once-off, and large custom catalogues run to **R80,000** or beyond. Cheaper DIY-tier startup stores are advertised below that band, but they are not comparable to a built store.",
      },
      {
        q: "What does a website cost per month in South Africa?",
        a: "Budget **R89** to **R499** a month for hosting, and **R500** to **R1,500** a month for basic upkeep, on top of whatever the once-off build cost. A full agency retainer runs into the thousands a month. A bundled monthly plan folds both into one payment instead.",
      },
      {
        q: "Does it cost more to hire a web designer in Cape Town or Johannesburg than elsewhere?",
        a: "No. Most South African designers work remotely and charge the same regardless of city. Paying more for a local firm buys in-person meetings, not a better website.",
      },
      {
        q: "What is included in a typical web design quote?",
        a: "A quote usually bundles design and layout, development, content setup, and testing before launch. Ask what each quote actually covers before comparing the headline number.",
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
