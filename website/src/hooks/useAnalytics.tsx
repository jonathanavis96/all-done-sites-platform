import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { contactMethod } from "@/lib/site";

declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
  }
}

export function useAnalytics() {
  const location = useLocation();
  // gtag('config') in index.html already sends the landing page's page_view, so only the
  // in-app navigations after it are sent from here; sending on mount too counted it twice.
  const landed = useRef(false);

  useEffect(() => {
    if (!landed.current) {
      landed.current = true;
      return;
    }
    if (window.gtag) {
      window.gtag("event", "page_view", {
        page_path: location.pathname + location.search,
        page_location: window.location.href,
        page_title: document.title,
      });
    }
  }, [location]);

  // Quote forms are not the only way in: without this, a lead who taps WhatsApp,
  // call or email never shows up in GA. Delegated so every such link on every
  // page counts, including ones added later.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const link = (e.target as Element | null)?.closest?.("a[href]");
      const method = link ? contactMethod(link.getAttribute("href") ?? "") : null;
      if (method && window.gtag) window.gtag("event", "contact_click", { method });
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);
}
