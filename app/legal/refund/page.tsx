// Refund policy — narrower than a general "return policy" because we sell
// digital goods and the EU 14-day withdrawal right is waived at checkout.

import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalPage } from '@/components/LegalPage';
import { LEGAL } from '@/lib/legal-info';

export const metadata: Metadata = {
  title: 'Refunds — Linework Studio',
  description: 'When and how Linework Studio issues refunds for digital posters.',
};

export default function RefundPage() {
  return (
    <LegalPage
      eyebrow="Refund policy"
      title="Refunds"
      lede="Digital posters are not eligible for the usual 14-day change-of-mind right once downloaded. Here&rsquo;s what we do refund, and how to ask."
      lastUpdated="23 April 2026"
    >
      <h2>The default</h2>
      <p>
        Linework Studio sells <strong>digital files for personal printing</strong>.
        At checkout you expressly consent to immediate delivery of the file and
        acknowledge that this ends the statutory 14-day right of withdrawal for
        that item &mdash; this is the regime set out in EU Directive 2011/83/EU,
        art. 16(m), transposed into Luxembourg law.
      </p>
      <p>
        In plain language: once you&rsquo;ve downloaded the file, a change of mind
        does not entitle you to a refund.
      </p>

      <h2>When we will refund</h2>
      <p>Even so, we will issue a full refund when:</p>
      <ul>
        <li>
          <strong>The file is broken or substantially different</strong> from
          what was advertised (wrong aspect ratio, unreadable file, totally
          different image).
        </li>
        <li>
          <strong>You were charged more than once</strong> for the same item
          because of a checkout glitch or a payment retry.
        </li>
        <li>
          <strong>The download link never worked</strong> and we are unable to
          re-issue it to you.
        </li>
      </ul>

      <h2>When we won&rsquo;t refund</h2>
      <ul>
        <li>You downloaded the file and later changed your mind.</li>
        <li>The colour looks different on your printer &mdash; printed output always varies with paper, device and calibration.</li>
        <li>You bought the wrong poster or city by mistake after downloading.</li>
      </ul>
      <p>
        In these cases we&rsquo;re still happy to help &mdash; write to us and we
        may offer store credit at our discretion.
      </p>

      <h2>How to request a refund</h2>
      <p>
        Email <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a> from the
        address you used at checkout. Include your order number (last 8
        characters shown in the receipt email) and a short description of the
        issue. Attach a screenshot if the file looks wrong.
      </p>
      <p>We aim to respond within two working days.</p>

      <h2>Refund timelines</h2>
      <p>
        Approved refunds are issued through Stripe to the original payment
        method. Depending on your bank, the funds typically appear within
        5&ndash;10 working days. We cannot issue refunds to a different card or
        account.
      </p>

      <h2>Related</h2>
      <p>
        For the broader sale terms see the{' '}
        <Link href="/legal/terms">Terms of sale</Link>. For what you can do
        with the file once you have it, see the{' '}
        <Link href="/legal/licence">Licence</Link>.
      </p>
    </LegalPage>
  );
}
