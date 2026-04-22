import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Watermark } from '@/components/Watermark';
import { PosterCard } from '@/components/PosterCard';
import { Nav } from '@/components/Nav';
import { Footer } from '@/components/Footer';
import {
  getPosterBySlug,
  getPublishedPosterSlugs,
  getRelatedPosters,
} from '@/lib/posters';

// Regenerate product pages when content changes; don't force dynamic
// rendering since posters don't change on every request.
export const revalidate = 300; // 5 minutes

// Pre-render published posters when the DB is reachable at build time;
// otherwise fall back to on-demand ISR rendering.
export async function generateStaticParams() {
  try {
    const slugs = await getPublishedPosterSlugs();
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
  const poster = await getPosterBySlug(slug);
  if (!poster) return {};
  return {
    title: `${poster.title} — Linework Studio`,
    description: poster.description,
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const poster = await getPosterBySlug(slug);
  if (!poster) notFound();

  const related = await getRelatedPosters(poster, 3);

  return (
    <>
      <Nav />

      <section className="section">
        <div className="product">
          <div className="main-preview">
            <Image
              src={poster.file}
              alt={poster.title}
              width={poster.masterWidthPx}
              height={poster.masterHeightPx}
              priority
              sizes="(max-width: 900px) 100vw, 55vw"
            />
            <Watermark lines={8} fontSize={20} />
          </div>

          <div className="info">
            <div className="breadcrumb">
              <Link
                href="/shop"
                style={{
                  borderBottom: '1px solid var(--rule-strong)',
                  paddingBottom: 1,
                }}
              >
                Shop
              </Link>{' '}
              /{' '}
              <Link
                href={`/city/${poster.citySlug}`}
                style={{
                  borderBottom: '1px solid var(--rule-strong)',
                  paddingBottom: 1,
                }}
              >
                {poster.city}
              </Link>{' '}
              / {poster.title}
            </div>
            <h2>{poster.title}</h2>
            <p className="byline">{poster.description}</p>

            <p className="wm-note">
              <svg
                width="13"
                height="13"
                viewBox="0 0 20 20"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path d="M10 2l7 4v5c0 4-3 7-7 8-4-1-7-4-7-8V6z" />
                <path d="M7 10l2 2 4-4" />
              </svg>
              <span>
                The watermark shown here is only on the preview. Your downloaded
                files are{' '}
                <strong>clean, unmarked, and yours to print.</strong>
              </span>
            </p>

            <div className="divider"></div>

            <div className="total-row">
              <div className="total-label">Price</div>
              <div className="total-value">€{poster.priceEur}.00</div>
            </div>

            <div className="buy-row">
              <button
                className="btn-full"
                disabled
                title="Checkout wiring arrives in Session 4"
              >
                Add to cart · download now
              </button>
              <button className="btn-icon" aria-label="Save">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                >
                  <path d="M6 3h12v18l-6-4-6 4z" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {related.length > 0 && (
          <>
            <div className="related-header">More from {poster.city}</div>
            <div className="gallery-grid">
              {related.map((p) => (
                <PosterCard key={p.slug} poster={p} />
              ))}
            </div>
          </>
        )}
      </section>

      <Footer />
    </>
  );
}
