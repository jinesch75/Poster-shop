'use server';

// Server actions invoked from the product page ("Buy now") and the cart
// page ("Checkout"). Keep the Stripe SDK firmly on the server and redirect
// the browser to the Checkout Session.
//
// Errors propagate as thrown Errors — Next.js will render the closest
// error boundary. A tidier UX (inline error banner) can come later.

import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import {
  createCheckoutForPoster,
  createCheckoutForCart,
  type CheckoutPosterInput,
} from '@/lib/checkout';

/** Maximum cart size we'll accept. Practical guard against abuse / typos. */
const MAX_CART_ITEMS = 25;

/**
 * Single-poster "Buy now" flow from /shop/[slug]. Bypasses the cart.
 */
export async function startCheckoutForPoster(formData: FormData) {
  const slug = formData.get('slug');
  if (typeof slug !== 'string' || !slug) {
    throw new Error('Missing poster slug.');
  }

  const poster = await prisma.poster.findFirst({
    where: { slug, status: 'PUBLISHED' },
    select: {
      id: true,
      slug: true,
      title: true,
      description: true,
      previewKey: true,
      priceDigitalCents: true,
    },
  });

  if (!poster) {
    throw new Error('That poster is no longer available.');
  }

  const url = await createCheckoutForPoster({
    posterId: poster.id,
    slug: poster.slug,
    title: poster.title,
    description: poster.description,
    previewKey: poster.previewKey,
    priceCents: poster.priceDigitalCents,
  });

  // `redirect` works by throwing internally; nothing after this runs.
  redirect(url);
}

/**
 * Multi-poster "Checkout" flow from /cart. The cart page submits a
 * comma-separated `slugs` field built from localStorage; the server is
 * the source of truth for everything else (price, availability, title).
 *
 * Posters that have been unpublished or deleted between add-to-cart and
 * checkout are silently dropped — better than throwing, since the
 * visitor can't easily fix a stale cart from an error page. If the
 * filter empties the cart entirely, we redirect back to /cart with a
 * flag so the page can show an explanatory banner.
 */
export async function startCheckoutForCart(formData: FormData) {
  const raw = formData.get('slugs');
  if (typeof raw !== 'string') {
    throw new Error('Cart is empty.');
  }

  // Trim and de-dupe slugs. Empty strings filtered out so a stray comma
  // doesn't cause a "poster not found" lookup.
  const slugs = Array.from(
    new Set(
      raw
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    ),
  );

  if (slugs.length === 0) {
    throw new Error('Cart is empty.');
  }
  if (slugs.length > MAX_CART_ITEMS) {
    throw new Error(`Cart is too large (max ${MAX_CART_ITEMS} items).`);
  }

  const rows = await prisma.poster.findMany({
    where: { slug: { in: slugs }, status: 'PUBLISHED' },
    select: {
      id: true,
      slug: true,
      title: true,
      description: true,
      previewKey: true,
      priceDigitalCents: true,
    },
  });

  if (rows.length === 0) {
    // Every poster in the cart is gone. Send the visitor back to /cart
    // with a flag so the page renders an empty-cart explanation.
    redirect('/cart?stale=1');
  }

  // Preserve the visitor's intended order. findMany returns rows in
  // index order, not slug-input order; we reorder by the original list
  // so the Stripe page shows items in the order they were added.
  const bySlug = new Map(rows.map((r) => [r.slug, r]));
  const ordered = slugs
    .map((s) => bySlug.get(s))
    .filter((r): r is (typeof rows)[number] => Boolean(r));

  const inputs: CheckoutPosterInput[] = ordered.map((p) => ({
    posterId: p.id,
    slug: p.slug,
    title: p.title,
    description: p.description,
    previewKey: p.previewKey,
    priceCents: p.priceDigitalCents,
  }));

  const url = await createCheckoutForCart(inputs);
  redirect(url);
}
