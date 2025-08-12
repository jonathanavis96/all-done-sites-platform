import { ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, Phone } from "lucide-react";

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `px-3 py-2 rounded-md text-sm font-medium transition-colors ${
    isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
  }`;

export const SiteHeader = () => {
  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <NavLink to="/" className="flex items-center gap-2" aria-label="All Done Sites Home">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-gradient-to-tr from-[hsl(var(--primary))] to-[hsl(var(--accent))] text-primary-foreground font-bold">A</span>
          <span className="text-lg font-semibold">All Done Sites</span>
        </NavLink>
        <nav className="hidden md:flex items-center gap-1">
          <NavLink className={navLinkClass} to="/how-it-works">How It Works</NavLink>
          <NavLink className={navLinkClass} to="/pricing">Pricing</NavLink>
          <NavLink className={navLinkClass} to="/portfolio">Portfolio</NavLink>
          <NavLink className={navLinkClass} to="/faq">FAQ</NavLink>
          <NavLink className={navLinkClass} to="/contact">Contact</NavLink>
        </nav>
        <div className="hidden md:flex items-center gap-3">
          <Button asChild variant="outline">
            <NavLink to="/contact" aria-label="Book a call">
              <Phone className="mr-2" /> Book a Call
            </NavLink>
          </Button>
          <Button asChild variant="hero">
            <NavLink to="/pricing">Get Started</NavLink>
          </Button>
        </div>
        <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open menu">
          <Menu />
        </Button>
      </div>
    </header>
  );
};

export const SiteFooter = () => {
  return (
    <footer className="border-t">
      <div className="container py-10 flex flex-col md:flex-row items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">© {new Date().getFullYear()} All Done Sites. All rights reserved.</p>
        <nav className="flex gap-4 text-sm">
          <NavLink to="/faq" className="text-muted-foreground hover:text-foreground">FAQ</NavLink>
          <NavLink to="/contact" className="text-muted-foreground hover:text-foreground">Contact</NavLink>
        </nav>
      </div>
    </footer>
  );
};

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SiteHeader />
      <main className="flex-1">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
