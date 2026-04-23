// Cookie policy.
// We only use strictly-necessary cookies, so no consent banner is legally
// required under the ePrivacy Directive / Luxembourg transposition.

import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalPage } from '@/components/LegalPage';
import { LEGAL } from '@/lib/legal-info';

export const metadata: Metadata = {
  title: 'Cookies — Linework Studio',
  description: 'What cookies Linework Studio uses and why.',
};

export default function CookiesPage() {
  return (
    <LegalPage
      eyebrow="Cookie policy"
      title="Cookies"
      lede="What we store in your browser, and why we don't show a cookie banner."
      lastUpdated="23 April 2026"
    >
      <h2>Our approach</h2>
      <p>
        Linework Studio only uses cookies that are strictly necessary for the
        Site to work. We do not use advertising cookies, analytics cookies, or
        cross-site tracking. Because all of our cookies fall under the
        &ldquo;strictly necessary&rdquo; exemption of the ePrivacy Directive,
        no consent banner is required.
      </p>

      <h2>Cookies we set</h2>
      <table className="admin-table" style={{ marginTop: 8 }}>
        <thead>
          <tr>
            <th>Name</th>
            <th>Purpose</th>
            <th>Lifetime</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>admin_session</code></td>
            <td>
              Keeps the studio admin panel signed in. Set only when the trader
              logs into /admin; never set for customers.
            </td>
            <td>Session</td>
          </tr>
        </tbody>
      </table>

      <h2>Third-party cookies</h2>
      <p>
        When you proceed to the Stripe checkout page, Stripe sets its own
        cookies to detect fraud and remember your payment. Those cookies are
        governed by{' '}
        <a
          href="https://stripe.com/cookies-policy/legal"
          target="_blank"
          rel="noreferrer noopener"
        >
          Stripe&rsquo;s cookie policy
        </a>{' '}
        and set in your browser when you&rsquo;re on <code>checkout.stripe.com</code>,
        not on Linework Studio.
      </p>

      <h2>Changing your mind</h2>
      <p>
        You can clear cookies at any time from your browser settings. Clearing
        the <code>admin_session</code> cookie will simply log the admin out.
      </p>

      <h2>Changes &amp; contact</h2>
      <p>
        If we start using analytics or other optional cookies, we will update
        this page and add a consent banner before doing so. Questions? Write
        to <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>.
      </p>

      <p>
        See also the <Link href="/legal/privacy">privacy policy</Link> for how
        we handle other personal data.
      </p>
    </LegalPage>
  );
}
