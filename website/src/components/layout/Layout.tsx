import { ReactNode } from "react";
import { Outlet } from "react-router-dom";
import { useAnalytics } from "@/hooks/useAnalytics"; // 👈 GA4 hook

// Every page renders its own nav and footer (see redesign/RedesignChrome.tsx).
export default function Layout({ children }: { children?: ReactNode }) {
  useAnalytics(); // 👈 Hook for GA4 tracking

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <main className="flex-1">{children || <Outlet />}</main>
    </div>
  );
}
