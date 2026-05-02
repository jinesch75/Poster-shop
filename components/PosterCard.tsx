// Poster tile used by the homepage gallery, the city pages, the Mondrian
// gallery, and the "More from {city}" rail at the bottom of a product
// page.
//
// The card is structured as a div that contains two interactive children:
//   1. A <Link> wrapping the thumb + meta — clicks anywhere except the
//      cart button take the visitor to /shop/[slug].
//   2. A <PosterCardCartButton> positioned over the bottom-right of the
//      thumb — one-tap add/remove without leaving the gallery.
//
// We deliberately do NOT nest the cart button inside the Link. A button
// inside an <a> is invalid HTML and breaks keyboard / screen-reader
// behaviour even when a click handler stops propagation.

import Link from 'next/link';
import type { PosterView } from '@/lib/posters';
import { ProtectedImage } from './ProtectedImage';
import { PosterCardCartButton } from './PosterCardCartButton';

export function PosterCard({ poster }: { poster: PosterView }) {
  return (
    <div className="card">
      <Link href={`/shop/${poster.slug}`} className="card__link">
        <div className="thumb">
          <ProtectedImage
            src={poster.file}
            alt={poster.title}
            width={600}
            height={800}
            sizes="(max-width: 520px) 50vw, (max-width: 820px) 33vw, (max-width: 1100px) 25vw, 20vw"
          />
        </div>
        <div className="meta">
          <div className="meta-left">
            <div className="title">{poster.title}</div>
            <div className="city">{poster.city}</div>
          </div>
          <div className="price">€{poster.priceEur}</div>
        </div>
      </Link>
      <PosterCardCartButton slug={poster.slug} title={poster.title} />
    </div>
  );
}
