// Stripe Checkout session builder.
//
// v1: single poster per checkout (€5). The schema already supports bundles
// and multiple line items, so when bundles ship we extend `createCheckout`
// to take an array of item inputs.
//
// Flow:
//   1. User clicks "Add to cart · download now" on /shop/[slug]
//   2. Server action calls createCheckoutForPoster(slug) → inserts a PENDING
//      Order row, creates a Stripe Checkout Session, returns its URL
//   3. Browser follows the 303 redirect to Stripe
//   4. Stripe redirects back to /checkout/success?sid={CHECKOUT_SESSION_ID}
//      or /checkout/cancel — the webhook is what actually flips status

import { prisma } from '@/lib/prisma';
import { stripe, CURRENCY } from '@/lib/stripe';
import { publicUrl } from '@/lib/storage';

function absoluteUrl(path: string): string {
  // Next.js doesn't give us a clean request URL in server actions; fall
  // back to env. Railway sets NEXT_PUBLIC_SITE_URL on deploys.
  const base =
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.VERCEL_URL ??
    'http://localhost:3000';
  const normalized = base.startsWith('http') ? base : `https://${base}`;
  return `${normalized.replace(/\/$/, '')}${path}`;
}

export type CheckoutPosterInput = {
  posterId: string;
  slug: string;
  title: string;
  description: string;
  previewKey: string | null;
  priceCents: number;
};

/**
 * Create a Stripe Checkout Session for a single poster. Returns the URL
 * to redirect the browser to. The Order row is pre-created in PENDING
 * state with the session id attached, so the webhook can look it up.
 */
export async function createCheckoutForPoster(
  poster: CheckoutPosterInput,
): Promise<string> {
  // 1. Pre-create a PENDING order. No customer yet — the webhook will
  // upsert a Customer from Stripe's collected email.
  const order = await prisma.order.create({
    data: {
      totalCents: poster.priceCents,
      currency: CURRENCY,
      status: 'PENDING',
      items: {
        create: [
          {
            posterId: poster.posterId,
            priceCents: poster.priceCents,
            kind: 'DIGITAL',
          },
        ],
      },
    },
  });

  // 2. Build the Checkout Session.
  //
  // - mode: 'payment' → one-time purchase (vs subscription)
  // - automatic_tax → Stripe Tax computes EU VAT from customer location
  // - customer_email is omitted: Stripe collects it on the form. We pass
  //   allow_promotion_codes so we can wire discount-code newsletter
  //   incentives later without touching this code path.
  // - metadata.orderId → how the webhook finds our Order row
  const previewImage = poster.previewKey
    ? [absoluteUrl(publicUrl(poster.previewKey))]
    : [];

  const session = await stripe().checkout.sessions.create(
    {
      mode: 'payment',
      currency: CURRENCY,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: CURRENCY,
            unit_amount: poster.priceCents,
            product_data: {
              name: poster.title,
              description: poster.description.slice(0, 500),
              images: previewImage,
              // Mark as digital for tax classification (EU place-of-supply
              // rules: VAT at customer location for digital goods).
              tax_code: 'txcd_10000000',
            },
            tax_behavior: 'inclusive',
          },
        },
      ],
      automatic_tax: { enabled: true },
      allow_promotion_codes: true,
      billing_address_collection: 'required',
      // EU VAT compliance needs the country at minimum; billing_address
      // 'required' covers it. We don't collect a physical shipping address
      // for digital-only.
      success_url: absoluteUrl('/checkout/success?sid={CHECKOUT_SESSION_ID}'),
      cancel_url: absoluteUrl(`/shop/${poster.slug}?cancelled=1`),
      metadata: {
        orderId: order.id,
        kind: 'poster',
        posterId: poster.posterId,
      },
    },
    {
      // Idempotency: if the browser double-submits, we don't create two
      // sessions for the same Order.
      idempotencyKey: `order_${order.id}`,
    },
  );

  // 3. Attach the session id to the order so the webhook can find it.
  await prisma.order.update({
    where: { id: order.id },
    data: { stripeSessionId: session.id },
  });

  if (!session.url) {
    throw new Error('Stripe did not return a checkout URL.');
  }
  return session.url;
}
