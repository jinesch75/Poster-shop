// Poster image maintenance page.
//
// Two related actions, each with its own button:
//
// 1. Migrate legacy `public:` masters → volume.
//    Walks every poster whose masterKey is still on the legacy `public:`
//    prefix (i.e. seeded into public/posters/*.png), runs the new clean +
//    QR-stamped pipeline, and writes the resulting derivatives + a fresh
//    volume-backed master into the DB. Safe to re-run.
//
// 2. Re-stamp QR codes on volume-backed posters.
//    Re-runs the watermark pipeline against every poster's existing master
//    so the QR badge encodes the current `NEXT_PUBLIC_SITE_URL`. Use this
//    after a domain change. Skips posters still on `public:` — run the
//    migration action first for those.
//
// Both continue past per-poster errors so one bad file doesn't abort the
// batch.

import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import path from 'path';
import { promises as fs } from 'fs';
import { prisma } from '@/lib/prisma';
import { putBuffer } from '@/lib/storage';
import { reprocessMaster } from '@/lib/watermark';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Backfill — Gridline Cities Admin' };

// Short-lived cookie that carries the per-poster result rows from a
// just-finished action through the post-action redirect. Stored in a
// cookie rather than a URL query param so big reports (21+ posters)
// don't blow past Railway's edge URL/timeout limits — which 503'd
// the original implementation. Expires automatically after 5 minutes.
const REPORT_COOKIE = 'maintenance_report';
const REPORT_COOKIE_TTL_SECONDS = 300;

type RowResult = {
  slug: string;
  status: 'migrated' | 'restamped' | 'skipped' | 'failed';
  detail?: string;
};

function encodeReport(results: RowResult[]): string {
  return results
    .map((r) => `${r.slug}|${r.status}${r.detail ? '|' + r.detail : ''}`)
    .join(',');
}

async function persistReport(results: RowResult[]): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(REPORT_COOKIE, encodeURIComponent(encodeReport(results)), {
    path: '/admin/maintenance/backfill',
    httpOnly: true,
    sameSite: 'strict',
    maxAge: REPORT_COOKIE_TTL_SECONDS,
  });
}

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

  await persistReport(results);
  redirect('/admin/maintenance/backfill');
}

async function runRestamp(): Promise<void> {
  'use server';

  // Re-run the watermark pipeline against every volume-backed poster's
  // existing master. The QR badge encodes qrTargetUrl(slug), which reads
  // from NEXT_PUBLIC_SITE_URL — so this is the action to run after a
  // domain change to refresh QR codes pointing at the new host.
  const posters = await prisma.poster.findMany({
    select: { id: true, slug: true, masterKey: true },
    orderBy: { number: 'asc' },
  });

  const results: RowResult[] = [];

  for (const poster of posters) {
    if (poster.masterKey.startsWith('public:')) {
      results.push({
        slug: poster.slug,
        status: 'skipped',
        detail: 'still on public: — run migration first',
      });
      continue;
    }

    try {
      const derivatives = await reprocessMaster(poster.masterKey, poster.slug);

      // master itself is unchanged on re-stamp; rewrite every derivative
      // so previews / thumbs / mockups all carry the new QR target.
      await prisma.poster.update({
        where: { id: poster.id },
        data: {
          previewKey: derivatives.previewKey,
          thumbnailKey: derivatives.thumbnailKey,
          mockupOfficeKey: derivatives.mockupOfficeKey,
          mockupLivingKey: derivatives.mockupLivingKey,
          masterWidthPx: derivatives.widthPx,
          masterHeightPx: derivatives.heightPx,
        },
      });

      results.push({ slug: poster.slug, status: 'restamped' });
    } catch (err) {
      console.error(`restamp failed for ${poster.slug}`, err);
      const detail = err instanceof Error ? err.message : String(err);
      results.push({ slug: poster.slug, status: 'failed', detail });
    }
  }

  await persistReport(results);
  redirect('/admin/maintenance/backfill');
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

export default async function BackfillPage() {
  // Read the most recent run's results from the cookie set by
  // runBackfill / runRestamp. Cookie expires after 5 minutes so the
  // page eventually goes back to a clean "no last run" state on its own.
  const cookieStore = await cookies();
  const reportCookie = cookieStore.get(REPORT_COOKIE);
  const reportRaw = reportCookie?.value
    ? decodeURIComponent(reportCookie.value)
    : undefined;
  const results = parseReport(reportRaw);

  // Pre-scan so the operator can see what's pending before running.
  const pending = await prisma.poster.count({
    where: { masterKey: { startsWith: 'public:' } },
  });
  const total = await prisma.poster.count();
  const restampable = total - pending;

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
          <h1>Poster image maintenance</h1>
          <p className="admin-page__sub">
            Migrate legacy seeded masters onto the volume, or re-stamp QR
            codes on every poster after a domain change.
          </p>
        </div>
      </header>

      <section className="admin-card" style={{ marginBottom: 16 }}>
        <h2 style={{ marginTop: 0 }}>
          Migrate legacy <code>public:</code> masters
        </h2>
        <p style={{ margin: 0 }}>
          <strong>{pending}</strong> of <strong>{total}</strong> poster
          {total === 1 ? '' : 's'} still on the legacy <code>public:</code>{' '}
          prefix.
        </p>
        {pending === 0 && (
          <p className="admin-muted" style={{ marginTop: 8 }}>
            Nothing to migrate — every poster is already on the volume.
          </p>
        )}
        <form action={runBackfill} style={{ marginTop: 16 }}>
          <button
            type="submit"
            className="admin-btn-primary"
            disabled={pending === 0}
          >
            Run migration on {pending} poster{pending === 1 ? '' : 's'}
          </button>
        </form>
      </section>

      <section className="admin-card" style={{ marginBottom: 24 }}>
        <h2 style={{ marginTop: 0 }}>Re-stamp QR codes</h2>
        <p style={{ margin: 0 }}>
          <strong>{restampable}</strong> volume-backed poster
          {restampable === 1 ? '' : 's'} ready to re-stamp.
        </p>
        <p className="admin-muted" style={{ marginTop: 8 }}>
          Run after a domain change so QR codes encode the current{' '}
          <code>NEXT_PUBLIC_SITE_URL</code>. Re-uses each poster&apos;s
          existing master and rewrites preview / thumbnail / mockup
          derivatives.
        </p>
        <form action={runRestamp} style={{ marginTop: 16 }}>
          <button
            type="submit"
            className="admin-btn-primary"
            disabled={restampable === 0}
          >
            Re-stamp {restampable} poster{restampable === 1 ? '' : 's'}
          </button>
        </form>
      </section>

      {results.length > 0 && (
        <section style={{ marginTop: 32 }}>
          <h2>Last run</h2>
          <p className="admin-muted">
            {counts.migrated ?? 0} migrated · {counts.restamped ?? 0}{' '}
            re-stamped · {counts.skipped ?? 0} skipped ·{' '}
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
