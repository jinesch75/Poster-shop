'use server';

// Server actions for the posters list page.
//
// runQuickUpload is the merged "drag-and-drop a master to create a DRAFT
// poster" flow that lives at the top of /admin/posters. It used to live
// at /admin/posters/import, alongside a second git-based path that read
// from `incoming/<city-slug>/`. Both are folded into this one server
// action — the git path was deleted on 2026-05-02 because Jacques never
// reached for it (the deploy round-trip wasn't worth it).

import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { processMaster, refreshLivingRoomMockups } from '@/lib/watermark';

const DEFAULT_DESCRIPTION_BY_CITY: Record<string, string> = {
  london:
    'Architectural line drawings and primary blocks — drawn in the spirit of De Stijl.',
  'new-york': 'Drawn from Manhattan, in line drawings and primary colour.',
  paris:
    'Parisian architecture, distilled to line drawings and primary blocks in the De Stijl tradition.',
  rome: 'The Eternal City, in clean line drawings and primary colour blocks.',
  tokyo: 'Tokyo architecture, reduced to line drawings and primary blocks.',
};

type UploadResult = {
  posterSlug: string;
  status: 'imported' | 'skipped' | 'failed';
  detail?: string;
};

function deriveSlug(fileName: string): string {
  const base = fileName.replace(/\.[^.]+$/, '');
  return base
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 80);
}

function deriveTitle(fileName: string): string {
  const base = fileName.replace(/\.[^.]+$/, '');
  return base
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

async function nextPosterNumber(): Promise<string> {
  // Find the largest existing N°NN and add 1, matching the seeded
  // numbering convention.
  const all = await prisma.poster.findMany({ select: { number: true } });
  let max = 0;
  for (const { number } of all) {
    const m = number.match(/(\d+)/);
    if (m) {
      const n = parseInt(m[1], 10);
      if (n > max) max = n;
    }
  }
  return `N°${String(max + 1).padStart(2, '0')}`;
}

export async function runQuickUpload(formData: FormData): Promise<void> {
  const cityId = String(formData.get('cityId') ?? '');
  const files = formData.getAll('files') as File[];

  const results: UploadResult[] = [];

  if (!cityId) {
    redirect(
      `/admin/posters?report=${encodeURIComponent('upload|failed|No city selected.')}`,
    );
  }

  const city = await prisma.city.findUnique({
    where: { id: cityId },
    select: { slug: true },
  });
  if (!city) {
    redirect(
      `/admin/posters?report=${encodeURIComponent('upload|failed|Unknown city.')}`,
    );
  }
  const citySlug = city!.slug;

  const slugsTouched = new Set<string>();

  for (const file of files) {
    if (!(file instanceof File) || file.size === 0) continue;

    const posterSlug = deriveSlug(file.name);
    if (!posterSlug) {
      results.push({
        posterSlug: file.name,
        status: 'failed',
        detail: 'Could not derive slug from filename.',
      });
      continue;
    }

    if (slugsTouched.has(posterSlug)) {
      results.push({
        posterSlug,
        status: 'failed',
        detail: 'Slug collision with another file in this batch — rename one.',
      });
      continue;
    }
    slugsTouched.add(posterSlug);

    const existing = await prisma.poster.findUnique({ where: { slug: posterSlug } });
    if (existing) {
      results.push({
        posterSlug,
        status: 'skipped',
        detail: 'Poster with this slug already exists.',
      });
      continue;
    }

    try {
      const buffer = Buffer.from(await file.arrayBuffer());
      const ext = file.type === 'image/jpeg' ? 'jpg' : 'png';
      const derivatives = await processMaster(buffer, ext);
      const number = await nextPosterNumber();
      const created = await prisma.poster.create({
        data: {
          slug: posterSlug,
          title: deriveTitle(file.name),
          number,
          description:
            DEFAULT_DESCRIPTION_BY_CITY[citySlug] ??
            'Architectural line drawings and primary blocks.',
          cityId,
          masterKey: derivatives.masterKey,
          previewKey: derivatives.previewKey,
          thumbnailKey: derivatives.thumbnailKey,
          mockupOfficeKey: derivatives.mockupOfficeKey,
          masterWidthPx: derivatives.widthPx,
          masterHeightPx: derivatives.heightPx,
          priceDigitalCents: 500,
          status: 'DRAFT',
        },
        select: { id: true },
      });
      // Build the living-room triptych variants now that the row exists
      // (the compositor needs to query siblings, which it can only do
      // once this poster is in the DB). Failures don't roll back the
      // upload — a poster with no living-room variants falls back to
      // the placeholder slot on the product page and can be retried via
      // the maintenance backfill page.
      try {
        await refreshLivingRoomMockups(created.id);
      } catch (err) {
        console.error(
          `living-room mockup refresh failed for ${posterSlug}`,
          err,
        );
      }
      results.push({ posterSlug, status: 'imported' });
    } catch (err) {
      console.error(`quick-upload failed for ${posterSlug}`, err);
      const detail = err instanceof Error ? err.message : String(err);
      results.push({ posterSlug, status: 'failed', detail });
    }
  }

  const summary = results
    .map(
      (r) =>
        `${r.posterSlug}|${r.status}${r.detail ? '|' + r.detail.replace(/[|,]/g, ' ') : ''}`,
    )
    .join(',');
  redirect(`/admin/posters?report=${encodeURIComponent(summary)}`);
}

export type { UploadResult };
