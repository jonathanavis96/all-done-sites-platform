import Seo from "@/components/Seo";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

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
    a: "Yes, you own your content and branding. While you subscribe, we manage hosting and maintenance for you.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Absolutely. Your subscription is month-to-month. We’ll help with a smooth handoff if you choose to move hosting.",
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
        description="Answers about turnaround time, updates, ownership, and cancellations for our website subscription service."
        jsonLd={jsonLd}
      />
      <header className="max-w-2xl">
        <h1 className="text-3xl font-bold">Frequently asked questions</h1>
        <p className="mt-2 text-muted-foreground">Everything you need to know about how our service works.</p>
      </header>

      <Accordion type="single" collapsible className="mt-10">
        {faqs.map((f, i) => (
          <AccordionItem key={i} value={`item-${i}`}>
            <AccordionTrigger>{f.q}</AccordionTrigger>
            <AccordionContent>
              <p className="text-muted-foreground">{f.a}</p>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
