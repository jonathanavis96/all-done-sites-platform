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
  /**
   * Optional byline. Omitted entirely (the default) renders no byline anywhere and the
   * Article JSON-LD keeps attributing authorship to the All Done Sites Organization, same
   * as before this field existed. `url` (optional even when `name` is set) becomes the
   * byline's link target and the JSON-LD Person's `url`/`sameAs`.
   */
  author?: { name: string; url?: string };
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
    author: { name: "Jonathan Avis", url: "https://www.linkedin.com/in/jonathan-avis-0503a6201/" },
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
    slug: "how-much-should-an-ecommerce-website-cost-in-south-africa",
    title: "How Much Should an Ecommerce Website Cost in South Africa?",
    metaTitle: "How Much Should an Ecommerce Website Cost in South Africa?",
    description:
      "Ecommerce website costs in South Africa run R15,000 to R80,000 to build, plus from about R500 a month to run. See what drives the price and what to skip.",
    summary:
      "What ecommerce sites actually cost to build and run in South Africa, by shop size, platform, and the monthly fees quotes often leave out.",
    category: "Pricing",
    readMins: 19,
    intro:
      "The price on an ecommerce quote and what the store costs you in its first year are rarely the same number. The monthly running cost is the part most quotes leave off, and it's often the difference between a build that looks cheap and a first year that isn't.",
    publishedAt: "2026-09-29",
    updatedAt: "2026-11-22",
    author: {
      name: "Jonathan Avis",
      url: "https://www.linkedin.com/in/jonathan-avis-0503a6201/",
    },
    blocks: [
      { p: "This article breaks down what actually drives the price of an e commerce website in South Africa: how big your catalogue is, which platform you choose between Shopify, WooCommerce and Wix, and which costs only show up once the store is live. It also covers what you can safely skip on a first build. And it covers how to read a quote, so you know what you're actually paying for before you sign. If you've been asking how much should an ecommerce website cost for a shop your size, the next section starts there." },
      { h2: "What an Ecommerce Website Costs in South Africa: The Short Answer" },
      { p: "A working ecommerce site in South Africa costs anything from nothing upfront (DIY on a platform's own template, where you still pay the monthly plan fee) to well into six figures for a custom build with integrations. Most small shops land somewhere between R15,000 and R80,000 for the build, then pay from about R500 a month upward all in to keep it running." },
      { p: "The number that matters most is not the build price. It's the total for the first year. Add hosting, a payment gateway, an SSL certificate if it is not bundled with your hosting, and someone to fix things when they break. A R20,000 build is not a R20,000 year: add the monthly running costs and the first-year total is considerably higher. A \"free\" DIY store on a paid plan can land closer to that total than you'd expect once you count transaction fees." },
      { p: "Here's roughly what each route costs to get live:" },
      { ul: [
        "DIY on Shopify, WooCommerce or Wix, using a template: nothing upfront to about R15,000 (mostly your own time, plus a monthly platform fee)",
        "Freelancer or small studio, template customised to your brand: R15,000–R60,000",
        "Agency build, custom design and some integration work: R60,000 upward",
        "Custom build with ERP or multi-system stock integrations: R100,000 upward",
      ] },
      { p: "Where you sit on that scale depends on three things. How many products you're listing, whether you need custom features like variant pricing or a booking system, and how much of the work you do yourself. The next section breaks that down by shop size, so you can see which band actually applies to you." },
      { h2: "How Much Should an Ecommerce Website Cost for a Shop Your Size?" },
      { p: "The number changes with how many products you sell and how much of your process needs to be automated, not with how \"professional\" you want the site to look. These are catalogue-size bands, cutting across the who-builds-it bands in the previous section rather than restating them. A 15-product shop and a 400-product shop are different jobs, even if the design brief sounds similar." },
      { h3: "A small catalogue — under 30 products" },
      { p: "If you're selling a tight range of your own products, expect somewhere between R15,000 and R20,000 for a proper build on Shopify or WooCommerce. That covers a template-based design fitted to your brand, product uploads, PayFast or Yoco checkout, and basic shipping rules. There's no custom development in this tier — you're paying mostly for setup, content, and getting the payment and courier pieces working together correctly." },
      { h3: "A mid-size catalogue — 30 to a few hundred products" },
      { p: "Once you're past 30 or so products, budget R20,000 to R80,000. The same band applies if you need variants (sizes, colours, bundles), stock syncing, or a courier integration beyond the platform defaults. Most of that extra cost goes into product data work — importing, tagging, and organising a bigger catalogue so customers can filter and find things. Custom theme changes for your brand sit on top of that." },
      { h3: "A large or custom catalogue — hundreds of products, or non-standard requirements" },
      { p: "Above that, you're in custom territory: wholesale pricing tiers, multi-warehouse stock, quote-based products, or integration with accounting software like Xero or Sage. These builds run R80,000 upward. Development hours drive that price, not the platform licence. Get a line-item breakdown here — \"custom integration\" on its own tells you nothing about what's being built." },
      { p: "What actually pushes you from one tier to the next:" },
      { ul: [
        "Number of products and how much of the catalogue needs manual setup",
        "Product variants — size, colour, bundles, subscriptions",
        "Payment gateways beyond a single PayFast or Yoco account",
        "Courier or fulfilment integrations instead of flat-rate shipping",
        "Custom features not built into the platform's standard theme",
      ] },
      { callout: {
        title: "Sizing tip",
        body: "count your current product list, then add what you plan to stock in the next year. Quote against that number, not today's number — re-platforming a growing catalogue costs more than building for it up front.",
      } },
      { h2: "What Actually Drives E Commerce Website Price in South Africa" },
      { p: "A quote is not one number. It's several separate costs added together, and each one can move independently of the others. Two shops with the same number of products can get quotes tens of thousands of rand apart because one needs custom design work and the other doesn't. Here's what's actually behind that gap." },
      { h3: "Hours of work, not the platform licence" },
      { p: "Shopify, WooCommerce and Wix themselves cost very little or nothing to license. What you're paying a freelancer or agency for is their time: setting up the store, customising the theme, uploading and tagging products, and connecting payment and shipping. Then testing that checkout actually works before you go live. A template site with light customisation might take 20–40 hours. A custom design with bespoke functionality can run past 150 hours. Multiply either by an hourly rate and you've got most of the quote." },
      { h3: "Design customisation" },
      { p: "Using a theme as-is, with your logo and colours dropped in, is the cheapest route. Asking for a layout that doesn't match any existing template — a different homepage structure, custom product pages, a non-standard checkout flow — means a designer and developer build it from scratch. That's usually the single biggest swing between a R20,000 quote and an R80,000 one for the same product count." },
      { h3: "Content and product data" },
      { p: "Someone has to write product descriptions, size photos correctly, and organise categories so customers can filter and find things. If you're supplying clean, ready-to-use content and a spreadsheet of product data, that work disappears from the quote. If the builder has to write copy, source or edit images, and manually enter every product, you're paying for that labour on top of the build itself." },
      { h3: "Third-party apps and integrations" },
      { p: "Stock syncing, loyalty programmes, review widgets, accounting hooks — most of these come from paid apps with their own monthly fee, on top of whatever it costs to wire them into your store. Some of that is a one-off setup charge. The subscription itself keeps running long after the build is finished, which is part of why the monthly costs most quotes leave out matter as much as the build price." },
      { h3: "Who's doing the build" },
      { p: "A freelancer working alone usually charges less per hour than a studio or agency, but has less capacity and no one to hand off to if they disappear. An agency costs more partly because that price includes project management, a second set of eyes, and often some support after launch. Neither is automatically right. It depends on whether you'd rather save money upfront or have backup if something goes wrong." },
      { callout: {
        title: "Ask this on every quote",
        body: "is this price for a working store, or for a store plus content plus every integration I asked about? Vague quotes usually mean one of those pieces is missing and will show up as a change order later.",
      } },
      { h2: "Platform Choice: Shopify, WooCommerce and Wix Costs Compared" },
      { p: "The platform changes what you pay after launch more than what you pay to build. All three can produce a working store in the same R15,000–R20,000 band for a small catalogue — the real difference shows up in the monthly bill. It also shows up in how much of the ongoing work falls on you." },
      { h3: "Shopify" },
      { p: "Plans start in the region of a few hundred rand a month for the entry tier and climb to roughly two thousand once you need extra staff logins or better reporting — check current pricing, which changes and is often discounted for a first term. Shopify doesn't process its own payments in South Africa. Every sale carries a card fee from PayFast, Yoco or Peach Payments, plus a small extra transaction charge from Shopify itself. Apps for stock sync, reviews or loyalty programmes each add their own subscription on top of the plan fee." },
      { h3: "WooCommerce" },
      { p: "WooCommerce itself is free. It's a plugin that turns a WordPress site into a store. The cost shifts to hosting (R100–R800 a month, with the plans that hold up at checkout towards the top), an SSL certificate, usually bundled with hosting, and whichever premium plugins you need for shipping rules, stock management or backups. It's typically the cheapest to run month to month. But WordPress, WooCommerce and every plugin need regular updates. That's either your own time or a maintenance retainer, and skipping it is how sites break at the worst moment." },
      { h3: "Wix" },
      { p: "Wix Business plans start in the region of a few hundred rand a month and include hosting, so there's no separate hosting invoice to track. It's the simplest of the three to run day-to-day. Product limits and design flexibility are tighter than Shopify or WooCommerce. Fine for a small, stable catalogue; restrictive once you're past a few hundred products or need checkout logic the platform doesn't offer out of the box." },
      { ul: [
        "Shopify: higher monthly fee, widest app ecosystem, extra card fees since local payments run through a third party",
        "WooCommerce: lowest monthly fee, most flexible, most maintenance responsibility",
        "Wix: lowest setup effort, all-in-one billing, least room to grow into custom features",
      ] },
      { callout: {
        title: "Cheapest to build is not always cheapest to run",
        body: "pick the platform for the store you'll have in two years, not the one that's easiest to demo this week.",
      } },
      { h2: "The Monthly Costs Most Quotes Leave Out" },
      { p: "Most quotes cover the build. Few cover what it takes to keep the store selling once it's live. That's usually where the year-one total creeps past what you budgeted. None of these are hidden on purpose. They're easy to leave off a one-page quote because they don't belong to the build itself." },
      { h3: "Payment gateway fees" },
      { p: "PayFast and Yoco both take a percentage of every sale, roughly 3% to 4% of the sale plus a small fixed amount per transaction, depending on gateway and volume, on top of whatever the platform itself charges. Yoco sits at the lower end of that band and PayFast's standard rate at the higher end. On a R500 sale that percentage plus the fixed fee comes off the top before you've paid for stock or postage. It scales with turnover, so it never shows up as a line item on a build quote. At any real sales volume it's the biggest running cost on the list, ahead of hosting or apps." },
      { h3: "Apps and plugin subscriptions" },
      { p: "Stock syncing, product reviews, upsell pop-ups, abandoned-cart emails — each one is usually a separate monthly subscription, often a few hundred rand apiece, and a store with five or six of these can add a couple of thousand rand a month that wasn't in the original quote. Ask exactly which apps a build depends on before you sign, because \"it's all included\" sometimes means the free tier of an app you'll outgrow in three months." },
      { h3: "Backups, security and updates" },
      { p: "WooCommerce sites need a backup plugin, malware scanning, and regular core and plugin updates. Skip these and you're one bad plugin update away from a broken checkout. Shopify and Wix handle most of this as part of the plan fee. That's part of what their higher monthly rate buys. Either way, budget for it somewhere: as a paid service if nobody in-house is doing it, or as your own time if you are." },
      { h3: "Content and small changes" },
      { p: "New season, new products, a price change, a banner for a sale — someone has to make those edits. A freelancer or agency retainer for this is commonly R500–R2,000 a month depending on how often you update the store. Doing it yourself costs nothing but your time, which is fine if you're comfortable in the platform's editor and less fine if every small change means a support ticket." },
      { p: "Add it up and a modest store often carries:" },
      { ul: [
        "Payment gateway fees: roughly 3% to 4% of turnover, plus a small fixed amount per sale",
        "Platform or hosting fee: from about R100 a month upward, covered in the platform comparison above",
        "Apps and integrations: a few hundred to a couple of thousand rand a month",
        "Backups and security: included on Shopify/Wix, a small extra monthly charge on WooCommerce if not bundled with hosting",
        "Content and small edits: nothing but your time if you do it yourself, up to R2,000 a month on retainer",
      ] },
      { callout: {
        body: "Before you sign a build quote, ask what it does not include for month two onward — that answer, not the build price, decides your year-one total.",
      } },
      { h2: "What You Can Skip on Your First Build" },
      { p: "The short version: skip anything you can't yet prove customers need. Adding a feature once you know it's wanted costs less than building it now on a guess and ripping it out later." },
      { h3: "Custom design" },
      { p: "A theme with your logo, colours and product photos in it sells just as well as a fully bespoke layout for most first stores. Custom homepage sections and non-standard checkout flows are the biggest single cost driver on a quote. On a first build you don't yet have the sales data to know which custom touches would move a customer to buy. Launch on a good theme, then redesign the parts that data tells you are underperforming." },
      { h3: "A full app stack" },
      { p: "It's tempting to add every app a platform offers on day one — upsell pop-ups, loyalty points, live chat, advanced analytics. Each one is a separate monthly subscription, and a handful of unused apps can add a thousand rand or more a month for features nobody's using yet. Start with payments, shipping and stock only. Add anything else once you can point to a specific problem it solves." },
      { h3: "Multi-currency and multi-language" },
      { p: "Wait for confirmed orders from outside South Africa. Until then, this adds setup cost and ongoing complexity for a market you haven't tested. Most small stores sell in rand, to South African customers, for years before this becomes worth the money." },
      { h3: "Loyalty and rewards programmes" },
      { p: "These need a customer base large enough to make repeat-purchase incentives worthwhile. On a store with no order history yet, a loyalty programme is a monthly fee with nothing to reward." },
      { h3: "A blog with no writer behind it" },
      { p: "A blog only helps if someone keeps publishing to it. An empty or abandoned blog section does nothing for search rankings and signals a store that isn't being looked after. Add it once you know who's writing for it and how often." },
      { p: "What's usually safe to skip on a first build:" },
      { ul: [
        "Fully custom homepage and checkout design",
        "Apps beyond payments, shipping and stock management",
        "Multi-currency or multi-language setup",
        "Loyalty and rewards programmes",
        "A blog, unless you already have a writer and a schedule",
      ] },
      { p: "What's not worth skipping, even on a tight budget:" },
      { ul: [
        "A working payment gateway and tested checkout",
        "Backups and basic security",
        "Mobile-friendly product pages",
      ] },
      { callout: {
        body: "If a feature is on the quote because it \"might be useful later,\" ask what it would cost to add later instead. Most of the time, later is cheaper.",
      } },
      { h2: "How to Read an Ecommerce Quote Before You Sign" },
      { p: "A quote tells you what something costs. It doesn't always tell you what's in it. Before you sign, get the once-off build cost and the monthly running cost separated into two clear numbers, then work through what's sitting inside each one." },
      { h3: "Get the once-off and the monthly apart" },
      { p: "If a quote gives you a single number, ask for it split. The build price and the ongoing cost behave differently. One is a decision you make once. The other is a decision you're making every month for as long as the store's open. A R20,000 build carrying a heavy monthly bill in fees and subscriptions can cost more by year two than a R60,000 build with a light one. You can't compare two quotes properly until both are broken down the same way." },
      { h3: "Questions worth asking before you sign" },
      { ul: [
        "What's included in the build price, item by item — design, product upload, payment gateway setup, testing?",
        "Who owns the domain, the hosting account and the store's admin login once the project's done?",
        "Which apps or plugins does the build depend on, and what does each one cost once any free trial ends?",
        "What's the payment gateway's percentage per sale, and is that on top of the platform's own fee?",
        "Who fixes it if the checkout breaks after launch, and is that covered or billed separately?",
        "How many rounds of changes are included before extra work is billed, and at what rate?",
        "What happens if you want to leave this developer or platform in two years — can you take your product data and content with you?",
      ] },
      { h3: "Watch for quotes that hide the real number" },
      { p: "A quote that's cheap on the build and vague on everything after it is the most common way small stores overspend. If a line says \"apps and integrations included\" with no list, ask for the list. If \"hosting\" is a single word with no rand figure next to it, ask what it becomes once a free first year ends. None of this means the developer is being dishonest. A lot of it is left off because it varies by store. That's exactly why it needs asking rather than assuming." },
      { callout: {
        body: "Before you sign, ask for the build price and the monthly cost as two separate numbers, in writing. If a supplier can't give you both, that's the one question to push on before anything else.",
      } },
      { p: "Once you have those two numbers and a straight answer on who owns what after launch, you have enough to compare quotes properly and choose with your eyes open." },
      { p: "There's no single right price for an ecommerce website in South Africa. There's only a right price for your catalogue size, your platform choice, and how much of the ongoing work you take on. A 20-product shop on a template and a 300-product shop with stock syncing are different jobs, and the quotes should reflect that." },
      { p: "What keeps the numbers honest is separating the once-off build cost from the monthly running cost before you sign anything. Ask what's included item by item, which apps the build depends on, and who owns your domain and product data if you ever want to leave. A cheap build with an expensive first year isn't actually the cheaper option." },
      { p: "If you're getting quotes now, start by counting your product list, deciding which platform fits how you plan to run the store month to month (our [comparison of Wix, Squarespace, WordPress and custom sites for small businesses](/articles/best-websites-for-niche-small-businesses/) can help), and asking every supplier for the build price and the monthly cost as two separate numbers, in writing." },
      { p: "If you'd rather start with a quote that's already split that way, ask us for an itemised one: the once-off build on one side, the monthly running cost on the other. Tell us your product count and your platform and we'll price it against that." },
    ],
    faqs: [
      {
        q: "How much does an ecommerce website cost in South Africa?",
        a: "Most small shops pay R15,000 to R80,000 to build the store, then from about R500 a month upward to run it. DIY template builds can start at nothing upfront beyond the platform's own monthly fee, while custom builds with ERP-level integration run from R100,000 upward.",
      },
      {
        q: "What should I budget for after the site is live?",
        a: "Payment gateway fees of roughly 3% to 4% of the sale plus a small fixed amount per transaction, depending on gateway and volume, with Yoco at the lower end and PayFast's standard rate at the higher end, a monthly platform or hosting fee, any app subscriptions the build depends on, backups and security if these aren't bundled into your plan, and content or small edits if you're not making them yourself.",
      },
      {
        q: "Which is cheaper to run, Shopify, WooCommerce or Wix?",
        a: "WooCommerce is usually the cheapest month to month but carries the most maintenance responsibility. Shopify costs more per month and adds card fees through a third-party gateway. Wix bundles hosting into one fee and is simplest to run, with more limited product capacity and design flexibility.",
      },
      {
        q: "What can I leave out of my first ecommerce build to save money?",
        a: "A fully custom homepage and checkout, apps beyond payments, shipping and stock management, multi-currency or multi-language setup, loyalty programmes, and a blog unless someone is already committed to writing for it.",
      },
      {
        q: "Why do two quotes for a similar shop come out so different?",
        a: "The gap usually comes from design customisation, how much product content you're supplying versus asking the builder to create, and how many paid apps or integrations the build depends on. Hours of work, not the platform licence, make up most of the price.",
      },
      {
        q: "What questions should I ask before signing an ecommerce quote?",
        a: "Get the build price and monthly cost as two separate numbers. Ask what's included item by item, which apps the store depends on and what they cost after any trial ends, who owns the domain and admin login, and what happens to your product data if you leave the platform later.",
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
    publishedAt: "2026-10-02",
    updatedAt: "2026-11-22",
    author: {
      name: "Jonathan Avis",
      url: "https://www.linkedin.com/in/jonathan-avis-0503a6201/",
    },
    blocks: [
      { h2: "The short answer: what a website costs in South Africa" },
      { p: "A basic small-business site in South Africa costs roughly **R5,590** to **R15,000** once-off for a template build. A fully custom site runs from **R16,900** up to **R40,000** or more for a large, multi-page build. That once-off fee is only part of the picture. Hosting typically adds **R100** to **R800** a month, and a .co.za domain carries a small annual registration fee on top." },
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
      { p: "A website costs money every month even after the once-off build is paid. Hosting typically runs **R100** to **R800** a month, and a .co.za domain renews from about **R99** a year." },
      { p: "Maintenance is the cost most quotes leave out. A small-business site typically needs **R500** to **R1,500** a month for basic updates and support. Agencies handling more involved work - security patching, backups, content changes - typically run into the thousands a month for a fuller retainer." },
      { p: "Add those up. Even a template-built site on the cheapest hosting carries a real monthly cost once maintenance is included, and a fuller retainer costs several times that." },
      { p: "A [monthly plan](/guides/monthly-vs-upfront-website-cost/) prices that stack up front. Launch starts at **R799** a month, Business at **R2,200**, and Premium at **R3,600**, so you know the full monthly figure before you commit." },
      { callout: {
        title: "Short answer",
        body: "budget R100-R800 a month for hosting, and R500-R1,500 for basic upkeep. A full agency retainer runs into the thousands, on top of a once-off build. A bundled monthly plan folds both into a single fee.",
      } },
      { h2: "Does location change the price? Cape Town, Johannesburg and Durban compared" },
      { p: "No. Most South African web designers and agencies work remotely and quote the same price whether you are in Cape Town, Johannesburg, Durban, or a small town in between. The template and custom bands above hold wherever you are based. Hosting and a .co.za domain are not local services either, so those costs do not shift by city." },
      { p: "What can change is who you end up talking to. Cape Town and Johannesburg have more agencies to choose from, which makes it easier to get several quotes and compare them properly. Smaller centres sometimes have fewer local options, but that pushes you toward remote designers, not toward higher prices." },
      { p: "The one place location genuinely matters is if you want in-person meetings. An agency in your own city can visit your business, which suits some owners better than a video call. That is a preference, not a cost difference: paying more for a local firm buys convenience, not a better website." },
      { h2: "How to compare quotes and keep the cost of creating a website down" },
      { p: "Ask every designer for the same brief so the quotes are actually comparable: pages needed, whether you are supplying copy and images, and what happens after launch. A quote that leaves out hosting or maintenance looks cheaper than one that includes it, not better." },
      { p: "Get at least three quotes in writing, [vet each website design provider](/articles/best-website-design-for-small-business/), and check what each one covers beyond the build itself. As set out in the monthly costs section above, hosting typically runs **R100** to **R800** a month. A .co.za domain adds its annual registration fee on top of whatever the build itself costs." },
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
        a: "Budget **R100** to **R800** a month for hosting, and **R500** to **R1,500** a month for basic upkeep, on top of whatever the once-off build cost. A full agency retainer runs into the thousands a month. A bundled monthly plan folds both into one payment instead.",
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
  {
    slug: "website-designers-for-small-business-near-me",
    title: "Website Designers for Small Business Near Me",
    metaTitle: "Website Designers for Small Business Near Me",
    description:
      "Local designer, DIY builder or remote studio: what website designers for small business near me search really means, and what each costs in South Africa.",
    summary:
      "Compares local designers, DIY builders and remote studios for small business websites, with South African pricing and what to check before choosing.",
    category: "Getting started",
    readMins: 9,
    intro:
      "\"Website designer for small business near me\" is really three separate searches wearing one disguise: a local freelancer, a DIY builder, and a remote studio that simply ranks well in your area. This guide sorts those apart, tells you when \"near\" genuinely matters, what each route costs in South Africa, and what to check before you commit to one.",
    publishedAt: "2026-10-05",
    updatedAt: "2026-11-20",
    author: {
      name: "Jonathan Avis",
      url: "https://www.linkedin.com/in/jonathan-avis-0503a6201/",
    },
    blocks: [
      { h2: "The short answer: what searching for a website designer for small business near me actually gets you" },
      { p: "Searching \"website designer for small business near me\" turns up three different things mixed together: local agencies and freelancers, DIY builders like Wix and Squarespace, and national or remote studios that just rank well locally. They are not the same purchase. A local designer meets you in person and knows your area. A builder hands you the tools and you do the work yourself. A remote studio often costs less and still gets the job done, because a website build does not require a local visit." },
      { p: "What you actually need depends on your budget, how much time you have, and whether you want ongoing help once the site is live. Managed plans start around R799 a month; a DIY builder from about R300. The full tier breakdown comes later, in the costs section." },
      { p: "The rest of this guide breaks down when \"local\" matters, what builders and designers each actually deliver, what a small business site costs in South Africa, and what happens after launch." },
      { h2: "Does your web designer need to be local?" },
      { p: "For most small businesses, no. A website build is a screen-sharing call, a brief, and a review round, not a site visit. A designer in Cape Town can build a site for a plumber in Durban without either of them noticing the distance." },
      { p: "Local still earns its keep in a few cases. If you want someone to photograph your shop, sit with you in person to plan the site, or you simply prefer meeting face to face before you hand over money, that is worth paying for. It is a preference, not a technical requirement." },
      { p: "What actually matters is turnaround time, whether they answer when something breaks, and whether they explain things in plain language rather than jargon. Those show up in how a studio works, not where its office is." },
      { p: "So when you search \"website designer for small business near me,\" treat \"near me\" as a filter for responsiveness and trust, not geography. A remote studio that replies fast and writes clearly will usually serve you better than a local one that goes quiet after the invoice. The same holds for \"website for small business near me\": the site itself is built the same way wherever the builder sits." },
      { h2: "Website builder for small business near me, or a designer who builds it for you?" },
      { p: "A builder gives you a template, a drag-and-drop editor, and full control over every change. You do the work yourself, on your own time, and DIY builders generally start from around R300 a month. That suits a business owner who enjoys tinkering and has an afternoon to spend on it." },
      { p: "The best website builder for a small business is usually the one that bills in rands and takes a local payment card, so you are not watching an exchange rate every month. Check whether support answers during South African hours, because a reply that lands overnight costs you a working day. Then check how easily you can export your pages and images if you leave. A builder you cannot walk away from is a builder that has priced itself higher than it looks." },
      { p: "A designer takes the template choice, the copywriting and the setup off your plate, then keeps the site running afterwards. That service starts at R799 a month for a launch-level site, with the higher tiers priced in the costs section below. You are paying for someone else's time, not just software." },
      { p: "Neither option is wrong. A builder is cheaper if your time is genuinely free and you do not mind fiddling with settings. A designer costs more each month but means the site gets fixed, updated and kept secure without you learning how any of that works." },
      { p: "The real question is what your own time is worth, and whether \"website for small business near me\" is a search you plan to make once, or one you would rather never have to make again." },
      { h2: "What a small business website costs in South Africa, and what you get for it" },
      { p: "A managed monthly plan runs from around R799 for a launch-level site up to R3,600 for a premium one, with R2,200 sitting between the two for a fuller business package. Building it yourself on a builder generally starts from around R300 a month, and you carry the editing." },
      { p: "The R799 plan buys a working site, hosting and someone to fix it when it breaks. The R3,600 tier adds more pages, more design work and closer ongoing support. Neither figure includes your domain, which is a separate yearly cost." },
      { p: "What you actually get for the money is not just the pages themselves. It is who answers when the contact form stops sending emails, or when a browser update breaks a layout. A R300 builder plan leaves that on you. A managed plan puts it on someone else, at a price that reflects the hours saved rather than the number of pages." },
      { p: "Match the plan to how much of the fixing you want to do yourself, not to the lowest number on the page. [How much does a website cost in South Africa?](/guides/how-much-does-a-website-cost-in-south-africa/) sets out the wider range if you want to compare before you decide. If the managed route is the one you want priced up, All Done Sites builds and maintains sites on exactly these plans." },
      { h2: "How to choose between website developers for small business near me" },
      { p: "Ask three developers the same brief and compare what comes back, not just the price. A vague quote with no timeline is a warning sign on its own." },
      { p: "Check what happens after launch. Some developers hand over the files and disappear. Others, like the managed monthly plans priced earlier in this guide, and covered in full in [monthly vs upfront website cost](/guides/monthly-vs-upfront-website-cost/), keep hosting, fixes and updates running for as long as you pay. Ask directly: who fixes it when it breaks, and how fast?" },
      { p: "Look at real examples of their work, not a portfolio slide, and judge them against what [good small business website design](/articles/best-website-design-for-small-business/) should actually do. Load a few of their sites on your phone. If those are slow or hard to read, yours will be too." },
      { p: "Get the scope in writing: number of pages, who writes the copy, how many rounds of changes are included. A cheap quote that balloons once you ask for a second round of edits was never the cheap option." },
      { p: "Plain language matters more than it sounds like it should. If a developer cannot explain a decision without jargon in the first call, that will not improve once you have paid them." },
      { h2: "What happens after launch: hosting, updates and ongoing support" },
      { p: "Launch is not the finish line. A site needs hosting to stay online, software kept current, and someone to notice when a form stops working or a page breaks. [What is included in website hosting and maintenance?](/guides/whats-included-in-website-hosting-and-maintenance/) sets out the split: hosting keeps the site reachable and secure, maintenance keeps it working, updated and findable." },
      { p: "On a managed monthly plan, that support is baked in. It is why R799 buys more than server space: someone is watching the site and answering when you email. The R3,600 tier adds more design attention and closer support alongside the extra pages." },
      { p: "Choose a builder instead, and none of that goes away; it just moves to you. You will watch your own hosting and fix your own broken plugin. Fine if you enjoy that kind of maintenance. If you would rather spend that time running your business, ask any designer you are considering one plain question before you sign anything: what happens the week after launch, and who answers if something breaks?" },
      { p: "\"Near me\" was never the real question. What matters is whether you want to build the site yourself or hand it to someone who answers when it breaks, and what that choice costs each month. A builder puts the work and the maintenance on you from around R300 a month. A managed plan starts at R799 and takes both off your plate, rising to R2,200 or R3,600 depending on how much site and support you need." },
      { p: "If you would rather someone else built and kept running your site, get in touch with All Done Sites for a quote and see which plan matches what you need." },
    ],
    faqs: [
      {
        q: "Does my website designer need to be based near me?",
        a: "No. Most of a build happens over calls and a shared brief, so a designer anywhere in South Africa can do the work. Treat \"near me\" as a search for someone responsive and easy to reach, not someone local.",
      },
      {
        q: "What does a small business website cost in South Africa?",
        a: "A managed monthly plan runs from R799 for a launch-level site up to R3,600 for a premium one, with R2,200 for a fuller business package in between. Building it yourself on a DIY builder generally starts from around R300 a month.",
      },
      {
        q: "Is a DIY website builder cheaper than hiring a designer?",
        a: "On the monthly price, yes: builders start near R300 against R799 for a managed plan. The difference is who does the ongoing work. A builder leaves fixes and updates to you; a managed plan includes them.",
      },
      {
        q: "What happens to my site after it launches?",
        a: "It needs hosting, software updates, and someone to notice when something breaks. On a managed plan that support is included in the monthly fee. On a builder, all of it moves to you.",
      },
      {
        q: "How do I choose between website developers for small business near me?",
        a: "Get the same brief in front of a few of them, ask what happens after launch, and check their existing sites on your phone. A vague quote or heavy jargon in the first call is a warning sign.",
      },
    ],
  },
  {
    slug: "how-much-does-a-small-business-website-cost",
    title: "How Much Does a Small Business Website Cost?",
    metaTitle: "How Much Does a Small Business Website Cost?",
    description:
      "South African small business website costs: R5,590-R15,000 once-off, from R799/month, or R16,900-R40,000 for custom design. What changes the price.",
    summary:
      "What a small business website costs in South Africa, DIY versus freelancer versus agency, monthly hosting costs, and how to compare quotes fairly.",
    category: "Pricing",
    readMins: 9,
    intro:
      "Budgeting for a small business website usually starts with one question: what does it actually cost? In South Africa a template build runs R5,590 to R15,000 once-off, or from R799 a month on a managed plan. This guide is for a small business owner who wants a straight number first, plus a sense of what changes it.",
    publishedAt: "2026-10-08",
    updatedAt: "2026-11-22",
    author: {
      name: "Jonathan Avis",
      url: "https://www.linkedin.com/in/jonathan-avis-0503a6201/",
    },
    blocks: [
      { p: "From there it covers what pushes a quote up or down. It compares building it yourself, hiring a freelancer and using an agency, then sets out the monthly costs that keep a site running once it is live. It also explains why overseas quotes are hard to compare against a South African one, and what to ask instead. Last, how to read a quote so two designers' numbers line up." },
      { h2: "The Short Answer: What a Small Business Website Costs" },
      { p: "A small business website in South Africa typically costs somewhere between R5,590 and R15,000 once-off for a template-based build, or from R799 a month on a managed plan that bundles hosting and support. A fully custom-designed site runs higher, usually R16,900 to R40,000. That band covers original design work and a bigger content build, not a template with your logo dropped in." },
      { p: "Which end you land on depends on how many pages you need. It also depends on whether you build it yourself or pay someone, and on whether you want a once-off price or a monthly one. These are hedged, real-world ranges. Treat them as a guide to budget against, not a quote for your specific site." },
      { ul: [
        "**Template build (designer-built):** R5,590–R15,000 once-off, or a monthly plan from R799.",
        "**DIY builder:** from around R300 a month, you do the design and content work yourself.",
        "**Fully custom design:** R16,900–R40,000 once-off, more for complex builds.",
        "**Ongoing costs:** hosting, a domain and maintenance, all separate from the build price.",
      ] },
      { p: "The rest of this guide breaks down what pushes a quote up or down, and how to [compare a web design quote](/guides/how-to-get-a-website-for-your-small-business/) fairly." },
      { h2: "What Actually Drives the Price of a Website Design" },
      { p: "A web design quote is not one number. It is a build made of several separate costs, and each one moves independently." },
      { ul: [
        "**Number of pages:** more pages means more design and content work, so a five-page brochure site sits well under a ten-page one.",
        "**Custom design versus template:** a template build starts around R5,590. Original design work, done from scratch for your brand, pushes the same site into the custom band.",
        "**Features:** a booking form, a product catalogue or a members' area all add build time on top of the base price.",
        "**Content:** who writes the copy and sources the images changes the quote. Supplying your own text keeps costs down.",
        "**Ongoing support:** a once-off price and a monthly plan cover different things. A monthly plan from R799 usually bundles hosting and support in; a once-off quote usually does not.",
      ] },
      { p: "Some designers quote by the hour rather than by the project. If yours does, ask how many hours the build is expected to take and turn that into an estimated project total. Only then can you set it beside a fixed-price quote." },
      { p: "Two quotes for what looks like the same site can differ by thousands of rand. The reason is almost always one of these factors, not a difference in workmanship." },
      { h2: "Your Three Options: DIY Builder, Freelancer or Web Design Agency" },
      { p: "Three routes get you a small business site, and each suits a different budget and a different amount of your own time, as our [comparison of website builders, freelancers and design companies](/articles/best-website-design-for-small-business/) explains." },
      { ul: [
        "**DIY builder:** from around R300 a month, depending on the platform and the exchange rate on the day. You build it yourself on a platform like Squarespace. Cheapest route, but you carry the design and content work.",
        "**Freelance web designer:** usually lands in template territory. A freelancer can also do original design work, at which point pricing moves into the custom band.",
        "**Web design agency:** covers template and fully custom builds too, but adds a team, project management and often ongoing support. Expect the custom band for custom work, sometimes more for a complex build.",
      ] },
      { p: "A managed plan from R799 a month sits alongside any of these. It bundles hosting and support into one monthly fee rather than a separate once-off design cost. That is a different decision to who designs the site. Read [monthly vs upfront](/guides/monthly-vs-upfront-website-cost/) before you choose between a plan and a once-off quote." },
      { h2: "Monthly Costs: Hosting, Domain and Maintenance" },
      { p: "A once-off build price is only half the budget. Three ongoing costs keep a site online and working: hosting, a domain, and maintenance." },
      { p: "Hosting alone typically runs **R100–R800 a month**, depending on traffic and the level of support included. A **.co.za domain** renews from about **R99 a year**, separate from hosting. Skip a managed plan and you add a maintenance retainer on top. Agencies commonly charge **R500–R1,500 a month** for basic upkeep like updates, backups and small content changes, and up to **R12,000 a month** for hands-on support of a larger or e-commerce site." },
      { p: "A managed plan from **R799 a month** bundles hosting and support into one bill. At the bottom of each range those items come to less than R799 a month: hosting from R100, a .co.za domain from about R99 a year, and basic maintenance from R500. Once maintenance moves past the basic band, the separate total runs well above R799. Compare on what is included, not on the headline number alone. Read [what's included in hosting and maintenance](/guides/whats-included-in-website-hosting-and-maintenance/) before comparing a monthly plan against a once-off quote plus these running costs." },
      { h2: "Why Overseas Website Quotes Don't Compare Directly: UK, Australia and India" },
      { p: "The figures in this article are South African, in rands, from South African suppliers. This guide prices the South African market only, so an overseas reader should use the band framework here rather than these rand amounts. That matters if you're comparing a local quote against something you found on a UK, Australian or Indian site. Currency, tax rules and labour costs differ. A number quoted in pounds or dollars won't translate cleanly into rands just by converting it on the day, and no rand figure in this article is a UK, Australian or Indian price." },
      { p: "The shape of the market is the same everywhere, though. A template or DIY build sits at the bottom of the range. A fully custom design costs more, because it includes original design work rather than a template with your logo dropped in. In South Africa that is the template band and the custom band set out in the short answer above." },
      { p: "Three things to check on an overseas quote: whether VAT or GST is included in the figure, what local labour rates are for design work, and whether hosting is billed locally or bundled. Comparing an overseas quote? Ask what band it falls into rather than trusting the raw number. Is it template-based or custom, and does it include hosting? A cheap-looking quote that excludes hosting and a domain isn't cheaper than a managed plan, it's just missing line items." },
      { h2: "How to Read a Web Design Quote and Compare It Fairly" },
      { p: "Line up quotes on what each one includes, not just the total at the bottom. A build price alone tells you little if one quote bundles hosting and one does not." },
      { p: "Check for these before comparing numbers:" },
      { ul: [
        "**Hosting:** is it included, or billed separately at the monthly rate set out above?",
        "**Domain:** does the quote cover your .co.za registration, or is that on you?",
        "**Maintenance:** are updates and small changes included, or a separate retainer?",
        "**Design type:** is it the template band or the custom band from the short answer? A quote should say which one you're getting.",
        "**Pricing basis:** is it a fixed project price or an hourly rate? An hourly quote needs an estimated hour count turned into a project total before it can be set beside a fixed price.",
      ] },
      { p: "A low once-off number that leaves out hosting, a domain and maintenance still needs all three added somewhere. Compare it against a managed plan from R799 a month on the same basis. Everything in, side by side, before you decide which is actually cheaper." },
      { p: "Ask each designer for the same brief and the same list of inclusions. Our [South African website cost guide](/guides/how-much-does-a-website-cost-in-south-africa/) sets out the same bands in more detail if you want a second reference point." },
      { p: "A once-off template build, a fully custom design, or a managed monthly plan: whichever route fits your budget, the number now has a range attached to it. Three things decide the band. How many pages you need, how much of the design is original, and whether hosting and support are bundled in or billed apart." },
      { p: "Want that worked out for your business rather than in the abstract? All Done Sites builds and maintains small business websites in South Africa on exactly this kind of template and managed-plan pricing. Get in touch and describe what you need; you'll get a quote that says plainly what it includes." },
    ],
    faqs: [
      {
        q: "How much does a small business website cost in South Africa?",
        a: "A template-based build typically costs R5,590 to R15,000 once-off, or from R799 a month on a managed plan. A fully custom design usually runs R16,900 to R40,000.",
      },
      {
        q: "What is the cheapest way to get a small business website?",
        a: "A DIY builder is the cheapest route, from around R300 a month. You do the design and content work yourself rather than paying someone else to.",
      },
      {
        q: "Does the build price include hosting and a domain?",
        a: "Not usually, unless you're on a managed plan. Hosting alone typically costs R100 to R800 a month, and a .co.za domain renews from about R99 a year.",
      },
      {
        q: "Is a freelancer or an agency cheaper?",
        a: "Both cover roughly the same bands, though a freelancer more often works in the template band: R5,590 to R15,000 for a template build, R16,900 to R40,000 for custom design. An agency adds a team and project management on top.",
      },
      {
        q: "How much does website maintenance cost each month?",
        a: "Agencies commonly charge R500 to R1,500 a month for basic upkeep: updates, backups and small content changes.",
      },
      {
        q: "Is South African website pricing different from the UK, Australia or India?",
        a: "The rand figures here are South African. They won't convert cleanly from a quote in another currency, so ask an overseas quote which band it is in instead. The shape of the market is the same everywhere: template builds sit lower, custom design costs more.",
      },
    ],
  },
  {
    slug: "seo-vs-sem-on-page-vs-off-page-in-house-vs-outsourced",
    title: "SEO vs SEM, On-Page vs Off-Page, In-House vs Outsourced",
    metaTitle: "SEO vs SEM, On-Page vs Off-Page, In-House vs Outsourced",
    description:
      "SEO vs SEM, on-page vs off-page SEO, and doing it yourself vs hiring help, explained in plain terms, plus what a small business should do first.",
    summary:
      "Explains SEO versus SEM, on-page versus off-page SEO, and insourcing versus outsourcing, plus what a small business should do first.",
    category: "Getting started",
    readMins: 8,
    intro:
      "Search jargon comes in pairs, and the pairs sound alike. SEO or SEM? On-page or off-page? Do it yourself or hire someone?",
    publishedAt: "2026-11-20",
    updatedAt: "2026-11-20",
    author: {
      name: "Jonathan Avis",
      url: "https://www.linkedin.com/in/jonathan-avis-0503a6201/",
    },
    blocks: [
      { p: "This article is for small business owners who want those three choices explained without the sales pitch. You will see what each term means, how they compare, and what to do first if your budget and time are both limited." },
      { h2: "The short answer" },
      { p: "SEO earns you free search traffic over time. SEM, as most people use the term, means paid search ads, so you pay for every click. Most small businesses should start with the basics of SEO and add paid ads only when they need leads quickly." },
      { p: "Here is how the three comparisons in this article come out:" },
      { ul: [
        "**SEO vs SEM:** SEO is slower and cheaper per visitor. SEM (paid search) is fast, but the traffic stops when you stop paying.",
        "**On-page vs off-page SEO:** On-page is what you control on your own site, such as your content, titles and page speed. Off-page is what other sites say about you, mainly through links and reviews.",
        "**Insource vs outsource:** Doing it yourself costs time instead of money. Hiring help costs money, but saves you the learning curve.",
      ] },
      { p: "None of these is a strict either/or choice. They overlap, and the right mix depends on your budget, your timeline and how much of the work you can handle yourself." },
      { p: "The sections below explain each one in plain terms, so you can decide what fits your business." },
      { h2: "What is SEO, and what is SEM?" },
      { p: "SEO stands for search engine optimisation. It is the work of getting your website to show up in Google's unpaid results. You do it by improving your pages, your site's technical health and the trust other sites place in you." },
      { p: "SEM stands for search engine marketing. In everyday use it means paid search: ads that appear above or below the unpaid results, and that you pay for when someone clicks. Some people use SEM as an umbrella term that includes SEO. Most guides, and this one, use it for the paid side only." },
      { p: "The difference is simple. With SEO you earn your position. With SEM you rent it." },
      { ul: [
        "**SEO:** You do not pay Google for the visit. You pay in time, effort or a specialist's fees, and results build slowly.",
        "**SEM:** You pay for each click. Visitors can arrive within hours of switching a campaign on, and they stop when you stop paying.",
      ] },
      { p: "Both start from the same place: knowing what your customers type into a search box. The rest of this article compares them properly, then looks at the two halves of SEO and who should do the work." },
      { h2: "SEO vs SEM compared: cost, speed, how long results last and trust" },
      { p: "Compare them one criterion at a time, because neither wins on all four." },
      { ul: [
        "**Cost:** SEO costs your time or a monthly fee, but nobody bills you per visitor. SEM charges for every click, so the bill grows with your traffic. A small budget can run out in days.",
        "**Speed:** SEM can send visitors the day your ads go live. SEO usually takes months to show results, and nobody can honestly promise you a ranking.",
        "**How long results last:** Ads stop the moment you stop paying. A page that ranks well can keep bringing visitors for years, though it needs regular upkeep.",
        "**Trust:** Some searchers skip the ads and click the unpaid results, because a ranking reads as earned. Ads still work well when someone is ready to buy now.",
      ] },
      { p: "SEM earns its place for a launch, a seasonal sale or a new service that needs enquiries this month. SEO earns its place when you want steady traffic that does not cost more with every visit. Most small businesses end up using both, in different proportions." },
      { h2: "On-page vs off-page SEO: what each one covers" },
      { p: "On-page SEO is everything you control on your own site. Off-page SEO is the signals that come from everywhere else. Both feed the same unpaid ranking." },
      { h3: "On-page SEO" },
      { p: "This is the part you control fully, so it is the quickest place to make progress, and it is where many small sites lose ground." },
      { ul: [
        "**Page titles and headings:** say plainly what each page is about, and include the service and the town.",
        "**Content:** answer the question a customer would type, in words they would use.",
        "**Speed and mobile layout:** slow pages lose visitors before they read a word. How the site is built matters here, as our [comparison of custom-coded and WordPress websites](/guides/custom-coded-vs-wordpress-website/) explains.",
        "**Internal links:** point related pages at each other.",
      ] },
      { h3: "Off-page SEO" },
      { p: "Off-page work is slower, because other people have to act." },
      { ul: [
        "**Backlinks:** links from other sites that vouch for yours. A few relevant ones beat many random ones.",
        "**Business listings:** a consistent name, address and phone number across directories and your Google Business Profile.",
        "**Reviews and mentions:** real customers talking about you, on Google and elsewhere.",
      ] },
      { p: "Start on-page. Off-page effort pays off far less if the site it points to is thin or slow." },
      { h2: "Insource vs outsource SEO: doing it yourself or paying someone" },
      { p: "Insourcing means you or a staff member does the work. Outsourcing means a freelancer or agency does it for a monthly or project fee. Neither is right for everyone." },
      { p: "The DIY route is paid for in hours rather than rand. That suits you if you enjoy learning, your site is small, and you can set aside a few hours a week. The risk is inconsistency. SEO rewards steady effort, and it is the first job to slip when the shop gets busy." },
      { p: "Outsourcing buys speed and experience, but you pay every month and need to judge the work. Fees vary widely, so ask what is included before you compare quotes." },
      { ul: [
        "**Do it yourself:** best for basics such as page titles, a Google Business Profile and clear service pages.",
        "**Hire help:** best for technical fixes, link building and competitive markets where mistakes are expensive.",
        "**Split the work:** write your own content, and pay a specialist for a once-off audit.",
      ] },
      { p: "Be wary of anyone who guarantees a number one ranking. Nobody controls Google, and a promise like that is a warning sign." },
      { h2: "Which should a small business start with?" },
      { p: "Start with SEO basics. They cost you time rather than ad spend, and the results can keep bringing visitors long after the work is done, with regular upkeep. Add paid search (SEM) only when you need enquiries faster than organic traffic can deliver them." },
      { p: "Before either, check that your site is worth sending people to. Ads and rankings both lead to the same place, and a slow or confusing site wastes the visit. If you are still setting up, our guide on [how to get a website for your small business](/guides/how-to-get-a-website-for-your-small-business/) covers the order to do things in." },
      { p: "A sensible order looks like this:" },
      { ol: [
        "**Fix the on-page basics:** clear page titles, one topic per page, your suburb or city named where it applies.",
        "**Claim your Google Business Profile:** it is free, and local searches lean on it heavily, and it also counts as an off-page listing.",
        "**Earn a few off-page signals:** reviews, directory listings and mentions from suppliers or local press.",
        "**Test paid ads on one offer:** set a small monthly cap and stop if leads do not arrive.",
      ] },
      { p: "Do the first three yourself while time is cheaper than a retainer. Outsource when the work stops fitting around running the business." },
      { p: "The right mix depends on how fast you need customers and how much of your own time you can spare." },
      { h2: "Where this leaves you" },
      { p: "You do not have to pick one side of every pair. Free search traffic, paid ads, your own site and outside signals all work together, and you can shift the balance as your business grows. What matters is the order: get the site right, then build trust, then spend on ads if you need speed." },
      { p: "A good website is the base for all of it, and that is the part All Done Sites builds and maintains for small businesses. If yours needs building or fixing before any of this will pay off, send us a message through the contact form on this site and tell us what you have now." },
    ],
    faqs: [
      {
        q: "Is SEM the same as SEO?",
        a: "No. SEO earns unpaid search results over time. SEM, as most guides use the term, means paid search ads where you pay for each click.",
      },
      {
        q: "Which is faster, SEO or SEM?",
        a: "SEM is faster, because ads can send visitors the day they go live. SEO usually takes months, and nobody can honestly promise you a ranking.",
      },
      {
        q: "What is the difference between on-page and off-page SEO?",
        a: "On-page SEO covers what you control on your own site, such as titles, content and speed. Off-page SEO covers signals from other places, such as backlinks, listings and reviews.",
      },
      {
        q: "Can I do SEO myself?",
        a: "Yes, for the basics. Page titles, clear service pages and a Google Business Profile are all within reach if you can spare a few hours a week.",
      },
      {
        q: "When should I hire an SEO specialist?",
        a: "Hire help for technical fixes, link building or a competitive market where mistakes are costly. Be wary of anyone who guarantees a number one ranking.",
      },
      {
        q: "Should a small business use SEO and SEM together?",
        a: "Most end up doing both, in different proportions. Start with SEO basics, then test paid ads on one offer with a small monthly cap.",
      },
    ],
  },
  {
    slug: "best-website-design-for-small-business",
    title: "Best Website Design for Small Business",
    metaTitle: "Best Website Design for Small Business | All Done Sites",
    description:
      "Compare website builders, freelancers and design companies for a small business in South Africa, with real rand costs and how to vet a designer.",
    summary:
      "What good small business website design does, how builders, freelancers and design companies compare, how to vet a provider, and typical rand costs.",
    category: "Getting started",
    readMins: 8,
    intro:
      "The best website design for a small business is a simple, fast site that says what you do, where you work and how to reach you. This article is for South African small business owners who want a site that brings in enquiries, without overpaying or getting locked in.",
    publishedAt: "2026-11-20",
    updatedAt: "2026-11-20",
    author: {
      name: "Jonathan Avis",
      url: "https://www.linkedin.com/in/jonathan-avis-0503a6201/",
    },
    blocks: [
      { p: "You will see what good design actually does, how builders, freelancers and design companies compare, and how to vet a provider. It also covers what Reddit threads can and cannot tell you, plus the running costs quotes tend to skip." },
      { h2: "The short answer" },
      { p: "The best website design for a small business is a simple, fast site that shows what you do, where you work and how to contact you. Fancy visuals matter far less than that. What changes from business to business is the route you take to get there." },
      { p: "Most owners choose between three routes:" },
      { ul: [
        "**Website builder:** Squarespace's Basic plan starts at R300 a month, and suits you if you are happy to build and update the site yourself.",
        "**Freelancer or studio:** a professionally designed five-page brochure site typically costs R5,590 to R15,000 once-off.",
        "**Monthly plan:** our Launch plan is R799 a month and bundles the build, hosting and upkeep.",
      ] },
      { p: "Which one is best depends on your time, your budget and how much you want to manage. Treat these figures as a rough guide, not a quote." },
      { p: "The sections below compare the routes by criterion, show how to vet a design company and explain how to use Reddit threads when shortlisting a designer. For the full cost picture, read [how much a small business website costs](/articles/how-much-does-a-small-business-website-cost/)." },
      { h2: "What the best small business website design actually does" },
      { p: "Good design does a job. It helps a stranger decide, within a few seconds, whether you can solve their problem." },
      { p: "That job breaks into five parts." },
      { ul: [
        "**Clear message:** the first screen says what you do and where you work, in plain words.",
        "**Easy contact:** your phone number, WhatsApp link or enquiry form is visible without scrolling or hunting.",
        "**Speed on mobile:** many visitors arrive on a phone, often on a patchy connection, so heavy images and slideshows cost you enquiries.",
        "**Proof:** real photos, a few honest reviews and your business details build trust faster than stock images.",
        "**Findability:** sensible page titles and a Google Business Profile let people actually reach the site.",
      ] },
      { p: "Notice what is missing. Animations, video backgrounds and clever layouts rarely win a customer. They often slow the page down." },
      { p: "A site built around these five things can be small. Four or five pages is normal for a local service business." },
      { p: "If you are still unsure you need one at all, read our comparison of [a website versus a Facebook page](/guides/website-vs-facebook-page/)." },
      { h2: "Website builders, freelancers or a design company: compared by criterion" },
      { p: "You have three realistic routes. Judge them on cost, effort and upkeep, not on which sounds most professional." },
      { p: "**Cost:** The prices in the short answer apply here. What differs is how they add up across the years. A builder and a monthly plan are steady bills that run for as long as the site is live. A freelancer or studio build is one larger payment upfront, after which you still pay for hosting, your domain and any upkeep. [Monthly versus upfront pricing](/guides/monthly-vs-upfront-website-cost/) explains how those models differ over time." },
      { p: "**Effort:** A builder is the cheapest route to start, but you do the work. Layout, copy, photos and updates are all yours. A freelancer or design company takes that off you. So does a monthly plan." },
      { p: "**Upkeep:** Builders handle hosting and security for you. Freelancers often stop at launch, so ask who fixes things afterwards. A design company may offer a retainer, which is a separate monthly cost." },
      { p: "**Best fit:** A builder earns its place if you have time and a simple site. A freelancer suits a one-off project with a clear brief. A design company suits a larger site, several people signing off the work, or a need for an ongoing retainer. A monthly plan suits owners who want no technical work and a predictable bill." },
      { h2: "How to judge the best website design companies for small business" },
      { p: "Ignore the awards and the slick portfolio reel. Judge a company on what it will actually hand over and how it behaves once the site is live." },
      { ul: [
        "**Real client sites:** ask for live links, not screenshots. Open them on your phone and check how fast they load.",
        "**Ownership:** you should own your domain and your content. Ask what happens if you leave.",
        "**A written scope:** the quote should list pages, revisions, hosting and email. Vague quotes cause arguments later.",
        "**Ongoing care:** find out who handles updates, backups and security, and what that costs each month.",
        "**Plain answers:** a good designer explains things without jargon and says no when your idea will not work.",
      ] },
      { p: "Be wary of anyone who promises first place on Google. Nobody can guarantee that." },
      { p: "Send the same short brief to three companies and compare how they respond. The differences show you who listens." },
      { h2: "What Reddit says about finding the best website designer for a small business" },
      { p: "Threads like the ones on r/smallbusiness are useful, but treat them as leads, not verdicts. Each answer comes from one person's project, often in another country and on another budget. A designer praised in one thread may not serve South Africa at all." },
      { p: "Use the replies to build a shortlist, then check each name yourself:" },
      { ul: [
        "**Portfolio:** look at live sites they built, not screenshots. Open them on your phone.",
        "**Past clients:** ask for two you can contact, and ask what went wrong as well as what went right.",
        "**Ownership:** confirm in writing that you keep your domain and content if you leave.",
        "**Recent activity:** a glowing post from years ago says little about who runs the business today.",
      ] },
      { p: "Be wary of replies that name one provider with no detail, or that read like a quiet advert. Praise with specifics (what was built, how long it took, what it cost) is worth more than a bare recommendation." },
      { p: "For local options, our comparison of [website designers for small business near you](/articles/website-designers-for-small-business-near-me/) covers local designers, DIY builders and remote studios." },
      { h2: "What a small business website costs in South Africa" },
      { p: "The build price is only part of the bill. Quotes often leave out the running costs. As a rough guide, these are typical South African figures." },
      { ul: [
        "**Hosting:** R100 to R800 a month, depending on whether it is cheap shared hosting or managed WordPress hosting.",
        "**Domain:** a .co.za renewal typically costs R99 to R180 a year, depending on the registrar.",
        "**Maintenance:** R500 to R1,500 a month covers updates, backups and uptime checks. Agency retainers can run higher.",
      ] },
      { p: "Add these up before you compare quotes. A cheap build with separate hosting and maintenance bills can cost more over time than a monthly plan. For a fuller breakdown of the running costs, see [what is included in website hosting and maintenance](/guides/whats-included-in-website-hosting-and-maintenance/)." },
      { h2: "Which route should you take?" },
      { p: "If your site is simple and you have the time, a builder may be all you need. You do not need a designer for that. Plenty of owners launch a decent five-page site themselves." },
      { p: "If you would rather spend your hours on customers, a designer or a monthly plan takes the work off you. Whichever you pick, judge it on clear messaging, easy contact, mobile speed and who looks after the site afterwards. And count the monthly running costs, not just the build." },
      { p: "Want it handled for you? All Done Sites builds and maintains small business websites. Get a quote: send us a short description of your business and we will reply with one. See pricing: [what a website costs in South Africa](/guides/how-much-does-a-website-cost-in-south-africa/) sets out typical build and monthly costs." },
    ],
    faqs: [
      {
        q: "What is the best website design for a small business?",
        a: "A simple, fast site that says what you do, where you work and how to get in touch. Animations and fancy layouts matter far less than those basics.",
      },
      {
        q: "How much does a small business website cost?",
        a: "It depends on the route. Squarespace's Basic plan starts at R300 a month, a freelancer or studio typically charges R5,590 to R15,000 once-off for a five-page brochure site, and our Launch plan is R799 a month.",
      },
      {
        q: "Are website builders good enough for a small business?",
        a: "Yes, if your site is simple and you are happy to build and update it yourself. A builder is the cheapest route to start, but the layout, copy and photos are your job.",
      },
      {
        q: "Can I trust Reddit recommendations for web designers?",
        a: "Use them as leads, not verdicts. Each reply reflects one person's project, often in another country, so check portfolios, past clients and recent activity yourself.",
      },
      {
        q: "What should I ask a design company before hiring?",
        a: "Ask for live client sites, confirm in writing that you own your domain and content, and get a written scope listing pages, revisions, hosting and email. Also ask who handles updates and backups afterwards.",
      },
    ],
  },
  {
    slug: "best-websites-for-niche-small-businesses",
    title: "Best Websites for Niche Small Businesses",
    metaTitle: "Best Websites for Niche Small Businesses | All Done Sites",
    description:
      "The best website for a small business depends on the trade. See what consultants, food and retail shops, makers and online sellers need, with rand prices.",
    summary:
      "What a small business website needs for consulting, food and retail, craft and art, and online selling, plus how Wix, Squarespace, WordPress and custom sites compare.",
    category: "Getting started",
    readMins: 8,
    intro:
      "You run a small business and you want a website that earns its keep. The right one depends on what you sell, so this guide goes trade by trade.",
    publishedAt: "2026-11-20",
    updatedAt: "2026-11-20",
    author: {
      name: "Jonathan Avis",
      url: "https://www.linkedin.com/in/jonathan-avis-0503a6201/",
    },
    blocks: [
      { p: "It covers consultants and home businesses, food and retail shops, craft, art and jewellery makers, and online-only sellers. Each gets a short list of what the site must do. You also get a plain look at the main ways to build it, with South African prices where we found them." },
      { p: "It is written for owners who are not technical and do not want to be upsold." },
      { h2: "The short answer: what the best website for a small service business needs" },
      { p: "The best website for a small service business is a simple, fast site that says what you do, where you work and how to reach you. Everything else is optional." },
      { p: "Most service businesses need five things:" },
      { ul: [
        "**Clear services:** one section per service, in plain words.",
        "**Proof:** photos, reviews and examples of finished work.",
        "**Contact options:** a phone number, a WhatsApp link and a short enquiry form.",
        "**Local detail:** your town, your service area and your trading hours.",
        "**Mobile speed:** most visitors will find you on a phone.",
      ] },
      { p: "A brochure site of about five pages covers this for most trades. In South Africa, published estimates for a professionally designed five-page site run from R5,590 to R15,000 once-off. Cheaper builders exist, and the section on Wix, Squarespace, WordPress or custom-coded sites compares them." },
      { p: "The niche sections below change the emphasis, not the basics. A consultant needs a booking link. A shop needs stock and payments." },
      { p: "Starting from nothing? Our [step-by-step guide to getting a website for your small business](/guides/how-to-get-a-website-for-your-small-business/) sets out the order of work." },
      { h2: "Consulting and home businesses: a simple site that books calls" },
      { p: "If you sell your time, your website has one job. It gets a stranger to book a call. Everything on the page should point at that." },
      { p: "A consultant or home-based business needs a clear one-line offer, a short page on who you are, proof that you have done the work, and a booking option. Put the booking button at the top and again at the bottom." },
      { ul: [
        "**Services:** say what you do, who it is for and what happens after someone gets in touch.",
        "**Proof:** two or three client quotes or short case notes. Real ones only.",
        "**Booking:** a calendar link or a short enquiry form, plus a phone number or WhatsApp link if your clients use them.",
        "**Location:** your suburb or service area, so people searching nearby can find you.",
      ] },
      { p: "Use an email address on your own domain, not a free Gmail one. It looks more credible and costs very little." },
      { p: "A five-page site covers all of this." },
      { h2: "Food and retail businesses: menus, trading hours and click-and-collect" },
      { p: "A café, bakery or small shop is judged on what people see in the first ten seconds. They want to know what you sell, when you are open and how to get it. Put those three answers on the home page." },
      { ul: [
        "**Menu or product list:** write it as text on the page, not a photo of a printed sheet. Google can read text, and phones can zoom it.",
        "**Trading hours:** show them near the top, including public holidays. Keep them matching your Google Business Profile.",
        "**Location:** add a map link, your street address and a line on parking.",
        "**Click-and-collect:** a simple order form or WhatsApp button is enough to start. A full shop can wait.",
      ] },
      { p: "Most food businesses do not need card payments online on day one. Taking orders by message and paying at the counter works fine." },
      { p: "A retail shop with a few dozen products is different. If you want customers to pay online, you need a proper shop. The [cost of an ecommerce site in South Africa](/articles/how-much-should-an-ecommerce-website-cost-in-south-africa/) is a separate conversation from a simple brochure site." },
      { p: "A Facebook page helps with daily specials. It does not replace a site you own, as [our guide on website versus Facebook page](/guides/website-vs-facebook-page/) explains." },
      { h2: "Craft, art and jewellery businesses: a portfolio that can also sell" },
      { p: "If you make things by hand, your photos do the selling. The best website for a craft, art or jewellery business is a gallery first and a shop second. Buyers want to see the work before they care about the checkout." },
      { p: "Start with large, sharp images on a plain background. Show each piece from more than one angle, and add a size or scale reference so nobody has to guess." },
      { ul: [
        "**Product details:** materials, dimensions, weight and care notes, written once and kept consistent.",
        "**Story:** two or three sentences on who makes the work and how. It builds trust faster than any badge.",
        "**Buying route:** a clear way to order, even if that is only an enquiry form for commissions.",
        "**Delivery and returns:** one short, honest paragraph, because handmade items are often one of a kind.",
      ] },
      { p: "Selling only a few pieces a month? A gallery with an enquiry button is enough. Add a proper cart once orders become regular and you are tired of replying to each one by hand." },
      { p: "Keep in mind that one-off pieces need stock that sells out cleanly. Choose a platform that lets you mark an item as sold, so the page does not promise what you no longer have." },
      { h2: "Small online businesses: when you need a proper online shop" },
      { p: "If you sell only online, your website is your shop. It cannot be a brochure with a contact form. You need a proper store." },
      { p: "A store has to do a few things well:" },
      { ul: [
        "**Checkout:** customers should pay in a few taps, on a phone, without creating an account.",
        "**Payments:** local card and instant EFT options matter more than fancy themes.",
        "**Shipping:** set rates and delivery areas up front, so nobody gets a surprise at the last step.",
        "**Stock:** the site should stop selling what you no longer have.",
      ] },
      { p: "Start small. A short product list that loads fast beats a huge catalogue that confuses people." },
      { p: "Cost depends on the platform and how much you need built. One published estimate puts an ecommerce site in South Africa at R7,580 to R20,000 once-off. Hosting, payment fees and upkeep come on top." },
      { p: "Some owners prefer a monthly fee to a large upfront bill. The next section touches on both, and links to a fuller comparison." },
      { p: "If you only sell a handful of items, a simple site with a payment link can do for now. Move to a full shop when orders start to take up your evenings." },
      { h2: "Wix, Squarespace, WordPress or custom-coded: which to choose and what it costs" },
      { p: "Pick the option that matches how much work you want to do yourself. All four can run a good small business site." },
      { ul: [
        "**Wix and Squarespace:** you build it yourself from templates. Squarespace lists its monthly plans in rands. Cheap to start, but your time is the real cost.",
        "**WordPress:** more flexible, and better if you plan to blog a lot. It needs hosting, updates and security checks, so someone has to look after it.",
        "**Custom-coded:** built around your business, usually lighter and faster than a plugin-heavy site, with fewer moving parts to patch. Someone still has to build and look after it. Our comparison of [custom-coded versus WordPress for small businesses](/guides/custom-coded-vs-wordpress-website/) goes through speed, security, upkeep and cost.",
      ] },
      { p: "If you would rather have a designer do it, published estimates for a professionally designed five-page site run from R5,590 to R15,000 once-off. An online shop costs more, and the sums change again if you pay monthly instead. Our look at [monthly versus upfront website pricing](/guides/monthly-vs-upfront-website-cost/) covers both." },
      { p: "For reference, All Done Sites' Launch plan is R799 a month. That is a managed option, not a builder you run yourself." },
      { p: "Start with the cheapest option that does the job. Move up only when you outgrow it." },
      { h2: "Where to go from here" },
      { p: "Whatever you sell, the pattern is the same. Say what you offer, show proof, and make it easy to get in touch or buy. Fancy features come later, if at all." },
      { p: "You may not need a designer. A builder such as Wix or Squarespace can work well if you have the time. If you would rather hand it over, All Done Sites builds and maintains small business sites, with plans starting at R799 a month." },
      { p: "Send us a short message about your business and what you sell, and we will tell you what it needs." },
    ],
    faqs: [
      {
        q: "What is the best website for a small service business?",
        a: "A simple, fast site that states your services, your area and how to contact you. A brochure site of about five pages covers most trades.",
      },
      {
        q: "Do I need an online shop for a food or retail business?",
        a: "Not at first. A menu or product list, trading hours and a WhatsApp order button is enough to start. Add a proper shop once customers want to pay online.",
      },
      {
        q: "How should a craft, art or jewellery maker set up a site?",
        a: "Lead with a gallery of sharp photos, then add buying details. An enquiry form works while you sell only a few pieces. A cart can wait until orders become regular.",
      },
      {
        q: "How much does a professionally designed small business site cost?",
        a: "Published estimates for a five-page site in South Africa run from R5,590 to R15,000 once-off. Online shops cost more, and hosting and upkeep are extra.",
      },
      {
        q: "Is a Facebook page enough?",
        a: "It helps with daily updates, but you do not own it. Our guide on [website versus Facebook page](/guides/website-vs-facebook-page/) explains why a site still matters.",
      },
    ],
  },
  {
    slug: "ai-search-vs-seo-what-actually-changes",
    title: "AI Search vs SEO: What Actually Changes",
    metaTitle: "AI Search vs SEO: What Actually Changes | All Done Sites",
    description:
      "AI search is not replacing SEO. See how results, ranking signals, traffic and cost compare, and which edits help your small business site in both.",
    summary:
      "How AI search optimisation compares with traditional SEO, what AI answers mean for a small business, and which edits to make to your pages.",
    category: "Getting started",
    readMins: 8,
    intro:
      "You have heard that AI is changing how people find businesses online. You may also have been told your SEO is now out of date. This article is for small business owners who want a straight answer.",
    publishedAt: "2026-11-20",
    updatedAt: "2026-11-20",
    author: {
      name: "Jonathan Avis",
      url: "https://www.linkedin.com/in/jonathan-avis-0503a6201/",
    },
    blocks: [
      { p: "It explains what AI search optimisation is and how it compares with traditional SEO. It then looks at what AI answers mean for a small business, whether they replace SEO, and which edits to make to your site." },
      { h2: "The short answer" },
      { p: "AI search optimisation and traditional SEO overlap far more than they differ. Most of what helps you rank in Google also helps AI tools mention your business. AI search is not replacing SEO." },
      { p: "What changes is where the result appears. A search engine lists links, and you compete for the click. An AI answer pulls from several sources into one reply, and you compete to be cited inside it." },
      { p: "For a small business, that comes down to three things:" },
      { ul: [
        "**Same foundation:** a fast, crawlable site with clear, honest pages still comes first.",
        "**Different target:** being named in an answer now matters alongside ranking.",
        "**Different measure:** rankings and clicks tell only part of the story, so watch enquiries and mentions too.",
      ] },
      { p: "If you do not have a site yet, start with [how to get a website for your small business](/guides/how-to-get-a-website-for-your-small-business/). The sections below compare the two approaches criterion by criterion, then cover what to change." },
      { h2: "What AI search optimisation is, and how it differs from traditional SEO" },
      { p: "AI search optimisation is the work of making your site easy for AI tools to read, trust and quote. Those tools include Google's AI answers, ChatGPT and Perplexity. You may also see it called AEO or GEO. The names differ, but the job is the same." },
      { p: "Traditional SEO aims to put your page in a list of blue links. AI search optimisation aims to get your business named inside a written answer, often with a link beside it." },
      { p: "The two share most of their foundations:" },
      { ul: [
        "**Clear content:** pages that answer a real question directly, in plain language.",
        "**Sound technical setup:** a fast site that search crawlers can read.",
        "**Trust signals:** accurate business details, reviews and mentions on other sites.",
      ] },
      { p: "The difference is in emphasis. AI tools lift short, self-contained passages, so a page that opens with the answer does better than one that buries it. They also lean on how consistently your business is described across the web." },
      { p: "Whether it replaces SEO is covered below." },
      { h2: "AI search vs SEO, criterion by criterion: results, ranking signals, traffic and cost" },
      { ul: [
        "**Results:** Traditional SEO gives you a list of links, and you want to sit near the top. AI search gives one written answer with a few cited sources, and on Google that answer often sits above the links.",
        "**Ranking signals:** Google still rewards relevance, links, speed and a sound site. AI tools lean on the same foundations, then favour clear, self-contained passages they can quote with confidence.",
        "**Traffic:** A ranking sends a click to your page. An AI answer often satisfies the reader without one, so you may get fewer visits that are better informed. Nobody can promise you a number here, and treat anyone who does with caution.",
        "**Cost:** Most of the work is shared. Good copy, a fast site and accurate business details serve both. The extra effort is mostly in rewriting pages so each opens with the answer and uses question-style headings.",
      ] },
      { p: "SEO earns its place because search engines still send most of the traffic that turns into enquiries. AI search is a smaller channel today, and it grows from the same groundwork." },
      { p: "You do not need two budgets. You need one site that is easy to find and easy to quote." },
      { h2: "How AI search results are changing SEO for small businesses" },
      { p: "AI answers change what a search result looks like. Often the reader gets a summary at the top of the page and only clicks through if they want more. For a small business, that shifts three things." },
      { ul: [
        "**Fewer easy clicks:** general questions (\"what is a bookkeeper?\") are the ones an AI answer settles on its own. Expect less traffic from those.",
        "**Local and buying searches matter more:** someone who needs a plumber in Pretoria still has to contact one. Those searches keep sending enquiries.",
        "**Being named counts:** an AI answer that mentions your business, or cites your page, puts you in front of the reader before they ever visit.",
      ] },
      { p: "Small businesses have an edge here. You know your customers, your area and your prices. A page that states them plainly gives an AI tool something specific to quote, which a generic blog post does not." },
      { p: "The basics still decide whether you get picked up at all. A site that is fast, clear and easy for search engines to read comes first." },
      { h2: "Is AI search replacing SEO?" },
      { p: "No. For a small business, AI search is sitting on top of SEO, not pushing it out." },
      { p: "AI tools still need somewhere to get their answers. They draw on pages that are indexed, clear and trusted, which is the same groundwork SEO has always done. Skip that groundwork and you are less likely to be named in an answer too." },
      { p: "What has changed is the scoreboard. Ranking first no longer guarantees the click, and being mentioned in an answer can bring a visit you would never have counted before. Treat both as part of one job." },
      { p: "Here is where each approach still wins:" },
      { ul: [
        "**Traditional SEO:** it still sends the steady stream of people ready to contact you, especially for local and buying searches.",
        "**AI search optimisation:** it helps you get named when someone asks a question instead of typing a few keywords.",
      ] },
      { p: "Be wary of anyone who says SEO is dead and sells you a separate package to replace it. Our look at [AI search optimisation services and specialists](/articles/ai-search-optimisation-services-and-specialists/) covers what to ask before you pay for one." },
      { p: "The honest picture is that nobody can promise how AI answers will behave next year. Good pages hold their value either way." },
      { h2: "What to change on your site so it works for AI search and SEO" },
      { p: "You do not need a second strategy. A handful of changes help both, and most are small edits to pages you already have." },
      { ul: [
        "**Answer first:** open each page with a direct answer to the question it targets, then explain. AI tools lift short passages, and search engines reward the same clarity.",
        "**Question headings:** write subheadings the way customers ask, such as \"How long does a geyser repair take?\", and answer each in a few plain sentences.",
        "**Clear business details:** keep your name, address, phone number, services and areas served consistent across your site and your Google Business Profile.",
        "**Real specifics:** state what you offer, where, and for whom. Vague copy gives an AI tool nothing to quote.",
        "**A fast, crawlable site:** If crawlers cannot read a page, neither Google nor an AI tool can use it, and a slow page puts you at a disadvantage against faster competitors. Our guide on [what hosting and maintenance include](/guides/whats-included-in-website-hosting-and-maintenance/) explains what keeps a site healthy.",
      ] },
      { p: "Start with your five most important pages. Check that each one answers its main question in the first paragraph. That one edit costs little and helps in both places." },
      { h2: "Want it handled for you?" },
      { p: "AI search has changed where your business can show up. It has not changed what makes a site worth showing. Clear pages, accurate details and a fast, readable site still do most of the work." },
      { p: "You do not need to choose between the two approaches. Good SEO gives AI tools something to draw on, and answer-first pages help you in both places." },
      { p: "All Done Sites builds and maintains small business websites set up for both, so if you want yours looked at, get in touch and tell us which five pages matter most to your business." },
    ],
    faqs: [
      {
        q: "Is AI search replacing SEO?",
        a: "No. AI tools draw on the same indexed, trusted pages that SEO builds. For a small business, AI search sits on top of SEO rather than pushing it out.",
      },
      {
        q: "What is the difference between AI search optimisation and SEO?",
        a: "SEO aims to place your page in a list of links. AI search optimisation aims to get your business named inside a written answer. Most of the groundwork is shared.",
      },
      {
        q: "Do I need a separate budget for AI search?",
        a: "Usually not. Good copy, a fast site and consistent business details serve both. The extra effort is mostly rewriting pages so each one opens with the answer and uses question-style headings.",
      },
      {
        q: "Will AI answers cut my website traffic?",
        a: "Possibly for general questions, which an AI answer can settle on its own. Local and buying searches still send enquiries. Nobody can promise you a specific number either way.",
      },
      {
        q: "What should I change first?",
        a: "Your most important pages, using the answer-first check described above.",
      },
      {
        q: "Should I trust someone who says SEO is dead?",
        a: "Be cautious. SEO still sends the steady stream of people ready to contact you, and AI tools draw on the same groundwork.",
      },
    ],
  },
  {
    slug: "wordpress-wix-and-shopify-website-costs-compared",
    title: "WordPress, Wix and Shopify Website Costs Compared",
    metaTitle: "WordPress, Wix and Shopify Website Costs Compared",
    description:
      "WordPress, Wix and Shopify costs in South Africa compared: build fees from R5,590, hosting from R100 a month, plus domains, apps and custom build prices.",
    summary:
      "What WordPress, Wix and Shopify cost to build and run in South Africa, compared on build cost, running cost, ownership and growth.",
    category: "Pricing",
    readMins: 8,
    intro:
      "WordPress, Wix and Shopify do not charge in the same way, which is why their prices are hard to compare. WordPress asks for a build fee, and a studio-built five-page site typically costs R5,590 to R15,000. Wix and Shopify swap that fee for a monthly plan.",
    publishedAt: "2026-11-27",
    updatedAt: "2026-11-27",
    author: {
      name: "Jonathan Avis",
      url: "https://www.linkedin.com/in/jonathan-avis-0503a6201/",
    },
    blocks: [
      { p: "This article sets out what each platform costs in South Africa and where the extra bills hide. It then compares them on build cost, running cost, ownership and growth. It ends with when a custom build is worth the money." },
      { p: "It is written for small business owners who want a realistic budget before they speak to anyone." },
      { h2: "The short answer" },
      { p: "A studio-built five-page site in South Africa, such as a small WordPress brochure site, typically costs between R5,590 and R15,000 once-off. A template-based design sits at the low end. More customisation pushes you toward the top." },
      { p: "An online store costs more. Published estimates for a full store run from R7,580 to R20,000, and the price scales with catalogue size and custom features." },
      { p: "Then there is the running cost. Budget for hosting at R100 to R800 a month on top of the build. WordPress itself is free software, so you pay for the work and the hosting around it." },
      { p: "Wix and Shopify flip that model. You skip most of the build fee and pay a monthly plan instead, usually billed in dollars. Each one is covered under its own heading below." },
      { p: "These are hedged ranges, so treat them as a guide, not a quote. For the wider picture, see our guide to [what a website costs in South Africa](/guides/how-much-does-a-website-cost-in-south-africa/)." },
      { h2: "How much does a WordPress website cost to make in South Africa?" },
      { p: "The build is where most of the spread comes from. Published packages for a five-page site range from R4,750 to R12,750. The gap is mostly design time and how much of the site is made to measure." },
      { p: "Here is what usually moves the price:" },
      { ul: [
        "**Template or custom design:** a template with light edits stays near the bottom of the R5,590 to R15,000 band.",
        "**Page count:** every extra page needs copy, images and checking.",
        "**Features:** booking forms, memberships and payment gateways add build hours.",
      ] },
      { p: "Then come the costs people forget. A .co.za domain renews from about R99 a year. Ongoing maintenance, covering updates, backups and security, is quoted at R500 to R1,500 per month for a small business site." },
      { p: "Maintenance is optional, but skipping it is how WordPress sites get hacked. For a fuller breakdown, see [what is included in hosting and maintenance](/guides/whats-included-in-website-hosting-and-maintenance/)." },
      { h2: "Wix website cost in South Africa: plans, rands and limits" },
      { p: "Wix charges a monthly plan instead of a build fee. You pick a template, edit it yourself, and pay as long as the site stays live. Wix and Shopify price their plans in US dollars, so check the current figure on their pricing pages before you budget." },
      { p: "What the plan does not cover is where the real cost sits:" },
      { ul: [
        "**Domain name:** a .co.za domain renews from about R99 a year, and a free domain on a plan is often only for the first year.",
        "**Your time:** a Wix site is cheap in rands because you build it. A studio-built five-page site typically costs R5,590 to R15,000 once-off, and that fee buys the hours Wix asks you to spend.",
        "**Add-ons:** booking, shop and email tools can move you to a higher plan.",
      ] },
      { p: "The limits matter more than the price. You cannot move a Wix site to another host. If you outgrow it, you rebuild. Wix also hosts the site for you, so there is no separate hosting bill, unlike WordPress at R100 to R800 a month." },
      { p: "For how a monthly model compares with paying once, read [monthly vs upfront website cost](/guides/monthly-vs-upfront-website-cost/)." },
      { h2: "Shopify website cost in South Africa: monthly plans, apps and transaction fees" },
      { p: "Shopify is built for selling, and you pay for that in a monthly subscription. Like Wix, it replaces the build fee with a plan, and it hosts the store for you." },
      { p: "The catch is that Shopify prices its plans in US dollars. The rand cost moves with the exchange rate, so check the current figure on Shopify's pricing page before you budget." },
      { p: "Three costs sit on top of the plan:" },
      { ul: [
        "**Apps:** reviews, subscriptions, advanced shipping and similar features are often paid add-ons, each billed monthly.",
        "**Transaction fees:** these depend on which payment gateway you use. Check whether Shopify's own payments are available for South Africa, because third-party gateways can add a fee on each sale.",
        "**Theme:** the free themes work for many stores. A paid theme is a once-off cost.",
      ] },
      { p: "Compare that with a store on WordPress. Published estimates for a full store run from R7,580 to R20,000 once-off, plus hosting at R100 to R800 a month." },
      { p: "Shopify is cheaper to start and simpler to run. The bill grows with every app you add, and it never stops. For a larger catalogue, [our guide to monthly vs upfront website cost](/guides/monthly-vs-upfront-website-cost/) shows how that adds up." },
      { h2: "WordPress vs Wix vs Shopify by criterion: build cost, running cost, ownership and growth" },
      { p: "Each platform wins on a different criterion. Here is how they line up." },
      { ul: [
        "**Build cost:** WordPress asks for the most upfront, because a studio-built five-page site typically costs R5,590 to R15,000 once-off. Wix and Shopify let you build it yourself, so your own hours (and, on Shopify, any paid theme) are the price.",
        "**Running cost:** WordPress adds hosting at R100 to R800 a month. Wix and Shopify bundle hosting into a monthly plan, and Shopify adds apps and transaction fees on top.",
        "**Ownership:** A WordPress site can move to another host with its content intact. Wix and Shopify keep you on their platform, so leaving usually means a rebuild.",
        "**Growth:** Shopify suits a store that keeps adding products. WordPress with an online shop plugin also works, and published estimates for a full online store run from R7,580 to R20,000 once-off. Wix is happiest as a small brochure site.",
      ] },
      { p: "Pick Shopify for a store you want running quickly, Wix for a simple site you will edit yourself, and WordPress when you want to own the result. If you are weighing a fully bespoke build, the [custom-coded vs WordPress comparison](/guides/custom-coded-vs-wordpress-website/) covers that step." },
      { h2: "WordPress custom website cost: when a custom build is worth paying for" },
      { p: "A custom WordPress build means bespoke design and development instead of a template with light edits. It costs more, and most small businesses do not need it." },
      { p: "As a rough guide, one studio prices large multi-page builds with advanced SEO structure and custom integrations at R16,900 to R40,000. Another agency puts a fuller business website, beyond a five-page brochure site, at R15,000 to R60,000. Treat both as published estimates, not quotes." },
      { p: "Custom work earns its price in a few situations:" },
      { ul: [
        "**Integrations:** the site must talk to a booking system, stock database or CRM.",
        "**Scale:** you have a large catalogue or many pages that need a planned structure.",
        "**Special features:** members areas, quote calculators or anything a plugin cannot do cleanly.",
      ] },
      { p: "Past that point you are building software, not a website. One agency lists custom web applications at R100,000 to R450,000." },
      { p: "If you only need five pages, a phone number and a contact form, skip it. The R5,590 to R15,000 band covers that. For a fuller breakdown of what drives these ranges, read [how much a website costs in South Africa](/guides/how-much-does-a-website-cost-in-south-africa/)." },
      { h2: "Which platform should you budget for?" },
      { p: "The cheapest platform on paper is rarely the cheapest in practice. Wix and Shopify cost less to start, but you carry the work and the monthly bill. WordPress costs more on day one and leaves you with a site you own." },
      { p: "Most small businesses land in the same place. A simple brochure site does not need a bespoke build. A store needs a bigger budget and a clear view of its ongoing fees." },
      { p: "Start with the number that matters most to you: what you can spend now, and what you can spend every month. The right platform follows from that." },
      { p: "All Done Sites builds and maintains this kind of site, so send us your page count and the features you need and we will tell you what it would cost." },
    ],
    faqs: [
      {
        q: "How much does a WordPress website cost in South Africa?",
        a: "A studio-built five-page site typically costs R5,590 to R15,000 once-off. Hosting adds R100 to R800 a month on top of that.",
      },
      {
        q: "Is Wix cheaper than WordPress?",
        a: "Wix has no build fee and includes hosting, so it costs less upfront. You spend your own time building the site. Wix prices its plans in US dollars, so check the current figure on its pricing page before you budget.",
      },
      {
        q: "Is a Shopify store cheaper than a WordPress store?",
        a: "Shopify is cheaper to start, but its plans are priced in US dollars and apps add to the monthly bill. Published estimates for a full online store run from R7,580 to R20,000 once-off, plus hosting.",
      },
      {
        q: "Can I move my site away from Wix or Shopify later?",
        a: "Usually not without a rebuild. A WordPress site can move to another host with its content intact.",
      },
      {
        q: "When is a custom WordPress build worth paying for?",
        a: "When the site must connect to other systems, handle a large catalogue or offer features a plugin cannot. One studio prices large custom builds at R16,900 to R40,000.",
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
