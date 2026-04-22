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
import { readBuffer } from '@/lib/storage';

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

  // Read the master file first, THEN increment the count. Earlier we
  // incremented before reading, which meant failed reads still burned a
  // download credit — a bad experience during bugs. Masters are a few MB,
  // buffering them is fine on Railway; we can revisit if we ever ship
  // very large files (>50MB) and need true streaming.
  const key = item.poster.masterKey;
  const ext = path.extname(key).toLowerCase();
  const mime = MIME[ext] ?? 'application/octet-stream';
  const filename = `${item.poster.slug}${ext || '.png'}`;

  let buffer: Buffer;
  try {
    buffer = await readBuffer(key);
  } catch (err) {
    console.error('[download] readBuffer failed for key', key, err);
    return NextResponse.json(
      { error: 'Master file is unavailable' },
      { status: 500 },
    );
  }

  // Atomic increment with a guard on the current count — prevents two
  // simultaneous requests from racing past the limit. Doing this AFTER
  // the read means a failed read doesn't cost the buyer a credit.
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

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      'Content-Type': mime,
      'Content-Length': String(buffer.length),
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'private, no-store',
    },
  });
}
