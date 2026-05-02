'use client';

// Office triptych mockup, randomised client-side.
//
// The compositor produces up to three office-mockup variants per poster
// (one for each pair of "More from <city/gallery>" siblings shown next
// to the main poster). To make repeat visits feel fresh, we ship all
// three URLs to the browser and pick one at random on mount.
//
// SSR-stable initial index of 0 avoids a hydration mismatch; the visible
// swap to the randomly-picked variant after hydration is brief and
// acceptable for v1. ISR continues to cache the HTML — the randomness
// happens entirely in the browser.
//
// When called without URLs (compositor not yet wired up, or fewer than
// 2 siblings exist in the gallery), renders a styled placeholder so the
// three-column layout still reads correctly.

import { useEffect, useState } from 'react';
import { ProtectedImage } from './ProtectedImage';

type Props = {
  /** URLs of the cached office mockup variants. Empty / undefined → placeholder. */
  urls?: string[];
  alt: string;
};

export function OfficeMockupRandom({ urls, alt }: Props) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (urls && urls.length > 1) {
      setIndex(Math.floor(Math.random() * urls.length));
    }
  }, [urls]);

  if (!urls || urls.length === 0) {
    return (
      <div
        className="product-detail__frame product-detail__frame--placeholder"
        aria-label="Office mockup — placeholder"
      >
        <span className="product-detail__ph-label">Office mockup</span>
        <span className="product-detail__ph-hint">Coming soon</span>
      </div>
    );
  }

  return (
    <div className="product-detail__frame">
      <ProtectedImage
        src={urls[index]}
        alt={alt}
        width={1200}
        height={1600}
        sizes="(max-width: 900px) 100vw, 33vw"
      />
    </div>
  );
}
