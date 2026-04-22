// Query layer for public poster / city views.
//
// Returns "view model" shapes — plain serializable objects the components
// render directly. Keeps storage keys and price cents out of the templates.
//
// Session 2 stored posters in Postgres. This file, before Session 3, held
// a static mock. Now it's the real thing. Admin pages read Prisma models
// directly; public pages call these helpers.

import { prisma } from '@/lib/prisma';
import { publicUrl } from '@/lib/storage';
import type {
  Poster as PosterRow,
  City as CityRow,
  Orientation,
  CityStatus,
} from '@prisma/client';

export type PosterView = {
  id: string;
  slug: string;
  title: string;
  number: string;
  description: string;
  city: string;
  citySlug: string;
  /** Preview image URL (watermarked). Never the master. */
  file: string;
  priceEur: number;
  orientation: Orientation;
  masterWidthPx: number;
  masterHeightPx: number;
  landmarkType: string | null;
};

export type CityView = {
  slug: string;
  name: string;
  number: string;
  description: string | null;
  heroFile: string;
  posterCount: number;
  status: CityStatus;
  statusLabel: string;
};

// Human-readable default if a city has no explicit statusLabel set.
function defaultStatusLabel(status: CityStatus): string {
  switch (status) {
    case 'AVAILABLE':
      return 'Available';
    case 'IN_PROGRESS':
      return 'In progress';
    case 'PLANNED':
      return 'Planned';
  }
}

function toPosterView(
  p: PosterRow & { city: Pick<CityRow, 'name' | 'slug'> },
): PosterView {
  // Prefer the watermarked preview; fall back to thumbnail; absolute last
  // resort is the master (the /api/storage route refuses to serve masters,
  // so this just shows a broken image, which is better than leaking them).
  const previewKey = p.previewKey ?? p.thumbnailKey ?? p.masterKey;
  return {
    id: p.id,
    slug: p.slug,
    title: p.title,
    number: p.number,
    description: p.description,
    city: p.city.name,
    citySlug: p.city.slug,
    file: publicUrl(previewKey),
    priceEur: Math.round(p.priceDigitalCents / 100),
    orientation: p.orientation,
    masterWidthPx: p.masterWidthPx,
    masterHeightPx: p.masterHeightPx,
    landmarkType: p.landmarkType,
  };
}

function toCityView(
  c: CityRow & { _count: { posters: number } },
): CityView {
  return {
    slug: c.slug,
    name: c.name,
    number: c.number,
    description: c.description,
    heroFile: publicUrl(c.heroImage),
    posterCount: c._count.posters,
    status: c.status,
    statusLabel: c.statusLabel ?? defaultStatusLabel(c.status),
  };
}

// ---------- Posters ----------

export type PosterFilters = {
  citySlug?: string;
  orientation?: Orientation;
  landmarkType?: string;
};

export async function getPublishedPosters(
  filters: PosterFilters = {},
): Promise<PosterView[]> {
  const rows = await prisma.poster.findMany({
    where: {
      status: 'PUBLISHED',
      ...(filters.citySlug && { city: { slug: filters.citySlug } }),
      ...(filters.orientation && { orientation: filters.orientation }),
      ...(filters.landmarkType && { landmarkType: filters.landmarkType }),
    },
    include: { city: { select: { name: true, slug: true } } },
    orderBy: [{ city: { name: 'asc' } }, { number: 'asc' }],
  });
  return rows.map(toPosterView);
}

export async function getPosterBySlug(slug: string): Promise<PosterView | null> {
  const row = await prisma.poster.findFirst({
    where: { slug, status: 'PUBLISHED' },
    include: { city: { select: { name: true, slug: true } } },
  });
  return row ? toPosterView(row) : null;
}

export async function getRelatedPosters(
  poster: PosterView,
  limit = 3,
): Promise<PosterView[]> {
  const rows = await prisma.poster.findMany({
    where: {
      status: 'PUBLISHED',
      city: { slug: poster.citySlug },
      slug: { not: poster.slug },
    },
    include: { city: { select: { name: true, slug: true } } },
    orderBy: { number: 'asc' },
    take: limit,
  });
  return rows.map(toPosterView);
}

/** Used by generateStaticParams on /shop/[slug] */
export async function getPublishedPosterSlugs(): Promise<string[]> {
  const rows = await prisma.poster.findMany({
    where: { status: 'PUBLISHED' },
    select: { slug: true },
  });
  return rows.map((r) => r.slug);
}

// ---------- Cities ----------

export async function getCities(): Promise<CityView[]> {
  const rows = await prisma.city.findMany({
    include: { _count: { select: { posters: { where: { status: 'PUBLISHED' } } } } },
    orderBy: { number: 'asc' },
  });
  return rows.map(toCityView);
}

export async function getCityBySlug(slug: string): Promise<CityView | null> {
  const row = await prisma.city.findUnique({
    where: { slug },
    include: { _count: { select: { posters: { where: { status: 'PUBLISHED' } } } } },
  });
  return row ? toCityView(row) : null;
}

/** Used by generateStaticParams on /city/[slug] */
export async function getCitySlugs(): Promise<string[]> {
  const rows = await prisma.city.findMany({ select: { slug: true } });
  return rows.map((r) => r.slug);
}

// ---------- Hero ----------
// Re-export from settings for a single public surface.
export { getHeroPoster as getHeroPosterRow } from '@/lib/settings';

/** Hero poster as a view model, or null if no published posters exist. */
export async function getHeroPosterView(): Promise<PosterView | null> {
  const { getHeroPoster } = await import('@/lib/settings');
  const row = await getHeroPoster();
  if (!row) return null;
  const city = await prisma.city.findUnique({
    where: { id: row.cityId },
    select: { name: true, slug: true },
  });
  if (!city) return null;
  return toPosterView({ ...row, city });
}
