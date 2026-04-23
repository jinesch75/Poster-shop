// Admin orders list.
// One row per order, with a re-issue button for PAID/FULFILLED orders.
// Clicking a row opens the detail view for per-item links (next page).

import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { ReissueButton } from './ReissueButton';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 50;

function formatDate(d: Date): string {
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatExpiry(d: Date | null): string {
  if (!d) return '—';
  const now = Date.now();
  const delta = d.getTime() - now;
  if (delta <= 0) return 'Expired';
  const hours = Math.floor(delta / (60 * 60 * 1000));
  if (hours >= 24) return `${Math.floor(hours / 24)}d left`;
  if (hours >= 1) return `${hours}h left`;
  const mins = Math.floor(delta / (60 * 1000));
  return `${mins}m left`;
}

export default async function AdminOrdersList() {
  const orders = await prisma.order.findMany({
    where: { status: { in: ['PAID', 'FULFILLED', 'REFUNDED'] } },
    orderBy: { createdAt: 'desc' },
    take: PAGE_SIZE,
    include: {
      customer: true,
      items: { select: { id: true, downloadExpiresAt: true, downloadCount: true } },
    },
  });

  return (
    <div className="admin-page">
      <header className="admin-page__header">
        <div>
          <p className="admin-page__eyebrow">Customers</p>
          <h1>Orders</h1>
        </div>
      </header>

      {orders.length === 0 ? (
        <p className="admin-muted">No paid orders yet.</p>
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Order</th>
              <th>Customer</th>
              <th>Status</th>
              <th className="admin-table__right">Total</th>
              <th>Links</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => {
              const earliestExpiry = o.items
                .map((i) => i.downloadExpiresAt)
                .filter((d): d is Date => Boolean(d))
                .sort((a, b) => a.getTime() - b.getTime())[0] ?? null;
              const customerEmail = o.customer?.email ?? o.guestEmail ?? 'Guest';
              const canReissue = o.status === 'PAID' || o.status === 'FULFILLED';
              return (
                <tr key={o.id}>
                  <td>{formatDate(o.createdAt)}</td>
                  <td>
                    <Link href={`/admin/orders/${o.id}`} style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>
                      {o.id.slice(-8).toUpperCase()}
                    </Link>
                  </td>
                  <td>{customerEmail}</td>
                  <td>{o.status.toLowerCase()}</td>
                  <td className="admin-table__right">€{(o.totalCents / 100).toFixed(2)}</td>
                  <td style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
                    {o.items.length} item{o.items.length === 1 ? '' : 's'} ·{' '}
                    {formatExpiry(earliestExpiry)}
                  </td>
                  <td>{canReissue && <ReissueButton orderId={o.id} />}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {orders.length >= PAGE_SIZE && (
        <p className="admin-muted" style={{ marginTop: 24 }}>
          Showing the {PAGE_SIZE} most recent. Pagination lands when the shop
          is busy enough to need it.
        </p>
      )}
    </div>
  );
}
