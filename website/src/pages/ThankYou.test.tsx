// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { afterEach, describe, expect, it } from "vitest";
import ThankYou from "./ThankYou";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | undefined;
let host: HTMLDivElement | undefined;
afterEach(() => {
  act(() => root?.unmount());
  host?.remove();
  localStorage.clear();
});

async function fields(url: string) {
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  await act(async () =>
    root!.render(
      <HelmetProvider context={{}}>
        <MemoryRouter initialEntries={[url]}>
          <ThankYou />
        </MemoryRouter>
      </HelmetProvider>,
    ),
  );
  return Object.fromEntries(new FormData(host.querySelector("form")!).entries());
}

describe("the thank-you onboarding form", () => {
  it("sends the paid plan and region from the return URL when this browser has no terms record", async () => {
    const data = await fields("/thank-you?plan=business&region=za?reference=abc");
    expect(data.termsPlan).toBe("business");
    expect(data.termsRegion).toBe("za");
    expect(data).not.toHaveProperty("termsAcceptedAt");
  });

  it("sends the stored terms record when there is one", async () => {
    localStorage.setItem("termsAccepted", JSON.stringify({ acceptedAt: "2026-11-01T00:00:00Z", ip: "1.2.3.4", plan: "premium", region: "us", termsVersion: "3" }));
    const data = await fields("/thank-you?plan=business&region=za");
    expect(data).toMatchObject({ termsAcceptedAt: "2026-11-01T00:00:00Z", termsIP: "1.2.3.4", termsPlan: "premium", termsRegion: "us", termsVersion: "3" });
  });
});
