// Posters admin: catalog grid + quick drag-and-drop upload.
//
// The dropzone at the top is the merged successor to the old
// /admin/posters/import page. It creates DRAFT posters with auto-
// generated metadata (slug from filename, default description per
// city, auto-incremented N°NN). Click any draft to refine and publish.
//
// For one-off uploads where you want full control over title /
// description / price up front, use /admin/posters/new instead.

import Link from 'next/link';
import Image from 'next/image';
import { prisma } from '@/lib/prisma';
import { publicUrl } from '@/lib/storage';
import { QuickUploadDropzone } from '@/components/QuickUploadDropzone';
import { runQuickUpload, type UploadResult } from './actions';

export const dynamic = 'force-dynamic';

function parseReport(raw: string | undefined): UploadResult[] {
  if (!raw) return [];
  return raw
    .split(',')
    .map((entry) => {
      const [posterSlug, status, ...rest] = entry.split('|');
      return {
        posterSlug,
        status: status as UploadResult['status'],
        detail: rest.length ? rest.join('|') : undefined,
      };
    })
    .filter((r) => r.posterSlug && r.status);
}

export default async function AdminPostersList({
  searchParams,
}: {
  searchParams: Promise<{ report?: string }>;
}) {
  const { report } = await searchParams;

  const [posters, cities] = await Promise.all([
    prisma.poster.findMany({
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      include: { city: true },
    }),
    prisma.city.findMany({
      select: { id: true, slug: true, name: true },
      orderBy: { number: 'asc' },
    }),
  ]);

  const results = parseReport(report);
  const counts = results.reduce(
    (acc, r) => {
      acc[r.status] = (acc[r.status] ?? 0) + 1;
      return acc;
    },
    {} as Record<UploadResult['status'], number>,
  );

  return (
    <div className="admin-page">
      <header className="admin-page__header">
        <div>
          <p className="admin-page__eyebrow">Catalog</p>
          <h1>Posters</h1>
          <p className="admin-page__sub">
            Drop a file to create a draft. Click any poster to edit metadata
            and publish.
          </p>
        </div>
        <Link href="/admin/posters/new" className="admin-btn-ghost">
          + Upload (full metadata)
        </Link>
      </header>

      <section className="admin-card admin-card--upload">
        <h2 className="admin-card__heading">Quick upload</h2>
        <p className="admin-muted" style={{ marginTop: 0, marginBottom: 16 }}>
          Drag PNG / JPG masters here. They land as DRAFT posters with
          auto-generated metadata. 50 MB cap per file.
        </p>
        <QuickUploadDropzone cities={cities} action={runQuickUpload} />
      </section>

      {results.length > 0 && (
        <section style={{ marginBottom: 32 }}>
          <h2>Last upload</h2>
          <p className="admin-muted">
            {counts.imported ?? 0} imported · {counts.skipped ?? 0} skipped ·{' '}
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

      <h2 className="admin-section-title">Catalog</h2>

      {posters.length === 0 ? (
        <p className="admin-muted">
          No posters yet. Drop a file in the quick-upload zone above, or use{' '}
          <Link href="/admin/posters/new">the full-metadata form</Link>.
        </p>
      ) : (
        <div className="admin-grid">
          {posters.map((p) => {
            const thumb = publicUrl(p.thumbnailKey ?? p.masterKey);
            return (
              <Link
                href={`/admin/posters/${p.id}`}
                key={p.id}
                className="admin-card admin-card--poster"
              >
                <div className="admin-card__thumb">
                  {thumb && (
                    <Image
                      src={thumb}
                      alt={p.title}
                      width={400}
                      height={500}
                      unoptimized
                    />
                  )}
                </div>
                <div className="admin-card__meta">
                  <div className="admin-card__title">
                    <span>{p.title}</span>
                    <span
                      className={`admin-pill admin-pill--${p.status.toLowerCase()}`}
                    >
                      {p.status.toLowerCase()}
                    </span>
                  </div>
                  <div className="admin-card__sub">
                    {p.city.name} · {p.number} · €
                    {(p.priceDigitalCents / 100).toFixed(2)}
                  </div>
                  <div className="admin-card__sub">
                    {p.gallery === 'MONDRIAN' ? 'Mondrian style' : 'Main gallery'}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
