// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { afterEach, describe, expect, it, vi } from "vitest";
import Index from "./Index";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | undefined;
let host: HTMLDivElement | undefined;
afterEach(() => {
  act(() => root?.unmount());
  host?.remove();
  vi.unstubAllGlobals();
});

describe("the home page FAQ", () => {
  it("says whether each answer is open, and Space toggles without scrolling the page", async () => {
    vi.stubGlobal("fetch", vi.fn(() => new Promise<Response>(() => {})));
    vi.stubGlobal("IntersectionObserver", class { observe() {} unobserve() {} disconnect() {} });
    host = document.createElement("div");
    document.body.append(host);
    root = createRoot(host);
    await act(async () =>
      root!.render(
        <HelmetProvider context={{}}>
          <MemoryRouter>
            <Index />
          </MemoryRouter>
        </HelmetProvider>,
      ),
    );
    const q = host.querySelector<HTMLElement>(".qa .q")!;
    const answer = document.getElementById(q.getAttribute("aria-controls")!)!;
    expect(answer.className).toBe("a");
    const before = q.getAttribute("aria-expanded");
    const space = new KeyboardEvent("keydown", { key: " ", bubbles: true, cancelable: true });
    act(() => {
      q.dispatchEvent(space);
    });
    expect(space.defaultPrevented).toBe(true);
    expect(q.getAttribute("aria-expanded")).toBe(before === "true" ? "false" : "true");
  });
});
