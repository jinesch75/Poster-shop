import Link from 'next/link';
import Image from 'next/image';
import { prisma } from '@/lib/prisma';
import { publicUrl } from '@/lib/storage';

export const dynamic = 'force-dynamic';

export default async function AdminPostersList() {
  const posters = await prisma.poster.findMany({
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    include: { city: true },
  });

  return (
    <div className="admin-page">
      <header className="admin-page__header">
        <div>
          <p className="admin-page__eyebrow">Catalog</p>
          <h1>Posters</h1>
        </div>
        <Link href="/admin/posters/new" className="admin-btn-primary">
          + Upload new poster
        </Link>
      </header>

      {posters.length === 0 ? (
        <p className="admin-muted">
          No posters yet. <Link href="/admin/posters/new">Upload the first</Link>.
        </p>
      ) : (
        <div className="admin-grid">
          {posters.map((p) => {
            const thumb = publicUrl(p.thumbnailKey ?? p.masterKey);
            return (
              <Link href={`/admin/posters/${p.id}`} key={p.id} className="admin-card">
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
                    <span className={`admin-pill admin-pill--${p.status.toLowerCase()}`}>
                      {p.status.toLowerCase()}
                    </span>
                  </div>
                  <div className="admin-card__sub">
                    {p.city.name} · {p.number} · €{(p.priceDigitalCents / 100).toFixed(2)}
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
