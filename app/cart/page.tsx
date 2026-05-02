// /cart — visitor's shopping cart.
//
// The cart contents live in the browser (localStorage), so this page is
// a Client Component. On mount it reads slugs from useCart(), calls a
// server action to fetch poster details, and renders the rows.
//
// Submitting "Checkout" posts the slugs (joined with commas) into a
// hidden form input handled by startCheckoutForCart, which validates
// and creates a Stripe Checkout Session covering all items.
//
// Suspense wrapper: Next 15 refuses to prerender a page that calls
// useSearchParams() unless it's inside a Suspense boundary. The default
// export here is a thin wrapper that provides that boundary; CartContents
// holds the actual logic.

'use client';

import { Suspense, useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Nav } from '@/components/Nav';
import { Footer } from '@/components/Footer';
import { ProtectedImage } from '@/components/ProtectedImage';
import { useCart } from '@/lib/cart';
import { getCartPreviews, type CartLineView } from '@/app/actions/cart';
import { startCheckoutForCart } from '@/app/actions/checkout';

export default function CartPage() {
  return (
    <Suspense fallback={<CartShell />}>
      <CartContents />
    </Suspense>
  );
}

/**
 * Static shell rendered while CartContents waits for client-side
 * hydration of the searchParams hook. Matches the eventual layout so
 * there's no jarring shift when the real content swaps in.
 */
function CartShell() {
  return (
    <>
      <Nav />
      <section className="section">
        <div className="cart-page">
          <div className="eyebrow">
            <span className="num">Your cart</span>
            <span className="mono-label" />
          </div>
          <h2 className="title">
            Cart<span className="italic">.</span>
          </h2>
          <div className="cart-loading aside">Loading your cart…</div>
        </div>
      </section>
      <Footer />
    </>
  );
}

function CartContents() {
  const { items, count, hydrated, remove } = useCart();
  const searchParams = useSearchParams();
  const wasCancelled = searchParams.get('cancelled') === '1';
  const wasStale = searchParams.get('stale') === '1';

  const [lines, setLines] = useState<CartLineView[]>([]);
  const [loading, setLoading] = useState(true);
  // Tracks the last set of slugs we hydrated against so we don't refetch
  // on every render (useEffect deps would otherwise re-run on each
  // localStorage change even when the slug list is identical).
  const lastSlugsKey = useRef<string>('');

  useEffect(() => {
    if (!hydrated) return;
    const slugs = items.map((i) => i.slug);
    const key = slugs.join(',');
    if (key === lastSlugsKey.current) return;
    lastSlugsKey.current = key;

    if (slugs.length === 0) {
      setLines([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    getCartPreviews(slugs).then((rows) => {
      setLines(rows);
      // Drop any cart entries the server couldn't find (poster
      // unpublished or deleted). Keeps localStorage tidy without making
      // the visitor manually clean up.
      const found = new Set(rows.map((r) => r.slug));
      slugs.filter((s) => !found.has(s)).forEach(remove);
      setLoading(false);
    });
  }, [hydrated, items, remove]);

  const subtotalCents = lines.reduce((sum, l) => sum + l.priceCents, 0);
  const subtotalEur = (subtotalCents / 100).toFixed(2);
  const slugsCsv = lines.map((l) => l.slug).join(',');

  return (
    <>
      <Nav />

      <section className="section">
        <div className="cart-page">
          <div className="eyebrow">
            <span className="num">Your cart</span>
            <span className="mono-label">
              {hydrated ? `${count} item${count === 1 ? '' : 's'}` : ''}
            </span>
          </div>

          <h2 className="title">
            Cart<span className="italic">.</span>
          </h2>

          {wasCancelled && (
            <p className="cart-banner">
              Checkout was cancelled — your cart is still here.
            </p>
          )}
          {wasStale && (
            <p className="cart-banner cart-banner--warn">
              Some posters in your cart are no longer available and were
              removed.
            </p>
          )}

          {!hydrated || loading ? (
            <div className="cart-loading aside">Loading your cart…</div>
          ) : lines.length === 0 ? (
            <div className="cart-empty">
              <p className="aside">
                Your cart is empty. Browse the gallery and add a poster.
              </p>
              <Link className="btn-full" href="/">
                Back to the gallery
              </Link>
            </div>
          ) : (
            <>
              <ul className="cart-list">
                {lines.map((line) => (
                  <li key={line.slug} className="cart-row">
                    <Link
                      href={`/shop/${line.slug}`}
                      className="cart-row__thumb"
                      aria-label={line.title}
                    >
                      <ProtectedImage
                        src={line.previewFile}
                        alt={line.title}
                        width={200}
                        height={260}
                        sizes="120px"
                      />
                    </Link>
                    <div className="cart-row__info">
                      <Link
                        href={`/shop/${line.slug}`}
                        className="cart-row__title"
                      >
                        {line.title}
                      </Link>
                      <div className="cart-row__meta">
                        {line.number} · {line.cityName}
                      </div>
                      <button
                        type="button"
                        className="cart-row__remove"
                        onClick={() => remove(line.slug)}
                        aria-label={`Remove ${line.title}`}
                      >
                        Remove
                      </button>
                    </div>
                    <div className="cart-row__price">€{line.priceEur}.00</div>
                  </li>
                ))}
              </ul>

              <div className="cart-summary">
                <div className="cart-summary__row cart-summary__row--total">
                  <span className="total-label">Subtotal</span>
                  <span className="total-value">€{subtotalEur}</span>
                </div>
                <p className="cart-summary__note">
                  EU VAT is calculated at checkout based on your billing
                  country. Digital download · link valid 48 hours, up to
                  five downloads per item.
                </p>
                <form action={startCheckoutForCart} className="cart-checkout">
                  <input type="hidden" name="slugs" value={slugsCsv} />
                  <button
                    type="submit"
                    className="btn-full"
                    disabled={lines.length === 0}
                  >
                    Checkout · €{subtotalEur}
                  </button>
                </form>
                <Link className="btn-ghost cart-summary__back" href="/">
                  ← Continue browsing
                </Link>
              </div>
            </>
          )}
        </div>
      </section>

      <Footer />
    </>
  );
}
