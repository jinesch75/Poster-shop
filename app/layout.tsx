import type { Metadata } from 'next';
import { outfit, manrope } from '@/lib/fonts';
import './globals.css';

const SITE_TITLE = 'Gridline Cities — Architectural posters, Mondrian-inspired';
const SITE_DESC =
  "Original architectural posters where draftsman's line meets the De Stijl palette. High-resolution digital downloads from €5, printed A4 at home.";

export const metadata: Metadata = {
  title: SITE_TITLE,
  description: SITE_DESC,
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
  openGraph: {
    title: SITE_TITLE,
    description: SITE_DESC,
    siteName: 'Gridline Cities',
    type: 'website',
    locale: 'en_GB',
    url: '/',
    images: [
      {
        url: '/opengraph-image.png',
        width: 1200,
        height: 630,
        alt: 'Gridline Cities — Architectural posters, Mondrian-inspired.',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: SITE_TITLE,
    description: SITE_DESC,
    images: ['/opengraph-image.png'],
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
