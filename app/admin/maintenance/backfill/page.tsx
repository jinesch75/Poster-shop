// Poster image maintenance page.
//
// Two related actions, each with its own button:
//
// 1. Migrate legacy `public:` masters → volume.
//    Walks every poster whose masterKey is still on the legacy `public:`
//    prefix (i.e. seeded into public/posters/*.png), runs the watermark
//    pipeline, and writes the resulting derivatives + a fresh volume-backed
//    master into the DB. Safe to re-run.
//
// 2. Regenerate previews / thumbnails / mockups on volume-backed posters.
//    Re-runs the watermark pipeline against every poster's existing master
//    so derivatives reflect the current pipeline (useful after any change
//    to lib/watermark.ts). Skips posters still on `public:` — run the
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
import { reprocessMaster, refreshLivingRoomMockups } from '@/lib/watermark';

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
  status: 'migrated' | 'regenerated' | 'skipped' | 'failed';
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
      const derivatives = await reprocessMaster(newMasterKey);

      // 4. Update the DB row to point at the volume-backed everything.
      await prisma.poster.update({
        where: { id: poster.id },
        data: {
          masterKey: derivatives.masterKey,
          previewKey: derivatives.previewKey,
          thumbnailKey: derivatives.thumbnailKey,
          mockupOfficeKey: derivatives.mockupOfficeKey,
          masterWidthPx: derivatives.widthPx,
          masterHeightPx: derivatives.heightPx,
        },
      });
      // 5. Build the living-room triptych variants. Done per-poster as
      //    we go; triptychs may reference neighbouring posters that
      //    haven't been migrated yet, so re-running this action after
      //    a full pass converges the gallery to a stable set of pairs.
      await refreshLivingRoomMockups(poster.id);

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

async function runRegenerate(): Promise<void> {
  'use server';

  // Re-run the watermark pipeline against every volume-backed poster's
  // existing master. Useful any time lib/watermark.ts changes — drops the
  // new derivatives back into storage and updates the DB row to point at
  // them. Master itself is untouched.
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
      const derivatives = await reprocessMaster(poster.masterKey);

      await prisma.poster.update({
        where: { id: poster.id },
        data: {
          previewKey: derivatives.previewKey,
          thumbnailKey: derivatives.thumbnailKey,
          mockupOfficeKey: derivatives.mockupOfficeKey,
          masterWidthPx: derivatives.widthPx,
          masterHeightPx: derivatives.heightPx,
        },
      });
      // Living-room triptych variants are rebuilt per-poster. They may
      // reference siblings that haven't been regenerated yet — running
      // this action a second time after a full pass converges to a stable
      // set of pairs (each poster reading the latest preview of its
      // neighbours).
      await refreshLivingRoomMockups(poster.id);

      results.push({ slug: poster.slug, status: 'regenerated' });
    } catch (err) {
      console.error(`regenerate failed for ${poster.slug}`, err);
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
  // runBackfill / runRegenerate. Cookie expires after 5 minutes so the
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
  const regenerable = total - pending;

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
            Migrate legacy seeded masters onto the volume, or regenerate
            previews / thumbnails / mockups for every poster.
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
        <h2 style={{ marginTop: 0 }}>Regenerate previews</h2>
        <p style={{ margin: 0 }}>
          <strong>{regenerable}</strong> volume-backed poster
          {regenerable === 1 ? '' : 's'} ready to regenerate.
        </p>
        <p className="admin-muted" style={{ marginTop: 8 }}>
          Re-runs the watermark pipeline against each poster&apos;s existing
          master and rewrites preview / thumbnail / mockup derivatives. Run
          after any change to <code>lib/watermark.ts</code> so existing
          posters reflect the current output format.
        </p>
        <form action={runRegenerate} style={{ marginTop: 16 }}>
          <button
            type="submit"
            className="admin-btn-primary"
            disabled={regenerable === 0}
          >
            Regenerate {regenerable} poster{regenerable === 1 ? '' : 's'}
          </button>
        </form>
      </section>

      {results.length > 0 && (
        <section style={{ marginTop: 32 }}>
          <h2>Last run</h2>
          <p className="admin-muted">
            {counts.migrated ?? 0} migrated · {counts.regenerated ?? 0}{' '}
            regenerated · {counts.skipped ?? 0} skipped ·{' '}
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
