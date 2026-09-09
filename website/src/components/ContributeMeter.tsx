// website/src/components/ContributeMeter.tsx — "Contribute your own meter" on the
// Claude usage tracker: the two prompts to paste into Claude Code, and the paste box
// that decodes a `CUT1:` line, shows what is in it, and posts it to /api/contribute.
import { useState } from "react";
import { MODEL_LABELS, PLAN_LABELS, fmtTokens } from "@/lib/claudeUsage";
import { decodeCut1, totalTokens, validateSample, type Sample } from "@/lib/contrib";
import { CONTINUOUS_PROMPT, ONE_OFF_PROMPT, README_URL, SCRIPT_URL } from "@/lib/contribPrompts";

function CopyBox({ id, label, text }: { id: string; label: string; text: string }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setState("copied");
    } catch {
      setState("failed");
    }
    setTimeout(() => setState("idle"), 1800);
  }
  return (
    <div className="copybox">
      <div className="copybox-head">
        <span id={`${id}-label`}>{label}</span>
        <button type="button" onClick={copy} aria-describedby={`${id}-label`}>
          {state === "copied" ? "Copied" : state === "failed" ? "Select and copy" : "Copy"}
        </button>
      </div>
      <pre id={id} tabIndex={0}>{text}</pre>
    </div>
  );
}

function fmtWhen(iso: string): string {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return iso;
  return new Date(t).toLocaleString([], { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

function SampleTable({ sample }: { sample: Sample }) {
  const models = Array.from(
    new Set([...Object.keys(sample.tokens_since_five_hour_reset), ...Object.keys(sample.tokens_since_seven_day_reset)]),
  ).sort();
  return (
    <table>
      <tbody>
        <tr>
          <td>Plan</td>
          <td>{PLAN_LABELS[sample.plan] ?? sample.plan}</td>
        </tr>
        <tr>
          <td>Five-hour meter</td>
          <td>
            {sample.five_hour.utilization}% · resets {fmtWhen(sample.five_hour.resets_at)}
          </td>
        </tr>
        <tr>
          <td>Seven-day meter</td>
          <td>
            {sample.seven_day.utilization}% · resets {fmtWhen(sample.seven_day.resets_at)}
          </td>
        </tr>
        {models.length === 0 && (
          <tr>
            <td>Tokens</td>
            <td>none since either window started</td>
          </tr>
        )}
        {models.map((m) => (
          <tr key={m}>
            <td>{MODEL_LABELS[m] ?? m}</td>
            <td>
              {fmtTokens(totalTokens(sample.tokens_since_five_hour_reset[m]))} since the five-hour reset ·{" "}
              {fmtTokens(totalTokens(sample.tokens_since_seven_day_reset[m]))} since the seven-day reset
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

type Checked = { sample: Sample; cut1: string };
type Sent = { me_url: string; samples: number };

export default function ContributeMeter() {
  const [raw, setRaw] = useState("");
  const [checked, setChecked] = useState<Checked | null>(null);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState<Sent | null>(null);

  function reset() {
    setChecked(null);
    setError("");
    setSent(null);
  }

  function check() {
    reset();
    let text: string;
    try {
      text = decodeCut1(raw);
    } catch (e) {
      setError(e instanceof Error ? e.message : "That is not a CUT1 line.");
      return;
    }
    let body: unknown;
    try {
      body = JSON.parse(text);
    } catch {
      setError("That line does not decode to JSON.");
      return;
    }
    const v = validateSample(body);
    if (v.ok === false) {
      setError(v.reason);
      return;
    }
    setChecked({ sample: v.value, cut1: raw.trim() });
  }

  async function send() {
    if (!checked || sending) return;
    setSending(true);
    setError("");
    try {
      const res = await fetch("/api/contribute", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ cut1: checked.cut1 }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok === false) {
        setError(typeof data.error === "string" ? data.error : `The server answered ${res.status}.`);
        return;
      }
      setSent({ me_url: String(data.me_url), samples: Number(data.samples) });
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="contrib">
      <p>
        One sample is your tokens since the current window started, over your meter percent right now: tokens per 1% under
        your real mix of models, and enough of them give Pro and Max 5x a measured figure instead of an assumed one. The
        one-off path installs nothing: your own Claude Code fetches a public script, prints exactly what it would send, and
        sends it only when you say so. Read the script at{" "}
        <a href={SCRIPT_URL}>contrib/sample.py</a> and what it sends in <a href={README_URL}>contrib/README.md</a>.
      </p>
      <div className="copyboxes">
        <CopyBox id="contrib-one-off" label="One-off" text={ONE_OFF_PROMPT} />
        <CopyBox id="contrib-continuous" label="Continuous" text={CONTINUOUS_PROMPT} />
      </div>
      <div className="pastebox">
        <label className="notify-label" htmlFor="contrib-cut1">
          Or paste the CUT1 line the script prints
        </label>
        <textarea
          id="contrib-cut1"
          placeholder="CUT1:..."
          value={raw}
          spellCheck={false}
          onChange={(e) => {
            setRaw(e.target.value);
            if (checked || error || sent) reset();
          }}
          aria-invalid={!!error}
          aria-describedby={error ? "contrib-err" : undefined}
        />
        <div className="row">
          <button type="button" onClick={check} disabled={raw.trim().length === 0 || sending}>
            Check
          </button>
          {checked && !sent && (
            <button type="button" className="primary" onClick={send} disabled={sending}>
              {sending ? "Sending…" : "Send"}
            </button>
          )}
        </div>
        {error && (
          <p className="err" id="contrib-err" role="alert">
            {error}
          </p>
        )}
        {checked && !sent && (
          <>
            <p className="sub" style={{ margin: "12px 0 0" }}>
              This is what the line holds. Send posts it as-is and nothing more.
            </p>
            <SampleTable sample={checked.sample} />
          </>
        )}
        {sent && (
          <div className="notify-done" role="status" style={{ maxWidth: "none", margin: "12px 0 0" }}>
            <strong>Sent.</strong> {sent.samples === 1 ? "That is your first sample." : `That is sample ${sent.samples} from you.`}{" "}
            Your page: <a href={sent.me_url}>{sent.me_url.replace(/^https?:\/\//, "")}</a>
          </div>
        )}
      </div>
      <p className="line">
        Every sample gets a personal link that draws your own tokens per 1% against everyone else's, and a continuous
        contributor gets a line rather than a point.
      </p>
    </div>
  );
}
