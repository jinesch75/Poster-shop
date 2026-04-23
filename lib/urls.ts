// Shared absolute-URL helper. Used in webhook handlers, server actions,
// email templates — anywhere we can't rely on a request-scoped URL.
//
// Railway injects NEXT_PUBLIC_SITE_URL on every deploy; locally we fall
// back to http://localhost:3000.

export function absoluteUrl(path: string): string {
  const base =
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.VERCEL_URL ??
    'http://localhost:3000';
  const normalized = base.startsWith('http') ? base : `https://${base}`;
  const clean = path.startsWith('/') ? path : `/${path}`;
  return `${normalized.replace(/\/$/, '')}${clean}`;
}
