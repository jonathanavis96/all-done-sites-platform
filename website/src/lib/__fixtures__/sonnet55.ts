import type { UsageJson } from "@/lib/claudeUsage";

// A published file with Claude Sonnet 5.5 added the way tracker/credits.py auto_family() files a
// model no family lists: its own `per_model` row keyed "sonnet-5-5", priced at an inferred rate
// from Anthropic's list price. Built from the inferred-rates fixture, copying Opus 5.5's inferred
// row as the shape and Sonnet 5's model entries as the model's own. `windowFigure` adds the
// family's window-tokens figure, which is what brings a new family onto the page.
export function withSonnet55(base: UsageJson, { windowFigure }: { windowFigure: boolean }): UsageJson {
  const j = structuredClone(base);
  const perModel = j as unknown as Record<string, Record<string, unknown> | undefined>;
  for (const key of ["rates", "api_price_per_mtok", "history", "model_plan_limits"]) {
    const block = perModel[key];
    if (block && "claude-sonnet-5" in block) block["claude-sonnet-5-5"] = structuredClone(block["claude-sonnet-5"]);
  }
  const c = j.credits!;
  c.per_model!["sonnet-5-5"] = {
    ...structuredClone(c.per_model!["opus-5-5"]!),
    rate_source: "inferred",
    inferred_from: "list_price",
    list_price_model: "claude-sonnet-5-5",
  };
  if (windowFigure) {
    const wt = c.window_tokens!;
    wt.per_family!["sonnet-5-5"] = { ...structuredClone(wt.per_family!["opus-5-5"]!), rate_source: "inferred" };
    const perWeek = wt.per_week?.per_family;
    if (perWeek?.["opus-5-5"]) perWeek["sonnet-5-5"] = structuredClone(perWeek["opus-5-5"]);
  }
  return j;
}
