// Admin actions for the orders screen.
// Currently just the re-issue-downloads escape hatch that lets the studio
// mint fresh tokens and re-email a customer whose 48h window lapsed.

'use server';

import { randomBytes } from 'crypto';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { ADMIN_COOKIE, verifyAdminToken } from '@/lib/auth';
import { sendReceiptEmail } from '@/lib/receipt';

// Same window as the original receipt — keep policy consistent.
const DOWNLOAD_TOKEN_TTL_MS = 48 * 60 * 60 * 1000;

function mintDownloadToken(): string {
  return randomBytes(32).toString('hex');
}

async function requireAdmin() {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  const ok = await verifyAdminToken(token);
  if (!ok) throw new Error('Not authorised');
}

export type ReissueResult =
  | { ok: true; emailed: boolean; message: string }
  | { ok: false; message: string };

/**
 * Re-issue downloads for every item in an order:
 *   - mint a fresh token
 *   - reset downloadCount to 0
 *   - extend the expiry 48h from now
 *   - resend the receipt email (if we have the buyer's address)
 *
 * Only PAID and FULFILLED orders are eligible. REFUNDED stays refunded —
 * studio should explicitly un-refund first if the customer's paying again.
 */
export async function reissueOrder(
  _prev: ReissueResult | null,
  formData: FormData,
): Promise<ReissueResult> {
  await requireAdmin();

  const orderId = String(formData.get('orderId') ?? '');
  if (!orderId) {
    return { ok: false, message: 'Missing order id.' };
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true, customer: true },
  });

  if (!order) {
    return { ok: false, message: 'Order not found.' };
  }
  if (order.status !== 'PAID' && order.status !== 'FULFILLED') {
    return {
      ok: false,
      message: `Cannot re-issue a ${order.status.toLowerCase()} order.`,
    };
  }

  const expiresAt = new Date(Date.now() + DOWNLOAD_TOKEN_TTL_MS);

  await prisma.$transaction(
    order.items.map((item) =>
      prisma.orderItem.update({
        where: { id: item.id },
        data: {
          downloadToken: mintDownloadToken(),
          downloadExpiresAt: expiresAt,
          downloadCount: 0,
        },
      }),
    ),
  );

  // Decide recipient: prefer linked Customer.email, fall back to guest email.
  const recipient = order.customer?.email ?? order.guestEmail ?? null;

  let emailed = false;
  if (recipient) {
    try {
      const res = await sendReceiptEmail({
        orderId: order.id,
        to: recipient,
        toName: order.customer?.name ?? null,
        stripeSessionId: order.stripeSessionId,
        isReissue: true,
      });
      emailed = res.ok;
    } catch (err) {
      console.error('[admin/orders] re-issue email threw', order.id, err);
    }
  }

  // Re-render the orders list so the new expiry shows.
  revalidatePath('/admin/orders');
  revalidatePath(`/admin/orders/${order.id}`);

  const tail = recipient
    ? emailed
      ? ` Fresh links emailed to ${recipient}.`
      : ` Couldn't send the email — copy the links manually.`
    : ' No customer email on file — copy the links manually.';

  return {
    ok: true,
    emailed,
    message: `Re-issued ${order.items.length} link(s).${tail}`,
  };
}
