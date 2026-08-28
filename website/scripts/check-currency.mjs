// scripts/check-currency.mjs
//
// A standalone check for the price-detection and rounding rules in
// src/lib/currency.ts. The site has no test runner, so this runs on its own:
//
//   node scripts/check-currency.mjs
//
// It transforms the TypeScript with the esbuild that ships inside Vite, then
// asserts on the exported functions. Exits non-zero on the first failure.

import { readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import assert from "node:assert/strict";
import { transformSync } from "esbuild";

const here = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(resolve(here, "../src/lib/currency.ts"), "utf8");
const js = transformSync(source, { loader: "ts", format: "esm" }).code;
const out = join(mkdtempSync(join(tmpdir(), "ads-currency-")), "currency.mjs");
writeFileSync(out, js);

const { findPrices, roundApprox, formatApprox, convert, currencyForCountry } =
  await import(pathToFileURL(out).href);

let failures = 0;
function check(name, fn) {
  try {
    fn();
    console.log(`ok   ${name}`);
  } catch (err) {
    failures += 1;
    console.error(`FAIL ${name}\n     ${err.message}`);
  }
}

check("finds a rand price written with a bare R", () => {
  assert.deepEqual(
    findPrices("Plans start at R799 a month.").map((p) => [p.currency, p.amount]),
    [["ZAR", 799]],
  );
});

check("finds dollars, pounds and euros with separators", () => {
  assert.deepEqual(
    findPrices("about $1,200 or £30 or €1 500 a year").map((p) => [p.currency, p.amount]),
    [["USD", 1200], ["GBP", 30], ["EUR", 1500]],
  );
});

check("finds an ISO code form", () => {
  assert.deepEqual(
    findPrices("ZAR 800 and USD50").map((p) => [p.currency, p.amount]),
    [["ZAR", 800], ["USD", 50]],
  );
});

check("prefers the longer symbol", () => {
  assert.deepEqual(
    findPrices("A$99 and C$40 and R$25").map((p) => [p.currency, p.amount]),
    [["AUD", 99], ["CAD", 40], ["BRL", 25]],
  );
});

check("ignores a bare R that is not a price", () => {
  assert.deepEqual(findPrices("Rated highly by R and D teams"), []);
});

check("ignores a plain number with no currency", () => {
  assert.deepEqual(findPrices("about 800 visitors a month"), []);
});

check("rounds to whole numbers on the documented steps", () => {
  assert.equal(roundApprox(44.62), 45); // under 100: nearest whole
  assert.equal(roundApprox(0.4), 1); // never rounds a real price to zero
  assert.equal(roundApprox(447), 450); // 100-999: nearest 10
  assert.equal(roundApprox(1284), 1300); // 1000-9999: nearest 100
  assert.equal(roundApprox(51720), 52000); // 10000+: nearest 1000
});

check("formats with a symbol, thousands separators and no cents", () => {
  assert.equal(formatApprox(44.62, "USD"), "≈ $45");
  assert.equal(formatApprox(1284.4, "USD"), "≈ $1,300");
  assert.equal(formatApprox(30.2, "GBP"), "≈ £30");
  assert.equal(formatApprox(1234, "SEK"), "≈ SEK 1,200");
});

check("converts through USD and skips a same-currency pair", () => {
  const rates = { ZAR: 18, GBP: 0.8 };
  assert.equal(convert(800, "ZAR", "USD", rates).toFixed(2), "44.44");
  assert.equal(convert(100, "USD", "GBP", rates), 80);
  assert.equal(convert(800, "ZAR", "ZAR", rates), null);
  assert.equal(convert(800, "ZAR", "XYZ", rates), null); // unknown rate
});

check("maps countries to currencies with a USD default", () => {
  assert.equal(currencyForCountry("ZA"), "ZAR");
  assert.equal(currencyForCountry("de"), "EUR");
  assert.equal(currencyForCountry("XX"), "USD");
  assert.equal(currencyForCountry(null), "USD");
});

if (failures > 0) {
  console.error(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log("\nall currency checks passed");
