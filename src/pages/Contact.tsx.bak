import Seo from "@/components/Seo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

export default function Contact() {
  const { toast } = useToast();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    toast({ title: "Thanks!", description: "We’ll get back to you within one business day." });
  }

  return (
    <div className="container py-16" id="contact">
      <Seo
        title="Contact | All Done Sites"
        description="Get in touch to start your hassle-free website subscription. Book a call or send us a message."
      />
      <header className="max-w-2xl">
        <h1 className="text-3xl font-bold">Let’s build your website</h1>
        <p className="mt-2 text-muted-foreground">Tell us about your business and we’ll reach out shortly.</p>
      </header>

      <form onSubmit={onSubmit} className="mt-8 grid md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Name</label>
            <Input placeholder="Jane Doe" required />
          </div>
          <div>
            <label className="text-sm font-medium">Email</label>
            <Input type="email" placeholder="you@business.com" required />
          </div>
          <div>
            <label className="text-sm font-medium">Phone</label>
            <Input type="tel" placeholder="(555) 000-0000" />
          </div>
        </div>
        <div className="flex flex-col">
          <label className="text-sm font-medium">Message</label>
          <Textarea className="min-h-[180px]" placeholder="What do you need?" required />
          <Button type="submit" size="lg" variant="hero" className="mt-4 self-start">Send Message</Button>
        </div>
      </form>
    </div>
  );
}
