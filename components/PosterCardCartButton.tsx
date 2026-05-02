// One-tap add-to-cart button overlaid on a PosterCard.
//
// State conveyed by the icon:
//   - not in cart → outlined bag, ink colour
//   - in cart     → filled bag, accent colour, plus a small "✓" hint
//
// We don't introduce a green outside the design tokens; the accent teal
// already reads as "active / confirmed" elsewhere in the site (italic
// punctuation, focus underlines), so reusing it keeps the palette tight.
//
// Click toggles: first click adds, next click removes. A brief "Added"
// flash gives the visitor confirmation without a layout-disturbing toast.

'use client';

import { useState, type MouseEvent } from 'react';
import { useCart } from '@/lib/cart';

type Props = {
  slug: string;
  /** Used in the aria-label so screen readers announce which poster. */
  title: string;
};

export function PosterCardCartButton({ slug, title }: Props) {
  const { has, add, remove, hydrated } = useCart();
  const [pulse, setPulse] = useState(false);

  // Until the cart hook hydrates, render a neutral placeholder so the
  // icon doesn't flash from "in cart" to "not in cart" (or vice versa)
  // on the first client paint. Visually identical to the empty state;
  // we just don't allow toggling yet.
  const inCart = hydrated && has(slug);

  const onClick = (e: MouseEvent<HTMLButtonElement>) => {
    // The card is wrapped in a Link to the product page; a click on
    // this overlay button must not navigate.
    e.preventDefault();
    e.stopPropagation();
    if (!hydrated) return;
    if (inCart) {
      remove(slug);
    } else {
      add(slug);
      setPulse(true);
      window.setTimeout(() => setPulse(false), 700);
    }
  };

  const label = inCart ? `Remove ${title} from cart` : `Add ${title} to cart`;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      aria-pressed={inCart}
      className={
        'card__cart-btn' +
        (inCart ? ' is-in-cart' : '') +
        (pulse ? ' is-pulse' : '')
      }
    >
      {/* Two icons stacked — CSS swaps which one is visible based on
          the .is-in-cart class. Keeping both in the DOM means no
          flash of unstyled icon while React updates. */}
      <svg
        className="card__cart-btn__icon card__cart-btn__icon--out"
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M5 8h14l-1.2 11.2a2 2 0 0 1-2 1.8H8.2a2 2 0 0 1-2-1.8L5 8z" />
        <path d="M9 8V6a3 3 0 0 1 6 0v2" />
      </svg>
      <svg
        className="card__cart-btn__icon card__cart-btn__icon--in"
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        {/* Solid bag with a tucked-in white checkmark for readability. */}
        <path
          d="M5 8h14l-1.2 11.2a2 2 0 0 1-2 1.8H8.2a2 2 0 0 1-2-1.8L5 8z"
          strokeLinejoin="round"
        />
        <path
          d="M9 8V6a3 3 0 0 1 6 0v2"
          fill="none"
          strokeLinecap="round"
        />
        <path
          d="M9.5 14l2 2 3.5-4"
          fill="none"
          stroke="var(--paper)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
