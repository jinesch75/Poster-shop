// Client-side cart, backed by localStorage.
//
// Why localStorage and not a server-side session?
// Gridline Cities is digital-only and runs without accounts. The cart is a
// short-lived browser-local list of poster slugs the visitor wants to buy
// in one Stripe Checkout session. Persisting on the server would mean
// session cookies + a Cart table for what is, in practice, a list that
// rarely outlives a single browsing session. localStorage covers it.
//
// Trade-offs (all acceptable at this scale):
//   - Cart is per-device-per-browser. Phone cart ≠ laptop cart.
//   - Clearing cookies/site data clears the cart.
//   - No price/availability lock-in — the server validates both at
//     checkout time and rejects unpublished posters / uses current price.
//
// API surface intentionally minimal: items, add(slug), remove(slug),
// clear(), and a derived `count`. No quantities (digital goods — buying
// the same PNG twice makes no sense), no in-cart price (always asked
// from the server at /cart render time, so a stale cart can't show a
// stale price).
//
// SSR-safety: every storage access is guarded with `typeof window`. The
// hook returns `{ items: [], hydrated: false }` on the first server-pass
// and the first client render, then flips to the real list once the
// effect runs. Components should treat `hydrated === false` as "don't
// show cart-dependent UI yet" to avoid a flash.

'use client';

import { useEffect, useState, useCallback } from 'react';

const STORAGE_KEY = 'gridline.cart.v1';
// Bumped if the on-disk shape ever changes — readers ignore other versions.
const CART_EVENT = 'gridline:cart-changed';

export type CartItem = {
  slug: string;
  /** ISO timestamp — used for stable ordering in the cart UI. */
  addedAt: string;
};

type StoredCart = {
  v: 1;
  items: CartItem[];
};

function readStorage(): CartItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as StoredCart;
    if (!parsed || parsed.v !== 1 || !Array.isArray(parsed.items)) return [];
    // Defensive: drop anything that doesn't have a slug string.
    return parsed.items.filter(
      (i): i is CartItem =>
        typeof i?.slug === 'string' && typeof i?.addedAt === 'string',
    );
  } catch {
    // Quota errors, JSON parse errors, private-mode quirks — bail out
    // silently. A broken cart should not crash the site.
    return [];
  }
}

function writeStorage(items: CartItem[]): void {
  if (typeof window === 'undefined') return;
  try {
    const payload: StoredCart = { v: 1, items };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    // Notify other useCart() instances (Nav badge, /cart page, product
    // page) on the same tab. The native 'storage' event only fires
    // cross-tab, which is why we dispatch our own.
    window.dispatchEvent(new CustomEvent(CART_EVENT));
  } catch {
    // Same as readStorage — fail soft.
  }
}

/**
 * React hook. Returns a live snapshot of the cart plus mutation helpers.
 * `hydrated` is false on the first paint and flips to true after the
 * initial localStorage read; callers should hide cart-dependent UI until
 * then to avoid hydration mismatches.
 */
export function useCart() {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // Initial load + subscribe to changes (this tab and other tabs).
  useEffect(() => {
    setItems(readStorage());
    setHydrated(true);
    const onChange = () => setItems(readStorage());
    window.addEventListener(CART_EVENT, onChange);
    window.addEventListener('storage', onChange);
    return () => {
      window.removeEventListener(CART_EVENT, onChange);
      window.removeEventListener('storage', onChange);
    };
  }, []);

  const add = useCallback((slug: string) => {
    const current = readStorage();
    // Idempotent: adding a poster that's already in the cart is a no-op.
    // Digital goods, no quantities — see file header.
    if (current.some((i) => i.slug === slug)) return;
    const next = [...current, { slug, addedAt: new Date().toISOString() }];
    writeStorage(next);
    setItems(next);
  }, []);

  const remove = useCallback((slug: string) => {
    const next = readStorage().filter((i) => i.slug !== slug);
    writeStorage(next);
    setItems(next);
  }, []);

  const clear = useCallback(() => {
    writeStorage([]);
    setItems([]);
  }, []);

  const has = useCallback(
    (slug: string) => items.some((i) => i.slug === slug),
    [items],
  );

  return {
    items,
    count: items.length,
    hydrated,
    add,
    remove,
    clear,
    has,
  };
}

/**
 * Non-hook reader. Useful for one-off reads outside React (e.g. building
 * a hidden form input on form submit).
 */
export function readCartSlugs(): string[] {
  return readStorage().map((i) => i.slug);
}

/**
 * Non-hook clear. Used by the post-checkout success page to drop the
 * cart once an order has been confirmed PAID.
 */
export function clearCart(): void {
  writeStorage([]);
}
