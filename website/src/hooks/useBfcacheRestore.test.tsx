// @vitest-environment jsdom
//
// A customer who goes back from Paystack can get the page from the browser's
// back/forward cache with its React state frozen as it was when they left. The
// hook is how the checkout pop-up finds out and un-freezes itself.
import { act, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useBfcacheRestore } from "./useBfcacheRestore";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function Probe() {
  const [redirecting, setRedirecting] = useState(true);
  useBfcacheRestore(() => setRedirecting(false));
  return <p>{redirecting ? "Redirecting…" : "Ready"}</p>;
}

let root: Root | undefined;
let host: HTMLDivElement | undefined;

function pageshow(persisted: boolean) {
  const e = new Event("pageshow");
  Object.defineProperty(e, "persisted", { value: persisted });
  act(() => {
    window.dispatchEvent(e);
  });
}

async function mount() {
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  await act(async () => root!.render(<Probe />));
  return host;
}

afterEach(() => {
  act(() => root?.unmount());
  host?.remove();
});

describe("useBfcacheRestore", () => {
  it("runs the callback when the page comes back from the back/forward cache", async () => {
    const el = await mount();
    expect(el.textContent).toBe("Redirecting…");
    pageshow(true);
    expect(el.textContent).toBe("Ready");
  });

  it("ignores an ordinary page show, which has fresh state anyway", async () => {
    const el = await mount();
    pageshow(false);
    expect(el.textContent).toBe("Redirecting…");
  });

  it("stops listening when the component unmounts", async () => {
    const remove = vi.spyOn(window, "removeEventListener");
    await mount();
    act(() => root!.unmount());
    expect(remove).toHaveBeenCalledWith("pageshow", expect.any(Function));
    remove.mockRestore();
  });
});
