// Sibling selection for the living-room triptych mockup.
//
// A triptych mockup pairs the main poster (in the centre frame) with two
// sibling posters bookending it on the left and right. Siblings have to
// come from the same gallery (a Mondrian-style poster never sits beside
// a Main one), and same-city siblings are preferred over other-city
// siblings within the same gallery.
//
// We cache up to three variants per poster so visitors see a different
// pairing on repeat visits. Variants are deterministic — given the same
// candidate pool, the same three pairs come out — which keeps re-runs of
// the backfill stable.

import { prisma } from './prisma';
import type { Gallery } from '@prisma/client';

/** Subset of Poster needed to build a triptych mockup. */
export type SiblingCandidate = {
  id: string;
  cityId: string;
  gallery: Gallery;
  number: string;
  previewKey: string | null;
  thumbnailKey: string | null;
  masterKey: string;
};

/** A pair of siblings that bookend the main poster (left + right of the triptych). */
export type SiblingPair = [SiblingCandidate, SiblingCandidate];

/** Maximum cached variants per poster (one per sibling pair). */
export const MAX_VARIANTS = 3;

/**
 * Pick up to MAX_VARIANTS deterministic pairs of siblings from the
 * candidate pool. Pure function — no DB.
 *
 * Selection rules:
 *   1. Skip the target itself.
 *   2. Same-gallery only (Mondrian doesn't mix with Main).
 *   3. Same-city siblings are pulled to the front of the pool, so the
 *      first pairs always use them when they exist.
 *   4. Pairs are combinations-of-2 from the pool, in order — pool[0]+pool[1],
 *      pool[0]+pool[2], pool[1]+pool[2], pool[0]+pool[3], …
 *      We stop after MAX_VARIANTS or when we run out of pairs.
 *
 * Returns [] if fewer than 2 candidates remain after filtering — the
 * caller should treat that as "no triptych available for this poster".
 */
export function selectSiblingPairs(
  target: { id: string; cityId: string; gallery: Gallery },
  candidates: SiblingCandidate[],
  maxPairs: number = MAX_VARIANTS,
): SiblingPair[] {
  const sameGallery = candidates.filter(
    (p) => p.id !== target.id && p.gallery === target.gallery,
  );
  // Same-city siblings come first in the pool (preferred), then other cities.
  const sameCity = sameGallery.filter((p) => p.cityId === target.cityId);
  const otherCities = sameGallery.filter((p) => p.cityId !== target.cityId);
  const pool = [...sameCity, ...otherCities];

  if (pool.length < 2) return [];

  const pairs: SiblingPair[] = [];
  outer: for (let i = 0; i < pool.length - 1; i++) {
    for (let j = i + 1; j < pool.length; j++) {
      pairs.push([pool[i], pool[j]]);
      if (pairs.length >= maxPairs) break outer;
    }
  }
  return pairs;
}

/**
 * Fetch the candidate pool for a poster from the DB and return up to
 * MAX_VARIANTS sibling pairs to use in its triptych mockups.
 *
 * Only PUBLISHED posters with a previewKey are eligible — drafts or
 * posters without a generated preview can't be composited.
 */
export async function getSiblingPairsForPoster(
  posterId: string,
): Promise<SiblingPair[]> {
  const target = await prisma.poster.findUnique({
    where: { id: posterId },
    select: { id: true, cityId: true, gallery: true },
  });
  if (!target) return [];

  const candidates = await prisma.poster.findMany({
    where: {
      id: { not: posterId },
      gallery: target.gallery,
      status: 'PUBLISHED',
      previewKey: { not: null },
    },
    select: {
      id: true,
      cityId: true,
      gallery: true,
      number: true,
      previewKey: true,
      thumbnailKey: true,
      masterKey: true,
    },
    // Stable ordering keeps pairs deterministic across reruns.
    orderBy: [{ cityId: 'asc' }, { number: 'asc' }],
  });

  return selectSiblingPairs(target, candidates as SiblingCandidate[]);
}
