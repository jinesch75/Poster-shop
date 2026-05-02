// Post-checkout landing page.
//
// Shows the user their purchase + download buttons. Crucially, it does
// NOT depend on the webhook having fired yet — Stripe sometimes delivers
// the webhook a few seconds after the redirect. We poll the order state
// server-side: refresh the page if it's still PENDING, render downloads
// once it's PAID.

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Nav } from '@/components/Nav';
import { Footer } from '@/components/Footer';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

type SearchParams = { sid?: string };

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { sid } = await searchParams;
  if (!sid) notFound();

  const order = await prisma.order.findUnique({
    where: { stripeSessionId: sid },
    include: {
      items: {
        include: {
          poster: {
            select: {
              title: true,
              slug: true,
              number: true,
              city: { select: { name: true } },
            },
          },
        },
      },
    },
  });

  if (!order) notFound();

  const isPending = order.status === 'PENDING';
  const isPaid = order.status === 'PAID' || order.status === 'FULFILLED';

  return (
    <>
      <Nav />

      {/* If the webhook hasn't fired yet, refresh the page every 3s until
          it flips to PAID. Meta-refresh is the simplest cross-browser way
          to do this without pulling in a client component. */}
      {isPending && (
        <meta httpEquiv="refresh" content="3" />
      )}

      <section className="section">
        <div className="checkout-success">
          <div className="eyebrow">
            <span className="num">Thank you</span>
            <span className="mono-label">Order {order.id.slice(-8)}</span>
          </div>

          {isPending && (
            <>
              <h2 className="title">
                Finalising your order<span className="italic">…</span>
              </h2>
              <p className="aside">
                We&apos;re confirming the payment with Stripe. This usually
                takes a few seconds — the page will refresh automatically.
              </p>
            </>
          )}

          {isPaid && (
            <>
              <h2 className="title">
                Ready to download<span className="italic">.</span>
              </h2>
              <p className="aside">
                Your files are clean, unmarked, and yours to print. Links
                below expire 48 hours after purchase and allow up to five
                downloads each.
              </p>

              <div className="download-list">
                {order.items.map((item) => (
                  <div key={item.id} className="download-row">
                    <div className="download-row__info">
                      <div className="download-row__title">
                        {item.poster?.title ?? 'Poster'}
                      </div>
                      <div className="download-row__meta">
                        {item.poster?.number ?? ''}
                        {item.poster?.city?.name ? ` · ${item.poster.city.name}` : ''}
                      </div>
                    </div>
                    {item.downloadToken ? (
                      <a
                        className="btn-full"
                        href={`/api/download/${item.downloadToken}`}
                      >
                        Download
                      </a>
                    ) : (
                      <span className="download-row__pending">
                        Preparing…
                      </span>
                    )}
                  </div>
                ))}
              </div>

              {order.guestEmail && (
                <p className="checkout-success__receipt">
                  We&apos;ve sent a receipt to{' '}
                  <strong>{order.guestEmail}</strong>.
                </p>
              )}
            </>
          )}

          {order.status === 'REFUNDED' && (
            <>
              <h2 className="title">Order refunded</h2>
              <p className="aside">
                This order has been refunded and the download links are no
                longer active. Reach out if you think this is in error.
              </p>
            </>
          )}

          <div className="checkout-success__back">
            <Link className="btn-ghost" href="/">
              ← Back to the gallery
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
