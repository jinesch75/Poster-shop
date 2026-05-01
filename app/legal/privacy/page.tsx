// Privacy policy — GDPR + Luxembourg data protection.

import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalPage } from '@/components/LegalPage';
import { LEGAL, legalValue } from '@/lib/legal-info';

export const metadata: Metadata = {
  title: 'Privacy — Gridline Cities',
  description: 'How Gridline Cities handles your personal data under GDPR.',
};

export default function PrivacyPage() {
  const address = legalValue(LEGAL.address, 'POSTAL ADDRESS TO BE ADDED');

  return (
    <LegalPage
      eyebrow="Privacy policy"
      title="Privacy policy"
      lede="What personal data Gridline Cities collects, why we collect it, and the rights you have over it under the EU General Data Protection Regulation."
      lastUpdated="23 April 2026"
    >
      <h2>1. Who is the data controller</h2>
      <p>
        The data controller for this Site is <strong>{LEGAL.name}</strong>,
        trading as <strong>{LEGAL.tradingName}</strong>, established in{' '}
        {LEGAL.country}. Contact:{' '}
        <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>.
      </p>
      <p>
        Postal address:{' '}
        {address.kind === 'value' ? (
          address.text
        ) : (
          <span className="legal__placeholder">[{address.text}]</span>
        )}
        .
      </p>

      <h2>2. Data we collect and why</h2>
      <h3>2.1. Newsletter signups</h3>
      <p>
        When you subscribe to the newsletter we store your email address and
        the page you subscribed from. We use this only to send you occasional
        updates about new posters and new city drops. Legal basis: your
        consent (GDPR art. 6(1)(a)). You can unsubscribe at any time via the
        link in every email.
      </p>

      <h3>2.2. Purchases</h3>
      <p>
        When you buy a poster we store your email address (provided to Stripe
        at checkout), the order details, the Stripe customer and payment
        references, and the timing of your download activity. Legal basis:
        performance of the sale contract (GDPR art. 6(1)(b)) and our legal
        obligation to keep accounting records (art. 6(1)(c)).
      </p>

      <h3>2.3. Payments</h3>
      <p>
        Card details are entered on Stripe&rsquo;s checkout page and{' '}
        <strong>never pass through our servers</strong>. Stripe is an
        independent data controller for payment processing; see{' '}
        <a
          href="https://stripe.com/privacy"
          target="_blank"
          rel="noreferrer noopener"
        >
          stripe.com/privacy
        </a>
        .
      </p>

      <h3>2.4. Server logs</h3>
      <p>
        Our hosting provider (Railway) keeps short-lived technical logs of
        requests to the Site, including IP address and user-agent, for
        security and debugging. Legal basis: our legitimate interest in
        operating a secure service (GDPR art. 6(1)(f)).
      </p>

      <h2>3. Cookies</h2>
      <p>
        We use a small number of strictly-necessary cookies (for the admin
        session and the checkout flow). We do not use advertising or
        cross-site tracking cookies. See the{' '}
        <Link href="/legal/cookies">Cookies page</Link> for the full list.
      </p>

      <h2>4. Who we share data with</h2>
      <p>Personal data is shared only with service providers who process it on our behalf:</p>
      <ul>
        <li>
          <strong>Stripe</strong> &mdash; payment processing. Established in
          Ireland; transfers may be safeguarded by EU Standard Contractual
          Clauses.
        </li>
        <li>
          <strong>Brevo</strong> (Sendinblue SAS) &mdash; transactional email
          and newsletter. Established in France (EU).
        </li>
        <li>
          <strong>Railway</strong> &mdash; website hosting. Established in the
          United States; transfers are safeguarded by EU Standard Contractual
          Clauses.
        </li>
      </ul>
      <p>We do not sell your personal data to anyone.</p>

      <h2>5. How long we keep data</h2>
      <ul>
        <li>Newsletter email: until you unsubscribe.</li>
        <li>Order records: for 10 years, to meet Luxembourg accounting obligations.</li>
        <li>Server logs: short-term, typically under 30 days.</li>
      </ul>

      <h2>6. Your rights</h2>
      <p>Under the GDPR you have the right to:</p>
      <ul>
        <li>access the personal data we hold about you;</li>
        <li>rectify inaccurate data;</li>
        <li>erase your data (subject to our legal retention obligations);</li>
        <li>restrict or object to processing;</li>
        <li>receive your data in a portable format;</li>
        <li>withdraw your consent at any time, without affecting prior processing.</li>
      </ul>
      <p>
        To exercise any of these, email{' '}
        <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>. You also have the
        right to lodge a complaint with the Luxembourg data protection
        authority (
        <a
          href="https://cnpd.public.lu/"
          target="_blank"
          rel="noreferrer noopener"
        >
          Commission nationale pour la protection des données
        </a>
        ).
      </p>

      <h2>7. Changes to this policy</h2>
      <p>
        We may update this policy to reflect new services or legal
        developments. The &ldquo;last updated&rdquo; date at the top of the
        page shows the current version.
      </p>
    </LegalPage>
  );
}
