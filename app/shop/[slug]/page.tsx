import { notFound } from 'next/navigation';
import { ProtectedImage } from '@/components/ProtectedImage';
import { PosterCard } from '@/components/PosterCard';
import { Nav } from '@/components/Nav';
import { Footer } from '@/components/Footer';
import { BuyRow } from '@/components/BuyRow';
import { LivingRoomMockupRandom } from '@/components/LivingRoomMockupRandom';
import {
  getPosterBySlug,
  getPublishedPosterSlugs,
  getRelatedPosters,
} from '@/lib/posters';
import { stripeConfigured } from '@/lib/stripe';
import { largestSharpPrintSize } from '@/lib/print-size';

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
    title: `${poster.title} — Gridline Cities`,
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
  const printSize = largestSharpPrintSize(
    poster.masterWidthPx,
    poster.masterHeightPx,
  );

  // Mockup URLs come from PosterView. Living-room is an array of up to
  // 3 cached triptych variants (each a different sibling pairing); the
  // client component picks one at random on mount. Office is a single
  // image of just the main poster on a wall.
  //
  // An empty array (or null office) means the compositor hasn't been
  // run for this poster yet, or — for living-room only — the gallery
  // has fewer than 2 siblings to bookend it. The corresponding slot
  // falls back to a grey-frame placeholder.
  const livingMockupUrls: string[] | undefined =
    poster.livingRoomMockupUrls.length > 0 ? poster.livingRoomMockupUrls : undefined;
  const officeMockupUrl: string | undefined = poster.mockupOfficeUrl ?? undefined;

  return (
    <>
      <Nav />

      <section className="section product-detail">
        {/* Hero — fills the previously-empty band at the top of the page,
            replaces the breadcrumb + headline pairing in the old layout. */}
        <header className="product-detail__hero">
          <h1>{poster.title}</h1>
          <p>{poster.description}</p>
        </header>

        {/* Two-column outer layout: main poster on the left, a pair of
            mockup columns on the right. The pair sits in its own grid
            so we can keep a tighter inner gap while opening up the gap
            between the main poster and the mockups. Stacks to a single
            column on mobile. */}
        <div className="product-detail__images">
          <div className="product-detail__frame product-detail__frame--main">
            <ProtectedImage
              src={poster.file}
              alt={poster.title}
              width={poster.masterWidthPx}
              height={poster.masterHeightPx}
              priority
              sizes="(max-width: 900px) 100vw, 33vw"
            />
          </div>

          <div className="product-detail__mockups">
            {/* Living-room triptych — randomised across cached variants
                (each variant pairs the main poster with two siblings). */}
            <LivingRoomMockupRandom
              urls={livingMockupUrls}
              alt={`${poster.title} in a living-room triptych`}
            />

            {/* Office single — just the main poster on its own. */}
            {officeMockupUrl ? (
              <div className="product-detail__frame product-detail__frame--mockup">
                <ProtectedImage
                  src={officeMockupUrl}
                  alt={`${poster.title} in an office`}
                  width={1200}
                  height={1600}
                  sizes="(max-width: 900px) 100vw, 33vw"
                />
              </div>
            ) : (
              <div
                className="product-detail__frame product-detail__frame--placeholder"
                aria-label="Office mockup — placeholder"
              >
                <span className="product-detail__ph-label">Office</span>
                <span className="product-detail__ph-hint">Mockup coming soon</span>
              </div>
            )}
          </div>
        </div>

        {/* Centered cart block — capped at ~600px so the price, buttons
            and helper text feel like a deliberate focal point under the
            gallery row rather than spanning the full content width. */}
        <div className="product-detail__cart">
          <div className="product-detail__cart-inner">
            {printSize && (
              <p
                className="print-size-badge"
                aria-label={`Prints sharp at ${printSize}`}
              >
                <span className="print-size-badge__chip">{printSize}</span>
                <span>Prints sharp at {printSize} (300 dpi)</span>
              </p>
            )}

            <div className="total-row">
              <div className="total-label">Price</div>
              <div className="total-value">€{poster.priceEur}.00</div>
            </div>

            {/* Two-button buy row: "Add to cart" stores the poster in the
                visitor's localStorage cart, "Buy now" skips the cart and
                goes straight to a single-item Stripe Checkout. The
                stripeReady prop is computed server-side because
                stripeConfigured() reads STRIPE_SECRET_KEY which isn't
                exposed to the browser. */}
            <BuyRow slug={poster.slug} stripeReady={stripeConfigured()} />

            <p className="fine-print">
              Digital download · High-resolution PNG · Link valid for 48 hours,
              up to 5 downloads. Lost your file? Email{' '}
              <a href="mailto:hello@gridlinecities.com">hello@gridlinecities.com</a>{' '}
              and we&apos;ll reissue it.
            </p>
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
