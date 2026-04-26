// QR code generation for poster previews.
//
// Used by the watermark pipeline to stamp a tiny scannable QR in the
// bottom-right corner of every public preview image. The encoded URL
// always points at a server-side redirect endpoint (`/q/<slug>`) on
// our own site, so the destination can be reconfigured later without
// re-stamping any of the already-shipped poster files.

import QRCode from 'qrcode';

/**
 * Build the URL that gets baked into a poster's QR code.
 *
 * The base host comes from NEXT_PUBLIC_SITE_URL (set on Railway) so that
 * a domain swap later only requires updating one env var + rerunning the
 * backfill. Path is always `/q/<slug>` — that endpoint lives in
 * `app/q/[slug]/route.ts` and currently 302-redirects to `/shop/<slug>`.
 */
export function qrTargetUrl(slug: string): string {
  const base =
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.VERCEL_URL ??
    'http://localhost:3000';
  const normalized = base.startsWith('http') ? base : `https://${base}`;
  return `${normalized.replace(/\/$/, '')}/q/${slug}`;
}

/**
 * Render a QR code as a PNG buffer at the requested pixel size.
 *
 * - Quiet zone of 1 module keeps the white pill around it small.
 * - Error-correction level "M" (~15%) — enough resilience for a tiny
 *   stamped QR while keeping module count low (more pixels per module
 *   = better scan reliability when downscaled in display).
 * - Solid black on solid white background; the watermark pipeline composites
 *   this onto the preview as a small "pill" so the QR scans even when
 *   the underlying poster has dark colour blocks behind it.
 */
export async function qrPngBuffer(url: string, sizePx: number): Promise<Buffer> {
  return QRCode.toBuffer(url, {
    type: 'png',
    errorCorrectionLevel: 'M',
    margin: 1,
    width: sizePx,
    color: {
      dark: '#000000ff',
      light: '#ffffffff',
    },
  });
}
