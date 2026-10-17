import { revalidatePath } from 'next/cache';

/**
 * Drop the cached HTML of every product page (/shop/<slug>).
 *
 * Product pages are ISR-cached (revalidate = 300 in app/shop/[slug]/page.tsx)
 * and embed the storage URLs of the poster's preview and mockups. Any admin
 * action that changes those images or a poster's details must call this, or
 * visitors keep seeing the old images — the homepage and city pages are
 * force-dynamic and update immediately, so the mismatch is easy to miss.
 */
export function revalidatePosterPages(): void {
  revalidatePath('/shop/[slug]', 'page');
}
