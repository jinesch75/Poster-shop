// Auto-generated sitemap for SEO.
//
// Lists every published poster, every available city, plus the homepage,
// /shop, and /about. Rebuilt on each request so newly-published posters
// appear without a redeploy. Excludes admin, api, and the /q redirect
// endpoint — those are also blocked in robots.txt.

import type { MetadataRoute } from 'next';
import { prisma } from '@/lib/prisma';
import { absoluteUrl } from '@/lib/urls';

export const dynamic = 'force-dynamic';
export const revalidate = 3600; // hourly

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  let posters: { slug: string; updatedAt: Date }[] = [];
  let cities: { slug: string }[] = [];
  try {
    [posters, cities] = await Promise.all([
      prisma.poster.findMany({
        where: { status: 'PUBLISHED' },
        select: { slug: true, updatedAt: true },
        orderBy: { updatedAt: 'desc' },
      }),
      prisma.city.findMany({
        where: { status: 'AVAILABLE' },
        select: { slug: true },
      }),
    ]);
  } catch {
    // DB unreachable at build time — return the static surface so the
    // build still succeeds.
  }

  const staticEntries: MetadataRoute.Sitemap = [
    { url: absoluteUrl('/'), lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: absoluteUrl('/shop'), lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: absoluteUrl('/mondrian'), lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: absoluteUrl('/about'), lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
  ];

  const cityEntries: MetadataRoute.Sitemap = cities.map((c) => ({
    url: absoluteUrl(`/city/${c.slug}`),
    lastModified: now,
    changeFrequency: 'weekly',
    priority: 0.7,
  }));

  const posterEntries: MetadataRoute.Sitemap = posters.map((p) => ({
    url: absoluteUrl(`/shop/${p.slug}`),
    lastModified: p.updatedAt,
    changeFrequency: 'monthly',
    priority: 0.8,
  }));

  return [...staticEntries, ...cityEntries, ...posterEntries];
}
