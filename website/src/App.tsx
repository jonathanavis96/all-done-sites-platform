// src/App.tsx
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";

import Layout from "@/components/layout/Layout";
import Index from "./pages/Index";
import HowItWorks from "./pages/HowItWorks";
import Pricing from "./pages/Pricing";
import Portfolio from "./pages/Portfolio";
import Faq from "./pages/Faq";
import Contact from "./pages/Contact";
import ContactEnterprise from "./pages/ContactEnterprise";
import NotFound from "./pages/NotFound";
import ThankYou from "./pages/ThankYou";

// ⬇️ New pages
import Terms from "./pages/Terms";
import TermsFull from "./pages/TermsFull";
import Privacy from "./pages/Privacy";

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <HelmetProvider>
          <Layout>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/how-it-works" element={<HowItWorks />} />
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/portfolio" element={<Portfolio />} />
              <Route path="/faq" element={<Faq />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/contact-enterprise" element={<ContactEnterprise />} />
              <Route path="/thank-you" element={<ThankYou />} />

              {/* Terms pages */}
              <Route path="/terms" element={<Terms />} />
              <Route path="/terms/full" element={<TermsFull />} />
              <Route path="/privacy" element={<Privacy />} />

              {/* Catch-all */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Layout>
        </HelmetProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}
