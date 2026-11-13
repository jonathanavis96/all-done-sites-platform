// src/pages/TrackerRoute.tsx
//
// The Claude usage tracker needs a data snapshot of most of a megabyte, which
// changes with every data refresh. Importing that into the page put it in the
// bundle every visitor to every page downloads, and gave that bundle a new hash on
// each refresh. A separate chunk is not enough, because a chunk's hash feeds into
// the hash of everything that links to it. So the browser build holds no snapshot:
// it fetches the JSON the site already publishes. Only entry-server.tsx imports it.
//
// A plain lazy() would prerender an empty shell, because renderToString does not
// resolve React.lazy. So the page can also be loaded ahead of rendering: the
// prerender does that, and so does the browser before hydrating a tracker page.
// Once loaded it renders synchronously, and client-side navigation uses lazy().
import { ComponentType, lazy } from "react";
import type { UsageJson } from "@/lib/claudeUsage";

type Tracker = ComponentType<{ initial?: UsageJson | null }>;

async function fetchSnapshot(): Promise<UsageJson | null> {
  try {
    const res = await fetch("/data/claude-usage.json");
    return res.ok ? ((await res.json()) as UsageJson) : null;
  } catch {
    return null; // the page has its own failed state
  }
}

let loaded: { Page: Tracker; snapshot: UsageJson | null } | null = null;
let loading: Promise<Tracker> | null = null;

/** The prerender passes `snapshot`, which it imports itself; the browser fetches it. */
export function loadTracker(snapshot?: UsageJson): Promise<Tracker> {
  loading ??= Promise.all([import("./ClaudeUsageTracker"), snapshot ?? fetchSnapshot()]).then(([m, data]) => {
    loaded = { Page: m.default, snapshot: data };
    return m.default;
  });
  return loading;
}

/**
 * Whether the browser's snapshot arrived. Without it the page's first render is the
 * failed state, not the prerendered figures, so hydrating would replace a good
 * prerendered page with "Data temporarily unavailable."
 */
export function trackerSnapshotLoaded(): boolean {
  return loaded?.snapshot != null;
}

const LazyTracker = lazy(() => loadTracker().then((Page) => ({ default: Page })));

export default function TrackerRoute() {
  if (loaded) return <loaded.Page initial={loaded.snapshot} />;
  // Reached only on client-side navigation, where the page's own fetch fills it in.
  return <LazyTracker />;
}
