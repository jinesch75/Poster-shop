// Stripe Checkout session builder.
//
// The cart is a list of CheckoutPosterInput items. Single-poster "buy now"
// is just a cart with one entry — there is no longer a separate code path
// for it. The schema (Order → OrderItem[]) and the webhook already loop
// over items, so multi-item is a natural extension, not a redesign.
//
// Flow:
//   1. /cart "Checkout" submits cart slugs to startCheckoutForCart, OR
//      /shop/[slug] "Buy now" submits a single slug to the same action.
//   2. Server action loads the posters, hands a list of CheckoutPosterInputs
//      to createCheckoutForCart, which:
//        a. inserts a PENDING Order with N OrderItem rows
//        b. creates a Stripe Checkout Session with N line_items
//        c. attaches the session id to the order so the webhook can find it
//   3. Browser follows the 303 redirect to Stripe.
//   4. Stripe redirects back to /checkout/success?sid={CHECKOUT_SESSION_ID}.
//      The webhook is what flips status PENDING → PAID and mints download
//      tokens; the success page polls the order until it's PAID.

import { prisma } from '@/lib/prisma';
import { stripe, CURRENCY } from '@/lib/stripe';
import { publicUrl } from '@/lib/storage';
import { absoluteUrl } from '@/lib/urls';

export type CheckoutPosterInput = {
  posterId: string;
  slug: string;
  title: string;
  description: string;
  previewKey: string | null;
  priceCents: number;
};

/**
 * Create a Stripe Checkout Session for a cart of posters. Returns the URL
 * to redirect the browser to. The Order row is pre-created in PENDING
 * state with the session id attached, so the webhook can look it up.
 *
 * Throws if the cart is empty — callers must guard.
 */
export async function createCheckoutForCart(
  posters: CheckoutPosterInput[],
): Promise<string> {
  if (posters.length === 0) {
    throw new Error('Cannot start checkout with an empty cart.');
  }

  const totalCents = posters.reduce((sum, p) => sum + p.priceCents, 0);

  // 1. Pre-create a PENDING order with one OrderItem per poster. No
  // customer yet — the webhook will upsert a Customer from Stripe's
  // collected email.
  const order = await prisma.order.create({
    data: {
      totalCents,
      currency: CURRENCY,
      status: 'PENDING',
      items: {
        create: posters.map((p) => ({
          posterId: p.posterId,
          priceCents: p.priceCents,
          kind: 'DIGITAL',
        })),
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
  //
  // Append the download terms to each Stripe product description so
  // they're visible BEFORE payment (consumer-protection / transparency).
  // Stripe caps description at 500 chars, so we trim the poster
  // description and always reserve room for the terms line.
  const TERMS = ' — Digital download. Link valid 48 hours, up to 5 downloads.';
  const descBudget = 500 - TERMS.length;

  const lineItems = posters.map((poster) => {
    const previewImage = poster.previewKey
      ? [absoluteUrl(publicUrl(poster.previewKey))]
      : [];
    const productDescription = poster.description.slice(0, descBudget) + TERMS;
    return {
      quantity: 1,
      price_data: {
        currency: CURRENCY,
        unit_amount: poster.priceCents,
        product_data: {
          name: poster.title,
          description: productDescription,
          images: previewImage,
          // Mark as digital for tax classification (EU place-of-supply
          // rules: VAT at customer location for digital goods).
          tax_code: 'txcd_10000000',
        },
        tax_behavior: 'inclusive' as const,
      },
    };
  });

  // For the cancel URL: if it's a single-poster cart we send the visitor
  // back to that product page (preserves the old "Buy now" UX). For a
  // real cart we send them back to /cart so they don't lose their items.
  const cancelPath =
    posters.length === 1 ? `/shop/${posters[0]!.slug}?cancelled=1` : `/cart?cancelled=1`;

  const session = await stripe().checkout.sessions.create(
    {
      mode: 'payment',
      currency: CURRENCY,
      line_items: lineItems,
      automatic_tax: { enabled: true },
      allow_promotion_codes: true,
      billing_address_collection: 'required',
      // EU VAT compliance needs the country at minimum; billing_address
      // 'required' covers it. We don't collect a physical shipping address
      // for digital-only.
      success_url: absoluteUrl('/checkout/success?sid={CHECKOUT_SESSION_ID}'),
      cancel_url: absoluteUrl(cancelPath),
      metadata: {
        orderId: order.id,
        kind: 'cart',
        // Comma-separated list of poster ids for at-a-glance debugging
        // on Stripe's dashboard. Authoritative source remains the Order
        // row — this is purely informational.
        posterIds: posters.map((p) => p.posterId).join(','),
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

/**
 * Convenience wrapper for the single-poster "Buy now" path. Kept around
 * so the product page button doesn't need to know the cart shape — it
 * just hands over one poster and gets back a URL.
 */
export function createCheckoutForPoster(
  poster: CheckoutPosterInput,
): Promise<string> {
  return createCheckoutForCart([poster]);
}
