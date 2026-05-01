// Licence terms — what a buyer can and cannot do with a downloaded poster.

import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalPage } from '@/components/LegalPage';
import { LEGAL } from '@/lib/legal-info';

export const metadata: Metadata = {
  title: 'Licence — Gridline Cities',
  description: 'What you may and may not do with a Gridline Cities poster file.',
};

export default function LicencePage() {
  return (
    <LegalPage
      eyebrow="Licence"
      title="Personal-use licence"
      lede="When you buy a poster you receive a licence to use the file. The licence is generous for personal use and narrow for commercial use. Here&rsquo;s the full scope."
      lastUpdated="23 April 2026"
    >
      <h2>You may</h2>
      <ul>
        <li>print the poster for your own home, for a gift, or for your personal workspace;</li>
        <li>print it as many times as you like, on any paper, at any size;</li>
        <li>use a local print shop or a print-on-demand service to produce your own copies;</li>
        <li>keep the file indefinitely &mdash; the licence doesn&rsquo;t expire.</li>
      </ul>

      <h2>You may not</h2>
      <ul>
        <li>resell, redistribute, or share the file, in full or in part, on any platform;</li>
        <li>sell printed copies of the poster, on your own or through a marketplace;</li>
        <li>use the image in products for sale (mugs, t-shirts, canvases, etc.);</li>
        <li>use the image for advertising, corporate premises, or any commercial display;</li>
        <li>modify or re-style the image and present it as an original work;</li>
        <li>train machine-learning models on the file.</li>
      </ul>

      <h2>Commercial licensing</h2>
      <p>
        If you&rsquo;d like to use a poster in a hotel, a bar, a workspace, a
        commercial print run, a merchandise product, or any other paid context,
        please get in touch at{' '}
        <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a> with details of the
        intended use. Commercial licences are handled individually.
      </p>

      <h2>Credit</h2>
      <p>
        Credit is not required for personal prints at home. For any published
        use (press, editorial, social media post about the print hanging
        somewhere), &ldquo;Poster by Gridline Cities&rdquo; is appreciated.
      </p>

      <h2>Ownership</h2>
      <p>
        The posters, the studio name, and the Site design remain the
        intellectual property of <strong>{LEGAL.name}</strong> trading as{' '}
        <strong>{LEGAL.tradingName}</strong>. Your purchase grants a licence to
        use the file, not a transfer of the underlying copyright.
      </p>

      <h2>Related</h2>
      <p>
        See the <Link href="/legal/terms">Terms of sale</Link> for the broader
        contract and the <Link href="/legal/refund">Refund policy</Link> for
        when a purchase can be reversed.
      </p>
    </LegalPage>
  );
}
