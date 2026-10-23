import { describe, expect, it } from "vitest";
import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import ClaudeUsageTracker from "@/pages/ClaudeUsageTracker";
import FourAccountChart from "./FourAccountChart";
import type { UsageJson } from "@/lib/claudeUsage";
import fourAccountsJson from "@/lib/__fixtures__/claude-usage-four-accounts.json";
import live0928Json from "@/lib/__fixtures__/claude-usage-live-2026-09-28.json";

const fixture = fourAccountsJson as unknown as UsageJson;

const text = (html: string) =>
  html
    .replace(/<!-- -->/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&#x27;/g, "'")
    .replace(/\s+/g, " ");

function page(j: UsageJson): string {
  return renderToString(
    <HelmetProvider context={{}}>
      <MemoryRouter>
        <ClaudeUsageTracker initial={j} initialPlan="max20" />
      </MemoryRouter>
    </HelmetProvider>,
  );
}

describe("FourAccountChart", () => {
  const html = renderToString(<FourAccountChart block={fixture.four_accounts} />);

  it("draws both lines' panels, every account and the shared step in the legend", () => {
    const t = text(html);
    expect(t).toContain("Seven-day meter: credits per 1%");
    expect(t).toContain("Five-hour points per seven-day point");
    for (const n of [1, 2, 3, 4]) expect(t).toContain(`Max account ${n}`);
    expect(t).toContain("Shared step");
    expect(t).toContain("Provisional");
    expect(t).not.toMatch(/\ba[1-4]\b/);
  });

  it("labels each change with its size and interval", () => {
    const t = text(html);
    expect(t).toContain("+18.3%");
    expect(t).toContain("+11.5 to +25.6% · 23 Sep");
    expect(t).toContain("with model rates −5.2 to +47.8%");
    expect(t).toContain("−17.4%");
    expect(t).toContain("−25.7 to −8.1% · 14 Sep");
    expect(t).toContain("−16.2 to −1.6% · 9 Oct · provisional");
  });

  it("counts the accounts the block publishes in its accessible name", () => {
    expect(html).toContain("Four Max accounts, each against its own level now");
    const probe = JSON.parse(JSON.stringify(fixture.four_accounts)) as NonNullable<UsageJson["four_accounts"]>;
    probe.accounts = probe.accounts!.slice(0, 3);
    const three = renderToString(<FourAccountChart block={probe} />);
    expect(three).toContain("Three Max accounts, each against its own level now");
    expect(three).not.toContain("Four Max accounts");
  });

  it("names a candidate change's dashed step in the legend by its state", () => {
    const probe = JSON.parse(JSON.stringify(fixture.four_accounts)) as NonNullable<UsageJson["four_accounts"]>;
    probe.changes!.find((c) => c.at.startsWith("2026-10-09"))!.state = "candidate";
    for (const ls of Object.values(probe.levels!)) for (const l of ls!) if (l.opened_by === "provisional") l.opened_by = "candidate";
    const t = text(renderToString(<FourAccountChart block={probe} />));
    expect(t).toContain("−16.2 to −1.6% · 9 Oct · candidate");
    expect(t).toContain("Candidate");
    expect(t).not.toContain("provisional");
    // The step it drew is dashed.
    expect(renderToString(<FourAccountChart block={probe} />)).toMatch(/stroke-dasharray="7 5"/);
  });

  it("hides the prerendered chart on a phone until it is measured", () => {
    expect(html).toMatch(/class="fa-chart-wrap fa-unmeasured"/);
  });

  it("is drawn at a fixed pixel width, not scaled from a viewBox", () => {
    expect(html).toMatch(/<svg[^>]*class="chart fa-chart"[^>]*width="760"/);
  });

  it("renders nothing without a block", () => {
    expect(renderToString(<FourAccountChart block={undefined} />)).toBe("");
  });
});

describe("the page's four-account section", () => {
  it("sits after the plan charts and before the speed section", () => {
    const html = page(fixture);
    const plan = html.indexOf('id="plan-charts"');
    const four = html.indexOf('id="limit-changes"');
    const speed = html.indexOf('id="speed"');
    expect(plan).toBeGreaterThan(-1);
    expect(four).toBeGreaterThan(plan);
    expect(speed).toBeGreaterThan(four);
    expect(text(html)).toContain("Limit changes on four Max accounts");
  });

  it("is not drawn for a file published before the detector", () => {
    expect(page(live0928Json as unknown as UsageJson)).not.toContain('id="limit-changes"');
  });
});
