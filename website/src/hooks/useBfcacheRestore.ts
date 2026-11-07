import { useEffect, useRef } from "react";

/**
 * Runs `onRestore` when the browser brings this page back from its back/forward
 * cache (a `pageshow` with `persisted` set). A restored page keeps its React state
 * exactly as it was when the visitor left, so anything that was mid-flight at that
 * moment, such as a "Redirecting…" button, is still frozen and has to be reset.
 */
export function useBfcacheRestore(onRestore: () => void): void {
  const latest = useRef(onRestore);
  latest.current = onRestore;
  useEffect(() => {
    const handler = (e: PageTransitionEvent) => {
      if (e.persisted) latest.current();
    };
    window.addEventListener("pageshow", handler);
    return () => window.removeEventListener("pageshow", handler);
  }, []);
}
