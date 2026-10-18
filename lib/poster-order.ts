// Poster ordering.
//
// Posters are listed alphabetically by title within each city (poster
// numbers were removed 2026-10-18). Sorting happens in JS rather than in
// Postgres so it ignores case and accents the way a reader would:
// "Écluse" sits with the E's, "the Shard" with the T's.

const collator = new Intl.Collator('en', { sensitivity: 'base', numeric: true });

/** A→Z by title. */
export function byTitle(a: { title: string }, b: { title: string }): number {
  return collator.compare(a.title, b.title);
}

const STATUS_RANK: Record<string, number> = { PUBLISHED: 0, DRAFT: 1, ARCHIVED: 2 };
const GALLERY_RANK: Record<string, number> = { MAIN: 0, MONDRIAN: 1 };

/**
 * Admin catalogue order (Rename all): live posters first, the main gallery
 * before the Mondrian gallery, cities in their site order, then A→Z.
 */
export function catalogueOrder(
  a: { status: string; gallery: string; title: string; city: { number: string } },
  b: { status: string; gallery: string; title: string; city: { number: string } },
): number {
  return (
    (STATUS_RANK[a.status] ?? 9) - (STATUS_RANK[b.status] ?? 9) ||
    (GALLERY_RANK[a.gallery] ?? 9) - (GALLERY_RANK[b.gallery] ?? 9) ||
    collator.compare(a.city.number, b.city.number) ||
    byTitle(a, b)
  );
}
