// Public shop — full poster catalogue with server-side filters.
//
// Filters are in the URL (?city=london&orientation=portrait) so results are
// shareable and SEO-friendly. All rendering is server-side; no client JS
// required to filter.

import Link from 'next/link';
import { PosterCard } from '@/components/PosterCard';
import { Nav } from '@/components/Nav';
import { Footer } from '@/components/Footer';
import {
  getPublishedPosters,
  getCities,
  type PosterFilters,
} from '@/lib/posters';
import type { Orientation } from '@prisma/client';

export const dynamic = 'force-dynamic';

type SearchParams = {
  city?: string;
  orientation?: string;
  landmark?: string;
};

const ALLOWED_ORIENTATIONS: Orientation[] = ['PORTRAIT', 'LANDSCAPE', 'SQUARE'];

function parseFilters(sp: SearchParams): PosterFilters {
  const filters: PosterFilters = {};
  if (sp.city) filters.citySlug = sp.city;
  if (sp.orientation) {
    const up = sp.orientation.toUpperCase() as Orientation;
    if (ALLOWED_ORIENTATIONS.includes(up)) filters.orientation = up;
  }
  if (sp.landmark) filters.landmarkType = sp.landmark;
  return filters;
}

// Build a href preserving other filters — `null` clears the key.
function buildHref(current: SearchParams, key: keyof SearchParams, value: string | null) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(current)) {
    if (v && k !== key) params.set(k, v);
  }
  if (value) params.set(key, value);
  const qs = params.toString();
  return qs ? `/shop?${qs}` : '/shop';
}

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const filters = parseFilters(sp);

  const [posters, cities] = await Promise.all([
    getPublishedPosters(filters),
    getCities(),
  ]);

  const cityChoices = cities.filter((c) => c.posterCount > 0);

  // Distinct landmark types — computed from the full catalogue.
  const allPosters = await getPublishedPosters();
  const landmarkTypes = Array.from(
    new Set(allPosters.map((p) => p.landmarkType).filter((x): x is string => !!x)),
  ).sort();

  return (
    <>
      <Nav />

      <section className="section">
        <div className="section-header" style={{ marginTop: 120 }}>
          <div className="eyebrow">
            <span className="num">Catalogue</span>
            <span className="mono-label">All posters</span>
          </div>
          <div className="inner-row">
            <h2 className="title">
              The full <span className="italic">catalogue.</span>
            </h2>
            <p className="aside">
              Every published poster across every city. Filter by city,
              orientation, or landmark type to narrow it down.
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="shop-filters">
          {/* City */}
          <span className="shop-filters__label">City</span>
          <Link
            href={buildHref(sp, 'city', null)}
            className={`shop-filters__chip ${!sp.city ? 'is-active' : ''}`}
          >
            All
          </Link>
          {cityChoices.map((c) => (
            <Link
              key={c.slug}
              href={buildHref(sp, 'city', c.slug)}
              className={`shop-filters__chip ${sp.city === c.slug ? 'is-active' : ''}`}
            >
              {c.name}
            </Link>
          ))}
        </div>

        {(landmarkTypes.length > 0 || sp.orientation) && (
          <div className="shop-filters">
            <span className="shop-filters__label">Orientation</span>
            <Link
              href={buildHref(sp, 'orientation', null)}
              className={`shop-filters__chip ${!sp.orientation ? 'is-active' : ''}`}
            >
              All
            </Link>
            {ALLOWED_ORIENTATIONS.map((o) => (
              <Link
                key={o}
                href={buildHref(sp, 'orientation', o.toLowerCase())}
                className={`shop-filters__chip ${sp.orientation?.toUpperCase() === o ? 'is-active' : ''}`}
              >
                {o.charAt(0) + o.slice(1).toLowerCase()}
              </Link>
            ))}
          </div>
        )}

        {landmarkTypes.length > 0 && (
          <div className="shop-filters">
            <span className="shop-filters__label">Landmark</span>
            <Link
              href={buildHref(sp, 'landmark', null)}
              className={`shop-filters__chip ${!sp.landmark ? 'is-active' : ''}`}
            >
              All
            </Link>
            {landmarkTypes.map((lm) => (
              <Link
                key={lm}
                href={buildHref(sp, 'landmark', lm)}
                className={`shop-filters__chip ${sp.landmark === lm ? 'is-active' : ''}`}
              >
                {lm}
              </Link>
            ))}
          </div>
        )}

        {/* Grid */}
        {posters.length === 0 ? (
          <div className="empty-state">No posters match these filters.</div>
        ) : (
          <div className="gallery-grid">
            {posters.map((p) => (
              <PosterCard key={p.slug} poster={p} />
            ))}
          </div>
        )}
      </section>

      <Footer />
    </>
  );
}
