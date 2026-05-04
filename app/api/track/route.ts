// Page-view tracking endpoint. Called fire-and-forget from middleware
// for every public page request. Node runtime — middleware (Edge)
// can't reach Prisma directly.
//
// Body: { path: string; referrer?: string }
// Headers we read: x-forwarded-for, user-agent, host
//
// Always responds 204 — even on error — so the caller never blocks.

import { NextRequest, NextResponse } from 'next/server';
import { recordPageView } from '@/lib/analytics';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as
      | { path?: string; referrer?: string }
      | null;
    if (!body || typeof body.path !== 'string') {
      return new NextResponse(null, { status: 204 });
    }

    // Take the first IP from x-forwarded-for. Railway's edge proxy
    // sets this; on local dev it's usually undefined and we fall
    // back to whatever the connection reports.
    const fwd = req.headers.get('x-forwarded-for') ?? '';
    const ip = fwd.split(',')[0]?.trim() || req.headers.get('x-real-ip') || '';

    const userAgent = req.headers.get('user-agent') ?? '';
    const ownHost = req.headers.get('host') ?? null;

    // Don't await — recording involves a network call (geo lookup) and
    // we don't want to hold the connection open. Errors are swallowed
    // inside recordPageView via the try/catch wrapper below.
    void recordPageView({
      path: body.path,
      referrer: body.referrer ?? null,
      ip,
      userAgent,
      ownHost,
    }).catch((err) => {
      // Surface in Railway logs but never bubble to the client.
      console.warn('[analytics] recordPageView failed:', err);
    });
  } catch (err) {
    console.warn('[analytics] /api/track error:', err);
  }

  return new NextResponse(null, { status: 204 });
}
