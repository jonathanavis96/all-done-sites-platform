// @vitest-environment jsdom
//
// The tracker page mounted in a browser-like DOM, for behaviour the prerender tests cannot see:
// what happens after the data refresh lands, and how the info tips open and close.
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { afterEach, describe, expect, it, vi } from "vitest";
import ClaudeUsageTracker from "./ClaudeUsageTracker";
import type { SpeedBlock, UsageJson } from "@/lib/claudeUsage";
import live0928 from "@/lib/__fixtures__/claude-usage-live-2026-09-28.json";
import speedBlock from "@/lib/__fixtures__/claude-usage-speed-block.json";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const data = (): UsageJson => ({ ...(structuredClone(live0928) as unknown as UsageJson), speed: speedBlock as unknown as SpeedBlock });

let root: Root | undefined;
let host: HTMLDivElement | undefined;

async function mount(j: UsageJson) {
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  await act(async () =>
    root!.render(
      <HelmetProvider context={{}}>
        <MemoryRouter>
          <ClaudeUsageTracker initial={j} initialPlan="max20" />
        </MemoryRouter>
      </HelmetProvider>,
    ),
  );
  return host;
}

afterEach(() => {
  act(() => root?.unmount());
  host?.remove();
  vi.unstubAllGlobals();
});

describe("the data refresh after mount", () => {
  it("keeps a model the visitor picked before the refresh landed", async () => {
    let land: (r: Response) => void = () => {};
    vi.stubGlobal("fetch", vi.fn(() => new Promise<Response>((resolve) => (land = resolve))));
    const j = data();
    const el = await mount(j);
    const select = el.querySelector<HTMLSelectElement>('select[aria-label="Model"]')!;
    const other = [...select.options].map((o) => o.value).find((v) => v !== select.value)!;
    expect(other).toBeTruthy();
    await act(async () => {
      select.value = other;
      select.dispatchEvent(new Event("change", { bubbles: true }));
    });
    expect(select.value).toBe(other);
    await act(async () => {
      land(new Response(JSON.stringify(j), { status: 200 }));
    });
    expect(el.querySelector<HTMLSelectElement>('select[aria-label="Model"]')!.value).toBe(other);
  });
});

describe("an info tip", () => {
  it("closes on a second tap and on Escape, even while focused, and says so in aria-expanded", async () => {
    vi.stubGlobal("fetch", vi.fn(() => new Promise<Response>(() => {})));
    const el = await mount(data());
    const btn = el.querySelector<HTMLButtonElement>(".info-tip-btn")!;
    const tip = btn.closest(".info-tip")!;
    await act(async () => {
      btn.focus();
      btn.click();
    });
    expect(tip.getAttribute("data-open")).toBe("true");
    expect(btn.getAttribute("aria-expanded")).toBe("true");
    await act(async () => btn.click());
    expect(tip.hasAttribute("data-open")).toBe(false);
    expect(tip.getAttribute("data-dismissed")).toBe("true");
    expect(btn.getAttribute("aria-expanded")).toBe("false");
    await act(async () => btn.click());
    expect(tip.getAttribute("data-open")).toBe("true");
    await act(async () => {
      btn.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    });
    expect(tip.getAttribute("data-dismissed")).toBe("true");
    expect(btn.getAttribute("aria-expanded")).toBe("false");
  });
});
