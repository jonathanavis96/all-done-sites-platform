// src/pages/TermsFull.tsx
import React from "react";
import { Link } from "react-router-dom";

export default function TermsFull() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-12 leading-relaxed">
      <header className="mb-8">
        <h1 className="text-3xl font-bold">All Done Sites — Master Subscription Agreement</h1>
        <p className="text-sm text-gray-500 mt-2">Last updated: August 2025</p>
        <p className="mt-6">
          <Link to="/terms" className="text-blue-600 hover:underline">
            ← Back to Terms & Policies (summary)
          </Link>
        </p>
      </header>

      {/* Snapshot */}
      <section id="snapshot" className="mb-10">
        <h2 className="text-2xl font-semibold mb-3">Plain-English Snapshot</h2>
        <p>
          This is the one agreement you sign with All Done Sites for our subscription website service. It
          covers ownership, payments, support, SEO, cancellation, transfer/buyout, and liability.
        </p>
      </section>

      {/* Quick contents */}
      <aside className="mb-10 rounded-2xl border p-5 bg-gray-50">
        <h3 className="font-semibold mb-2">Contents</h3>
        <ol className="list-decimal list-inside space-y-1">
          <li><a href="#s1" className="text-blue-700 hover:underline">Parties; Effective Date; Order of Precedence</a></li>
          <li><a href="#s2" className="text-blue-700 hover:underline">Definitions</a></li>
          <li><a href="#s3" className="text-blue-700 hover:underline">Scope of Services</a></li>
          <li><a href="#s4" className="text-blue-700 hover:underline">Client Responsibilities</a></li>
          <li><a href="#s5" className="text-blue-700 hover:underline">Ownership; License; Access</a></li>
          <li><a href="#s6" className="text-blue-700 hover:underline">SEO Levels</a></li>
          <li><a href="#s7" className="text-blue-700 hover:underline">Term; Minimum Commitment; Cancellation</a></li>
          <li><a href="#s8" className="text-blue-700 hover:underline">Fees; Invoicing; No Refunds; Taxes</a></li>
          <li><a href="#s9" className="text-blue-700 hover:underline">Non-Payment; Suspension; Data Retention</a></li>
          <li><a href="#s10" className="text-blue-700 hover:underline">Buyout; Transfer to Another Host</a></li>
          <li><a href="#s11" className="text-blue-700 hover:underline">Service Levels; Maintenance; Security</a></li>
          <li><a href="#s12" className="text-blue-700 hover:underline">Content Standards; Compliance; Data Protection</a></li>
          <li><a href="#s13" className="text-blue-700 hover:underline">Additional Work; Changes in Scope</a></li>
          <li><a href="#s14" className="text-blue-700 hover:underline">Confidentiality</a></li>
          <li><a href="#s15" className="text-blue-700 hover:underline">Warranties; Disclaimers; Limitation of Liability</a></li>
          <li><a href="#s16" className="text-blue-700 hover:underline">Force Majeure</a></li>
          <li><a href="#s17" className="text-blue-700 hover:underline">Suspension; Termination for Cause</a></li>
          <li><a href="#s18" className="text-blue-700 hover:underline">Governing Law; Dispute Resolution</a></li>
          <li><a href="#s19" className="text-blue-700 hover:underline">Entire Agreement; Amendments; Assignment; Notices</a></li>
        </ol>
      </aside>

      {/* 1 */}
      <section id="s1" className="mb-8">
        <h2 className="text-xl font-semibold mb-2">1. Parties; Effective Date; Order of Precedence</h2>
        <p>
          This Master Subscription Agreement (“Agreement”) is entered into by and between All Done Sites
          (“Provider”) and the entity or individual identified on the applicable order, proposal, or checkout
          page (“Client”). This Agreement becomes effective on the date the Client accepts the order or signs
          the proposal (the “Effective Date”). Any order form or proposal (each, an “Order”) is incorporated
          by reference. If there is a conflict between this Agreement and an Order, the Order governs only as
          to pricing, plan tier and term; otherwise this Agreement controls.
        </p>
      </section>

      {/* 2 */}
      <section id="s2" className="mb-8">
        <h2 className="text-xl font-semibold mb-3">2. Definitions</h2>
        <dl className="space-y-2">
          <div>
            <dt className="font-medium">Branding</dt>
            <dd className="text-gray-700">
              The Client’s trademarks, logos, colour schemes, fonts, and other brand assets supplied by Client.
            </dd>
          </div>
          <div>
            <dt className="font-medium">Content</dt>
            <dd className="text-gray-700">
              Text, images, video, audio and other materials the Client supplies for inclusion on the Website.
            </dd>
          </div>
          <div>
            <dt className="font-medium">Website</dt>
            <dd className="text-gray-700">
              The website and related software, templates, themes, components, and configurations created or
              provided by Provider under the subscription.
            </dd>
          </div>
          <div>
            <dt className="font-medium">Small Content Update</dt>
            <dd className="text-gray-700">
              Minor tasks such as swapping photos, editing text, or adding a single new section.
            </dd>
          </div>
          <div>
            <dt className="font-medium">Additional Work</dt>
            <dd className="text-gray-700">
              Changes outside a Small Content Update, including new pages, redesigns, custom features, or integrations.
            </dd>
          </div>
          <div>
            <dt className="font-medium">Fair Market Value (FMV)</dt>
            <dd className="text-gray-700">
              A good-faith valuation for purchasing the Website’s code/design considering the time and skill to
              recreate deliverables, prevailing hourly rates, comparable market pricing, and third-party license
              buyouts/transfer costs.
            </dd>
          </div>
          <div>
            <dt className="font-medium">Term</dt>
            <dd className="text-gray-700">
              The initial and any renewal period of the subscription specified in the Order.
            </dd>
          </div>
        </dl>
      </section>

      {/* 3 */}
      <section id="s3" className="mb-8">
        <h2 className="text-xl font-semibold mb-2">3. Scope of Services</h2>
        <p className="mb-2">
          Provider will design, build and host the Website and provide maintenance and support during the
          Term according to the plan tier selected: Starter, Business, or Premium. Most sites are ready in
          7–14 days depending on complexity and timely Client approvals and content. Small Content Updates
          are included as part of ongoing maintenance; Additional Work is out of scope and will be quoted and
          billed separately. Provider can connect Client’s existing domain or assist with registration and set up
          professional email addresses. Provider may use third-party themes, plugins, fonts, analytics, CDNs
          or hosting. Licenses remain with Provider unless expressly assigned.
        </p>
      </section>

      {/* 4 */}
      <section id="s4" className="mb-8">
        <h2 className="text-xl font-semibold mb-2">4. Client Responsibilities</h2>
        <p>
          Client will (i) provide Branding and Content, accurate business information, and timely feedback/
          approvals; (ii) warrant it owns or has rights to all supplied Content and Branding; and (iii) comply
          with applicable laws, including privacy and marketing laws (e.g., POPIA). Client is responsible for
          the accuracy and legality of all Content.
        </p>
      </section>

      {/* 5 */}
      <section id="s5" className="mb-8">
        <h2 className="text-xl font-semibold mb-2">5. Ownership; License; Access</h2>
        <ol className="list-decimal list-inside space-y-1">
          <li><strong>Client Ownership.</strong> Client owns its Branding and Content.</li>
          <li>
            <strong>Provider Ownership.</strong> Provider owns the Website design, code, templates, components, build
            scripts, configurations and other IP created or provided by Provider.
          </li>
          <li>
            <strong>Subscription License.</strong> While the subscription is active, Provider grants Client a limited,
            non-exclusive, non-transferable license to use and publicly display the Website hosted by Provider
            for Client’s business purposes.
          </li>
          <li>
            <strong>Administrative Access.</strong> Provider may restrict back-end access to protect platform integrity.
            Full code/database access is provided only upon Buyout under Section 10.
          </li>
          <li>
            <strong>No Work-For-Hire.</strong> The Website is not a work-for-hire and no assignment of Provider IP
            occurs unless and until Buyout is completed.
          </li>
        </ol>
      </section>

      {/* 6 */}
      <section id="s6" className="mb-8">
        <h2 className="text-xl font-semibold mb-2">6. SEO Levels</h2>
        <p>
          <strong>Starter Plan</strong> — Basic SEO setup for launch. <strong>Business Plan</strong> — Solid SEO optimisation for
          good search visibility, without ongoing analytics or performance enhancements. <strong>Premium Plan</strong> —
          Enhanced SEO with ongoing analytics, reporting, and performance improvements. No specific rankings
          are guaranteed.
        </p>
      </section>

      {/* 7 */}
      <section id="s7" className="mb-8">
        <h2 className="text-xl font-semibold mb-2">7. Term; Minimum Commitment; Cancellation</h2>
        <ol className="list-decimal list-inside space-y-1">
          <li><strong>Minimum Term.</strong> The standard minimum commitment is six (6) months.</li>
          <li><strong>Trial.</strong> If Client is invited to an introductory one-month trial, Client may cancel at the end of that month with no further charges.</li>
          <li><strong>Early Cancellation.</strong> Client may terminate early but remains liable for all remaining amounts due through the end of the six-month minimum.</li>
          <li><strong>Notice.</strong> Client must give written notice of cancellation. Provider will coordinate a smooth transition of Client’s Branding and Content.</li>
        </ol>
      </section>

      {/* 8 */}
      <section id="s8" className="mb-8">
        <h2 className="text-xl font-semibold mb-2">8. Fees; Invoicing; No Refunds; Taxes</h2>
        <ol className="list-decimal list-inside space-y-1">
          <li><strong>Subscription Fees.</strong> Fees are due monthly in advance within the first five (5) business days of each month unless otherwise stated in the Order.</li>
          <li><strong>Additional Work.</strong> Out-of-scope work will be quoted and, once approved, billed at the then-current rates.</li>
          <li><strong>No Refunds.</strong> Payments are non-refundable.</li>
          <li><strong>Taxes.</strong> Fees are exclusive of VAT and other taxes, which will be added where applicable.</li>
          <li><strong>Currency.</strong> International Clients may be charged in their local currency; conversions are handled by the payment processor.</li>
        </ol>
      </section>

      {/* 9 */}
      <section id="s9" className="mb-8">
        <h2 className="text-xl font-semibold mb-2">9. Non-Payment; Suspension; Data Retention</h2>
        <p>
          If payment stops, the Website remains online for thirty (30) days. Thereafter the Website may be
          suspended and a backup will be retained for three (3) additional months. If payment is not received
          within that retention period, the Website and associated files may be permanently deleted. Provider
          may charge a reactivation fee to restore suspended service.
        </p>
      </section>

      {/* 10 */}
      <section id="s10" className="mb-8">
        <h2 className="text-xl font-semibold mb-2">10. Buyout; Transfer to Another Host</h2>
        <ol className="list-decimal list-inside space-y-1">
          <li><strong>Buyout Option.</strong> After the six-month minimum is satisfied and all amounts are paid, Client may elect to purchase the Website (design and code) at Fair Market Value (FMV) plus the cost of any Additional Work and third-party license buyouts/transfer fees.</li>
          <li><strong>Valuation.</strong> FMV will consider estimated recreation hours × Provider’s standard rates, comparable market values, and license replacement costs.</li>
          <li><strong>Deliverables on Buyout.</strong> Upon receipt of Buyout payment, Provider will deliver a reasonable export (e.g., code bundle and database dump where applicable) and provide limited transition assistance.</li>
          <li><strong>Third-Party Licenses.</strong> Certain licenses (e.g., premium themes/plugins, fonts) may be non-transferable; Client must obtain its own licenses post-transfer.</li>
        </ol>
      </section>

      {/* 11 */}
      <section id="s11" className="mb-8">
        <h2 className="text-xl font-semibold mb-2">11. Service Levels; Maintenance; Security</h2>
        <ol className="list-decimal list-inside space-y-1">
          <li><strong>Hosting & Maintenance.</strong> Hosting, updates and security patches are included while the subscription is active.</li>
          <li><strong>Response Times.</strong> Critical issues affecting site availability will be addressed within twenty-four (24) hours; non-critical requests will be scheduled within a commercially reasonable timeframe.</li>
          <li><strong>Backups & Monitoring.</strong> Provider maintains backups and monitoring on a best-effort basis.</li>
          <li><strong>Disclaimer.</strong> Internet, hosting and third-party failures may occur; Provider does not warrant uninterrupted or error-free service.</li>
        </ol>
      </section>

      {/* 12 */}
      <section id="s12" className="mb-8">
        <h2 className="text-xl font-semibold mb-2">12. Content Standards; Compliance; Data Protection</h2>
        <p>
          Client is solely responsible for all Content and for maintaining lawful privacy and terms pages where
          applicable. Client must comply with marketing and privacy laws (including POPIA) when collecting
          personal information. To the extent Provider processes personal information on Client’s behalf,
          Provider acts as an operator under POPIA and will process such data only on Client’s lawful instructions.
        </p>
      </section>

      {/* 13 */}
      <section id="s13" className="mb-8">
        <h2 className="text-xl font-semibold mb-2">13. Additional Work; Changes in Scope</h2>
        <p>
          Provider may in good faith determine that a request constitutes Additional Work or a scope change and
          may quote a revised recurring fee or a one-off project fee. Work will commence once approved.
        </p>
      </section>

      {/* 14 */}
      <section id="s14" className="mb-8">
        <h2 className="text-xl font-semibold mb-2">14. Confidentiality</h2>
        <p>
          Each party may receive confidential information (“Confidential Information”) from the other. The
          receiving party will use the disclosing party’s Confidential Information solely to perform under this
          Agreement and will protect it using reasonable measures. Exceptions include information that is public,
          independently developed, rightfully received from a third party, or required to be disclosed by law.
        </p>
      </section>

      {/* 15 */}
      <section id="s15" className="mb-8">
        <h2 className="text-xl font-semibold mb-2">15. Warranties; Disclaimers; Limitation of Liability</h2>
        <ol className="list-decimal list-inside space-y-1">
          <li><strong>Mutual Warranties.</strong> Each party warrants it has the authority to enter into this Agreement. Client warrants it owns or has obtained rights to all Content and Branding supplied.</li>
          <li><strong>Disclaimers.</strong> Except as expressly stated, the services are provided “as is” without warranties of any kind. Provider disclaims implied warranties of merchantability, fitness for a particular purpose and non-infringement.</li>
          <li><strong>Limitation.</strong> To the maximum extent permitted by law, Provider’s aggregate liability arising out of or related to this Agreement will not exceed the amounts paid by Client to Provider in the twelve (12) months immediately preceding the claim. In no event will Provider be liable for indirect, incidental, special, exemplary, punitive or consequential damages, or loss of profits, revenue, data or goodwill.</li>
        </ol>
      </section>

      {/* 16 */}
      <section id="s16" className="mb-8">
        <h2 className="text-xl font-semibold mb-2">16. Force Majeure</h2>
        <p>
          Neither party will be liable for delays or failures due to events beyond its reasonable control, including
          acts of God, internet or hosting failures, civil disturbances, labour disputes or governmental actions.
        </p>
      </section>

      {/* 17 */}
      <section id="s17" className="mb-8">
        <h2 className="text-xl font-semibold mb-2">17. Suspension; Termination for Cause</h2>
        <p>
          Provider may suspend or terminate the service for: (i) non-payment; (ii) material breach not cured
          within ten (10) days after notice; (iii) unlawful, infringing, or abusive use. Upon termination for cause,
          outstanding fees become immediately due.
        </p>
      </section>

      {/* 18 */}
      <section id="s18" className="mb-8">
        <h2 className="text-xl font-semibold mb-2">18. Governing Law; Dispute Resolution</h2>
        <p>
          This Agreement is governed by the laws of the Republic of South Africa, without regard to conflict-of-law
          rules. The parties will first attempt to resolve disputes amicably; failing that, they will submit to
          mediation, and if unresolved, the courts of the Western Cape, South Africa will have exclusive jurisdiction.
        </p>
      </section>

      {/* 19 */}
      <section id="s19" className="mb-8">
        <h2 className="text-xl font-semibold mb-2">19. Entire Agreement; Amendments; Assignment; Notices</h2>
        <p>
          This Agreement, together with any Orders, constitutes the entire agreement and supersedes prior
          proposals and understandings. Amendments must be in writing and signed. Client may not assign
          this Agreement without Provider’s consent. Notices must be in writing and delivered by email or
          registered post to the addresses on the Order.
        </p>
      </section>
    </div>
  );
}
