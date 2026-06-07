// src/pages/Terms.tsx
import { Link } from "react-router-dom";
import Seo from "@/components/Seo";
import { PageShell } from "@/components/redesign/RedesignChrome";

export default function Terms() {
  return (
    <PageShell eyebrow="Legal" title="Terms & Policies" sub="Last updated: June 7, 2026">
      <Seo
        title="Terms & Policies | All Done Sites"
        description="All Done Sites terms of service, including our refund and cancellation policies."
      />
      <div className="legal">
        <p className="intro">
          Welcome to <strong>All Done Sites</strong>. These Terms &amp; Policies outline the key
          conditions of our subscription website service. Please review them before subscribing.
        </p>

        <section id="refund-policy">
          <h2>Refund Policy</h2>
          <p>
            All Done Sites operates on a subscription basis. All payments are billed monthly in
            advance and are <strong>non-refundable</strong>.
          </p>
          <ul>
            <li>No refunds for partial months</li>
            <li>No refunds for unused services</li>
            <li>No refunds for early cancellation</li>
          </ul>
        </section>

        <section id="cancellation-policy">
          <h2>Cancellation Policy</h2>
          <ul>
            <li>
              Subscriptions run on a <strong>minimum 12-month term</strong>.
            </li>
            <li>
              If you are on a one-month trial (by invitation), you may cancel at the end of that month without further charges.
            </li>
            <li>
              After the 12-month term, you may cancel at any time with written notice, and the website's
              code and files can be transferred to you, so it is yours to keep or move.
            </li>
            <li>
              Early cancellation within the 12-month term still requires payment for the remainder of the term.
            </li>
          </ul>
        </section>

        <section id="privacy-policy">
          <h2>Privacy &amp; Cookies</h2>
          <p>
            We use <strong>Google Analytics 4</strong> with <strong>Consent Mode v2</strong> to
            understand how our site is used and to improve performance. In the <strong>EEA/UK</strong>,
            a banner asks for consent before analytics/advertising cookies are set. Outside the EEA/UK
            (e.g., South Africa), analytics is enabled by default. You can reset or change your choice
            any time (see Privacy Policy).
          </p>
          <p>
            Payment processing is handled by <strong>Paystack</strong>; we do not store full card details on our servers.
          </p>
          <p>
            For the full details, see our <Link to="/privacy">Privacy Policy</Link>.
          </p>
        </section>

        <section>
          <h2>General Policies</h2>
          <ul>
            <li>
              <strong>Ownership:</strong> You own your branding and content. All Done Sites owns the website
              design and code while your subscription is active. After your first 12 months, the website's
              code and files can be transferred to you, so it is yours to keep or move.
            </li>
            <li>
              <strong>Service:</strong> Hosting, updates, and security patches are included while your subscription
              is active.
            </li>
            <li>
              <strong>Credit:</strong> Your website includes a small "Built and maintained by All Done Sites" credit
              in the footer, linking to alldonesites.com, while your subscription is active. Removal can be arranged
              on request.
            </li>
            <li>
              <strong>Liability:</strong> Services are provided "as is." Our liability is limited to the amounts
              you have paid us in the last 12 months.
            </li>
            <li>
              <strong>Data Protection:</strong> You are responsible for lawful use of customer data. All Done Sites
              complies with POPIA when acting as an operator on your behalf.
            </li>
          </ul>
        </section>

        <section>
          <h2>Full Subscription Agreement</h2>
          <p>
            The above policies are a summary. For the complete legal framework, read our{" "}
            <Link to="/terms/full">Full Subscription Agreement</Link>.
          </p>
        </section>
      </div>
    </PageShell>
  );
}
