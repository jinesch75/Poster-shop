// Mentions légales / Imprint.
// Required under EU e-commerce directive (Luxembourg: Loi du 14 août 2000).
// Must list the trader's identity and a means of direct contact.

import type { Metadata } from 'next';
import { LegalPage } from '@/components/LegalPage';
import { LEGAL, legalValue } from '@/lib/legal-info';

export const metadata: Metadata = {
  title: 'Imprint — Gridline Cities',
  description: 'Legal notice and trader information for Gridline Cities.',
};

function Value({ value, placeholder }: { value: string | null; placeholder: string }) {
  const v = legalValue(value, placeholder);
  return v.kind === 'value' ? (
    <>{v.text}</>
  ) : (
    <span className="legal__placeholder">[{v.text}]</span>
  );
}

export default function ImprintPage() {
  return (
    <LegalPage
      eyebrow="Legal notice"
      title="Imprint"
      lede="Identity of the trader behind Gridline Cities, as required under EU e-commerce law."
      lastUpdated="23 April 2026"
    >
      <h2>Trader</h2>
      <p>
        <strong>{LEGAL.name}</strong>, trading as <strong>{LEGAL.tradingName}</strong>.
        Individual trader established in {LEGAL.country}.
      </p>

      <h2>Contact</h2>
      <p>
        Email:{' '}
        <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>
      </p>
      <p>
        Postal address:{' '}
        <Value value={LEGAL.address} placeholder="ADDRESS TO BE ADDED BEFORE LAUNCH" />
      </p>

      <h2>Registration</h2>
      <p>
        Luxembourg business permit (autorisation d&rsquo;établissement):{' '}
        <Value
          value={LEGAL.businessPermit}
          placeholder="BUSINESS PERMIT NUMBER PENDING"
        />
      </p>
      <p>
        Registre de Commerce et des Sociétés (RCS):{' '}
        <Value value={LEGAL.rcsNumber} placeholder="NOT REGISTERED" />
      </p>
      <p>
        VAT identification number:{' '}
        <Value
          value={LEGAL.vatNumber}
          placeholder="NOT VAT-REGISTERED — BELOW THRESHOLD"
        />
      </p>

      <h2>Hosting</h2>
      <p>
        This site is hosted on Railway (Railway Corp., 548 Market St PMB 80455,
        San Francisco, CA 94104, USA). Payment processing is provided by Stripe
        Payments Europe Ltd. (The One Building, 1 Grand Canal Street Lower,
        Dublin 2, D02 H210, Ireland). Transactional email is sent via Brevo
        (Sendinblue SAS, 106 boulevard Haussmann, 75008 Paris, France).
      </p>

      <h2>Dispute resolution</h2>
      <p>
        Consumers based in the European Union may use the European Commission&rsquo;s
        online dispute resolution platform at{' '}
        <a
          href="https://ec.europa.eu/consumers/odr/"
          target="_blank"
          rel="noreferrer noopener"
        >
          ec.europa.eu/consumers/odr
        </a>
        . We prefer to resolve matters directly — please write to us first at{' '}
        <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>.
      </p>
    </LegalPage>
  );
}
