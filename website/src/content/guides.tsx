// Single source of truth for the /guides section.
//
// Each guide is authored as structured data (no JSX in the content) so the same
// objects power: the rendered article, the Article + FAQPage JSON-LD, the guides
// index cards, the sitemap and llms.txt entries. Paragraph/list strings may use a
// tiny markdown-style inline link, [text](/path), which renderInline() turns into
// a router <Link> (internal) or <a> (external); stripInline() flattens it to plain
// text for structured data.

import { ReactNode } from "react";
import { Link } from "react-router-dom";

export type GuideBlock =
  | { h2: string }
  | { h3: string }
  | { p: string }
  | { ul: string[] }
  | { ol: string[] }
  | { callout: { title?: string; body: string } };

export type GuideFaq = { q: string; a: string };

export interface Guide {
  slug: string;
  title: string;
  metaTitle: string;
  description: string;
  summary: string;
  category: string;
  readMins: number;
  intro: string;
  blocks: GuideBlock[];
  faqs: GuideFaq[];
  relatedSlugs: string[];
}

/** Last content review date, used for sitemap lastmod + Article dateModified. */
export const GUIDES_UPDATED = "2026-06-08";
export const GUIDES_PUBLISHED = "2026-06-08";

export const guides: Guide[] = [
  {
    slug: "how-much-does-a-website-cost-in-south-africa",
    title: "How much does a website cost in South Africa?",
    metaTitle: "How Much Does a Website Cost in South Africa? | All Done Sites",
    description:
      "A clear, honest guide to website costs in South Africa: DIY, freelancer and agency price ranges, hidden ongoing costs, and upfront vs monthly models.",
    summary:
      "What a website really costs in SA: build price ranges, the ongoing costs people forget, and how upfront and monthly models compare.",
    category: "Pricing",
    readMins: 5,
    intro:
      "In South Africa a small-business website typically costs anywhere from a few hundred rand a month for a done-for-you service to a one-off build of R5,000 to R50,000 or more. The right number depends on how many pages you need, who builds it, and whether you pay one large upfront fee or a smaller monthly subscription that also covers hosting, updates and support.",
    blocks: [
      { p: "There is no single price for a website, and anyone who quotes you one without asking questions is guessing. What you pay depends on the size of the site, who builds it, and how you spread the cost over time. This guide breaks down the real numbers so you can budget with confidence." },
      { h2: "What actually drives the cost of a website" },
      { p: "Two businesses can pay very different amounts for sites that look similar. The price is shaped by a handful of practical factors:" },
      { ul: [
        "Number of pages: a single landing page costs far less than a 12-page site with services, blog and gallery sections.",
        "Who builds it: doing it yourself, hiring a freelancer, or using an agency each sits at a different price point.",
        "Custom design vs template: bespoke branding and layouts take more time than a polished template.",
        "Features: online bookings, e-commerce, member logins and integrations all add work.",
        "Content: if you supply text and photos it is quicker; if someone has to write and source them, that adds cost.",
        "Ongoing care: hosting, security, backups and monthly updates are recurring, not once-off.",
      ] },
      { h2: "Typical price ranges in South Africa" },
      { p: "These are hedged, real-world ranges. Treat them as a guide, not a quote, because every project differs." },
      { h3: "DIY website builders" },
      { p: "Platforms like Wix, Squarespace or WordPress let you build it yourself. Subscriptions often run from around R150 to R600 a month, plus your time. They are cheap on paper, but the cost shows up in the hours you spend learning, building and fixing things instead of running your business." },
      { h3: "Freelancers" },
      { p: "A freelance designer or developer can typically build a small business site for around R5,000 to R25,000 once-off. Quality and reliability vary widely. The main risk is what happens afterwards: many freelancers move on, so updates and support can become hard to arrange." },
      { h3: "Agencies" },
      { p: "A web agency usually charges more, often R20,000 to R80,000 or higher for a custom build, sometimes with a monthly retainer on top. You generally get a polished result and a team behind it, but it is the most expensive route and often overkill for a small business that just needs a solid, findable website." },
      { h2: "The ongoing costs people forget" },
      { p: "The build price is only part of the picture. A website is not a once-off purchase; it needs a few things to stay online, secure and useful. These recur every month or year:" },
      { ul: [
        "Domain name: a .co.za domain usually costs a small annual fee.",
        "Hosting: where your site lives, billed monthly or yearly. Load-shedding-resilient hosting matters in South Africa.",
        "SSL certificate: the padlock that keeps the site secure and trusted.",
        "Professional email: an address at your own domain looks far more credible than a free Gmail account.",
        "Backups and security: protection against hacks, crashes and data loss.",
        "Updates and maintenance: changing prices, adding photos, fixing breakages and keeping software current.",
      ] },
      { p: "When people compare a once-off build to a monthly service, they often forget these. A R10,000 freelance site can quietly cost you more over two years once hosting, email, security and ad-hoc update fees are added in." },
      { h2: "Upfront vs monthly: two ways to pay" },
      { p: "There are two common models, and the difference matters most for cash flow." },
      { ol: [
        "Upfront build: you pay a large once-off fee, then handle (and pay for) hosting, updates and maintenance separately. Bigger initial outlay, more admin afterwards.",
        "Monthly subscription: a smaller, predictable fee each month that bundles design, hosting, security, email, updates and support. No big bill to start, and someone else keeps it running.",
      ] },
      { p: "For many small businesses the monthly model is easier to budget for, especially when starting out. You can read a fuller comparison in our guide on [monthly vs upfront website cost](/guides/monthly-vs-upfront-website-cost)." },
      { h2: "How a done-for-you monthly model works" },
      { p: "All Done Sites uses the subscription approach. We design and build your site for free to start, then host, secure and update it for one simple monthly fee. Every site is custom hand-coded, not built on WordPress or a page builder, so it stays fast and secure with fewer running costs over time. There is no large upfront bill, and the recurring costs above are bundled in rather than billed separately." },
      { p: "Plans start at R799 a month for a single-page site, with Business at R2,200 and Premium at R3,600 for larger sites. Every plan includes fast secure hosting, SSL, automated backups, a mobile-friendly build, professional email at your domain, monthly content updates and SEO. See the full breakdown on the [pricing page](/#pricing)." },
      { callout: { title: "Do you own the website?", body: "Yes. After the first 12 months, the site's code and files can be transferred to you, so you own it to keep or move elsewhere. You are never locked in." } },
      { h2: "So what should you budget?" },
      { p: "If you want a simple, professional site without a big upfront cost, budget for a monthly fee from around R799 and let someone else handle the technical side. If you prefer to own the build outright from day one, expect a once-off cost in the thousands to tens of thousands, plus separate ongoing costs for hosting, email and maintenance. Either way, factor in the full picture, not just the headline build price." },
      { p: "Not sure which route fits? [Get a quick quote](/#getquote) and we will give you an honest answer for your specific business." },
    ],
    faqs: [
      { q: "How much does a small business website cost in South Africa?", a: "It varies by route. A done-for-you monthly service can start from around R799 a month including hosting and updates, while a once-off freelance or agency build typically ranges from R5,000 to R80,000 or more, with hosting and maintenance billed separately." },
      { q: "Are there hidden or ongoing costs with a website?", a: "Yes. Beyond the build, a website needs a domain, hosting, an SSL certificate, professional email, backups, security and regular updates. These recur monthly or yearly and are easy to forget when comparing quotes." },
      { q: "Is it cheaper to build my own website?", a: "DIY builders like Wix or Squarespace look cheaper at around R150 to R600 a month, but the real cost is your time spent learning, building and maintaining it instead of running your business." },
      { q: "Why is a monthly subscription often better than paying upfront?", a: "A monthly model removes the large initial bill and bundles hosting, security, email, updates and support into one predictable fee, which is easier to budget for and means someone else keeps the site running." },
      { q: "Do I own my website if I pay monthly?", a: "With All Done Sites, yes. After the first 12 months the site's code and files can be transferred to you, so you can keep or move the site and are never locked in." },
    ],
    relatedSlugs: ["monthly-vs-upfront-website-cost", "whats-included-in-website-hosting-and-maintenance"],
  },

  {
    slug: "custom-coded-vs-wordpress-website",
    title: "Custom-coded vs WordPress: which is better for a small business website?",
    metaTitle: "Custom-Coded vs WordPress Websites | All Done Sites",
    description:
      "Custom-coded vs WordPress for a small business website in South Africa: how they compare on speed, security, maintenance, cost and SEO.",
    summary:
      "How custom-coded and WordPress websites compare on speed, security, upkeep, cost and SEO, and which suits a small South African business.",
    category: "Getting started",
    readMins: 6,
    intro:
      "For most South African small businesses that want a fast, professional marketing website, a custom-coded site is usually the better choice: it loads faster, has a smaller security risk and needs less upkeep than a typical WordPress site. WordPress is still a strong option if you need a large self-managed blog, a complex online shop, or a specific library of plugins. The right answer depends on what your site actually needs to do.",
    blocks: [
      { h2: "The short answer" },
      { p: "Both can produce a good website, so this is not about one being useless. It is about fit. A custom-coded site is lean and fast and suits the brochure, services and lead-generation sites most small businesses need. WordPress is flexible and self-editable and suits sites with heavy, frequently changing content or complex features, as long as someone keeps it maintained." },
      { h2: "What each one actually is" },
      { p: "WordPress is a content management system that powers a large share of the web. You build a site by combining a theme with plugins, and you (or a developer) keep the core, theme and plugins updated. Its strength is flexibility and a huge ecosystem of add-ons." },
      { p: "A custom-coded site is built with hand-written code (HTML, CSS and JavaScript, often using a modern framework), made specifically for your business. It contains only the code your site needs and nothing extra, with no themes or plugins layered on top." },
      { h2: "Speed and performance" },
      { p: "Custom-coded sites are usually lighter and faster because there is no theme or plugin overhead to download and run. WordPress can be made fast, but a typical install carries unused code from its theme and plugins that slows pages down. Speed matters most on mobile, where the majority of South African visitors arrive, and faster pages tend to rank and convert better." },
      { h2: "Security" },
      { p: "Out-of-date plugins are the most common way small WordPress sites get hacked, because every plugin is extra code that can contain a weakness. A custom-coded site has no third-party plugins to exploit, so the attack surface is much smaller. WordPress can be kept secure, but it relies on someone applying updates promptly and choosing plugins carefully." },
      { h2: "Maintenance and updates" },
      { p: "WordPress needs regular updates to its core, theme and plugins, and those updates can occasionally clash and break something, so the site needs ongoing attention. A custom-coded site has far less to update and fewer moving parts to go wrong." },
      { p: "The trade-off is editing. WordPress lets you log in and change content yourself, if you are comfortable doing it and willing to maintain the site. A custom-coded site is usually changed by the developer, which is exactly why done-for-you services include those changes for you." },
      { h2: "Cost over time" },
      { p: "WordPress software is free, but the real costs are hosting, premium themes or plugins, and a developer's time for updates and fixes. A custom-coded site is paid for either as a build or as a subscription that bundles the upkeep. When you add up the ongoing costs, the gap is often smaller than it first looks. There is a fuller breakdown in our guide on [how much a website costs in South Africa](/guides/how-much-does-a-website-cost-in-south-africa)." },
      { h2: "SEO and AI readability" },
      { p: "Search engines and AI assistants read your page's code. Clean, lightweight, well-structured code is easy for them to crawl, understand and cite, and it gives you full control over headings, schema markup and page structure. Heavier, plugin-generated markup can get in the way. This is a genuine advantage of a well-built custom-coded site." },
      { callout: { title: "When WordPress is still the right call", body: "WordPress earns its place if you want to write and manage a busy blog yourself, you depend on a specific plugin or integration, or you run a complex membership or large e-commerce site and have someone to maintain it. In those cases its flexibility is worth the extra weight and upkeep." } },
      { h2: "Which is right for your business?" },
      { p: "For a typical small business that wants a fast, credible website to bring in enquiries, bookings or sales, a custom-coded site is usually the better fit: faster, more secure and lower-maintenance. Choose WordPress if you need to manage a lot of your own content or you need features that depend on its plugin ecosystem, and you have the time or budget to keep it maintained." },
      { h2: "How All Done Sites does it" },
      { p: "All Done Sites hand-codes every website, with no WordPress, Wix or page builders, then hosts, secures and updates it for one simple monthly fee. You never touch the code: you ask for a change and we make it as part of the plan. You get the speed, security and clean structure of a custom-coded site without having to manage any of it. See [our plans](/#pricing) or [get a free quote](/#getquote)." },
    ],
    faqs: [
      { q: "Is WordPress bad for small business websites?", a: "No, WordPress is a capable tool. But for a typical small-business marketing site it often adds weight and maintenance you do not need. A custom-coded site is usually faster and lower-maintenance for that purpose." },
      { q: "Why are custom-coded websites faster than WordPress?", a: "A custom-coded site contains only the code your site needs, with no theme or plugin overhead. There is less to download and run, which improves load times, especially on mobile." },
      { q: "Can I edit a custom-coded website myself?", a: "Usually not directly, which is why done-for-you services include the changes. With All Done Sites you request a change and the team makes it for you as part of the monthly plan." },
      { q: "Is WordPress cheaper than a custom-coded site?", a: "WordPress software is free, but the real costs are hosting, premium plugins or themes, and a developer's time for updates and fixes. Once those are added in, a bundled subscription is often comparable or cheaper." },
      { q: "Does Google prefer custom-coded or WordPress sites?", a: "Google does not favour the technology. It rewards fast, well-structured, secure pages. Clean custom code makes those easier to achieve, but a well-built WordPress site can also rank well." },
    ],
    relatedSlugs: ["how-much-does-a-website-cost-in-south-africa", "whats-included-in-website-hosting-and-maintenance"],
  },

  {
    slug: "website-vs-facebook-page",
    title: "Do you need a website if you already have a Facebook page?",
    metaTitle: "Website vs Facebook Page: Do You Need Both? | All Done Sites",
    description:
      "A Facebook page helps, but it is not a website. Here is what you do not control on social media and why a website still matters in South Africa.",
    summary:
      "A Facebook page builds an audience, but a website gives you ownership, credibility and search visibility. Use both together.",
    category: "Getting started",
    readMins: 5,
    intro:
      "A Facebook page is useful, but it is not a substitute for a website. You do not own your social media presence, it ranks poorly in Google and AI answers, and it cannot do everything a real website can. The strongest setup is a website as your hub, with social media and a Google Business Profile feeding into it.",
    blocks: [
      { h2: "The short answer" },
      { p: "Yes, a Facebook page is genuinely valuable. It helps you reach people, share updates and chat to customers. But it works best alongside a website, not instead of one. A website is the part of your online presence that you actually own and control, and it does jobs a social page simply cannot." },
      { h2: "What you do not control on a Facebook page" },
      { p: "A social media page lives on someone else's platform. That comes with real limits that many small business owners only notice when something goes wrong." },
      { ul: [
        "Reach: how many people see your posts is decided by the platform's algorithm, not by you. Organic reach for business pages has generally declined over the years.",
        "Account safety: pages can be restricted, hacked or suspended, sometimes by mistake, and getting support can be slow.",
        "Ownership: you do not own your followers or your content in the way you own a website and a domain.",
        "Rules change: features, layout and what you are allowed to post can change at any time, with no say from you.",
      ] },
      { p: "None of this means you should leave social media. It means you should not let it be the only thing holding up your business online." },
      { h2: "Why a website builds more trust" },
      { p: "When someone is deciding whether to spend money with you, they often look for a proper website. A site at your own .co.za or .com domain signals that you are an established, serious business. It is your space, set up the way you want, without competing posts, adverts or distractions next to your offer." },
      { p: "A website also lets you tell your full story: your services, prices, photos of past work, customer reviews and clear contact details, all in one tidy place that loads in seconds." },
      { h2: "Websites win on Google and in AI answers" },
      { p: "Most buying journeys still start with a search. Social pages rarely rank well for the things people type into Google, like 'plumber in Durban' or 'wedding cakes Pretoria'. A website built for search gives you a real chance to be found." },
      { p: "The same is increasingly true for AI assistants. Tools like ChatGPT, Claude, Perplexity and Google's AI overviews tend to read and cite structured website content, not Facebook posts. At [All Done Sites](/#how) we structure every site so it can be found and cited by both Google and AI assistants, which is hard to do on a social page you do not control." },
      { h2: "What a website can do that a Facebook page cannot" },
      { p: "Beyond visibility and trust, a website unlocks practical tools that a social page does not offer in the same way." },
      { ul: [
        "Professional email at your own domain, such as hello@yourbusiness.co.za, instead of a free Gmail address.",
        "Online bookings, enquiry forms and quote requests that come straight to you.",
        "Payments and shopping, if you sell products or take deposits.",
        "Full control of design, content, layout and the customer journey.",
        "Proper SEO so the right pages show up for the right searches.",
        "Data handled with POPIA in mind, on hosting you can rely on.",
      ] },
      { callout: { title: "Website, social and Google working together", body: "Think of your website as the hub. Your Facebook or Instagram page builds an audience and points people to the site. Your Google Business Profile helps you show up in local map searches and sends people there too. The website is where they read the detail, trust you, and get in touch or buy." } },
      { h2: "How to set it up the simple way" },
      { p: "You do not need to choose between social media and a website. Keep posting where your customers already are, and add a website as the home base that ties everything together." },
      { ol: [
        "Keep your Facebook, Instagram or WhatsApp Business active for reach and conversations.",
        "Claim and complete your free Google Business Profile for local search.",
        "Set up a website at your own domain as the hub, with your services, prices and contact details.",
        "Link all of them to each other so customers can move between them easily.",
      ] },
      { p: "If the website part feels like the hard bit, that is exactly what we handle. [All Done Sites](/#pricing) designs, builds, hosts and updates your site for one simple monthly fee, with no big upfront cost, so you can focus on running your business." },
      { h2: "So do you still need a website?" },
      { p: "If you want to be found on Google and in AI answers, look credible to new customers, own your online presence, and offer bookings, payments or professional email, then yes. A Facebook page is a great team player, but the website is the part you control and the place where serious buyers decide to trust you." },
    ],
    faqs: [
      { q: "Can a Facebook page replace a website?", a: "Not really. A Facebook page is great for reach and conversations, but you do not own it, it ranks poorly in search, and it cannot offer your own domain email, bookings or full design control. It works best alongside a website, not instead of one." },
      { q: "Will a website show up on Google better than my Facebook page?", a: "Usually, yes. A website built for search has a far better chance of ranking for terms like your service plus your town. Social pages rarely rank well for those searches." },
      { q: "Do I still need a Google Business Profile if I have a website?", a: "Yes. A Google Business Profile helps you appear in local map results and reviews, and it points people to your website. The two work together rather than competing." },
      { q: "Is a website worth it for a very small business?", a: "For most small businesses, yes. With a monthly plan from R799, you get a professional, secure site without a large upfront cost, plus hosting, updates and domain email included." },
      { q: "How long does it take to get a website if I only have social media now?", a: "Typically 7 to 14 days. You can keep using your social pages as normal while we design and build the site, then link everything together once it is live." },
    ],
    relatedSlugs: ["how-to-get-a-website-for-your-small-business", "how-much-does-a-website-cost-in-south-africa"],
  },

  {
    slug: "monthly-vs-upfront-website-cost",
    title: "Monthly vs upfront: which is better for a small business website?",
    metaTitle: "Monthly vs Upfront Website Cost | All Done Sites",
    description:
      "A fair comparison of paying monthly versus a one-off upfront cost for a small business website in South Africa, including cash flow, ownership and total cost.",
    summary:
      "Monthly subscription or one-off upfront build? A balanced look at cash flow, maintenance, ownership and total cost for SA small businesses.",
    category: "Pricing",
    readMins: 5,
    intro:
      "There is no single right answer. A monthly subscription spreads the cost, includes ongoing hosting and maintenance, and suits owners who want a working site without a big lump sum. A one-off upfront build can work out cheaper over many years, but only if you have the capital and the skills to keep the site running yourself.",
    blocks: [
      { h2: "The two models in plain terms" },
      { p: "Most small business websites are paid for in one of two ways. An upfront build is a once-off fee you pay a designer or agency to create the site. A monthly model spreads the cost into a subscription that usually covers building, hosting and keeping the site working over time." },
      { p: "The price you see is not the whole story. A website is not a once-off purchase like a printer. It is closer to a vehicle. The build is the easy part. Keeping it secure, updated and online is the ongoing reality most people forget to budget for." },
      { h2: "Cash flow and risk for a small business" },
      { p: "For most South African small businesses, cash flow is the real constraint. A typical custom upfront build can run from a few thousand rand to well over R20,000, depending on size and who builds it. Paying that in one go can be hard when the money could go towards stock, staff or marketing." },
      { p: "A monthly fee turns a large unknown into a predictable line item. You spread the cost, you keep more cash in the business early on, and if the relationship is not working you can stop. The risk with upfront is paying in full before you know whether the site delivers. The risk with monthly is that you keep paying for as long as you want the service running." },
      { h2: "What each model usually includes and excludes" },
      { p: "This is where people get caught out. An upfront price often covers only the build. A monthly price more often bundles the running costs together." },
      { p: "A typical one-off upfront build usually includes:" },
      { ul: [
        "Design and the initial build of the pages",
        "Setup of your domain in many cases",
        "A finished site handed over to you",
      ] },
      { p: "What it often excludes, and you pay separately for:" },
      { ul: [
        "Hosting, the SSL security certificate and backups",
        "Software updates, security patches and bug fixes",
        "Content changes, new pages and ongoing SEO",
        "Professional email at your domain",
      ] },
      { p: "A monthly model is built the other way around. With [our plans](/#pricing) the build is free to start, and design, fast secure hosting, SSL, automated backups, professional email, monthly content updates and SEO are all included in one fee. You can see exactly [what hosting and maintenance covers](/guides/whats-included-in-website-hosting-and-maintenance) so there are no surprises later." },
      { h2: "Total cost of ownership over a few years" },
      { p: "Compare the true cost over three to five years, not just day one. With an upfront build, add hosting, an SSL certificate, backups, plugin and security updates, and a developer's time whenever something needs changing. Those costs are real whether you pay them in cash or in your own hours." },
      { p: "With a monthly plan, everything is in the fee. Launch is R799 a month, Business is R2,200 a month and Premium is R3,600 a month. Over a few years a do-it-yourself upfront site that you maintain well can be cheaper. The catch is the words maintain well. Most owners do not, and that changes the maths." },
      { callout: { title: "The hidden cost of a neglected site", body: "An upfront site that is never maintained slowly breaks. Contact forms stop sending, software goes out of date, security holes open up, and search rankings slide. A cheap build that costs you customers two years later is not cheap. Budget for upkeep from the start, whoever does it." } },
      { h2: "Who owns the site?" },
      { p: "Ownership matters and it is a fair concern with any subscription. With a one-off build you usually own the files once you have paid, though you still need somewhere to host them and someone to maintain them." },
      { p: "With All Done Sites the difference is timing. After the first 12 months the site's code and files can be transferred to you, so you can keep it or move it elsewhere. While you stay subscribed, hosting, maintenance and updates are handled for you, so you are not locked out of your own site." },
      { h2: "Who each model suits best" },
      { p: "Choose an upfront build if you have the capital available now, you have in-house technical skills or a trusted developer on call, and you are happy to manage hosting, security and updates yourself. For a business with those resources, owning the code outright from day one can be the better long-term choice." },
      { p: "Choose a monthly model if you want a professional site without a big lump sum, you would rather not deal with the technical upkeep, and you value a predictable cost with someone handling the maintenance. For most first-time website buyers, that is the calmer path." },
      { h2: "How to decide" },
      { ol: [
        "Work out what you can comfortably pay upfront without straining cash flow.",
        "List who will handle hosting, security and updates, and what their time costs.",
        "Add the running costs to any upfront quote so you compare like for like over three years.",
        "Decide how much you want to manage yourself versus have handled for you.",
      ] },
      { p: "If you are still unsure, the honest answer depends on your numbers and your appetite for upkeep. You can [request a quote](/#getquote) and we will give you a straight comparison for your situation, with no pressure to sign up." },
    ],
    faqs: [
      { q: "Is monthly more expensive than paying upfront?", a: "It can be over many years if you maintain an upfront site well yourself. But once you add hosting, security, backups and updates to an upfront build, the gap narrows. A monthly fee bundles all of those into one predictable cost." },
      { q: "Do I own my website on a monthly plan?", a: "Yes, in time. With All Done Sites the site's code and files can be transferred to you after the first 12 months, so you can keep it or move it. While subscribed, the hosting and maintenance are handled for you." },
      { q: "What happens to an upfront site if I never maintain it?", a: "It slowly degrades. Software goes out of date, security risks grow, forms can stop working and search rankings drop. Upkeep is not optional, so budget for it whichever model you choose." },
      { q: "Can I switch from monthly to owning the site later?", a: "Yes. After 12 months the code and files can be transferred to you, so you are free to take the site elsewhere or host it yourself if your needs change." },
      { q: "Which model is better for a brand new business?", a: "For most new businesses with tight cash flow and no in-house tech skills, a monthly plan is the lower-risk start. An upfront build suits you better if you have the capital and the skills to maintain it." },
    ],
    relatedSlugs: ["how-much-does-a-website-cost-in-south-africa", "whats-included-in-website-hosting-and-maintenance"],
  },

  {
    slug: "how-to-get-a-website-for-your-small-business",
    title: "How to get a website for your South African small business",
    metaTitle: "How to Get a Website for Your SA Small Business | All Done Sites",
    description:
      "A plain, practical step-by-step guide to getting your first small business website in South Africa: domain, content, build options, launch and upkeep.",
    summary:
      "A step-by-step guide to getting your first small business website in SA, from .co.za domain to launch and keeping it found on Google and AI.",
    category: "Getting started",
    readMins: 6,
    intro:
      "Getting a website for your South African small business comes down to a few clear steps: decide what the site must do, sort out a domain and professional email, gather your content, then choose how to build it. You can do it yourself, hire a freelancer, or use a done-for-you service. This guide walks through each step so you can pick the route that suits your time and budget.",
    blocks: [
      { h2: "Step 1: Clarify your goal and what the site must do" },
      { p: "Before anything else, decide what you want the site to achieve. A clear goal shapes every decision that follows, from the pages you need to how you measure success." },
      { p: "Most small business sites do one of a few jobs: bring in enquiries or bookings, show your work or menu, sell products, or simply give people a credible place to find your details. Pick the main one." },
      { ul: [
        "Write down the single most important action a visitor should take, such as phoning you, sending an enquiry, or placing an order.",
        "List the pages you actually need. Many small businesses launch well with a home page, an about page, a services or products page, and a contact page.",
        "Note who your customers are and what they need to see to trust you, such as photos of past work, prices, or reviews.",
      ] },
      { h2: "Step 2: Sort out a domain and professional email" },
      { p: "Your domain is your address on the web, like yourbusiness.co.za. In South Africa, a .co.za domain is the common choice and signals you are a local business. You register one through an accredited registrar; the .co.za namespace is run by the ZA Central Registry (ZACR)." },
      { p: "A professional email at your own domain, such as hello@yourbusiness.co.za, looks far more credible than a free Gmail or Yahoo address. Set this up alongside the domain. If you would rather not manage registrars and email yourself, a done-for-you service can handle the domain and professional email for you." },
      { callout: { title: "Pick the right domain name", body: "Keep it short, easy to spell and easy to say over the phone. Avoid hyphens and numbers where you can. Check that the matching social media handles are free too, so your business looks consistent everywhere." } },
      { h2: "Step 3: Gather your content" },
      { p: "Content is the part that takes most people by surprise. The build is quick once the words and pictures are ready, so gathering them early saves time later." },
      { ol: [
        "Write the key text: a short description of your business, your main services or products, your prices or price ranges, and your contact details and area you serve.",
        "Collect photos: clear images of your work, products, premises or team. Photos taken on a recent phone are usually fine if the lighting is good.",
        "Find your logo and brand colours. If you do not have a logo yet, note the colours and feel you want so the design can stay consistent.",
        "Gather proof: a few genuine customer reviews or testimonials, and any certifications, memberships or awards.",
      ] },
      { h2: "Step 4: Choose how to build it" },
      { p: "There are three common routes, and the right one depends on your time, budget and confidence. Here is an honest look at each." },
      { p: "DIY website builder (such as Wix, Squarespace or WordPress): cheapest in cash terms and you keep full control. The trade-off is time. Expect to spend many hours learning the tools, and you remain responsible for hosting, security, backups and updates forever." },
      { p: "Hire a freelancer or agency: you get a custom build and expert input. Costs vary widely and are usually a larger upfront fee. Quality and aftercare differ a lot between providers, so check past work and ask clearly who handles updates once the site is live." },
      { p: "Done-for-you service: someone designs, builds, hosts and maintains the site for you, often for a monthly fee rather than a big upfront cost. You save time and avoid the technical side, with less hands-on control than DIY. [All Done Sites](/#how) works this way, and its sites are custom hand-coded rather than built on WordPress or page builders, which keeps them fast and secure (see [custom-coded vs WordPress](/guides/custom-coded-vs-wordpress-website)). Compare the [monthly versus upfront approaches](/guides/monthly-vs-upfront-website-cost) before deciding." },
      { h2: "Step 5: Build and review" },
      { p: "Whichever route you choose, the build turns your goal and content into real pages. If you are doing it yourself, start from a template close to your industry and replace the placeholder text and images with your own." },
      { p: "Review the draft on both a phone and a computer. Most South African visitors will arrive on a phone, so check that text is readable, buttons are easy to tap, and your contact details and main action are obvious. Ask a friend or customer to try it and tell you what is confusing." },
      { h2: "Step 6: Launch" },
      { p: "Launching means pointing your domain at the finished site and making it live. A few things should be in place before you announce it:" },
      { ul: [
        "An SSL certificate so the address shows https and visitors see the site as secure.",
        "Working contact methods: test that enquiry forms arrive and that phone and WhatsApp links open correctly.",
        "A basic privacy notice. Under POPIA, you must tell visitors how you collect and use their personal information if you gather any through forms.",
        "Correct business details everywhere, including your trading name, area served and hours.",
      ] },
      { h2: "Step 7: Keep it maintained and found" },
      { p: "A website is not finished at launch. To stay secure and useful it needs ongoing care, and to bring in customers it needs to be found." },
      { ul: [
        "Maintenance: regular backups, security updates and small content changes such as new prices, photos or services.",
        "Get found on Google: set up a free Google Business Profile, use clear local wording such as your town and services, and keep your details consistent across the web.",
        "Get found by AI: increasingly, people ask AI assistants for recommendations. Clear, well-structured pages that plainly state who you are, what you do and where you operate help your business be cited in those answers too.",
      ] },
      { callout: { title: "How All Done Sites handles the whole thing", body: "We design, build, host, secure and update your site for one simple monthly fee, with no big upfront build cost. We register or connect your .co.za domain, set up professional email, build a mobile-friendly site free to start, and keep it backed up, secure and updated each month. Plans begin at R799 a month. See [our plans](/#pricing) or message us on WhatsApp at +27 82 222 7457." } },
      { p: "Whichever route you pick, the order is the same: clarify the goal, sort the domain and email, gather content, build, review, launch, then maintain. Get those right and you will have a site that earns trust and brings in work." },
    ],
    faqs: [
      { q: "How long does it take to get a small business website?", a: "It depends on the route. A simple DIY build can take a few weekends. A done-for-you service like All Done Sites typically launches in 7 to 14 days once your content is ready." },
      { q: "Do I need a .co.za domain or a .com?", a: "Either works. A .co.za signals you are a South African business and is widely recognised locally, while .com is more international. Many businesses register both and point them to the same site." },
      { q: "What does a small business website cost in South Africa?", a: "It varies by route. DIY builders charge ongoing subscription fees, freelancers often charge a larger upfront fee, and done-for-you plans start from around R799 a month. See our guide on website costs for a fuller breakdown." },
      { q: "Do I need to write all the content myself?", a: "For a DIY build, usually yes. With a done-for-you service, you provide the basic facts about your business and the team can shape them into the finished text and structure for you." },
      { q: "Can I move my website elsewhere later?", a: "Yes. You should always own your domain. With All Done Sites, the site itself can be transferred to you after 12 months if you ever want to take it elsewhere." },
      { q: "Do you build websites on WordPress?", a: "No. All Done Sites builds every website with custom, hand-written code rather than WordPress, Wix or page builders. That keeps sites fast, lightweight and secure, with no plugin bloat, and the team handles any changes for you as part of the monthly plan." },
    ],
    relatedSlugs: ["how-much-does-a-website-cost-in-south-africa", "how-long-does-it-take-to-build-a-website"],
  },

  {
    slug: "how-long-does-it-take-to-build-a-website",
    title: "How long does it take to build a website?",
    metaTitle: "How Long Does It Take to Build a Website? | All Done Sites",
    description:
      "A realistic look at website build times in South Africa: typical ranges by site type, the phases of a build, and what speeds it up or slows it down.",
    summary:
      "Realistic website build timelines by site type, the phases of a build, and the factors that speed things up or slow them down.",
    category: "Process",
    readMins: 5,
    intro:
      "For most small business websites, a realistic build time is 7 to 14 days once you have chosen a provider and are ready to start. A simple one-page site can be ready in under a week, while larger multi-page sites or online shops usually take 2 to 6 weeks. The single biggest factor is how quickly you provide content, photos and feedback.",
    blocks: [
      { h2: "The short answer" },
      { p: "There is no single number, because a corner café website is not the same job as a 40 product online shop. As a rough guide, a one-page site takes a few days to a week, a standard multi-page business site takes 1 to 3 weeks, and an e-commerce site takes 3 to 6 weeks. These ranges assume you are reasonably responsive with content and approvals." },
      { p: "With a done-for-you service like [All Done Sites](/#how), most small business sites go live in 7 to 14 days. We handle the design, build, hosting and security so the work that is left on your side is small and clear." },
      { h2: "Timelines by site type" },
      { p: "Use these as planning ranges, not promises. Complexity, custom features and content readiness all move the numbers." },
      { ul: [
        "One-page site: a few days to one week. Good for a single service, a profile or a launch page.",
        "Multi-page business site: 1 to 3 weeks. Home, about, services, contact and a few extra pages.",
        "E-commerce site: 3 to 6 weeks. Product pages, payments, delivery options and stock all add time.",
        "Larger custom or booking sites: 4 to 8 weeks, depending on the features and integrations involved.",
      ] },
      { h2: "The phases of a build" },
      { p: "Almost every website moves through the same phases. Knowing them helps you see where time goes and where you can help things along." },
      { ol: [
        "Discovery: 1 to 2 days. We learn about your business, your goals and who you serve.",
        "Design: 2 to 4 days. We shape the look, layout and structure, then show you a draft.",
        "Build: 3 to 7 days. The design is turned into a working, responsive website.",
        "Content: runs alongside the build. Your copy, photos, logo and details are added in.",
        "Review: 1 to 3 days. You check the draft and request any changes.",
        "Launch: 1 day. We connect your domain, switch on security and take it live.",
      ] },
      { p: "These phases often overlap. While we build, you can be gathering photos and approving copy, which keeps the whole project moving." },
      { h2: "What speeds it up" },
      { p: "The fastest projects are not the simplest ones, they are the ones where the client is ready. A few things make a real difference:" },
      { ul: [
        "Having your content ready: a short description of your business, your services and your prices.",
        "Good photos of your work, your team or your premises, even decent phone photos help.",
        "Quick, clear feedback when you review the draft, ideally in one consolidated list.",
        "Knowing your goal for the site up front, such as enquiries, bookings or sales.",
        "A registered domain, or letting us help you sort one out early.",
      ] },
      { h2: "What slows it down" },
      { p: "Content is the biggest factor in how long a website takes, far more than the technical build. A site can sit unfinished for weeks simply because the text or photos have not arrived yet." },
      { ul: [
        "Waiting on copy, photos or logos that have not been sent through.",
        "Slow or scattered feedback, with changes coming in a few at a time over many days.",
        "Decisions that keep changing, such as a new layout or a different set of pages midway.",
        "Adding new features once the build is already underway.",
        "Domain or email access that takes time to track down.",
      ] },
      { callout: { title: "Content is the real timeline", body: "If you can prepare your business description, services, prices and a handful of photos before you start, you remove the single biggest cause of delay. Even rough notes give us something to work with and refine." } },
      { h2: "Our done-for-you 7 to 14 day timeline" },
      { p: "All Done Sites is built around getting you live quickly without an upfront build cost. You tell us about your business, we design and build a draft free to start, you review and request changes, and then we launch and look after hosting, security and updates on a simple monthly plan." },
      { p: "Most clients are live within 7 to 14 days. The faster you send content and feedback, the closer you land to the 7 day end. You can see the steps in detail on [how it works](/#how) or compare the [monthly plans](/#pricing) to find the right fit." },
      { h2: "Planning your launch date" },
      { p: "If you have a specific date in mind, such as a market, a season or an event, give yourself a little buffer. Aim to have your content ready a week or two before you want to go live, and start the conversation early. That way a 7 to 14 day build comfortably fits inside your plan." },
    ],
    faqs: [
      { q: "How fast can a website really go live?", a: "A simple one-page site can be live within a few days if your content is ready. For most small business sites we work to a 7 to 14 day timeline, with the faster end depending mostly on how quickly you send content and feedback." },
      { q: "Why does content take so long?", a: "Writing about your own business, choosing photos and agreeing prices often takes longer than people expect. Preparing this before you start, even as rough notes, is the best way to keep your project on track." },
      { q: "Can you build a website faster if I am in a hurry?", a: "Yes, a focused one-page site can move quickly when you are ready with the essentials. Tell us your deadline up front so we can plan the work and let you know what we need from you and when." },
      { q: "Does a bigger site always take longer?", a: "Usually, yes. More pages, an online shop or custom features add build and testing time. The structure and number of pages are a bigger factor than the design itself." },
      { q: "What do I need to have ready before we start?", a: "A short description of your business, your main services or products, your prices, your logo if you have one, and a few photos. The more of this you have ready, the faster your site comes together." },
    ],
    relatedSlugs: ["how-to-get-a-website-for-your-small-business", "whats-included-in-website-hosting-and-maintenance"],
  },

  {
    slug: "whats-included-in-website-hosting-and-maintenance",
    title: "What is included in website hosting and maintenance?",
    metaTitle: "What's Included in Website Hosting & Maintenance | All Done Sites",
    description:
      "A plain-English guide to what website hosting and maintenance cover for South African small businesses, and why ongoing upkeep matters.",
    summary:
      "Hosting keeps your site online and secure. Maintenance keeps it working, updated and found. Here is what each includes.",
    category: "Hosting & maintenance",
    readMins: 5,
    intro:
      "Hosting is the service that keeps your website online, fast and secure so people can reach it any time. Maintenance is the ongoing work that keeps it updated, safe and visible after launch, from software fixes to content edits and search upkeep. Together they turn a website from a once-off build into something that keeps working for your business.",
    blocks: [
      { h2: "What website hosting is" },
      { p: "Hosting is where your website lives. Your pages, images and code sit on a server that is always connected to the internet, so anyone who types your address sees your site. Without hosting, a website is just files on a computer that nobody can reach." },
      { p: "Good hosting does more than store files. It keeps your site online, loads it quickly, and protects it from common attacks. In South Africa, hosting that is resilient to load-shedding matters, because your customers should still find you when the power is out at your premises." },
      { h2: "What hosting usually includes" },
      { ul: [
        "Uptime, meaning your site stays online and reachable around the clock.",
        "An SSL certificate, so the address shows the padlock and data is encrypted.",
        "Fast loading speeds, which help both visitors and search rankings.",
        "Automated backups, so a recent copy of your site can be restored if something breaks.",
        "Server-level security to block common threats and spam.",
        "Email at your own domain, such as you@yourbusiness.co.za, which looks more professional than a free address.",
      ] },
      { h2: "What website maintenance is" },
      { p: "Maintenance is everything that happens after launch to keep the site healthy. A website is not a print brochure. The software it runs on is updated regularly, your business details change, and the things you offer evolve. Maintenance keeps all of that current." },
      { p: "It usually covers two kinds of work. The first is technical upkeep that keeps the site secure and working. The second is content work, such as updating prices, hours, photos or a new service you have added." },
      { h2: "What maintenance usually includes" },
      { ul: [
        "Software and security updates, so known weak points are patched before they are exploited.",
        "Content edits, like changing prices, trading hours, staff or seasonal offers.",
        "Monitoring, so problems are spotted early rather than reported by a frustrated customer.",
        "Fixes when something breaks, such as a broken link, a form that stopped sending, or a layout glitch.",
        "SEO upkeep, keeping titles, descriptions and structure tidy so the site stays findable.",
        "Email and domain admin, including renewals and keeping professional email working.",
      ] },
      { h2: "Why ongoing maintenance matters" },
      { p: "A site left alone tends to drift. The risks build up quietly until they cause a real problem, often at the worst time." },
      { ul: [
        "Security: out-of-date software is the most common way small sites get hacked or defaced.",
        "Speed: pages slow down over time as images and plugins pile up, and slow sites lose visitors.",
        "Uptime: without monitoring, a site can be down for days before anyone notices.",
        "Broken things: forms, links and buttons stop working, and you may never hear about the enquiries you lost.",
        "SEO decay: stale content and technical errors push you down the rankings, so fewer people find you.",
      ] },
      { callout: { title: "Neglect is silent", body: "The expensive part of a neglected site is rarely the fix. It is the customers who quietly gave up because a page was down, slow or broken, and never told you." } },
      { h2: "Managed versus do-it-yourself" },
      { p: "You can host and maintain a site yourself. It means choosing a host, installing updates, taking backups, renewing your .co.za domain, watching for outages and fixing things when they break. It is doable, but it takes time and some technical confidence, and small jobs are easy to put off." },
      { p: "A managed, done-for-you approach hands all of that to someone else for a set monthly fee. You ask for a change, it gets done. The trade-off is the monthly cost against the hours and stress of doing it yourself. For most owners who would rather run their business, managed wins. If you are weighing the money side, see [monthly versus upfront website cost](/guides/monthly-vs-upfront-website-cost)." },
      { h2: "What a monthly done-for-you plan covers" },
      { p: "With All Done Sites, hosting and maintenance come bundled into one simple monthly fee. There is no large upfront build cost. Your site is built free to start, then kept running on a subscription. Every plan includes the same core." },
      { ul: [
        "Design and a mobile-friendly build that works on any phone or laptop.",
        "Fast, secure hosting with SSL and automated backups.",
        "Professional email at your own domain.",
        "Monthly content updates, so your site never goes stale.",
        "SEO, with sites structured to be found and cited by AI assistants like ChatGPT, Claude and Perplexity, not just Google.",
        "POPIA-friendly basics, so your contact forms and data handling start on the right foot.",
      ] },
      { p: "Plans scale with how active your site is. Launch is R799 a month with one small update a month. Business is R2,200 a month with two updates a month. Premium is R3,600 a month with more updates and priority support. There is also a Custom option for larger needs. You can compare them on the [pricing page](/#pricing), and after 12 months the site's code and files can be transferred to you." },
    ],
    faqs: [
      { q: "Do I need both hosting and maintenance?", a: "Hosting is essential, because without it your site is not online. Maintenance is strongly recommended, because it is what keeps a live site secure, fast and accurate over time. A done-for-you plan combines both so you do not have to manage them separately." },
      { q: "What happens if I do not maintain my website?", a: "It usually still works at first, then problems creep in. Software falls out of date and becomes a security risk, pages slow down, links and forms break, and search rankings slip. The damage is often invisible until it costs you customers." },
      { q: "Is my professional email part of hosting?", a: "Email at your own domain is set up and kept running as part of the service. It means addresses like you@yourbusiness.co.za, which look far more professional and trustworthy than a free Gmail or Yahoo address." },
      { q: "Are backups really included?", a: "Yes. Automated backups run regularly, so if something goes wrong a recent copy of your site can be restored quickly. You do not need to remember to do anything." },
      { q: "Can I move my site elsewhere later?", a: "Yes. After 12 months on a plan, the site's code and files can be transferred to you, so you are never locked in. If you have questions, you can reach us on WhatsApp or call +27 82 222 7457, or email hello@alldonesites.com." },
    ],
    relatedSlugs: ["monthly-vs-upfront-website-cost", "how-much-does-a-website-cost-in-south-africa"],
  },
];

export function getGuide(slug: string | undefined): Guide | undefined {
  return guides.find((g) => g.slug === slug);
}

const LINK_RE = /\[([^\]]+)\]\(([^)]+)\)/g;

/** Turn [text](/path) markdown into router <Link>s (internal) or <a>s (external). */
export function renderInline(text: string): ReactNode {
  const out: ReactNode[] = [];
  let last = 0;
  let key = 0;
  let m: RegExpExecArray | null;
  LINK_RE.lastIndex = 0;
  while ((m = LINK_RE.exec(text)) !== null) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const label = m[1];
    const href = m[2];
    if (href.startsWith("/")) {
      out.push(
        <Link key={key++} to={href}>
          {label}
        </Link>
      );
    } else {
      out.push(
        <a key={key++} href={href} target="_blank" rel="noopener noreferrer">
          {label}
        </a>
      );
    }
    last = LINK_RE.lastIndex;
  }
  if (last < text.length) out.push(text.slice(last));
  return out.length === 1 ? out[0] : out;
}

/** Flatten [text](/path) markdown to plain text, for JSON-LD / meta. */
export function stripInline(text: string): string {
  return text.replace(LINK_RE, "$1");
}
