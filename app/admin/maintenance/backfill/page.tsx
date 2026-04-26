// One-shot backfill page.
//
// Walks every poster whose masterKey is still on the legacy `public:`
// prefix (i.e. seeded into public/posters/*.png), runs the new clean +
// QR-stamped pipeline, and writes the resulting derivatives + a fresh
// volume-backed master into the DB.
//
// Run-once after the Phase-1 deploy. Continues past per-poster errors so
// one bad file doesn't abort the batch. Safe to re-run: posters whose
// masterKey is already volume-backed are skipped.
//
// Once every poster has migrated off public:, this route can be deleted
// in a follow-up commit (the page itself is harmless to leave around;
// it just becomes a no-op).

import { redirect } from 'next/navigation';
import path from 'path';
import { promises as fs } from 'fs';
import { prisma } from '@/lib/prisma';
import { putBuffer } from '@/lib/storage';
import { reprocessMaster } from '@/lib/watermark';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Backfill — Linework Studio Admin' };

type RowResult = {
  slug: string;
  status: 'migrated' | 'skipped' | 'failed';
  detail?: string;
};

async function runBackfill(): Promise<void> {
  'use server';

  const posters = await prisma.poster.findMany({
    select: { id: true, slug: true, masterKey: true },
    orderBy: { number: 'asc' },
  });

  const results: RowResult[] = [];

  for (const poster of posters) {
    if (!poster.masterKey.startsWith('public:')) {
      results.push({ slug: poster.slug, status: 'skipped', detail: 'already on volume' });
      continue;
    }

    try {
      // 1. Read the seeded PNG out of the repo's public folder.
      const relative = poster.masterKey.slice('public:'.length).replace(/^\//, '');
      const sourcePath = path.join(process.cwd(), 'public', relative);
      const sourceBuffer = await fs.readFile(sourcePath);

      // 2. Move the master onto the volume so future regenerates work.
      const ext = (path.extname(relative).replace(/^\./, '') || 'png') as 'png' | 'jpg';
      const newMasterKey = await putBuffer('masters', sourceBuffer, ext);

      // 3. Run the new pipeline against the volume-backed master.
      //    reprocessMaster reads from storage by key, so we go via the
      //    new key we just wrote.
      const derivatives = await reprocessMaster(newMasterKey, poster.slug);

      // 4. Update the DB row to point at the volume-backed everything.
      await prisma.poster.update({
        where: { id: poster.id },
        data: {
          masterKey: derivatives.masterKey,
          previewKey: derivatives.previewKey,
          thumbnailKey: derivatives.thumbnailKey,
          mockupOfficeKey: derivatives.mockupOfficeKey,
          mockupLivingKey: derivatives.mockupLivingKey,
          masterWidthPx: derivatives.widthPx,
          masterHeightPx: derivatives.heightPx,
        },
      });

      results.push({ slug: poster.slug, status: 'migrated' });
    } catch (err) {
      console.error(`backfill failed for ${poster.slug}`, err);
      const detail = err instanceof Error ? err.message : String(err);
      results.push({ slug: poster.slug, status: 'failed', detail });
    }
  }

  // Persist the report on the URL so the page can render it after the
  // redirect. (Long reports are truncated by the URL length limit but
  // 21 posters' worth fits comfortably.)
  const summary = results
    .map((r) => `${r.slug}|${r.status}${r.detail ? '|' + r.detail : ''}`)
    .join(',');
  redirect(`/admin/maintenance/backfill?report=${encodeURIComponent(summary)}`);
}

function parseReport(raw: string | undefined): RowResult[] {
  if (!raw) return [];
  return raw
    .split(',')
    .map((entry) => {
      const [slug, status, ...rest] = entry.split('|');
      return {
        slug,
        status: status as RowResult['status'],
        detail: rest.length ? rest.join('|') : undefined,
      };
    })
    .filter((r) => r.slug && r.status);
}

export default async function BackfillPage({
  searchParams,
}: {
  searchParams: Promise<{ report?: string }>;
}) {
  const { report } = await searchParams;
  const results = parseReport(report);

  // Pre-scan so the operator can see what's pending before running.
  const pending = await prisma.poster.count({
    where: { masterKey: { startsWith: 'public:' } },
  });
  const total = await prisma.poster.count();

  const counts = results.reduce(
    (acc, r) => {
      acc[r.status] = (acc[r.status] ?? 0) + 1;
      return acc;
    },
    {} as Record<RowResult['status'], number>,
  );

  return (
    <div className="admin-page">
      <header className="admin-page__header">
        <div>
          <p className="admin-page__eyebrow">Maintenance</p>
          <h1>Backfill legacy masters</h1>
          <p className="admin-page__sub">
            Migrates posters seeded into <code>public/posters/</code> onto the
            volume and regenerates clean previews + QR-stamped derivatives.
          </p>
        </div>
      </header>

      <section className="admin-card" style={{ marginBottom: 24 }}>
        <p style={{ margin: 0 }}>
          <strong>{pending}</strong> of <strong>{total}</strong> poster
          {total === 1 ? '' : 's'} still on the legacy <code>public:</code>{' '}
          prefix.
        </p>
        {pending === 0 && (
          <p className="admin-muted" style={{ marginTop: 8 }}>
            Nothing to backfill — every poster is already on the volume.
          </p>
        )}
      </section>

      <form action={runBackfill}>
        <button
          type="submit"
          className="admin-btn-primary"
          disabled={pending === 0}
        >
          Run backfill on {pending} poster{pending === 1 ? '' : 's'}
        </button>
      </form>

      {results.length > 0 && (
        <section style={{ marginTop: 32 }}>
          <h2>Last run</h2>
          <p className="admin-muted">
            {counts.migrated ?? 0} migrated · {counts.skipped ?? 0} skipped ·{' '}
            {counts.failed ?? 0} failed
          </p>
          <table className="admin-table" style={{ marginTop: 12 }}>
            <thead>
              <tr>
                <th>Slug</th>
                <th>Status</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r) => (
                <tr key={r.slug}>
                  <td>
                    <code>{r.slug}</code>
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
