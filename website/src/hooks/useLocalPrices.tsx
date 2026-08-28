// src/hooks/useLocalPrices.tsx
//
// Appends an approximate local-currency figure after every price written in a
// guide or article body, for readers outside the price's own currency.
//
// Nothing here is load-bearing: the country lookup, the rate fetch and the
// storage cache are each wrapped so that a failure leaves the page exactly as
// the server rendered it.

import { useEffect } from "react";
import {
  convert,
  currencyForCountry,
  findPrices,
  formatApprox,
} from "@/lib/currency";

const RATES_URL = "https://open.er-api.com/v6/latest/USD";
const CACHE_KEY = "ads.rates.usd.v1";
const TTL_MS = 24 * 60 * 60 * 1000;

/** Marks a text node we have already annotated, so re-runs stay idempotent. */
const MARK_CLASS = "price-local";

function readCache(): Record<string, number> | null {
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { at: number; rates: Record<string, number> };
    if (!parsed || typeof parsed.at !== "number" || !parsed.rates) return null;
    if (Date.now() - parsed.at > TTL_MS) return null;
    return parsed.rates;
  } catch {
    return null;
  }
}

function writeCache(rates: Record<string, number>): void {
  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), rates }));
  } catch {
    /* private mode, quota, blocked storage — the cache is optional */
  }
}

/** Cloudflare's own trace endpoint, same-origin and free. */
async function detectCountry(signal: AbortSignal): Promise<string | null> {
  try {
    const res = await fetch("/cdn-cgi/trace", { signal });
    if (res.ok) {
      const text = await res.text();
      const loc = /(?:^|\n)loc=([A-Z]{2})/.exec(text);
      if (loc) return loc[1];
    }
  } catch {
    /* fall through to the language hint */
  }
  try {
    const tag = navigator.language || "";
    const region = /-([A-Za-z]{2})\b/.exec(tag);
    if (region) return region[1].toUpperCase();
  } catch {
    /* nothing else to try */
  }
  return null;
}

async function loadRates(signal: AbortSignal): Promise<Record<string, number> | null> {
  const cached = readCache();
  if (cached) return cached;
  try {
    const res = await fetch(RATES_URL, { signal });
    if (!res.ok) return null;
    const data = (await res.json()) as { rates?: Record<string, number> };
    if (!data?.rates || typeof data.rates !== "object") return null;
    writeCache(data.rates);
    return data.rates;
  } catch {
    return null;
  }
}

/** Every text node under root that is safe to rewrite. */
function textNodes(root: HTMLElement): Text[] {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = (node as Text).parentElement;
      if (!parent) return NodeFilter.FILTER_REJECT;
      if (parent.closest(`.${MARK_CLASS}`)) return NodeFilter.FILTER_REJECT;
      const tag = parent.tagName;
      if (tag === "SCRIPT" || tag === "STYLE" || tag === "CODE" || tag === "PRE") {
        return NodeFilter.FILTER_REJECT;
      }
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  const out: Text[] = [];
  let n: Node | null;
  while ((n = walker.nextNode())) out.push(n as Text);
  return out;
}

function annotate(root: HTMLElement, viewer: string, rates: Record<string, number>): void {
  for (const node of textNodes(root)) {
    const text = node.nodeValue ?? "";
    const prices = findPrices(text).filter((p) => p.currency !== viewer);
    if (prices.length === 0) continue;

    const frag = document.createDocumentFragment();
    let cursor = 0;
    let changed = false;

    for (const price of prices) {
      const value = convert(price.amount, price.currency, viewer, rates);
      if (value === null) continue;
      const end = price.index + price.text.length;
      frag.appendChild(document.createTextNode(text.slice(cursor, end)));
      const span = document.createElement("span");
      span.className = MARK_CLASS;
      span.textContent = ` (${formatApprox(value, viewer)})`;
      frag.appendChild(span);
      cursor = end;
      changed = true;
    }

    if (!changed) continue;
    frag.appendChild(document.createTextNode(text.slice(cursor)));
    node.parentNode?.replaceChild(frag, node);
  }
}

/**
 * Annotate prices inside the element matched by `selector` once the content has
 * rendered. `deps` should identify the article, so a route change re-runs it.
 */
export function useLocalPrices(selector = "article.guide-body", key?: string): void {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const controller = new AbortController();
    let cancelled = false;

    (async () => {
      const root = document.querySelector<HTMLElement>(selector);
      if (!root) return;

      const country = await detectCountry(controller.signal);
      if (cancelled) return;
      const viewer = currencyForCountry(country);

      const rates = await loadRates(controller.signal);
      if (cancelled || !rates) return;

      annotate(root, viewer, rates);
    })().catch(() => {
      /* best-effort: leave the page as it was */
    });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [selector, key]);
}

export default useLocalPrices;
