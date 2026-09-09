// website/src/lib/contribPrompts.ts — the two prompts a reader pastes into their own
// Claude Code to contribute a meter sample. Both are verbatim from contrib/README.md
// in github.com/jonathanavis96/claude-usage-tracker; change them there first.

export const SCRIPT_URL = "https://github.com/jonathanavis96/claude-usage-tracker/blob/main/contrib/sample.py";
export const README_URL = "https://github.com/jonathanavis96/claude-usage-tracker/blob/main/contrib/README.md";

export const ONE_OFF_PROMPT =
  'Run `python3 -c "$(curl -fsSL https://raw.githubusercontent.com/jonathanavis96/claude-usage-tracker/main/contrib/sample.py)" --print`, show me the JSON it prints, explain each field, and post it only if I say yes.';

export const CONTINUOUS_PROMPT =
  "Clone `https://github.com/jonathanavis96/claude-usage-tracker` into `~/claude-usage-tracker`, read `contrib/README.md`, then run `python3 ~/claude-usage-tracker/contrib/sample.py --print` and show me the JSON it prints with an explanation of each field. Do not send anything and do not install anything until I type `approve`. When I do, install the 30-minute schedule from the README for my operating system and show me the line you added.";
