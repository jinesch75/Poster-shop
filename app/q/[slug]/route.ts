// QR redirect endpoint.
//
// Every public preview carries a small QR code encoding /q/<slug>. Scans
// land here and are sent on to the product page. Keeping this hop means
// the destination can change later without re-stamping the preview files.
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
