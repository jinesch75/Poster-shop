// Bulk import — two parallel paths to the same place.
//
// Path A (git, for batches): drop files into incoming/<city-slug>/,
// commit, push, wait for Railway to redeploy, then click "Import N
// files". Originals live in commit history. No HTTP body limits.
//
// Path B (browser drag-and-drop, for one or two): use the QuickUpload
// dropzone, pick a city, drop the files. They go straight to the
// volume — no commit, no redeploy. Capped at 50 MB per file (matches
// next.config.mjs serverActions.bodySizeLimit).
//
// Both paths run files through the same processMaster pipeline and
// create DRAFT posters with auto-generated metadata. Refine and publish
// from /admin/posters/[id].

import { redirect } from 'next/navigation';
import path from 'path';
import { promises as fs } from 'fs';
import { prisma } from '@/lib/prisma';
import { processMaster } from '@/lib/watermark';
import { QuickUploadDropzone } from '@/components/QuickUploadDropzone';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Import posters — Gridline Cities Admin' };

const VALID_EXTS = new Set(['.png', '.jpg', '.jpeg']);

const DEFAULT_DESCRIPTION_BY_CITY: Record<string, string> = {
  london:
    'Architectural line drawings and primary blocks — drawn in the spirit of De Stijl.',
  'new-york': 'Drawn from Manhattan, in line drawings and primary colour.',
  paris:
    'Parisian architecture, distilled to line drawings and primary blocks in the De Stijl tradition.',
  rome: 'The Eternal City, in clean line drawings and primary colour blocks.',
  tokyo: 'Tokyo architecture, reduced to line drawings and primary blocks.',
};

type Candidate = {
  citySlug: string;
  fileName: string;
  posterSlug: string;
  absolutePath: string;
};

type ImportResult = {
  posterSlug: string;
  status: 'imported' | 'skipped' | 'failed';
  detail?: string;
};

function deriveSlug(fileName: string): string {
  const base = fileName.replace(/\.[^.]+$/, '');
  return base
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, "")
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

async function scanIncoming(): Promise<Candidate[]> {
  const root = path.join(process.cwd(), 'incoming');
  let cityDirs: string[];
  try {
    const entries = await fs.readdir(root, { withFileTypes: true });
    cityDirs = entries.filter((e) => e.isDirectory()).map((e) => e.name);
  } catch {
    return [];
  }

  const out: Candidate[] = [];
  for (const citySlug of cityDirs) {
    const cityDir = path.join(root, citySlug);
    let files: string[] = [];
    try {
      files = await fs.readdir(cityDir);
    } catch {
      continue;
    }
    for (const fileName of files) {
      const ext = path.extname(fileName).toLowerCase();
      if (!VALID_EXTS.has(ext)) continue;
      out.push({
        citySlug,
        fileName,
        posterSlug: deriveSlug(fileName),
        absolutePath: path.join(cityDir, fileName),
      });
    }
  }
  return out.sort((a, b) =>
    a.citySlug === b.citySlug
      ? a.fileName.localeCompare(b.fileName)
      : a.citySlug.localeCompare(b.citySlug),
  );
}

async function nextPosterNumber(): Promise<string> {
  // Find the largest existing N°NN and add 1. Matches the existing seeded
  // numbering (`N°01` … `N°21`) and keeps new imports continuing the run.
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

async function runImport(): Promise<void> {
  'use server';

  const candidates = await scanIncoming();
  const results: ImportResult[] = [];

  // Pre-load the city slug → id lookup; we'll skip files whose folder
  // doesn't match a known city.
  const cities = await prisma.city.findMany({
    select: { id: true, slug: true },
  });
  const cityIdBySlug = new Map(cities.map((c) => [c.slug, c.id]));

  // Track in-batch slugs so we don't import two files with the same slug
  // from different folders (the second is reported as a conflict).
  const slugsTouchedThisRun = new Set<string>();

  for (const c of candidates) {
    if (slugsTouchedThisRun.has(c.posterSlug)) {
      results.push({
        posterSlug: c.posterSlug,
        status: 'failed',
        detail: 'Slug collision with another file in this batch — rename one.',
      });
      continue;
    }
    slugsTouchedThisRun.add(c.posterSlug);

    const cityId = cityIdBySlug.get(c.citySlug);
    if (!cityId) {
      results.push({
        posterSlug: c.posterSlug,
        status: 'failed',
        detail: `Unknown city folder "${c.citySlug}".`,
      });
      continue;
    }

    const existing = await prisma.poster.findUnique({
      where: { slug: c.posterSlug },
    });
    if (existing) {
      results.push({
        posterSlug: c.posterSlug,
        status: 'skipped',
        detail: 'Poster with this slug already exists.',
      });
      continue;
    }

    try {
      const buffer = await fs.readFile(c.absolutePath);
      const ext = path.extname(c.fileName).toLowerCase() === '.png' ? 'png' : 'jpg';
      const derivatives = await processMaster(buffer, c.posterSlug, ext);
      const number = await nextPosterNumber();
      await prisma.poster.create({
        data: {
          slug: c.posterSlug,
          title: deriveTitle(c.fileName),
          number,
          description:
            DEFAULT_DESCRIPTION_BY_CITY[c.citySlug] ??
            'Architectural line drawings and primary blocks.',
          cityId,
          masterKey: derivatives.masterKey,
          previewKey: derivatives.previewKey,
          thumbnailKey: derivatives.thumbnailKey,
          mockupOfficeKey: derivatives.mockupOfficeKey,
          mockupLivingKey: derivatives.mockupLivingKey,
          masterWidthPx: derivatives.widthPx,
          masterHeightPx: derivatives.heightPx,
          priceDigitalCents: 500,
          status: 'DRAFT',
        },
      });
      results.push({ posterSlug: c.posterSlug, status: 'imported' });
    } catch (err) {
      console.error(`import failed for ${c.posterSlug}`, err);
      const detail = err instanceof Error ? err.message : String(err);
      results.push({ posterSlug: c.posterSlug, status: 'failed', detail });
    }
  }

  const summary = results
    .map((r) => `${r.posterSlug}|${r.status}${r.detail ? '|' + r.detail.replace(/[|,]/g, ' ') : ''}`)
    .join(',');
  redirect(`/admin/posters/import?report=${encodeURIComponent(summary)}`);
}

async function runQuickUpload(formData: FormData): Promise<void> {
  'use server';

  const cityId = String(formData.get('cityId') ?? '');
  const files = formData.getAll('files') as File[];

  const results: ImportResult[] = [];

  if (!cityId) {
    redirect(
      `/admin/posters/import?report=${encodeURIComponent('upload|failed|No city selected.')}`,
    );
  }

  const city = await prisma.city.findUnique({
    where: { id: cityId },
    select: { slug: true },
  });
  if (!city) {
    redirect(
      `/admin/posters/import?report=${encodeURIComponent('upload|failed|Unknown city.')}`,
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
      const derivatives = await processMaster(buffer, posterSlug, ext);
      const number = await nextPosterNumber();
      await prisma.poster.create({
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
          mockupLivingKey: derivatives.mockupLivingKey,
          masterWidthPx: derivatives.widthPx,
          masterHeightPx: derivatives.heightPx,
          priceDigitalCents: 500,
          status: 'DRAFT',
        },
      });
      results.push({ posterSlug, status: 'imported' });
    } catch (err) {
      console.error(`quick-upload failed for ${posterSlug}`, err);
      const detail = err instanceof Error ? err.message : String(err);
      results.push({ posterSlug, status: 'failed', detail });
    }
  }

  const summary = results
    .map((r) => `${r.posterSlug}|${r.status}${r.detail ? '|' + r.detail.replace(/[|,]/g, ' ') : ''}`)
    .join(',');
  redirect(`/admin/posters/import?report=${encodeURIComponent(summary)}`);
}

function parseReport(raw: string | undefined): ImportResult[] {
  if (!raw) return [];
  return raw
    .split(',')
    .map((entry) => {
      const [posterSlug, status, ...rest] = entry.split('|');
      return {
        posterSlug,
        status: status as ImportResult['status'],
        detail: rest.length ? rest.join('|') : undefined,
      };
    })
    .filter((r) => r.posterSlug && r.status);
}

export default async function ImportPage({
  searchParams,
}: {
  searchParams: Promise<{ report?: string }>;
}) {
  const { report } = await searchParams;
  const candidates = await scanIncoming();
  const existingSlugs = new Set(
    (
      await prisma.poster.findMany({
        where: { slug: { in: candidates.map((c) => c.posterSlug) } },
        select: { slug: true },
      })
    ).map((p) => p.slug),
  );
  const cities = await prisma.city.findMany({
    select: { id: true, slug: true, name: true },
    orderBy: { number: 'asc' },
  });
  const knownCitySlugs = new Set(cities.map((c) => c.slug));

  const pending = candidates.filter(
    (c) => !existingSlugs.has(c.posterSlug) && knownCitySlugs.has(c.citySlug),
  );
  const wouldSkip = candidates.filter((c) => existingSlugs.has(c.posterSlug));
  const wouldFail = candidates.filter((c) => !knownCitySlugs.has(c.citySlug));

  const results = parseReport(report);

  return (
    <div className="admin-page">
      <header className="admin-page__header">
        <div>
          <p className="admin-page__eyebrow">Catalog</p>
          <h1>Bulk import</h1>
          <p className="admin-page__sub">
            Two ways in — drag-and-drop straight from your computer for
            one or two pictures, or drop into <code>incoming/&lt;city-slug&gt;/</code>{' '}
            in the repo and push for a whole batch. Both create DRAFT
            posters with auto-generated metadata; refine and publish
            from <code>/admin/posters</code>.
          </p>
        </div>
      </header>

      <section style={{ marginBottom: 40 }}>
        <h2 style={{ marginTop: 0 }}>Quick upload</h2>
        <p className="admin-muted" style={{ marginTop: 0, marginBottom: 16 }}>
          Drop files directly into the volume — no commit, no redeploy.
          50 MB cap per file.
        </p>
        <QuickUploadDropzone cities={cities} action={runQuickUpload} />
      </section>

      <hr style={{ border: 0, borderTop: '1px solid var(--rule)', margin: '40px 0' }} />

      <h2>From the repo's <code>incoming/</code> folder</h2>
      <p className="admin-muted" style={{ marginTop: 0, marginBottom: 16 }}>
        Drop, push, wait for Railway to redeploy, then click below.
        Originals stay in commit history.
      </p>

      <section className="admin-card" style={{ marginBottom: 24 }}>
        <p style={{ margin: 0 }}>
          <strong>{pending.length}</strong> file
          {pending.length === 1 ? '' : 's'} ready to import ·{' '}
          {wouldSkip.length} already in the catalog ·{' '}
          {wouldFail.length} unknown city.
        </p>
      </section>

      {pending.length > 0 && (
        <section style={{ marginBottom: 24 }}>
          <h2>Pending</h2>
          <table className="admin-table">
            <thead>
              <tr>
                <th>City</th>
                <th>Filename</th>
                <th>Will create slug</th>
              </tr>
            </thead>
            <tbody>
              {pending.map((c) => (
                <tr key={c.absolutePath}>
                  <td>{c.citySlug}</td>
                  <td>
                    <code>{c.fileName}</code>
                  </td>
                  <td>
                    <code>{c.posterSlug}</code>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {wouldSkip.length > 0 && (
        <p className="admin-muted" style={{ marginBottom: 24 }}>
          Skipped (already in DB):{' '}
          {wouldSkip.map((c) => c.posterSlug).join(', ')}
        </p>
      )}

      {wouldFail.length > 0 && (
        <p className="admin-banner admin-banner--error" role="alert">
          Unknown city folder
          {wouldFail.length === 1 ? '' : 's'}:{' '}
          {Array.from(new Set(wouldFail.map((c) => c.citySlug))).join(', ')}.
          Either rename the folder to a known city slug or add the city
          first under <code>/admin/cities</code>.
        </p>
      )}

      <form action={runImport}>
        <button
          type="submit"
          className="admin-btn-primary"
          disabled={pending.length === 0}
        >
          Import {pending.length} file{pending.length === 1 ? '' : 's'}
        </button>
      </form>

      {results.length > 0 && (
        <section style={{ marginTop: 32 }}>
          <h2>Last run</h2>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Slug</th>
                <th>Status</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r) => (
                <tr key={r.posterSlug}>
                  <td>
                    <code>{r.posterSlug}</code>
                  </td>
                  <td>{r.status}</td>
                  <td className="admin-muted">{r.detail ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}

