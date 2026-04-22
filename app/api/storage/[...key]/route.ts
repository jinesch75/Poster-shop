// Streams a volume-backed file back to the browser.
// v1 is un-gated for previews/thumbnails. Session 4 will add signed-URL
// gating for master files (purchasers only).

import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { resolveKey, readBuffer } from '@/lib/storage';

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
    await fs.stat(filePath); // existence check
    const buffer = await readBuffer(key);
    const ext = path.extname(key).toLowerCase();
    const mime = MIME[ext] ?? 'application/octet-stream';
    // Newer @types/node types Buffer as Buffer<ArrayBufferLike>, which TS
    // refuses to treat as BlobPart/BodyInit (both require an ArrayBuffer
    // backing, not SharedArrayBuffer). Copy into a fresh Uint8Array — its
    // backing store is a plain ArrayBuffer, which BodyInit accepts.
    const bytes = new Uint8Array(buffer.byteLength);
    bytes.set(buffer);
    return new NextResponse(bytes, {
      status: 200,
      headers: {
        'Content-Type': mime,
        'Cache-Control': 'public, max-age=3600, immutable',
      },
    });
  } catch {
    return new NextResponse('Not found', { status: 404 });
  }
}
