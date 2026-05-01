// Curated per-city collection page.
// For AVAILABLE cities: posters grid. For IN_PROGRESS / PLANNED:
// a "coming soon" pane pointing back to the newsletter.

import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Nav } from '@/components/Nav';
import { Footer } from '@/components/Footer';
import { PosterCard } from '@/components/PosterCard';
import {
  getCityBySlug,
  getCitySlugs,
  getPublishedPosters,
} from '@/lib/posters';

export const dynamic = 'force-dynamic';

// Pre-render known cities when the DB is reachable at build time; otherwise
// fall back to on-demand rendering. Railway usually provides DATABASE_URL at
// build, but this keeps builds green even when it isn't.
export async function generateStaticParams() {
  try {
    const slugs = await getCitySlugs();
    return slugs.map((slug) => ({ slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const city = await getCityBySlug(slug);
  if (!city) return {};
  return {
    title: `${city.name} — Gridline Cities`,
    description:
      city.description ??
      `Architectural posters of ${city.name}, in line and the De Stijl palette.`,
  };
}

export default async function CityPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const city = await getCityBySlug(slug);
  if (!city) notFound();

  const posters =
    city.status === 'AVAILABLE'
      ? await getPublishedPosters({ citySlug: city.slug })
      : [];

  return (
    <>
      <Nav />

      <section className="section city-hero">
        <div className="city-hero__eyebrow">
          N°{city.number} · {city.statusLabel}
        </div>
        <h1 className="city-hero__title">
          {city.name}
          <span className="italic">.</span>
        </h1>
        {city.description && (
          <p className="city-hero__lede">{city.description}</p>
        )}
        {city.status !== 'AVAILABLE' && (
          <span className="city-hero__status">{city.statusLabel}</span>
        )}
      </section>

      <section className="section">
        {city.status === 'AVAILABLE' && posters.length > 0 && (
          <div className="gallery-grid">
            {posters.map((p) => (
              <PosterCard key={p.slug} poster={p} />
            ))}
          </div>
        )}

        {city.status === 'AVAILABLE' && posters.length === 0 && (
          <div className="empty-state">
            No published posters for {city.name} yet. Check back soon.
          </div>
        )}

        {city.status !== 'AVAILABLE' && (
          <div
            className="empty-state"
            style={{ padding: '60px 20px', maxWidth: 620, margin: '0 auto' }}
          >
            <p style={{ marginBottom: 12 }}>
              {city.name} is {city.status === 'IN_PROGRESS' ? 'in progress' : 'planned'}.
            </p>
            <p style={{ fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--mute)' }}>
              Subscribe below to be notified
            </p>
          </div>
        )}

        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            marginTop: 64,
          }}
        >
          <Link className="btn-ghost" href="/shop">
            ← Back to the full catalogue
          </Link>
        </div>
      </section>

      <Footer />
    </>
  );
}
