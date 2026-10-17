// QR code generation for poster previews.
//
// The watermark pipeline stamps a small scannable QR in the bottom-right
// corner of every public preview. The encoded URL points at our own
// redirect endpoint (`/q/<slug>`, see app/q/[slug]/route.ts) rather than
// straight at the product page, so the destination can change later
// without re-stamping every preview file.

import QRCode from 'qrcode';
import { absoluteUrl } from './urls';

/** URL baked into a poster's QR code. Host comes from NEXT_PUBLIC_SITE_URL. */
export function qrTargetUrl(slug: string): string {
  return absoluteUrl(`/q/${encodeURIComponent(slug)}`);
}

/**
 * Render a QR code as a PNG buffer at the requested pixel size.
 *
 * Error-correction "M" (~15%) with a 1-module quiet zone keeps the module
 * count low, so each module stays as large as possible at this small size.
 * Solid black on white — the pipeline puts it on a white pill so it scans
 * even over dark colour blocks.
 */
export async function qrPngBuffer(url: string, sizePx: number): Promise<Buffer> {
  return QRCode.toBuffer(url, {
    type: 'png',
    errorCorrectionLevel: 'M',
    margin: 1,
    width: sizePx,
    color: { dark: '#000000ff', light: '#ffffffff' },
  });
}
