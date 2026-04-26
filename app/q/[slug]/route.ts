// QR scan endpoint.
//
// Every stamped poster preview encodes a URL that lands here. We log the
// scan (best-effort), then 302 to the actual destination. The indirection
// means the destination of a previously-shipped poster image is always
// reconfigurable from server-side code, without re-stamping the file.
//
// Default behaviour: redirect to /shop/<slug>. Override globally with
// QR_DESTINATION_TEMPLATE env var, e.g. "/shop/{slug}", "/promo?p={slug}",
// or an absolute URL like "https://etsy.com/listing/{slug}".

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

function buildDestination(slug: string): string {
  const template = process.env.QR_DESTINATION_TEMPLATE ?? '/shop/{slug}';
  return template.replace(/\{slug\}/g, encodeURIComponent(slug));
}

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ slug: string }> },
): Promise<NextResponse> {
  const { slug } = await ctx.params;

  // Best-effort scan log. We don't want a DB hiccup to break the redirect,
  // so we swallow errors and still send the user where they need to go.
  try {
    await prisma.qrScan.create({
      data: {
        posterSlug: slug,
        userAgent: req.headers.get('user-agent') ?? null,
        referrer: req.headers.get('referer') ?? null,
      },
    });
  } catch (err) {
    console.error('qr-scan log failed', err);
  }

  const destination = buildDestination(slug);
  // Resolve relative templates against the request URL; absolute URLs
  // pass through untouched.
  const url = destination.startsWith('http')
    ? destination
    : new URL(destination, req.url).toString();

  return NextResponse.redirect(url, { status: 302 });
}
