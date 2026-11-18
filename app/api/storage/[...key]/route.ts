// Streams a volume-backed file back to the browser.
// v1 is un-gated for previews/thumbnails. Session 4 will add signed-URL
// gating for master files (purchasers only).

import { NextRequest, NextResponse } from 'next/server';
import { promises as fs, createReadStream } from 'fs';
import { Readable } from 'stream';
import path from 'path';
import { resolveKey } from '@/lib/storage';

export const runtime = 'nodejs';

const MIME: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.pdf': 'application/pdf',
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ key: string[] }> },
) {
  const { key: keyParts } = await params;
  const key = keyParts.map(decodeURIComponent).join('/');

  // Guard against path traversal — keys must be relative.
  if (key.includes('..') || key.startsWith('/')) {
    return new NextResponse('Invalid key', { status: 400 });
  }

  // Block direct access to masters until we add signed URLs in Session 4.
  if (key.startsWith('masters/')) {
    return new NextResponse('Not available', { status: 403 });
  }

  try {
    const filePath = resolveKey(key);
    const stat = await fs.stat(filePath); // existence check + Content-Length
    const ext = path.extname(key).toLowerCase();
    const mime = MIME[ext] ?? 'application/octet-stream';

    // Stream from disk rather than reading the whole file into a Buffer and
    // then copying it into a second Uint8Array. The old version allocated
    // every file twice per request; at a few hundred KB a time that is
    // invisible per hit but fragments the native heap steadily, and the
    // process never gave the memory back.
    const body = Readable.toWeb(
      createReadStream(filePath),
    ) as unknown as ReadableStream<Uint8Array>;

    return new NextResponse(body, {
      status: 200,
      headers: {
        'Content-Type': mime,
        'Content-Length': String(stat.size),
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch {
    return new NextResponse('Not found', { status: 404 });
  }
}
