// Public Mondrian-style gallery — the second collection.
//
// Mirrors the homepage's city-grouped layout but is filtered to posters
// in the MONDRIAN gallery. Lives at /mondrian. Posters are assigned to
// a gallery from /admin/posters/[id].

import { PosterCard } from '@/components/PosterCard';
import { Nav } from '@/components/Nav';
import { Footer } from '@/components/Footer';
import {
  getPublishedPosters,
  getCities,
  type PosterView,
} from '@/lib/posters';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Mondrian style — Gridline Cities',
  description:
    'The De Stijl / Mondrian-inspired collection — architectural posters in primary colour and line.',
};

export default async function MondrianGalleryPage() {
  const [cities, allPosters] = await Promise.all([
    getCities('MONDRIAN'),
    getPublishedPosters({ gallery: 'MONDRIAN' }),
  ]);

  // Group posters by city slug so each city section renders only its own.
  const postersByCity = allPosters.reduce<Record<string, PosterView[]>>(
    (acc, poster) => {
      (acc[poster.citySlug] ??= []).push(poster);
      return acc;
    },
    {},
  );

  // Cities with at least one Mondrian-style poster, in display order.
  const citiesWithPosters = cities.filter(
    (c) => (postersByCity[c.slug]?.length ?? 0) > 0,
  );

  return (
    <>
      <Nav />

      {/* ============ HERO ============ */}
      <section className="hero">
        <p className="lede">
          The Mondrian-style collection — architectural line drawings on
          De Stijl primaries.
        </p>
      </section>

      {/* ============ CITY SECTIONS ============ */}
      {citiesWithPosters.length === 0 ? (
        <section className="city-section">
          <div className="empty-state">
            No Mondrian-style posters published yet.
          </div>
        </section>
      ) : (
        citiesWithPosters.map((city) => {
          const cityPosters = postersByCity[city.slug] ?? [];
          return (
            <section key={city.slug} className="city-section">
              <div className="city-heading">
                <span className="name">{city.name}</span>
                <span className="status">
                  {`${String(cityPosters.length).padStart(2, '0')} posters · available`}
                </span>
              </div>
              <div className="gallery-grid">
                {cityPosters.map((p) => (
                  <PosterCard key={p.slug} poster={p} />
                ))}
              </div>
            </section>
          );
        })
      )}

      <Footer />
    </>
  );
}
