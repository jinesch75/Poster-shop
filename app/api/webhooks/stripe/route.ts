// Stripe webhook handler.
//
// Stripe posts here after payment events. We care about:
//   - checkout.session.completed  → mark order PAID, mint download tokens,
//                                   upsert customer from email
//   - charge.refunded             → flip order REFUNDED, revoke tokens
//
// Signature verification is mandatory — without it, anyone could POST a
// fake `checkout.session.completed` and get download tokens for free.
//
// Runtime: nodejs. Stripe's webhook verification needs the raw body; the
// Edge runtime doesn't expose it cleanly, so we explicitly opt into nodejs
// and read the raw text before handing to the SDK.

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import type Stripe from 'stripe';
import { prisma } from '@/lib/prisma';
import { stripe } from '@/lib/stripe';
import { sendReceiptEmail } from '@/lib/receipt';

export const runtime = 'nodejs';
// Don't let Next cache anything on this route.
export const dynamic = 'force-dynamic';

// 48h from purchase, 5 download attempts. Kept explicit here so the
// policy is obvious in one place.
const DOWNLOAD_TOKEN_TTL_MS = 48 * 60 * 60 * 1000;

function mintDownloadToken(): string {
  // 32 bytes of entropy → 64-char hex. Plenty of room; unguessable even
  // if an attacker had one valid token.
  return randomBytes(32).toString('hex');
}

export async function POST(req: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: 'Webhook secret not configured' },
      { status: 500 },
    );
  }

  const signature = req.headers.get('stripe-signature');
  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(rawBody, signature, secret);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Invalid signature';
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object);
        break;
      case 'charge.refunded':
        await handleChargeRefunded(event.data.object);
        break;
      default:
        // Ignore other events — we can opt in later (payment_intent.succeeded,
        // etc.) without changing how the Stripe dashboard is configured.
        break;
    }
  } catch (err) {
    // Log and return 500 so Stripe retries (exponential backoff for 72h).
    console.error('[stripe webhook] handler error', event.type, err);
    return NextResponse.json({ error: 'Handler failed' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

// ---------- Handlers ----------

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const orderId = session.metadata?.orderId;
  if (!orderId) {
    console.warn('[stripe webhook] session without orderId metadata', session.id);
    return;
  }

  // Only transition PENDING → PAID. Re-deliveries of the event are a normal
  // part of Stripe's at-least-once guarantee — we must be idempotent.
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });
  if (!order) {
    console.warn('[stripe webhook] unknown orderId', orderId);
    return;
  }
  if (order.status !== 'PENDING') {
    // Already processed — nothing to do, return 200 so Stripe stops retrying.
    return;
  }

  const email = session.customer_details?.email ?? session.customer_email ?? null;
  const name = session.customer_details?.name ?? null;

  // Upsert Customer when we got an email. Guest checkouts without email
  // still get the order; they just won't have a linked account.
  let customerId: string | null = order.customerId;
  if (email && !customerId) {
    const customer = await prisma.customer.upsert({
      where: { email: email.toLowerCase() },
      update: {
        name: name ?? undefined,
        stripeCustomerId:
          typeof session.customer === 'string' ? session.customer : undefined,
      },
      create: {
        email: email.toLowerCase(),
        name: name ?? undefined,
        stripeCustomerId:
          typeof session.customer === 'string' ? session.customer : null,
      },
    });
    customerId = customer.id;
  }

  const expiresAt = new Date(Date.now() + DOWNLOAD_TOKEN_TTL_MS);

  // Update order + mint per-item download tokens in one transaction so
  // we never end up with a PAID order whose items have no tokens.
  await prisma.$transaction([
    prisma.order.update({
      where: { id: order.id },
      data: {
        status: 'PAID',
        customerId: customerId ?? order.customerId,
        guestEmail: email,
        stripePaymentIntentId:
          typeof session.payment_intent === 'string'
            ? session.payment_intent
            : null,
        // Stripe Tax updates the amount on completion — take what actually
        // cleared rather than what we guessed at session-create time.
        totalCents: session.amount_total ?? order.totalCents,
      },
    }),
    ...order.items.map((item) =>
      prisma.orderItem.update({
        where: { id: item.id },
        data: {
          downloadToken: mintDownloadToken(),
          downloadExpiresAt: expiresAt,
          downloadCount: 0,
        },
      }),
    ),
  ]);

  // Send the receipt email. Intentionally outside the transaction — we never
  // want an email failure to undo a PAID order, and we also never want to
  // retry the whole webhook just because Brevo 5xx'd. If the email fails,
  // the download still works (success page + admin re-issue button are the
  // safety nets).
  if (email) {
    try {
      await sendReceiptEmail({
        orderId: order.id,
        to: email,
        toName: name,
        stripeSessionId: session.id,
      });
    } catch (err) {
      console.error('[stripe webhook] receipt email failed', order.id, err);
    }
  }
}

async function handleChargeRefunded(charge: Stripe.Charge) {
  const paymentIntentId =
    typeof charge.payment_intent === 'string'
      ? charge.payment_intent
      : charge.payment_intent?.id;
  if (!paymentIntentId) return;

  const order = await prisma.order.findUnique({
    where: { stripePaymentIntentId: paymentIntentId },
    include: { items: true },
  });
  if (!order) return;
  if (order.status === 'REFUNDED') return;

  // Full refund → revoke tokens. Partial refunds keep delivery.
  const isFull = charge.amount_refunded >= charge.amount;
  if (!isFull) return;

  await prisma.$transaction([
    prisma.order.update({
      where: { id: order.id },
      data: { status: 'REFUNDED' },
    }),
    ...order.items.map((item) =>
      prisma.orderItem.update({
        where: { id: item.id },
        data: {
          // Setting expiry to the epoch makes the download route refuse
          // further attempts without needing schema changes.
          downloadExpiresAt: new Date(0),
        },
      }),
    ),
  ]);
}
