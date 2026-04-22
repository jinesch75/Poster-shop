// Site-wide settings accessor. Reads/writes the singleton SiteSetting row.
//
// Reads fall back gracefully: if the row doesn't exist, or the chosen hero
// has been unpublished/deleted, we return the most recent published poster
// instead. That way the home page never breaks when an admin changes content.

import { prisma } from '@/lib/prisma';
import type { Poster } from '@prisma/client';

const SINGLETON_ID = 'singleton';

export async function getSiteSettings() {
  return prisma.siteSetting.upsert({
    where: { id: SINGLETON_ID },
    update: {},
    create: { id: SINGLETON_ID },
  });
}

export async function setHeroPoster(posterId: string | null) {
  return prisma.siteSetting.upsert({
    where: { id: SINGLETON_ID },
    update: { heroPosterId: posterId },
    create: { id: SINGLETON_ID, heroPosterId: posterId },
  });
}

/**
 * Returns the featured hero poster — the admin's chosen pick, with a fallback
 * to the newest published poster if no choice is set or the choice is no
 * longer available. Returns null only if there are no published posters at all.
 */
export async function getHeroPoster(): Promise<Poster | null> {
  const settings = await getSiteSettings();

  if (settings.heroPosterId) {
    const chosen = await prisma.poster.findFirst({
      where: { id: settings.heroPosterId, status: 'PUBLISHED' },
    });
    if (chosen) return chosen;
  }

  // Fallback: newest published poster
  return prisma.poster.findFirst({
    where: { status: 'PUBLISHED' },
    orderBy: { createdAt: 'desc' },
  });
}
