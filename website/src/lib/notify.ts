// website/src/lib/notify.ts — pure helpers shared by the subscribe form and the
// Pages Functions under website/functions/api/notify/. Kept free of DOM and of
// Workers APIs so both runtimes and vitest can import it.

// Deliberately permissive but structural: one @, a dot-bearing domain, no
// whitespace, no consecutive dots. Real validation is the confirmation email —
// this only rejects input that could never be deliverable.
const EMAIL_RE = /^[^\s@,;:<>()[\]\\"]+@[^\s@.,;:<>()[\]\\"]+(\.[^\s@.,;:<>()[\]\\"]+)+$/;

/** Trim and lower-case an address so one person cannot hold two subscriptions. */
export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

export function isValidEmail(raw: string): boolean {
  const e = normalizeEmail(raw);
  // 254 is the RFC 5321 limit on a forward path; anything longer is not routable.
  return e.length > 0 && e.length <= 254 && EMAIL_RE.test(e);
}
