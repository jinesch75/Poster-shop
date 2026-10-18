// Catalogue ordering for posters.
//
// Poster numbers are stored as text ("N°07"). Sorting text puts "N°9"
// after "N°10" and "N°100" before "N°20", so anything that orders posters
// by number goes through numberValue(), which reads the digits.

/** Numeric value of a poster number ("N°07" → 7). No digits → sorts last. */
export function numberValue(number: string): number {
  const m = /(\d+)/.exec(number);
  return m ? parseInt(m[1], 10) : Number.POSITIVE_INFINITY;
}

/** Order two posters within the same list by their number, then title. */
export function byPosterNumber(
  a: { number: string; title: string },
  b: { number: string; title: string },
): number {
  return numberValue(a.number) - numberValue(b.number) || a.title.localeCompare(b.title);
}

const STATUS_RANK: Record<string, number> = { PUBLISHED: 0, DRAFT: 1, ARCHIVED: 2 };
const GALLERY_RANK: Record<string, number> = { MAIN: 0, MONDRIAN: 1 };

/**
 * Full catalogue order, as used by "Number in this order" on
 * /admin/posters/rename: live posters first, the main gallery before the
 * Mondrian gallery, cities in their site order (City.number), then the
 * current poster number within each city.
 */
export function catalogueOrder(
  a: { status: string; gallery: string; number: string; title: string; city: { number: string } },
  b: { status: string; gallery: string; number: string; title: string; city: { number: string } },
): number {
  return (
    (STATUS_RANK[a.status] ?? 9) - (STATUS_RANK[b.status] ?? 9) ||
    (GALLERY_RANK[a.gallery] ?? 9) - (GALLERY_RANK[b.gallery] ?? 9) ||
    numberValue(a.city.number) - numberValue(b.city.number) ||
    byPosterNumber(a, b)
  );
}
