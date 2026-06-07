// src/App.tsx
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Routes, Route, Navigate } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";

import Layout from "@/components/layout/Layout";
import { ScrollToHash } from "@/components/redesign/RedesignChrome";
import Index from "./pages/Index";
import ContactEnterprise from "./pages/ContactEnterprise";
import NotFound from "./pages/NotFound";
import ThankYou from "./pages/ThankYou";
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
          <ScrollToHash />
          <Layout>
            <Routes>
              <Route path="/" element={<Index />} />

              {/* The old standalone pages are now sections on the homepage:
                  redirect their URLs to the matching homepage anchors. */}
              <Route path="/how-it-works" element={<Navigate to="/#how" replace />} />
              <Route path="/pricing" element={<Navigate to="/#pricing" replace />} />
              <Route path="/portfolio" element={<Navigate to="/#pf" replace />} />
              <Route path="/faq" element={<Navigate to="/#faq" replace />} />
              <Route path="/contact" element={<Navigate to="/#getquote" replace />} />

              {/* Redesigned standalone pages */}
              <Route path="/contact-enterprise" element={<ContactEnterprise />} />
              <Route path="/thank-you" element={<ThankYou />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/terms/full" element={<TermsFull />} />
              <Route path="/privacy" element={<Privacy />} />

              {/* The /new preview path is retired post-cutover; send it home. */}
              <Route path="/new/*" element={<Navigate to="/" replace />} />

              {/* Catch-all */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Layout>
        </HelmetProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}
