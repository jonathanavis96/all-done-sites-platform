// website/src/components/NotifyForm.tsx — "email me when this changes" sign-up
// for the Claude usage tracker. Posts to the Pages Function at
// /api/notify/subscribe, which mails a confirmation link.
import { useState } from "react";
import { isValidEmail } from "@/lib/notify";

type Status = "idle" | "sending" | "sent" | "error";

export default function NotifyForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (status === "sending") return;
    if (!isValidEmail(email)) {
      setStatus("error");
      setMessage("That doesn't look like an email address.");
      return;
    }
    setStatus("sending");
    setMessage("");
    try {
      const res = await fetch("/api/notify/subscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus("error");
        setMessage(typeof data.error === "string" ? data.error : "Something went wrong. Try again shortly.");
        return;
      }
      setStatus("sent");
      setMessage(typeof data.message === "string" ? data.message : "Check your inbox for the confirmation link.");
    } catch {
      setStatus("error");
      setMessage("Couldn't reach the server. Check your connection and try again.");
    }
  }

  if (status === "sent") {
    return (
      <div className="notify notify-done" role="status">
        <strong>Almost there.</strong> {message}
      </div>
    );
  }

  return (
    <form className="notify" onSubmit={submit} noValidate>
      <label className="notify-label" htmlFor="notify-email">
        Email me when this changes
      </label>
      <div className="notify-row">
        <input
          id="notify-email"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (status === "error") {
              setStatus("idle");
              setMessage("");
            }
          }}
          aria-invalid={status === "error"}
          aria-describedby={message ? "notify-msg" : undefined}
          disabled={status === "sending"}
        />
        <button type="submit" disabled={status === "sending"}>
          {status === "sending" ? "Sending…" : "Notify me"}
        </button>
      </div>
      <p className="notify-note" id="notify-msg" role={status === "error" ? "alert" : undefined}>
        {message || "One email per change. Unsubscribe in one click."}
      </p>
    </form>
  );
}
