// "What you can do with your file" — example mockups shown on each
// product page.
//
// The images are static files in public/ideas/<slug>/<key>.webp, made
// offline from each poster's public (watermarked) preview, and listed in
// lib/ideas-manifest.json. A poster whose web address was changed on
// /admin/posters/rename keeps its examples: we also look under its old
// slugs. Posters without examples simply don't show the section.

import manifest from './ideas-manifest.json';
import { prisma } from './prisma';

export type Idea = { key: string; src: string; title: string; hint: string };

/** Caption per scene, in display order. */
const CAPTIONS: Record<string, { title: string; hint: string }> = {
  'wall-art': { title: 'Print & frame', hint: 'Any print shop, up to the sharp-print size above.' },
  'phone-wallpaper': { title: 'Phone wallpaper', hint: 'Crop to your screen and set it as your lock screen.' },
  'tablet-wallpaper': { title: 'Tablet wallpaper', hint: 'The 3:4 format fits a tablet almost edge to edge.' },
  'laptop-wallpaper': { title: 'Desktop wallpaper', hint: 'Crop to widescreen for your laptop or monitor.' },
  postcards: { title: 'Postcards', hint: 'Print at A6 on card and send a few.' },
  'gallery-wall': { title: 'Gallery wall', hint: 'Frame several posters from one city together.' },
  calendar: { title: 'Calendar', hint: 'A month page for a personalised calendar.' },
  bookmark: { title: 'Bookmark', hint: 'A slim strip printed on card.' },
  notebook: { title: 'Notebook cover', hint: 'Cover a notebook or sketchbook.' },
  mug: { title: 'Mug', hint: 'From a print-on-demand service, for you or as a gift.' },
  't-shirt': { title: 'T-shirt', hint: 'A personal print on cotton.' },
  'tote-bag': { title: 'Tote bag', hint: 'Printed onto natural canvas.' },
  jigsaw: { title: 'Jigsaw puzzle', hint: 'Fine line work makes a satisfying puzzle.' },
};

const MANIFEST = manifest as Record<string, string[]>;

function toIdeas(slug: string, keys: string[]): Idea[] {
  return keys
    .filter((k) => CAPTIONS[k])
    .map((k) => ({ key: k, src: `/ideas/${slug}/${k}.webp`, ...CAPTIONS[k] }));
}

export async function getIdeas(slug: string, posterId: string): Promise<Idea[]> {
  if (MANIFEST[slug]) return toIdeas(slug, MANIFEST[slug]);
  const old = await prisma.posterSlugRedirect.findMany({
    where: { posterId },
    select: { oldSlug: true },
    orderBy: { createdAt: 'desc' },
  });
  for (const { oldSlug } of old) {
    if (MANIFEST[oldSlug]) return toIdeas(oldSlug, MANIFEST[oldSlug]);
  }
  return [];
}
