// Edge middleware — two jobs:
//   1. Guard every /admin route except /admin/login (unauthed → /admin/login)
//   2. Fire-and-forget a page-view ping for public, non-prefetch GET
//      requests. The actual DB write happens in /api/track on the
//      Node runtime; this just buffers the request data and posts.

import { NextRequest, NextResponse } from 'next/server';
import { ADMIN_COOKIE, verifyAdminToken } from '@/lib/auth';

// Paths we never track (admin, API, static assets, well-known files).
function shouldTrack(pathname: string): boolean {
  if (pathname.startsWith('/admin')) return false;
  if (pathname.startsWith('/api/')) return false;
  if (pathname.startsWith('/_next/')) return false;
  if (pathname === '/favicon.ico') return false;
  if (pathname === '/robots.txt') return false;
  if (pathname === '/sitemap.xml') return false;
  if (pathname.startsWith('/.well-known/')) return false;
  // file extensions — favicons, OG images, etc.
  if (/\.[a-z0-9]{2,5}$/i.test(pathname)) return false;
  return true;
}

function fireTrackingPing(req: NextRequest): void {
  // We post to our own /api/track. The site URL we hit must work
  // from inside the Edge runtime — req.nextUrl.origin gives us the
  // current request's origin, which is what we want.
  const url = new URL('/api/track', req.nextUrl.origin);
  const body = JSON.stringify({
    path: req.nextUrl.pathname,
    referrer: req.headers.get('referer') ?? null,
  });

  // Forward IP + user-agent so /api/track has the same view we have.
  const headers: Record<string, string> = {
    'content-type': 'application/json',
    'user-agent': req.headers.get('user-agent') ?? '',
  };
  const xff = req.headers.get('x-forwarded-for');
  if (xff) headers['x-forwarded-for'] = xff;
  const xri = req.headers.get('x-real-ip');
  if (xri) headers['x-real-ip'] = xri;

  // No await — fire and forget. `keepalive` lets the request finish
  // even if the response is already streamed back to the client.
  void fetch(url, { method: 'POST', headers, body, keepalive: true }).catch(
    () => undefined,
  );
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // ---- analytics tracking (public traffic only) ----
  if (req.method === 'GET' && shouldTrack(pathname)) {
    // Skip Next.js prefetches — they fire on link hover and would
    // wildly inflate the numbers.
    const isPrefetch =
      req.headers.get('next-router-prefetch') === '1' ||
      req.headers.get('purpose') === 'prefetch' ||
      req.headers.get('sec-purpose') === 'prefetch';
    // Skip RSC payloads if we wanted; we keep them — every <Link>
    // navigation fires an RSC fetch and that IS a real page view.
    // But also fold full document loads in. Both have the same path,
    // so the count reflects actual navigations either way.
    if (!isPrefetch) {
      fireTrackingPing(req);
    }
  }

  // ---- admin guard ----
  if (!pathname.startsWith('/admin')) return NextResponse.next();
  if (pathname === '/admin/login' || pathname.startsWith('/admin/login/')) {
    return NextResponse.next();
  }

  const token = req.cookies.get(ADMIN_COOKIE)?.value;
  const ok = await verifyAdminToken(token);
  if (ok) return NextResponse.next();

  const loginUrl = req.nextUrl.clone();
  loginUrl.pathname = '/admin/login';
  loginUrl.searchParams.set('next', pathname);
  return NextResponse.redirect(loginUrl);
}

// Match every route — we need analytics on the public site too, not
// just /admin. The handler above filters out static assets / api.
export const config = {
  matcher: [
    // exclude _next/static, _next/image, image optimization, and the
    // tracking endpoint itself (so we don't ping ourselves recursively)
    '/((?!_next/static|_next/image|api/track|favicon.ico).*)',
  ],
};
