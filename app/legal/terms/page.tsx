// Terms & conditions of sale — digital goods, Luxembourg base, EU consumers.

import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalPage } from '@/components/LegalPage';
import { LEGAL } from '@/lib/legal-info';

export const metadata: Metadata = {
  title: 'Terms — Gridline Cities',
  description: 'Terms of sale for digital posters at Gridline Cities.',
};

export default function TermsPage() {
  return (
    <LegalPage
      eyebrow="Terms of sale"
      title="Terms & conditions"
      lede="The terms on which Gridline Cities sells digital posters to customers in the European Union and beyond."
      lastUpdated="23 April 2026"
    >
      <h2>1. Who we are</h2>
      <p>
        These terms govern your use of gridlinecities.com (the &ldquo;Site&rdquo;) and
        any purchases you make from it. The Site is operated by{' '}
        <strong>{LEGAL.name}</strong>, trading as <strong>{LEGAL.tradingName}</strong>,
        established in {LEGAL.country}. Full trader details are listed on the{' '}
        <Link href="/legal/imprint">Imprint page</Link>.
      </p>

      <h2>2. The product</h2>
      <p>
        We sell <strong>digital poster files</strong> intended for personal
        printing at home, at a print shop, or via a third-party print-on-demand
        service. Each poster is delivered as a high-resolution image file.
        Printed posters and framed goods are not sold at this time.
      </p>
      <p>
        The posters are created by the studio using digital tools. Products and
        files are sold as seen on the Site. Physical printed output will vary
        with your paper, printer and calibration.
      </p>

      <h2>3. Pricing &amp; VAT</h2>
      <p>
        Prices shown include any applicable value-added tax (VAT). VAT is
        collected automatically by Stripe Tax based on the billing address you
        provide at checkout. Prices are quoted in euros (&euro;).
      </p>
      <p>
        We may change prices at any time; the price that applies to your order
        is the one shown at the moment you confirm the purchase.
      </p>

      <h2>4. Placing an order</h2>
      <p>
        An order is placed when you complete checkout through our payment
        provider, Stripe. Your payment authorises the purchase; the contract is
        formed once payment is confirmed and we&rsquo;ve emailed you the download
        link(s).
      </p>

      <h2>5. Delivery of digital files</h2>
      <p>
        After payment you will receive a confirmation email with one download
        link per item purchased. Links are also available on the order success
        page immediately after checkout.
      </p>
      <p>
        Download links are active for <strong>48 hours</strong> from the moment
        of purchase and allow <strong>up to 5 downloads</strong> each. Save the
        file to your own device as soon as you receive it.
      </p>
      <p>
        If a link expires or fails for any reason, reply to your order email or
        write to <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a> and we will
        re-issue it.
      </p>

      <h2>6. Right of withdrawal &mdash; digital content</h2>
      <p>
        Under EU consumer law (Directive 2011/83/EU, art. 16(m) and the
        Luxembourg consumer code), you normally have a 14-day right to withdraw
        from a distance-sale contract without giving a reason.
      </p>
      <p>
        <strong>This right does not apply to the supply of digital content</strong>{' '}
        that is not delivered on a tangible medium if performance has begun with
        your prior express consent and acknowledgement that you lose the right
        of withdrawal.
      </p>
      <p>
        By confirming the order on the checkout page you:
      </p>
      <ul>
        <li>expressly request that we begin supplying the digital file immediately; and</li>
        <li>acknowledge that you lose the right of withdrawal once the file has been made available for download.</li>
      </ul>
      <p>
        Requesting and receiving the download link therefore ends the withdrawal
        right for that item.
      </p>

      <h2>7. Refunds</h2>
      <p>
        Although the right of withdrawal does not apply once a file has been
        downloaded, we will still refund you in the following cases:
      </p>
      <ul>
        <li>the file is technically broken or substantially different from what was advertised;</li>
        <li>a duplicate charge was placed on your payment method; or</li>
        <li>the download link never worked and we are unable to re-issue it.</li>
      </ul>
      <p>
        See the <Link href="/legal/refund">Refunds page</Link> for the full
        policy and how to claim.
      </p>

      <h2>8. Licence granted to you</h2>
      <p>
        The purchase price includes a personal, non-exclusive, non-transferable
        licence to use the file. The scope is detailed on the{' '}
        <Link href="/legal/licence">Licence page</Link>. In short: personal and
        home use is allowed; commercial reproduction or resale is not.
      </p>

      <h2>9. Our liability</h2>
      <p>
        We take care to describe the posters accurately and to deliver files
        free of technical defects. To the extent permitted by law, our liability
        for any single order is limited to the price paid for that order.
        Nothing in these terms limits your statutory rights as a consumer or
        our liability for fraud or gross negligence.
      </p>

      <h2>10. Changes to these terms</h2>
      <p>
        We may update these terms from time to time. The version that applies
        to your order is the one published on the Site at the moment of
        purchase. The &ldquo;last updated&rdquo; date at the top of this page
        reflects the current version.
      </p>

      <h2>11. Governing law &amp; jurisdiction</h2>
      <p>
        These terms are governed by the laws of the Grand Duchy of Luxembourg.
        If you are a consumer resident in the EU, this does not deprive you of
        the protection of the mandatory consumer-law rules of your country of
        residence. Disputes will be heard by the competent courts of Luxembourg,
        without prejudice to any mandatory forum rule in your favour.
      </p>

      <h2>12. Contact</h2>
      <p>
        Questions about these terms? Write to{' '}
        <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>.
      </p>
    </LegalPage>
  );
}
