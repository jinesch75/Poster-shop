// Small client component used by Nav.
//
// Subscribes to the localStorage-backed cart and renders a bag icon plus
// a count badge. Hidden until the cart hook hydrates so the server-rendered
// markup matches the first client paint (no hydration warning) and the
// badge doesn't flash an out-of-date number.

'use client';

import Link from 'next/link';
import { useCart } from '@/lib/cart';

export function CartLink() {
  const { count, hydrated } = useCart();

  // Until we know what's in localStorage, render an inert placeholder.
  // It still occupies the grid column so the centred nav links don't
  // shift sideways when the badge appears.
  if (!hydrated) {
    return <div className="nav-spacer" aria-hidden="true" />;
  }

  return (
    <div className="right">
      <Link href="/cart" className="cart" aria-label={`Cart (${count})`}>
        <svg
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
          {/* A simple shopping-bag glyph: rectangle body + handle arc.
              Matches the linework aesthetic of the brand mark. */}
          <path d="M5 8h14l-1.2 11.2a2 2 0 0 1-2 1.8H8.2a2 2 0 0 1-2-1.8L5 8z" />
          <path d="M9 8V6a3 3 0 0 1 6 0v2" />
        </svg>
        <span className="cart-label">Cart</span>
        {count > 0 && (
          <span className="badge" aria-hidden="true">
            {count}
          </span>
        )}
      </Link>
    </div>
  );
}
