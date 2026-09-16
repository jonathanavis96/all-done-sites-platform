// website/src/lib/contribPrompts.ts — the two prompts a reader pastes into their own
// Claude Code to contribute a meter sample. Both are verbatim from contrib/README.md
// in github.com/jonathanavis96/claude-usage-tracker; change them there first.

export const SCRIPT_URL = "https://github.com/jonathanavis96/claude-usage-tracker/blob/main/contrib/sample.py";
export const README_URL = "https://github.com/jonathanavis96/claude-usage-tracker/blob/main/contrib/README.md";

export const ONE_OFF_PROMPT =
  'Run `python3 -c "$(curl -fsSL https://raw.githubusercontent.com/jonathanavis96/claude-usage-tracker/main/contrib/sample.py)" --print`, show me the JSON it prints, explain each field, and post it only if I say yes. If it asks which plan I am on, ask me -- do not guess.';

// The continuous prompt is parameterised by how often the schedule runs. Hourly is the
// default; the README's interval table carries the same choices.
export const INTERVALS = [
  { minutes: 30, label: "every 30 minutes", phrase: "30-minute" },
  { minutes: 60, label: "every hour", phrase: "hourly" },
  { minutes: 120, label: "every 2 hours", phrase: "2-hourly" },
  { minutes: 360, label: "every 6 hours", phrase: "6-hourly" },
  { minutes: 720, label: "every 12 hours", phrase: "12-hourly" },
  { minutes: 1440, label: "once a day", phrase: "daily" },
] as const;
export const DEFAULT_INTERVAL_MINUTES = 60;

export function continuousPrompt(minutes: number = DEFAULT_INTERVAL_MINUTES): string {
  const found = INTERVALS.find((i) => i.minutes === minutes);
  const phrase = found ? found.phrase : `${minutes}-minute`;
  return (
    "Clone `https://github.com/jonathanavis96/claude-usage-tracker` into `~/claude-usage-tracker`, read `contrib/README.md`, then run `python3 ~/claude-usage-tracker/contrib/sample.py --print` and show me the JSON it prints with an explanation of each field. If it asks which plan I am on, ask me -- do not guess. Do not send anything and do not install anything until I type `approve`. When I do, install the " +
    phrase +
    " schedule from the README for my operating system and show me the line you added."
  );
}

export const CONTINUOUS_PROMPT = continuousPrompt();
