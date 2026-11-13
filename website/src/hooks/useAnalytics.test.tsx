// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter, useNavigate } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useAnalytics } from "./useAnalytics";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let go: (to: string) => void = () => {};
function Probe() {
  useAnalytics();
  go = useNavigate();
  return null;
}

let root: Root | undefined;
afterEach(() => {
  act(() => root?.unmount());
  delete window.gtag;
});

describe("useAnalytics", () => {
  it("leaves the landing page_view to gtag('config') and sends one per navigation after it", async () => {
    const gtag = vi.fn();
    window.gtag = gtag;
    root = createRoot(document.createElement("div"));
    await act(async () =>
      root!.render(
        <MemoryRouter initialEntries={["/"]}>
          <Probe />
        </MemoryRouter>,
      ),
    );
    const views = () => gtag.mock.calls.filter((c) => c[1] === "page_view");
    expect(views()).toHaveLength(0);
    await act(async () => go("/guides/"));
    expect(views()).toHaveLength(1);
    expect(views()[0][2].page_path).toBe("/guides/");
  });
});
