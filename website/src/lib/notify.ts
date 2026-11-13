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
  // 254 octets is the RFC 5321 limit on a forward path; anything longer is not routable. Counted
  // in UTF-8 bytes, not characters: 254 non-ASCII characters overran KV's 512-byte key limit and
  // made subscribe throw.
  const bytes = new TextEncoder().encode(e).length;
  return bytes > 0 && bytes <= 254 && EMAIL_RE.test(e);
}
