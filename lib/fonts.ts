import { Outfit, Manrope } from 'next/font/google';

// Display face — Outfit (geometric sans, Scandinavian-design feel)
export const outfit = Outfit({
  subsets: ['latin'],
  weight: ['200', '300', '400', '500', '600', '700'],
  variable: '--font-display',
  display: 'swap',
});

// Body face — Manrope (clean, slightly technical sans)
export const manrope = Manrope({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-body',
  display: 'swap',
});
