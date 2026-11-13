// src/main.tsx (browser entry)
import { createRoot, hydrateRoot } from "react-dom/client"
import { BrowserRouter } from "react-router-dom"
import { HelmetProvider } from "react-helmet-async"
import App from "./App"
import { loadTracker, trackerSnapshotLoaded } from "./pages/TrackerRoute"
import "./index.css"

const root = document.getElementById("root")!

const tree = (
  <HelmetProvider>
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <App />
    </BrowserRouter>
  </HelmetProvider>
)

// If the page was prerendered at build time, DEFER hydration so the static
// content paints first (much faster FCP/LCP on mobile). We hydrate on the first
// user interaction, when the browser goes idle, or after a short timeout —
// whichever comes first. Otherwise (no prerender) mount immediately.
if (root.hasChildNodes()) {
  let hydrated = false
  const evts = ["pointerdown", "keydown", "scroll", "touchstart"] as const
  const cleanup = () => evts.forEach((e) => window.removeEventListener(e, run))
  function run() {
    if (hydrated) return
    hydrated = true
    cleanup()
    // The tracker's code is in its own chunk, and hydrating without it would throw
    // away the prerendered page until it arrived. If the chunk or the data snapshot
    // fails to load, the prerendered page stays up, which beats hydrating into an
    // error or into "Data temporarily unavailable."
    if (window.location.pathname.startsWith("/claude-usage-tracker")) {
      loadTracker().then(
        () => {
          if (trackerSnapshotLoaded()) hydrateRoot(root, tree)
        },
        () => {},
      )
    } else {
      hydrateRoot(root, tree)
    }
  }
  evts.forEach((e) => window.addEventListener(e, run, { passive: true }))
  const ric = (window as unknown as { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => void })
    .requestIdleCallback
  if (ric) ric(run, { timeout: 1800 })
  else setTimeout(run, 1200)
} else {
  createRoot(root).render(tree)
}
