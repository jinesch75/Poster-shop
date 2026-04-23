// Receipt-email composer.
//
// Two callers:
//  - app/api/webhooks/stripe/route.ts — on the PENDING→PAID transition
//  - app/admin/orders/[id]/actions.ts — when an admin re-issues downloads
//
// Both pass the orderId + recipient email; this module loads the current
// order/items from the DB, builds the template, and hands off to sendEmail.

import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/lib/email';
import { renderReceipt } from '@/lib/email-templates';
import { absoluteUrl } from '@/lib/urls';

export type SendReceiptArgs = {
  orderId: string;
  to: string;
  toName?: string | null;
  /** If present, used to build the /checkout/success?sid= order URL. */
  stripeSessionId?: string | null;
  /**
   * When true, subject is "Your updated download links" instead of the
   * first-purchase phrasing. Used by the admin re-issue action.
   */
  isReissue?: boolean;
};

export async function sendReceiptEmail(args: SendReceiptArgs) {
  const order = await prisma.order.findUnique({
    where: { id: args.orderId },
    include: {
      items: {
        include: {
          poster: {
            select: {
              title: true,
              number: true,
              city: { select: { name: true } },
            },
          },
        },
      },
    },
  });

  if (!order) throw new Error(`Order ${args.orderId} not found`);
  if (order.items.length === 0) throw new Error(`Order ${args.orderId} has no items`);

  const sessionId = args.stripeSessionId ?? order.stripeSessionId;
  const orderUrl = sessionId
    ? absoluteUrl(`/checkout/success?sid=${encodeURIComponent(sessionId)}`)
    : absoluteUrl(`/shop`);

  const items = order.items.map((item) => ({
    title: item.poster?.title ?? 'Linework Studio poster',
    number: item.poster?.number ?? '',
    cityName: item.poster?.city?.name ?? null,
    downloadUrl: item.downloadToken
      ? absoluteUrl(`/api/download/${item.downloadToken}`)
      : orderUrl,
  }));

  const supportEmail = process.env.ADMIN_EMAIL || 'brosiusjacques@gmail.com';

  const { html, text } = renderReceipt({
    orderShortId: order.id.slice(-8).toUpperCase(),
    totalEur: (order.totalCents / 100).toFixed(2),
    items,
    orderUrl,
    supportEmail,
  });

  const subject = args.isReissue
    ? 'Your Linework Studio download links — refreshed'
    : 'Your Linework Studio order — ready to download';

  return sendEmail({
    to: args.to,
    toName: args.toName ?? undefined,
    subject,
    html,
    text,
    tag: args.isReissue ? 'reissue' : 'receipt',
  });
}
