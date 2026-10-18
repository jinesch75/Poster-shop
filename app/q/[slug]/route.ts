// QR redirect endpoint.
//
// Previews carried a small QR code encoding /q/<slug> (April–May 2026 and
// again 2026-10-17/18). New previews no longer do, but copies of the old
// images are still out there, so scans keep landing here and are sent on to
// the product page.
// The middleware logs the hit like any page view, so scans show up in the
// admin analytics under /q/<slug>.

import { NextResponse } from 'next/server';
import { absoluteUrl } from '@/lib/urls';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  return NextResponse.redirect(absoluteUrl(`/shop/${encodeURIComponent(slug)}`), 302);
}
