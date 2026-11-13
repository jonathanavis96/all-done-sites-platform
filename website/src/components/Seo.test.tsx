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
