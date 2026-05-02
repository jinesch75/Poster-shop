import { PosterCard } from '@/components/PosterCard';
import { Nav } from '@/components/Nav';
import { Footer } from '@/components/Footer';
import {
  getPublishedPosters,
  getCities,
  type PosterView,
} from '@/lib/posters';

// Always fresh — content can change in the admin panel.
export const dynamic = 'force-dynamic';

export default async function HomePage() {
  // Homepage shows the MAIN gallery only. The Mondrian-style set lives at
  // its own route (/mondrian) so the two collections stay visually distinct.
  const [cities, allPosters] = await Promise.all([
    getCities('MAIN'),
    getPublishedPosters({ gallery: 'MAIN' }),
  ]);

  // Group posters by city slug so each city section renders only its own.
  const postersByCity = allPosters.reduce<Record<string, PosterView[]>>(
    (acc, poster) => {
      (acc[poster.citySlug] ??= []).push(poster);
      return acc;
    },
    {},
  );

  return (
    <>
      <Nav />

      {/* ============ HERO ============ */}
      <section className="hero">
        <p className="lede">
          High-resolution digital downloads, ready to print.
        </p>
      </section>

      {/* ============ CITY SECTIONS ============ */}
      {/* Only show cities that actually have published posters — cities without
          uploads yet are hidden from the gallery (they'll appear once a poster
          is published for them). */}
      {cities
        .filter(
          (city) =>
            city.status === 'AVAILABLE' &&
            (postersByCity[city.slug]?.length ?? 0) > 0,
        )
        .map((city) => {
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
        })}

      <Footer />
    </>
  );
}
