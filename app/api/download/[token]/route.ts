// Signed-URL-equivalent download route.
//
// The OrderItem row carries the download policy:
//   - downloadToken      opaque 64-char hex (unguessable)
//   - downloadExpiresAt  48h from checkout; epoch-zero means "revoked"
//   - downloadCount      5-download limit — incremented atomically
//
// On a valid request we stream the master file back. Masters are
// otherwise blocked by /api/storage/[...key] — this route is the only
// way a master reaches a buyer.
//
// Runtime: nodejs (we rely on fs streaming + crypto).

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import path from 'path';
import { prisma } from '@/lib/prisma';
import { readStream } from '@/lib/storage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_DOWNLOADS = 5;

const MIME: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
};

function badToken(message: string, status = 403) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  // Token shape sanity check — avoids a DB round trip for obvious garbage.
  if (!/^[a-f0-9]{64}$/i.test(token)) {
    return badToken('Invalid token', 400);
  }

  const item = await prisma.orderItem.findUnique({
    where: { downloadToken: token },
    include: {
      poster: { select: { title: true, masterKey: true, slug: true } },
      order: { select: { status: true } },
    },
  });

  if (!item || !item.poster) {
    return badToken('Download not found', 404);
  }
  if (item.order.status !== 'PAID' && item.order.status !== 'FULFILLED') {
    return badToken('This order is not eligible for download', 403);
  }
  if (!item.downloadExpiresAt || item.downloadExpiresAt.getTime() <= Date.now()) {
    return badToken('This download link has expired', 410);
  }
  if (item.downloadCount >= MAX_DOWNLOADS) {
    return badToken('Download limit reached for this item', 429);
  }

  // Atomic increment with a guard on the current count — prevents two
  // simultaneous requests from racing past the limit.
  const updated = await prisma.orderItem.updateMany({
    where: {
      id: item.id,
      downloadCount: { lt: MAX_DOWNLOADS },
    },
    data: {
      downloadCount: { increment: 1 },
    },
  });
  if (updated.count === 0) {
    return badToken('Download limit reached for this item', 429);
  }

  // Stream the master file. We don't pre-buffer — posters are big.
  const key = item.poster.masterKey;
  const ext = path.extname(key).toLowerCase();
  const mime = MIME[ext] ?? 'application/octet-stream';
  const filename = `${item.poster.slug}${ext || '.png'}`;

  // readStream handles both volume-backed keys and legacy "public:" keys
  // (the seed data uses public: keys because the admin-upload flow hasn't
  // replaced them yet). If the file itself is missing, the stream will
  // emit an error and the client gets a truncated response — acceptable
  // for now; we'll surface it more cleanly once R2 is in.
  const { Readable } = await import('stream');
  const nodeStream = readStream(key);
  const webStream = Readable.toWeb(nodeStream) as ReadableStream<Uint8Array>;

  return new NextResponse(webStream, {
    status: 200,
    headers: {
      'Content-Type': mime,
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'private, no-store',
    },
  });
}
