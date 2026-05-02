// Buy row on the product page (/shop/[slug]).
//
// Two actions side-by-side:
//   - "Add to cart" → mutates localStorage via useCart, shows a brief
//     "Added ✓" confirmation, then reverts. Doesn't navigate.
//   - "Buy now"    → submits a form to startCheckoutForPoster, skipping
//     the cart entirely. Same UX as the original single-button flow,
//     for visitors who want one poster fast.
//
// We need a Client Component because localStorage is a browser API. The
// "Buy now" form action stays a server action — it's just embedded
// inside this client wrapper.

'use client';

import { useState, useTransition } from 'react';
import { useCart } from '@/lib/cart';
import { startCheckoutForPoster } from '@/app/actions/checkout';

type Props = {
  slug: string;
  /** Set true when the server has confirmed Stripe is configured. */
  stripeReady: boolean;
};

export function BuyRow({ slug, stripeReady }: Props) {
  const { add, has, hydrated } = useCart();
  const [justAdded, setJustAdded] = useState(false);
  const [isPending, startTransition] = useTransition();

  const inCart = hydrated && has(slug);
  // While the cart hook hasn't hydrated, render the buttons in their
  // default state. This matches the server-rendered HTML and avoids
  // a hydration mismatch warning.

  const handleAdd = () => {
    add(slug);
    setJustAdded(true);
    // Brief confirmation flash, then revert label so a second click
    // (which is a no-op) still feels responsive.
    window.setTimeout(() => setJustAdded(false), 1600);
  };

  const addLabel = justAdded
    ? 'Added ✓'
    : inCart
      ? 'In your cart'
      : 'Add to cart';

  return (
    <div className="buy-row buy-row--cart">
      <button
        type="button"
        className="btn-full btn-full--secondary"
        onClick={handleAdd}
        disabled={!stripeReady || (inCart && !justAdded)}
        aria-live="polite"
      >
        {addLabel}
      </button>
      <form
        action={(formData) => {
          startTransition(() => {
            startCheckoutForPoster(formData);
          });
        }}
      >
        <input type="hidden" name="slug" value={slug} />
        <button
          type="submit"
          className="btn-full"
          disabled={!stripeReady || isPending}
          title={
            stripeReady
              ? 'Pay securely with Stripe — download delivered immediately'
              : 'Checkout is temporarily unavailable. Please try again shortly.'
          }
        >
          {isPending ? 'Redirecting…' : 'Buy now'}
        </button>
      </form>
    </div>
  );
}
