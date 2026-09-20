import type { UsageJson, WeeklyPlan, WindowReading } from "@/lib/claudeUsage";

// A published schema 2 file with the fields tracker wf-50 adds, built by hand the way the brief
// says to: Max 20x's readings and weeks from `weekly_windows.passive` (the same point shapes),
// from the day the account moved onto Max 20x. Accounts are dealt round-robin, which is enough
// for a label per dot. `currentAsObject` picks which of the two readings of the brief the marks
// on Max 5x's and Pro's current figure follow: on `current` itself, or beside it on the plan.
export function withWf50(base: UsageJson, { currentAsObject = false }: { currentAsObject?: boolean } = {}): UsageJson {
  const j = structuredClone(base);
  const ww = j.weekly_windows!;
  // `passive` is the collector's pooled log, published beside the plans but not a plan.
  const passive = (ww as unknown as { passive?: { by_window?: WindowReading[]; history?: WeeklyPlan["history"] } }).passive;
  const max20 = ww.max20!;
  const since = max20.regimes![0].start;
  const accounts = ["a1", "a2", "a3"];
  max20.by_window = (passive?.by_window ?? [])
    .filter((r) => r.window_ending >= since)
    .map((r, i) => ({ ...r, account: accounts[i % 3] }));
  max20.weekly = (passive?.history ?? [])
    .filter((h) => h.week_ending >= since.slice(0, 10))
    .map((h) => ({
      week_ending: h.week_ending,
      windows: h.windows,
      rounding_interval: (h as { rounding_interval?: number[] }).rounding_interval ?? [h.windows * 0.9, h.windows * 1.1],
      n: 20,
      five_hour_pct: h.five_hour_pct,
      seven_day_pct: h.seven_day_pct,
      partial: h.partial === true,
    }));
  const step = (onset: string) => ({ onset, before: 6.5, after: 4.7, percent: -28 });
  max20.by_account = {
    a1: { n: 60, current: 4.7, regimes: [], step: step("2026-09-13") },
    a2: { n: 40, current: 4.6, regimes: [], step: step("2026-09-14") },
    a3: { n: 12, current: null, regimes: [], step: null },
  };
  j.plan_ratios = { pro: 0.05, max5: 0.3, max20: 1.0 };
  j.plan_ratios_basis = { kind: "credits_table", credits_per_window: { pro: 1, max5: 6, max20: 20 } };
  j.weekly_window_ratios = { pro: 1.2, max5: 1.667, max20: 1.0 };
  // The same table's credits per week: the page reads the per-week ratio off these rather than
  // off a constant, so the fixture has to carry what the published file carries.
  j.weekly_window_ratios_basis = {
    kind: "credits_table",
    credits_per_week: { pro: 5_000_000, max5: 41_666_700, max20: 83_333_300 },
  };
  const current = typeof max20.current === "number" ? max20.current : 0;
  for (const plan of ["max5", "pro"] as const) {
    const w = ww[plan]!;
    const value = Math.round(current * j.weekly_window_ratios![plan]! * 100) / 100;
    const marks = { assumed: true, inferred_from: "max20" as const, availability: { status: "inferred", reason: null } };
    if (currentAsObject) w.current = { value, ...marks };
    else Object.assign(w, { current: value }, marks);
  }
  return j;
}
