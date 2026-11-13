// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RedesignNav, ScrollToHash } from "./RedesignChrome";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | undefined;
let host: HTMLDivElement | undefined;

async function mount(ui: React.ReactNode) {
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  await act(async () => root!.render(ui));
  return host;
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  act(() => root?.unmount());
  host?.remove();
  document.body.innerHTML = "";
  vi.useRealTimers();
  Object.defineProperty(window, "scrollY", { value: 0, configurable: true });
});

function target(id: string) {
  const el = document.createElement("section");
  el.id = id;
  el.scrollIntoView = vi.fn();
  document.body.append(el);
  return el;
}

describe("ScrollToHash", () => {
  it("finds a fragment that is not a valid CSS selector, instead of throwing", async () => {
    const el = target("1-step");
    await mount(
      <MemoryRouter initialEntries={["/#1-step"]}>
        <ScrollToHash />
      </MemoryRouter>,
    );
    expect(() => act(() => vi.advanceTimersByTime(100))).not.toThrow();
    expect(el.scrollIntoView).toHaveBeenCalled();
  });

  it("leaves a page the visitor has already scrolled when it first runs, as hydration does", async () => {
    const el = target("pricing");
    Object.defineProperty(window, "scrollY", { value: 900, configurable: true });
    await mount(
      <MemoryRouter initialEntries={["/#pricing"]}>
        <ScrollToHash />
      </MemoryRouter>,
    );
    act(() => vi.advanceTimersByTime(100));
    expect(el.scrollIntoView).not.toHaveBeenCalled();
  });
});

describe("the logo link", () => {
  it("leaves a modified click to the browser and handles a plain one", async () => {
    const el = await mount(
      <MemoryRouter initialEntries={["/guides/"]}>
        <RedesignNav />
      </MemoryRouter>,
    );
    const brand = el.querySelector<HTMLAnchorElement>("a.brand")!;
    const click = (init: MouseEventInit) => {
      const e = new MouseEvent("click", { bubbles: true, cancelable: true, button: 0, ...init });
      act(() => {
        brand.dispatchEvent(e);
      });
      return e.defaultPrevented;
    };
    expect(click({ ctrlKey: true })).toBe(false);
    expect(click({ metaKey: true })).toBe(false);
    expect(click({ shiftKey: true })).toBe(false);
    expect(click({})).toBe(true);
  });
});
