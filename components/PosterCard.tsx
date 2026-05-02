// Poster tile used by the homepage gallery, the city pages, the Mondrian
// gallery, and the "More from {city}" rail at the bottom of a product
// page.
//
// The card has three interactive children:
//   1. A <Link> wrapping the thumb — biggest click target, navigates to
//      /shop/[slug].
//   2. A <Link> wrapping the title + city text — same destination, so
//      tapping the title also navigates. (Two links to the same href is
//      a standard product-card pattern; a single link wrapping everything
//      would force the cart button to be nested inside an <a>, which is
//      invalid HTML.)
//   3. A <PosterCardCartButton> tucked into the right column of the
//      meta row, beside the price. One-tap add/remove without leaving
//      the gallery.

import Link from 'next/link';
import type { PosterView } from '@/lib/posters';
import { ProtectedImage } from './ProtectedImage';
import { PosterCardCartButton } from './PosterCardCartButton';

export function PosterCard({ poster }: { poster: PosterView }) {
  return (
    <div className="card">
      <Link href={`/shop/${poster.slug}`} className="card__thumb-link" aria-label={poster.title}>
        <div className="thumb">
          <ProtectedImage
            src={poster.file}
            alt={poster.title}
            width={600}
            height={800}
            sizes="(max-width: 520px) 50vw, (max-width: 820px) 33vw, (max-width: 1100px) 25vw, 20vw"
          />
        </div>
      </Link>
      <div className="meta">
        <Link href={`/shop/${poster.slug}`} className="meta-left">
          <div className="title">{poster.title}</div>
          <div className="city">{poster.city}</div>
        </Link>
        <div className="meta-right">
          <div className="price">€{poster.priceEur}</div>
          <PosterCardCartButton slug={poster.slug} title={poster.title} />
        </div>
      </div>
    </div>
  );
}
