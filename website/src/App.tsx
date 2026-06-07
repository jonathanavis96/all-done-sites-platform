// src/App.tsx
import { Toaster } from "@/components/ui/toaster";
import { Routes, Route, Navigate } from "react-router-dom";
import { lazy, Suspense } from "react";

import Layout from "@/components/layout/Layout";
import { ScrollToHash } from "@/components/redesign/RedesignChrome";
import Index from "./pages/Index"; // homepage stays eager (it's the landing page)

// Secondary pages are code-split so they don't weigh down the homepage bundle.
const ContactEnterprise = lazy(() => import("./pages/ContactEnterprise"));
const NotFound = lazy(() => import("./pages/NotFound"));
const ThankYou = lazy(() => import("./pages/ThankYou"));
const Terms = lazy(() => import("./pages/Terms"));
const TermsFull = lazy(() => import("./pages/TermsFull"));
const Privacy = lazy(() => import("./pages/Privacy"));

// Router and HelmetProvider are supplied by the entry points (main.tsx for the
// browser, entry-server.tsx for build-time prerendering), so App can be rendered
// in both contexts.
export default function App() {
  return (
    <>
      <Toaster />
      <ScrollToHash />
      <Layout>
        <Suspense fallback={null}>
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
        </Suspense>
      </Layout>
    </>
  );
}
