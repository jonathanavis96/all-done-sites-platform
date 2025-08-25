import { ReactNode, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, Phone, X } from "lucide-react";

// Import Drawer components for mobile navigation
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerClose,
  DrawerFooter,
} from "@/components/ui/drawer";

const base = import.meta.env.BASE_URL; // for logo path if you need it later

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `px-3 py-2 rounded-md text-sm font-medium transition-colors ${
    isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
  }`;

export const SiteHeader = () => {
  // State to control the mobile drawer open/close
  const [mobileOpen, setMobileOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <NavLink
          to="/"
          className="flex items-center gap-2"
          aria-label="All Done Sites Home"
        >
          <img
            src={`${base}logo-bimi.svg`}
            alt="All Done Sites Logo"
            className="h-8 w-8 object-contain"
            width={32}
            height={32}
            decoding="async"
          />
          <span className="text-lg font-semibold">All Done Sites</span>
        </NavLink>

        {/* Desktop navigation */}
        <nav className="hidden md:flex items-center gap-1">
          <NavLink className={navLinkClass} to="/how-it-works">How It Works</NavLink>
          <NavLink className={navLinkClass} to="/pricing">Pricing</NavLink>
          <NavLink className={navLinkClass} to="/portfolio">Portfolio</NavLink>
          <NavLink className={navLinkClass} to="/faq">FAQ</NavLink>
          <NavLink className={navLinkClass} to="/contact">Contact</NavLink>
        </nav>

        {/* Desktop actions */}
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

        {/* Mobile menu button */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          onClick={() => setMobileOpen(true)}
        >
          <Menu />
        </Button>
      </div>

      {/* Mobile drawer navigation */}
      <Drawer open={mobileOpen} onOpenChange={setMobileOpen} shouldScaleBackground>
        <DrawerContent>
          <DrawerHeader className="flex items-center justify-between px-4 py-2">
            <DrawerTitle className="text-lg font-semibold">Menu</DrawerTitle>
            <DrawerClose asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMobileOpen(false)}
                aria-label="Close menu"
              >
                <X />
              </Button>
            </DrawerClose>
          </DrawerHeader>
          <nav className="flex flex-col gap-4 px-4 py-6">
            <NavLink className={navLinkClass} to="/how-it-works" onClick={() => setMobileOpen(false)}>
              How It Works
            </NavLink>
            <NavLink className={navLinkClass} to="/pricing" onClick={() => setMobileOpen(false)}>
              Pricing
            </NavLink>
            <NavLink className={navLinkClass} to="/portfolio" onClick={() => setMobileOpen(false)}>
              Portfolio
            </NavLink>
            <NavLink className={navLinkClass} to="/faq" onClick={() => setMobileOpen(false)}>
              FAQ
            </NavLink>
            <NavLink className={navLinkClass} to="/contact" onClick={() => setMobileOpen(false)}>
              Contact
            </NavLink>
          </nav>
          <DrawerFooter className="px-4 pb-6">
            <Button asChild variant="outline" className="w-full mb-3">
              <NavLink to="/contact" aria-label="Book a call" onClick={() => setMobileOpen(false)}>
                <Phone className="mr-2" /> Book a Call
              </NavLink>
            </Button>
            <Button asChild variant="hero" className="w-full" onClick={() => setMobileOpen(false)}>
              <NavLink to="/pricing">Get Started</NavLink>
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </header>
  );
};

export const SiteFooter = () => {
  return (
    <footer className="border-t">
      <div className="container py-10 flex flex-col md:flex-row items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          © {new Date().getFullYear()} All Done Sites. All rights reserved.
        </p>

        {/* Footer nav with policy links */}
        <nav className="flex flex-wrap items-center justify-center gap-2 text-sm">
          <NavLink to="/faq" className="text-muted-foreground hover:text-foreground">
            FAQ
          </NavLink>
          <span className="text-muted-foreground">|</span>
          <NavLink to="/contact" className="text-muted-foreground hover:text-foreground">
            Contact
          </NavLink>
          <span className="text-muted-foreground">|</span>
          <NavLink to="/terms#refund-policy" className="text-muted-foreground hover:text-foreground">
            Refund Policy
          </NavLink>
          <span className="text-muted-foreground">|</span>
          <NavLink to="/terms#cancellation-policy" className="text-muted-foreground hover:text-foreground">
            Cancellation Policy
          </NavLink>
          <span className="text-muted-foreground">|</span>
          <NavLink to="/privacy" className="text-muted-foreground hover:text-foreground">
            Privacy Policy
          </NavLink>
          <span className="text-muted-foreground">|</span>
          <NavLink to="/terms/full" className="text-muted-foreground hover:text-foreground">
            Subscription Agreement
          </NavLink>
        </nav>
      </div>
    </footer>
  );
};

export default function Layout({ children }: { children?: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SiteHeader />
      <main className="flex-1">{children || <Outlet />}</main>
      <SiteFooter />
    </div>
  );
}
