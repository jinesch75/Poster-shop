// Rename all posters in one go.
//
// One table, one row per poster: title, number and web address (slug) are
// editable inline, and a single Save applies every change. Rows that fail
// validation (empty title, malformed or duplicate address) are skipped and
// reported; every other row is saved, so a typo in one row never throws
// away the edits in the other forty.
//
// Changing a web address records the old one in PosterSlugRedirect, and
// /shop/<old-slug> permanently redirects to the new page — saved links,
// search results and QR codes on older previews keep working.

import Image from 'next/image';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { publicUrl } from '@/lib/storage';
import { revalidatePosterPages } from '@/lib/revalidate';
import { applyRenames, type RenameIssue, type RenameRow } from '@/lib/rename';

export const dynamic = 'force-dynamic';

async function saveAll(formData: FormData): Promise<void> {
  'use server';

  // Collect every row that was on the page.
  const rows: RenameRow[] = [];
  for (const [key, value] of formData.entries()) {
    const m = /^title_(.+)$/.exec(key);
    if (!m) continue;
    const id = m[1];
    rows.push({
      id,
      title: String(value),
      number: String(formData.get(`number_${id}`) ?? ''),
      slug: String(formData.get(`slug_${id}`) ?? ''),
    });
  }

  const result = await applyRenames(rows);
  revalidatePosterPages();

  const params = new URLSearchParams({
    saved: String(result.saved),
    moved: String(result.moved),
  });
  if (result.issues.length) {
    params.set('issues', JSON.stringify(result.issues.slice(0, 20)));
  }
  redirect(`/admin/posters/rename?${params.toString()}`);
}

export default async function RenamePostersPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; moved?: string; issues?: string }>;
}) {
  const { saved, moved, issues: issuesRaw } = await searchParams;
  let issues: RenameIssue[] = [];
  try {
    issues = issuesRaw ? (JSON.parse(issuesRaw) as RenameIssue[]) : [];
  } catch {
    issues = [];
  }

  const posters = await prisma.poster.findMany({
    select: {
      id: true,
      slug: true,
      title: true,
      number: true,
      status: true,
      thumbnailKey: true,
      masterKey: true,
      city: { select: { name: true } },
    },
    orderBy: [{ city: { name: 'asc' } }, { number: 'asc' }],
  });

  return (
    <div className="admin-page">
      <header className="admin-page__header">
        <p className="admin-page__eyebrow">
          <Link href="/admin/posters">Posters</Link>
        </p>
        <h1>Rename all</h1>
        <p className="admin-page__sub">
          Edit titles, numbers and web addresses below, then press Save once.
          Changing a web address keeps the old one working: it redirects to the
          new page.
        </p>
      </header>

      {saved !== undefined && (
        <p className="admin-banner admin-banner--success" role="status">
          Saved {saved} poster{saved === '1' ? '' : 's'}
          {moved && moved !== '0'
            ? ` — ${moved} web address${moved === '1' ? '' : 'es'} changed, old ones now redirect.`
            : '.'}
        </p>
      )}
      {issues.length > 0 && (
        <div className="admin-banner admin-banner--error" role="alert">
          <strong>Some rows need another look:</strong>
          <ul className="admin-rename__issues">
            {issues.map((i, n) => (
              <li key={n}>
                <strong>{i.title}</strong> — {i.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      <form action={saveAll} className="admin-form admin-rename">
        <div className="admin-rename__bar">
          <button type="submit" className="admin-btn-primary">
            Save all changes
          </button>
        </div>

        <table className="admin-table admin-rename__table">
          <thead>
            <tr>
              <th aria-label="Thumbnail" />
              <th>Title</th>
              <th>No.</th>
              <th>Web address</th>
              <th>City</th>
            </tr>
          </thead>
          <tbody>
            {posters.map((p) => {
              const thumb = publicUrl(p.thumbnailKey ?? p.masterKey);
              return (
                <tr key={p.id}>
                  <td className="admin-rename__thumb">
                    {thumb && (
                      <Image src={thumb} alt="" width={44} height={58} unoptimized />
                    )}
                  </td>
                  <td>
                    <input
                      type="text"
                      name={`title_${p.id}`}
                      defaultValue={p.title}
                      aria-label={`Title for ${p.title}`}
                      required
                    />
                  </td>
                  <td className="admin-rename__num">
                    <input
                      type="text"
                      name={`number_${p.id}`}
                      defaultValue={p.number}
                      aria-label={`Number for ${p.title}`}
                    />
                  </td>
                  <td>
                    <div className="admin-rename__slug">
                      <span>/shop/</span>
                      <input
                        type="text"
                        name={`slug_${p.id}`}
                        defaultValue={p.slug}
                        aria-label={`Web address for ${p.title}`}
                        spellCheck={false}
                      />
                    </div>
                  </td>
                  <td className="admin-muted">
                    {p.city.name}
                    {p.status !== 'PUBLISHED' && (
                      <span className={`admin-pill admin-pill--${p.status.toLowerCase()}`}>
                        {p.status.toLowerCase()}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div className="admin-rename__bar">
          <button type="submit" className="admin-btn-primary">
            Save all changes
          </button>
        </div>
      </form>
    </div>
  );
}
