// Server-side Stripe client.
//
// Lazily initialized so that `next build` doesn't crash on CI boxes or
// preview environments where STRIPE_SECRET_KEY isn't set. Call `stripe()`
// from any server code that needs it; the first call instantiates, subsequent
// calls return the cached instance.
//
// API version is pinned: this matches the TypeScript types shipped with
// stripe@17.x. When bumping the SDK, lock the version string to whatever
// ships with that release — otherwise TS will complain about shape drift.

import Stripe from 'stripe';

let client: Stripe | null = null;

/** Lazily-instantiated Stripe server client. Throws if the key is missing. */
export function stripe(): Stripe {
  if (client) return client;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error(
      'STRIPE_SECRET_KEY is not set. See .env.example — Stripe requires this at runtime.',
    );
  }
  client = new Stripe(key, {
    apiVersion: '2025-02-24.acacia',
    appInfo: {
      name: 'Linework Studio',
      version: '0.2.0',
    },
    // Small retry for transient network errors; Checkout creates are idempotent
    // by design (we pass our own idempotency keys where relevant).
    maxNetworkRetries: 2,
  });
  return client;
}

/**
 * Whether Stripe is configured for this environment. Used by defensive
 * fallbacks (e.g. disable the Buy button if someone forgets to set keys
 * on a preview deploy), and by scripts that shouldn't boot the client.
 */
export function stripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

/** Currency used throughout the app. */
export const CURRENCY = 'eur';
