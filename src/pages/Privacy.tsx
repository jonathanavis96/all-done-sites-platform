// src/pages/Privacy.tsx
import React from "react";

export default function Privacy() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-12 leading-relaxed">
      <header className="mb-8">
        <h1 className="text-3xl font-bold">Privacy Policy</h1>
        <p className="text-sm text-gray-500 mt-2">Last updated: August 2025</p>
      </header>

      <section className="mb-6">
        <p>
          At <strong>All Done Sites</strong>, we respect your privacy and are committed to
          protecting your personal information. This Privacy Policy explains how we collect,
          use, and safeguard your information when you interact with our website and services.
        </p>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">1. Information We Collect</h2>
        <p>
          When you use our website, contact us, or subscribe to our services, we may collect
          personal details such as your name, email address, phone number, and billing
          information. Payment details are processed securely through our payment provider,
          Paystack — we do not store your card details on our servers.
        </p>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">2. How We Use Your Information</h2>
        <ul className="list-disc pl-6 space-y-1">
          <li>To provide and manage your website subscription</li>
          <li>To process payments securely via Paystack</li>
          <li>To respond to enquiries and provide customer support</li>
          <li>To send you important service updates</li>
        </ul>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">3. Cookies & Analytics</h2>
        <p>
          At this time, we do <strong>not</strong> use cookies, tracking pixels, or analytics
          tools on our website. If we introduce cookies or analytics in the future, this
          Privacy Policy will be updated and a cookie notice will be displayed for
          transparency and consent.
        </p>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">4. Data Security</h2>
        <p>
          We take reasonable measures to protect your personal information against
          unauthorised access, alteration, or disclosure. Payment data is encrypted and
          handled only by trusted third-party providers such as Paystack.
        </p>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">5. Sharing of Information</h2>
        <p>
          We do not sell or rent your personal data. We may share information only with
          trusted service providers (such as Paystack for payment processing) or if required
          by law.
        </p>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">6. Your Rights</h2>
        <p>
          Under POPIA (and similar data protection laws), you have the right to access,
          correct, or request deletion of your personal information. To exercise these rights,
          please contact us using the details below.
        </p>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">7. Contact Us</h2>
        <p>
          If you have any questions about this Privacy Policy or how your data is handled,
          you can reach us at:  
        </p>
        <p className="mt-2">
          <strong>Email:</strong> hello@alldonesites.com  
        </p>
      </section>
    </div>
  );
}
