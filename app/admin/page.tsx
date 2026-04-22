import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function AdminDashboard() {
  const [posterCount, publishedCount, cityCount, orderCount, subscriberCount, recentOrders] =
    await Promise.all([
      prisma.poster.count(),
      prisma.poster.count({ where: { status: 'PUBLISHED' } }),
      prisma.city.count(),
      prisma.order.count({ where: { status: 'PAID' } }),
      prisma.subscriber.count(),
      prisma.order.findMany({
        where: { status: { in: ['PAID', 'FULFILLED'] } },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: { customer: true },
      }),
    ]);

  const revenueCents = await prisma.order.aggregate({
    where: { status: { in: ['PAID', 'FULFILLED'] } },
    _sum: { totalCents: true },
  });
  const revenueEur = (revenueCents._sum.totalCents ?? 0) / 100;

  return (
    <div className="admin-dash">
      <header className="admin-dash__header">
        <p className="admin-dash__eyebrow">Overview</p>
        <h1>Dashboard</h1>
        <p className="admin-dash__lede">
          The shop at a glance. Stripe-wired metrics fill in during Session 4.
        </p>
      </header>

      <div className="admin-stats">
        <Stat label="Posters" value={String(posterCount)} note={`${publishedCount} live`} />
        <Stat label="Cities" value={String(cityCount)} />
        <Stat label="Paid orders" value={String(orderCount)} note="All-time" />
        <Stat label="Revenue" value={`€${revenueEur.toFixed(2)}`} note="All-time" />
        <Stat label="Newsletter" value={String(subscriberCount)} note="Subscribers" />
      </div>

      <section className="admin-dash__section">
        <h2>Recent orders</h2>
        {recentOrders.length === 0 ? (
          <p className="admin-muted">No orders yet — Stripe arrives in Session 4.</p>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Customer</th>
                <th>Status</th>
                <th className="admin-table__right">Total</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.map((o) => (
                <tr key={o.id}>
                  <td>{o.createdAt.toLocaleDateString()}</td>
                  <td>{o.customer?.email ?? o.guestEmail ?? 'Guest'}</td>
                  <td>{o.status.toLowerCase()}</td>
                  <td className="admin-table__right">€{(o.totalCents / 100).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="admin-stat">
      <div className="admin-stat__label">{label}</div>
      <div className="admin-stat__value">{value}</div>
      {note && <div className="admin-stat__note">{note}</div>}
    </div>
  );
}
