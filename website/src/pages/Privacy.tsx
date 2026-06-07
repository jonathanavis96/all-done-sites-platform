// src/pages/Privacy.tsx
import Seo from "@/components/Seo";
import { PageShell } from "@/components/redesign/RedesignChrome";
import { EMAIL } from "@/lib/site";

export default function Privacy() {
  return (
    <PageShell eyebrow="Privacy" title="Privacy Policy" sub="Last updated: August 25, 2025">
      <Seo
        title="Privacy Policy | All Done Sites"
        description="How All Done Sites collects, uses, and protects your personal information."
      />
      <div className="legal">
        <section>
          <p className="intro">
            At <strong>All Done Sites</strong>, we respect your privacy and are committed to
            protecting your personal information. This policy explains what we collect, how we use
            it, and your choices. For any questions, contact{" "}
            <a href={`mailto:${EMAIL}`}>{EMAIL}</a>.
          </p>
        </section>

        <section>
          <h2>1) What we collect</h2>
          <p>
            We use <strong>Google Analytics 4 (GA4)</strong> to measure site usage (pages viewed,
            time on site, referring links, device/browser, language, approximate location). We
            don't keep full IP addresses in our own systems.
          </p>
          <p>
            If you contact us or subscribe, we may receive details you provide (e.g. name, email,
            phone, company, message). Payments are processed by <strong>Paystack</strong>; we don't
            store full card details.
          </p>
        </section>

        <section>
          <h2>2) Cookies &amp; consent</h2>
          <p>
            We use <strong>Google Consent Mode v2</strong>. In the <strong>EEA/UK</strong> a banner
            asks for consent before analytics/ads cookies are set. If you deny, GA4 runs in a
            limited, cookieless mode. Outside the EEA/UK (e.g. South Africa), analytics runs by
            default to help us improve the site.
          </p>
          <p>
            Essential storage for site security/operations may still occur. Your banner choice is
            remembered in your browser.
          </p>
        </section>

        <section>
          <h2>3) Your choices &amp; rights</h2>
          <ul>
            <li>You can block or delete cookies in your browser, or use Google's Analytics opt-out add-on.</li>
            <li>Request access, correction, or deletion of your data by emailing{" "}
              <a href={`mailto:${EMAIL}`}>{EMAIL}</a>.
            </li>
          </ul>
          <p>
            Legal basis: In the EEA/UK analytics relies on <strong>consent</strong>; essential
            operations may rely on <strong>legitimate interests</strong>. Under POPIA (South Africa)
            you may request access, correction, or deletion where applicable.
          </p>
        </section>

        <section>
          <h2>4) Sharing, retention &amp; security</h2>
          <ul>
            <li>Processors: GA4 (analytics), hosting/CDN providers, Paystack (payments).</li>
            <li>We don't sell personal information. We may disclose if required by law.</li>
            <li>GA4 event retention: <strong>14 months</strong>. Messages/emails are kept only as
              needed to respond and keep records.</li>
            <li>We use reasonable security measures, but no method is 100% secure.</li>
          </ul>
        </section>

        <div className="callout">
          <h3>Cookie transparency</h3>
          <p>
            When consented (or outside the EEA/UK), GA4 may set cookies like <code>_ga</code> and{" "}
            <code>_ga_&lt;MEASUREMENT_ID&gt;</code>. If denied in the EEA/UK, these are not set and
            GA4 works in a limited cookieless mode.
          </p>
        </div>
      </div>
    </PageShell>
  );
}
