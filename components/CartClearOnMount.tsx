// Tiny client component used by /checkout/success.
//
// When the parent has confirmed the order is PAID, it renders this
// component. On mount we clear the localStorage cart so the visitor's
// next visit doesn't show items they've already paid for.
//
// Lives in its own file so the success page can stay a Server Component
// (it does the order lookup) and only switches to a client island for
// this one effect.

'use client';

import { useEffect } from 'react';
import { clearCart } from '@/lib/cart';

export function CartClearOnMount() {
  useEffect(() => {
    clearCart();
  }, []);
  return null;
}
