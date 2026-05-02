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
      {cities.map((city) => {
        const cityPosters = postersByCity[city.slug] ?? [];
        const hasPosters =
          city.status === 'AVAILABLE' && cityPosters.length > 0;

        return (
          <section key={city.slug} className="city-section">
            <div className="city-heading">
              <span className="name">{city.name}</span>
              <span className="status">
                {hasPosters
                  ? `${String(cityPosters.length).padStart(2, '0')} posters · available`
                  : city.statusLabel || 'Coming soon'}
              </span>
            </div>

            {hasPosters ? (
              <div className="gallery-grid">
                {cityPosters.map((p) => (
                  <PosterCard key={p.slug} poster={p} />
                ))}
              </div>
            ) : (
              <div className="coming-soon">
                <div>
                  <span className="label">
                    Pictures <span className="italic">to come.</span>
                  </span>
                  <span className="hint">
                    Subscribe below to be notified
                  </span>
                </div>
              </div>
            )}
          </section>
        );
      })}

      <Footer />
    </>
  );
}
