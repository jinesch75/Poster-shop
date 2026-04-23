// Shared chrome for legal pages.
// Renders Nav + Footer + a consistent content frame so each individual
// legal page (terms.tsx, privacy.tsx, etc.) only owns its prose.

import Link from 'next/link';
import { Nav } from '@/components/Nav';
import { Footer } from '@/components/Footer';

type LegalPageProps = {
  eyebrow: string; // "Legal" | "Policy" | "Notice"
  title: string;
  lede?: string;
  lastUpdated: string; // "23 April 2026"
  children: React.ReactNode;
};

// Kept here so every legal page links to the same siblings. Edit in one place.
const LEGAL_ROUTES: { href: string; label: string }[] = [
  { href: '/legal/terms', label: 'Terms' },
  { href: '/legal/privacy', label: 'Privacy' },
  { href: '/legal/cookies', label: 'Cookies' },
  { href: '/legal/refund', label: 'Refunds' },
  { href: '/legal/licence', label: 'Licence' },
  { href: '/legal/imprint', label: 'Imprint' },
];

export function LegalPage({ eyebrow, title, lede, lastUpdated, children }: LegalPageProps) {
  return (
    <>
      <Nav />
      <article className="legal">
        <div className="legal__eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        {lede && <p className="legal__lede">{lede}</p>}
        <div className="legal__updated">Last updated {lastUpdated}</div>
        {children}
        <nav className="legal__nav" aria-label="Other policies">
          {LEGAL_ROUTES.map((r) => (
            <Link key={r.href} href={r.href}>
              {r.label}
            </Link>
          ))}
        </nav>
      </article>
      <Footer />
    </>
  );
}
