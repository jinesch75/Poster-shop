import type { Metadata } from 'next';
import { outfit, manrope } from '@/lib/fonts';
import './globals.css';

export const metadata: Metadata = {
  title: 'Linework Studio — Architectural posters, Mondrian-inspired',
  description:
    'Original architectural posters where draftsman\'s line meets the De Stijl palette. High-resolution digital downloads from €5. Printed at A4 from any home or local print shop.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
  openGraph: {
    title: 'Linework Studio',
    description:
      'Architectural posters, Mondrian-inspired. Digital downloads from €5.',
    type: 'website',
    locale: 'en_GB',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${outfit.variable} ${manrope.variable}`}>
      <body>{children}</body>
    </html>
  );
}
