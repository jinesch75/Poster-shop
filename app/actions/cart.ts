'use server';

// Server action used by the /cart page to hydrate the cart with current
// poster data. The cart on the client is just a list of slugs in
// localStorage; everything else (title, price, preview image,
// availability) is loaded fresh from the DB on every cart render so a
// stale cart can't show a stale price.

import { prisma } from '@/lib/prisma';
import { publicUrl } from '@/lib/storage';

export type CartLineView = {
  slug: string;
  title: string;
  number: string;
  cityName: string;
  /** Watermarked preview image URL — never the master. */
  previewFile: string;
  priceEur: number;
  priceCents: number;
};

/**
 * Look up posters by slug. Slugs not found (deleted/unpublished) are
 * silently dropped — the caller compares input vs. output to detect
 * stale cart entries and remove them client-side.
 */
export async function getCartPreviews(
  slugs: string[],
): Promise<CartLineView[]> {
  // De-dupe + drop empties. Defensive — the client should already do
  // this, but server actions are reachable from anywhere.
  const cleaned = Array.from(
    new Set(slugs.map((s) => s.trim()).filter(Boolean)),
  );
  if (cleaned.length === 0) return [];

  const rows = await prisma.poster.findMany({
    where: { slug: { in: cleaned }, status: 'PUBLISHED' },
    include: { city: { select: { name: true } } },
  });

  // Map back into the order the caller asked for so the cart UI keeps
  // the visitor's add-to-cart order.
  const bySlug = new Map(rows.map((r) => [r.slug, r]));
  const out: CartLineView[] = [];
  for (const slug of cleaned) {
    const r = bySlug.get(slug);
    if (!r) continue;
    const previewKey = r.previewKey ?? r.thumbnailKey ?? r.masterKey;
    out.push({
      slug: r.slug,
      title: r.title,
      number: r.number,
      cityName: r.city.name,
      previewFile: publicUrl(previewKey),
      priceEur: Math.round(r.priceDigitalCents / 100),
      priceCents: r.priceDigitalCents,
    });
  }
  return out;
}
