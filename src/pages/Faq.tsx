import Seo from "@/components/Seo";
import { Link } from "react-router-dom";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

// FAQ content. The first two questions remain unchanged, while the rest reflect
// updated policies around ownership, cancellation, hosting, SEO and more. Each
// entry defines a question (`q`) and its answer (`a`). Answers can contain
// markdown-like line breaks for lists.
const faqs = [
  {
    q: "How fast can you launch my website?",
    a: "Most sites are ready in 7–14 days depending on the complexity and how quickly we receive your content.",
  },
  {
    q: "What counts as a 'small content update'?",
    a: "A small update is something like swapping photos, changing text, or adding a new section. Larger redesigns or new pages can be scoped separately.",
  },
  {
    q: "Do I own the website?",
    // Explain ownership without markdown bolding. The client owns their
    // branding, logo and content, but not the underlying website code. If they
    // wish to purchase the site when leaving, pricing is discussed on a case‑by‑case
    // basis. A full stop has been added after “additional work done” per user
    // feedback.
    a: `No — while you own your branding, logo and content, the website design, code, and infrastructure remain our property.\n\nIf you wish to leave our service, we can offer you the option to purchase the website at fair market value plus the cost of any additional work done. Pricing is discussed individually for each site.`,
  },
  {
    q: "Can I cancel anytime?",
    // Describe the minimum commitment and trial period without markdown bolding.
    a: `Our standard agreement is a minimum 6‑month commitment.\n\nIntroductory 1‑month trial (by invitation) → You can cancel after that month without further charges.\nStandard plan → You may cancel early but must still pay the remaining months of your 6‑month term.`,
  },
  {
    q: "What happens if I cancel?",
    a: "We’ll help with a smooth transition of your content and branding. If you choose to purchase the site, we’ll prepare all files and assets for you after payment.",
  },
  {
    q: "What happens if I stop paying the subscription?",
    // Provide a single sentence rather than numbered list so the text wraps
    // correctly on mobile. Remove markdown bolding.
    a: `If payments stop, the site remains online for 30 days, we keep a backup for a further 3 months, and if no payment is received after that period the site is permanently deleted.`,
  },
  {
    q: "Do you handle hosting and maintenance?",
    a: "Yes — hosting, updates, and security are included in your subscription while you are an active client.",
  },
  {
    q: "How much input will I have in the design?",
    a: "The process is collaborative. You’ll receive drafts to review and can request changes before the site goes live.",
  },
  {
    q: "What if I don’t have all my content ready?",
    a: "We can start the design using placeholder text and images until you provide your real content.",
  },
  {
    q: "Do you write content for me?",
    a: "Yes — we offer copywriting as an additional service for an extra fee.",
  },
  {
    q: "Are seasonal promotions or event updates included?",
    a: "No — these are considered larger updates and will be quoted separately.",
  },
  {
    q: "Do you provide SEO optimisation?",
    // Explain SEO levels without markdown bolding.
    a: `Yes — all our plans include SEO, but the level depends on your subscription:\n\nStarter Plan → Basic SEO setup for launch.\nBusiness Plan → Solid SEO optimisation for good search visibility, but without ongoing analytics or performance enhancements.\nPremium Plan → Enhanced SEO with ongoing analytics, reporting and performance improvements.`,
  },
  {
    q: "Can you connect my website to social media?",
    a: "Yes — we can link your site to your social media accounts and embed certain feeds if required.",
  },
  {
    q: "What happens if my site gets hacked or goes down?",
    a: "We have backup, monitoring, and security measures in place. In the rare case something goes wrong, we’ll restore your site and investigate the cause.",
  },
  {
    q: "Do you work with businesses outside South Africa?",
    a: "Yes — we handle international clients and charge in their local currency.",
  },
  {
    q: "Can I move my site to a different host later?",
    // Remove markdown bolding and simplify formatting.
    a: `Yes — you can move hosting at any time after your 6‑month contract ends, provided you have:\n\nPurchased the site’s code/design at fair market value\nPaid for any additional work done`,
  },
];

export default function Faq() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <div className="container py-16">
      <Seo
        title="FAQ | All Done Sites"
        description="Answers about launch timelines, ownership, cancellations, hosting, SEO, and more for our website subscription service."
        jsonLd={jsonLd}
      />
      <header className="max-w-2xl">
        <h1 className="text-3xl font-bold">Frequently asked questions</h1>
        <p className="mt-2 text-muted-foreground">Everything you need to know about how our service works.</p>
      </header>

      <Accordion type="single" collapsible className="mt-10">
        {faqs.map((f, i) => (
          <AccordionItem key={i} value={`item-${i}`}>
            {/* Ensure FAQ headings align left on mobile by adding a text-left class */}
            <AccordionTrigger className="text-left">{f.q}</AccordionTrigger>
            <AccordionContent>
              {/* Preserve newline characters within answers so lists appear on separate lines */}
              <p className="text-muted-foreground whitespace-pre-line">{f.a}</p>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>

      {/* Call‑to‑action asking visitors to reach out if they have unanswered questions */}
      <div className="mt-12 text-muted-foreground">
        Got any other questions?{' '}
        <Link to="/contact" className="underline">
          Ask here and we'll get back to you.
        </Link>
      </div>
    </div>
  );
}
