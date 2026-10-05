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
      "Ecommerce website costs in South Africa run R15,000 to R80,000 to build, plus R500 to R3,000 a month to run. See what drives the price and what to skip.",
    summary:
      "What ecommerce sites actually cost to build and run in South Africa, by shop size, platform, and the monthly fees quotes often leave out.",
    category: "Pricing",
    readMins: 18,
    intro:
      "The price on an ecommerce quote and what the store costs you in its first year are rarely the same number. The monthly running cost is the part most quotes leave off, and it's often the difference between a build that looks cheap and a first year that isn't.",
    publishedAt: "2026-09-29",
    updatedAt: "2026-09-29",
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
      { p: "WooCommerce itself is free. It's a plugin that turns a WordPress site into a store. The cost shifts to hosting (R150–R500 a month for something that holds up at checkout), an SSL certificate, usually bundled with hosting, and whichever premium plugins you need for shipping rules, stock management or backups. It's typically the cheapest to run month to month. But WordPress, WooCommerce and every plugin need regular updates. That's either your own time or a maintenance retainer, and skipping it is how sites break at the worst moment." },
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
        "Platform or hosting fee: from about R150 a month upward, covered in the platform comparison above",
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
      { p: "If you're getting quotes now, start by counting your product list, deciding which platform fits how you plan to run the store month to month, and asking every supplier for the build price and the monthly cost as two separate numbers, in writing." },
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
    updatedAt: "2026-10-02",
    author: {
      name: "Jonathan Avis",
      url: "https://www.linkedin.com/in/jonathan-avis-0503a6201/",
    },
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
    updatedAt: "2026-10-05",
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
      { p: "Look at real examples of their work, not a portfolio slide. Load a few of their sites on your phone. If those are slow or hard to read, yours will be too." },
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
