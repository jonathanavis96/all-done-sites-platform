// src/pages/Privacy.tsx
import React from "react";

export default function Privacy() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-12 leading-relaxed">
      <header className="mb-8">
        <h1 className="text-3xl font-bold">Privacy Policy</h1>
        <p className="text-sm text-gray-500 mt-2">Last updated: August 25, 2025</p>
      </header>

      <section className="mb-6">
        <p>
          At <strong>All Done Sites</strong>, we respect your privacy and are committed to
          protecting your personal information. This policy explains what we collect, how we use
          it, and your choices. For any questions, contact{" "}
          <a className="text-blue-600 hover:underline" href="mailto:hello@alldonesites.com">
            hello@alldonesites.com
          </a>.
        </p>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">1) What we collect</h2>
        <p className="mb-3">
          We use <strong>Google Analytics 4 (GA4)</strong> to measure site usage (pages viewed,
          time on site, referring links, device/browser, language, approximate location). We
          don’t keep full IP addresses in our own systems.
        </p>
        <p>
          If you contact us or subscribe, we may receive details you provide (e.g. name, email,
          phone, company, message). Payments are processed by <strong>Paystack</strong>; we don’t
          store full card details.
        </p>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">2) Cookies & consent</h2>
        <p className="mb-3">
          We use <strong>Google Consent Mode v2</strong>. In the <strong>EEA/UK</strong> a banner
          asks for consent before analytics/ads cookies are set. If you deny, GA4 runs in a
          limited, cookieless mode. Outside the EEA/UK (e.g. South Africa), analytics runs by
          default to help us improve the site.
        </p>
        <p className="text-sm text-gray-600">
          Essential storage for site security/operations may still occur. Your banner choice is
          remembered in your browser.
        </p>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">3) Your choices & rights</h2>
        <ul className="list-disc pl-6 space-y-2">
          <li>You can block or delete cookies in your browser, or use Google’s Analytics opt-out add-on.</li>
          <li>Request access, correction, or deletion of your data by emailing{" "}
            <a className="text-blue-600 hover:underline" href="mailto:hello@alldonesites.com">
              hello@alldonesites.com
            </a>.
          </li>
        </ul>
        <p className="text-sm text-gray-600 mt-2">
          Legal basis: In the EEA/UK analytics relies on <strong>consent</strong>; essential
          operations may rely on <strong>legitimate interests</strong>. Under POPIA (South Africa)
          you may request access, correction, or deletion where applicable.
        </p>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">4) Sharing, retention & security</h2>
        <ul className="list-disc pl-6 space-y-1">
          <li>Processors: GA4 (analytics), hosting/CDN providers, Paystack (payments).</li>
          <li>We don’t sell personal information. We may disclose if required by law.</li>
          <li>GA4 event retention: <strong>14 months</strong>. Messages/emails are kept only as
              needed to respond and keep records.</li>
          <li>We use reasonable security measures, but no method is 100% secure.</li>
        </ul>
      </section>

      <section className="rounded-2xl border p-4 bg-gray-50">
        <h3 className="font-semibold mb-2">Cookie transparency</h3>
        <p className="text-sm text-gray-700">
          When consented (or outside the EEA/UK), GA4 may set cookies like <code>_ga</code> and
          <code>_ga_&lt;MEASUREMENT_ID&gt;</code>. If denied in the EEA/UK, these are not set and
          GA4 works in a limited cookieless mode.
        </p>
      </section>
    </div>
  );
}
