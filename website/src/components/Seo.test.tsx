// @vitest-environment jsdom
import { renderToString } from "react-dom/server";
import { HelmetProvider, type HelmetServerState } from "react-helmet-async";
import { describe, expect, it } from "vitest";
import Seo from "./Seo";

// Server mode, so the provider fills `context` even though jsdom gives Seo a window to read.
HelmetProvider.canUseDOM = false;

function head(ui: React.ReactNode) {
  const context: { helmet?: HelmetServerState } = {};
  renderToString(<HelmetProvider context={context}>{ui}</HelmetProvider>);
  return `${context.helmet!.link.toString()}${context.helmet!.meta.toString()}`;
}

describe("Seo's computed canonical", () => {
  it("leaves out the #fragment and names the production host, as the static shell does", () => {
    window.history.replaceState(null, "", "/privacy/?utm_source=x#cookies");
    const html = head(<Seo title="Privacy" description="d" />);
    expect(html).toContain('rel="canonical" href="https://alldonesites.com/privacy/"');
    expect(html).toContain('property="og:url" content="https://alldonesites.com/privacy/"');
    expect(html).not.toContain("#cookies");
    expect(html).not.toMatch(/(canonical|og:url)"[^>]*localhost/);
  });
});

describe("Seo's locale", () => {
  it("sets <html lang> while a localised page is mounted and puts the site default back after", async () => {
    const { act } = await import("react");
    const { createRoot } = await import("react-dom/client");
    (globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    document.documentElement.lang = "en";
    const host = document.createElement("div");
    document.body.append(host);
    const root = createRoot(host);
    await act(async () =>
      root.render(
        <HelmetProvider context={{}}>
          <Seo title="t" description="d" locale="en-GB" />
        </HelmetProvider>,
      ),
    );
    expect(document.documentElement.lang).toBe("en-GB");
    await act(async () => root.unmount());
    expect(document.documentElement.lang).toBe("en");
    host.remove();
  });

  it("emits og:locale in Open Graph form only when given", () => {
    expect(head(<Seo title="t" description="d" locale="en-US" />)).toContain(
      'property="og:locale" content="en_US"',
    );
    expect(head(<Seo title="t" description="d" />)).not.toContain("og:locale");
  });
});
