// Admin order detail.
// Shows the per-item download links so the studio can copy them manually
// when the customer can't receive the email, and gives access to the
// re-issue action from here too.

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { absoluteUrl } from '@/lib/urls';
import { ReissueButton } from '../ReissueButton';

export const dynamic = 'force-dynamic';

function formatDateTime(d: Date): string {
  return d.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default async function AdminOrderDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      customer: true,
      items: {
        include: {
          poster: {
            select: { title: true, number: true, city: { select: { name: true } } },
          },
        },
      },
    },
  });

  if (!order) notFound();

  const customerEmail = order.customer?.email ?? order.guestEmail ?? null;
  const canReissue = order.status === 'PAID' || order.status === 'FULFILLED';

  return (
    <div className="admin-page">
      <header className="admin-page__header">
        <div>
          <p className="admin-page__eyebrow">
            <Link href="/admin/orders">Orders</Link> · {order.id.slice(-8).toUpperCase()}
          </p>
          <h1 style={{ fontFamily: 'var(--mono)', fontSize: 20 }}>
            Order {order.id.slice(-8).toUpperCase()}
          </h1>
        </div>
        {canReissue && <ReissueButton orderId={order.id} />}
      </header>

      <dl className="admin-definition" style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: '8px 24px', margin: '24px 0 40px' }}>
        <dt style={{ color: 'var(--mute)', fontSize: 12, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Placed</dt>
        <dd>{formatDateTime(order.createdAt)}</dd>
        <dt style={{ color: 'var(--mute)', fontSize: 12, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Status</dt>
        <dd>{order.status.toLowerCase()}</dd>
        <dt style={{ color: 'var(--mute)', fontSize: 12, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Customer</dt>
        <dd>{customerEmail ?? <span className="admin-muted">Guest, no email captured</span>}</dd>
        <dt style={{ color: 'var(--mute)', fontSize: 12, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Total</dt>
        <dd>€{(order.totalCents / 100).toFixed(2)} {order.currency.toUpperCase()}</dd>
        <dt style={{ color: 'var(--mute)', fontSize: 12, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Stripe session</dt>
        <dd style={{ fontFamily: 'var(--mono)', fontSize: 12, wordBreak: 'break-all' }}>
          {order.stripeSessionId ?? '—'}
        </dd>
      </dl>

      <h2 style={{ fontFamily: 'var(--display)', fontSize: 16, fontWeight: 500, margin: '0 0 12px' }}>
        Items
      </h2>
      <table className="admin-table">
        <thead>
          <tr>
            <th>Poster</th>
            <th>Price</th>
            <th>Downloads</th>
            <th>Expires</th>
            <th>Link</th>
          </tr>
        </thead>
        <tbody>
          {order.items.map((item) => {
            const url = item.downloadToken
              ? absoluteUrl(`/api/download/${item.downloadToken}`)
              : null;
            return (
              <tr key={item.id}>
                <td>
                  {item.poster?.title ?? 'Poster'}
                  <div className="admin-muted" style={{ fontSize: 12 }}>
                    {item.poster?.number}
                    {item.poster?.city?.name ? ` · ${item.poster.city.name}` : ''}
                  </div>
                </td>
                <td>€{(item.priceCents / 100).toFixed(2)}</td>
                <td>{item.downloadCount} / 5</td>
                <td>
                  {item.downloadExpiresAt
                    ? formatDateTime(item.downloadExpiresAt)
                    : '—'}
                </td>
                <td style={{ fontFamily: 'var(--mono)', fontSize: 11, wordBreak: 'break-all', maxWidth: 320 }}>
                  {url ?? <span className="admin-muted">No link</span>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
