// src/pages/Terms.tsx
import React from "react";
import { Link } from "react-router-dom";

export default function Terms() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <h1 className="text-3xl font-bold mb-6">Terms & Policies</h1>
      <p className="text-sm text-gray-500 mb-10">Last updated: August 2025</p>

      <p className="mb-8">
        Welcome to <strong>All Done Sites</strong>. These Terms & Policies set out the
        key conditions of our subscription website service. Please review them
        carefully before subscribing.
      </p>

      {/* Refund Policy */}
      <section id="refund-policy" className="mb-10">
        <h2 className="text-2xl font-semibold mb-4">Refund Policy</h2>
        <p className="mb-2">
          All Done Sites operates on a subscription basis. All payments are billed
          monthly in advance and are <strong>non-refundable</strong>.
        </p>
        <ul className="list-disc list-inside space-y-1">
          <li>No refunds for partial months</li>
          <li>No refunds for unused services</li>
          <li>No refunds for early cancellation</li>
        </ul>
      </section>

      {/* Cancellation Policy */}
      <section id="cancellation-policy" className="mb-10">
        <h2 className="text-2xl font-semibold mb-4">Cancellation Policy</h2>
        <ul className="list-disc list-inside space-y-1">
          <li>
            Subscriptions require a <strong>minimum commitment of six (6) months</strong>.
          </li>
          <li>
            If you are on a one-month trial, you may cancel at the end of that
            month without further charges.
          </li>
          <li>
            After the minimum term, you may cancel at any time with written
            notice.
          </li>
          <li>
            Early cancellation within the six-month minimum still requires payment
            for the full term.
          </li>
        </ul>
      </section>

      {/* Privacy Policy */}
      <section id="privacy-policy" className="mb-10">
        <h2 className="text-2xl font-semibold mb-4">Privacy Policy</h2>
        <p className="mb-2">
          We respect your privacy and are committed to protecting your personal
          information. At this time, we do not use cookies or analytics. Customer
          and payment details are processed securely through our payment provider,
          Paystack. We do not store card information on our servers.
        </p>
        <p>
          For full details, please see our dedicated{" "}
          <Link to="/privacy" className="text-blue-600 hover:underline">
            Privacy Policy
          </Link>
          .
        </p>
      </section>

      {/* General Policies */}
      <section className="mb-10">
        <h2 className="text-2xl font-semibold mb-4">General Policies</h2>
        <ul className="list-disc list-inside space-y-1">
          <li>
            <strong>Ownership:</strong> You own your branding and content. All Done
            Sites owns the website design and code unless a buyout is completed.
          </li>
          <li>
            <strong>Service:</strong> Hosting, updates, and security patches are
            included while your subscription is active.
          </li>
          <li>
            <strong>Liability:</strong> Services are provided “as is.” Our liability
            is limited to the amounts you have paid us in the last 12 months.
          </li>
          <li>
            <strong>Data Protection:</strong> You are responsible for lawful use of
            customer data. All Done Sites complies with POPIA when acting as an
            operator on your behalf.
          </li>
        </ul>
      </section>

      {/* Link to full agreement */}
      <section>
        <h2 className="text-2xl font-semibold mb-4">Full Subscription Agreement</h2>
        <p>
          The above policies are simplified for customer clarity. For the complete
          legal framework, please read our{" "}
          <Link to="/terms/full" className="text-blue-600 hover:underline">
            Full Subscription Agreement
          </Link>
          .
        </p>
      </section>
    </div>
  );
}
