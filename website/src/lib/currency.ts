// src/lib/currency.ts
//
// Viewer-local price conversion for guide and article bodies.
//
// Prices in the written content stay exactly as the author wrote them. Where we
// can work out what the reader's own currency is, and what it is worth today, we
// append an approximation after the original — "R800 (≈ $45)" — and nothing else
// changes. Every step is best-effort: if the country lookup or the rate fetch
// fails, the page is left untouched.

/** Currency for a country, for the countries worth covering. Default: USD. */
const COUNTRY_TO_CURRENCY: Record<string, string> = {
  ZA: "ZAR",
  NA: "ZAR",
  US: "USD",
  GB: "GBP",
  AU: "AUD",
  CA: "CAD",
  NZ: "NZD",
  IN: "INR",
  JP: "JPY",
  CH: "CHF",
  SE: "SEK",
  NO: "NOK",
  DK: "DKK",
  PL: "PLN",
  CZ: "CZK",
  BR: "BRL",
  MX: "MXN",
  AR: "ARS",
  CL: "CLP",
  CN: "CNY",
  HK: "HKD",
  SG: "SGD",
  MY: "MYR",
  TH: "THB",
  ID: "IDR",
  PH: "PHP",
  VN: "VND",
  KR: "KRW",
  TR: "TRY",
  IL: "ILS",
  AE: "AED",
  SA: "SAR",
  EG: "EGP",
  NG: "NGN",
  KE: "KES",
  GH: "GHS",
  BW: "BWP",
  ZW: "USD",
  RU: "RUB",
  UA: "UAH",
  // Euro area
  AT: "EUR",
  BE: "EUR",
  CY: "EUR",
  DE: "EUR",
  EE: "EUR",
  ES: "EUR",
  FI: "EUR",
  FR: "EUR",
  GR: "EUR",
  HR: "EUR",
  IE: "EUR",
  IT: "EUR",
  LT: "EUR",
  LU: "EUR",
  LV: "EUR",
  MT: "EUR",
  NL: "EUR",
  PT: "EUR",
  SI: "EUR",
  SK: "EUR",
};

/** How each currency we might display is written. */
const CURRENCY_SYMBOL: Record<string, string> = {
  ZAR: "R",
  USD: "$",
  GBP: "£",
  EUR: "€",
  AUD: "A$",
  CAD: "C$",
  NZD: "NZ$",
  INR: "₹",
  JPY: "¥",
  CNY: "¥",
  CHF: "CHF ",
  BRL: "R$",
  SGD: "S$",
  HKD: "HK$",
  KRW: "₩",
  NGN: "₦",
  TRY: "₺",
  ILS: "₪",
  PHP: "₱",
  THB: "฿",
  VND: "₫",
};

export function currencyForCountry(country: string | null | undefined): string {
  if (!country) return "USD";
  return COUNTRY_TO_CURRENCY[country.trim().toUpperCase()] ?? "USD";
}

export function symbolFor(code: string): string {
  return CURRENCY_SYMBOL[code] ?? `${code} `;
}

// ---------------------------------------------------------------------------
// Finding prices in text
// ---------------------------------------------------------------------------

/**
 * Symbols that can open a price, longest first so "A$" wins over "$".
 * "R" is South African rand; "R$" is the Brazilian real and must be tried first.
 */
const SYMBOL_TO_CURRENCY: Array<[string, string]> = [
  ["NZ$", "NZD"],
  ["HK$", "HKD"],
  ["R$", "BRL"],
  ["A$", "AUD"],
  ["C$", "CAD"],
  ["S$", "SGD"],
  ["US$", "USD"],
  ["$", "USD"],
  ["£", "GBP"],
  ["€", "EUR"],
  ["₹", "INR"],
  ["¥", "JPY"],
  ["₦", "NGN"],
  ["R", "ZAR"],
];

const KNOWN_CODES = [
  "ZAR", "USD", "GBP", "EUR", "AUD", "CAD", "NZD", "INR", "JPY", "CNY",
  "CHF", "SGD", "HKD", "BRL", "KRW", "NGN", "KES", "AED", "SEK", "NOK",
  "DKK", "PLN", "MXN", "TRY", "ILS", "PHP", "THB",
];

const PRICE_RE = new RegExp(
  // Either "ZAR 800" / "ZAR800", or a symbol immediately before the number.
  String.raw`(?:\b(${KNOWN_CODES.join("|")})\s?|(NZ\$|HK\$|US\$|R\$|A\$|C\$|S\$|\$|£|€|₹|¥|₦|R(?=\d)))` +
    String.raw`(\d{1,3}(?:[ ,]\d{3})*(?:\.\d{1,2})?|\d+(?:\.\d{1,2})?)`,
  "g",
);

export interface FoundPrice {
  /** Full matched text, e.g. "R800". */
  text: string;
  /** Index of the match within the searched string. */
  index: number;
  currency: string;
  amount: number;
}

/** Every price-looking run in a piece of text, left to right. */
export function findPrices(text: string): FoundPrice[] {
  const out: FoundPrice[] = [];
  PRICE_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = PRICE_RE.exec(text)) !== null) {
    const [full, code, symbol, digits] = m;
    let currency: string | undefined;
    if (code) {
      currency = code.toUpperCase();
    } else if (symbol) {
      currency = SYMBOL_TO_CURRENCY.find(([s]) => s === symbol)?.[1];
    }
    if (!currency) continue;
    const amount = Number(digits.replace(/[ ,]/g, ""));
    if (!Number.isFinite(amount) || amount <= 0) continue;
    out.push({ text: full, index: m.index, currency, amount });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Rounding
// ---------------------------------------------------------------------------

/**
 * Whole numbers only, and deliberately coarse — a converted price is an
 * approximation and reads as one:
 *
 *   under 100      -> nearest whole unit    (≈ $45)
 *   100 - 999      -> nearest 10            (≈ $450)
 *   1 000 - 9 999  -> nearest 100           (≈ $1,300)
 *   10 000 and up  -> nearest 1 000         (≈ ¥52,000)
 */
export function roundApprox(value: number): number {
  const abs = Math.abs(value);
  let step = 1;
  if (abs >= 10000) step = 1000;
  else if (abs >= 1000) step = 100;
  else if (abs >= 100) step = 10;
  const rounded = Math.round(value / step) * step;
  // Never round a real price away to nothing.
  return rounded === 0 && value > 0 ? 1 : rounded;
}

/** "≈ $45" — the text appended after the original price. */
export function formatApprox(amount: number, currency: string): string {
  const rounded = roundApprox(amount);
  let body: string;
  try {
    // Whole numbers only, always — a converted price is never shown with cents.
    body = rounded.toLocaleString("en-US", { maximumFractionDigits: 0 });
  } catch {
    body = String(rounded);
  }
  return `≈ ${symbolFor(currency)}${body}`;
}

/** Convert via USD using a rates table keyed USD -> currency. */
export function convert(
  amount: number,
  from: string,
  to: string,
  rates: Record<string, number>,
): number | null {
  if (from === to) return null;
  const fromRate = from === "USD" ? 1 : rates[from];
  const toRate = to === "USD" ? 1 : rates[to];
  if (!fromRate || !toRate) return null;
  return (amount / fromRate) * toRate;
}
