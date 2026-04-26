// Print-size estimator.
//
// Given a master's pixel dimensions, returns the largest A-series paper
// size it can print sharply at 300dpi. Used on the product page so
// buyers know what they're paying for ("Prints sharp at A2").
//
// Math: 300dpi means 300 pixels per inch. An A-size paper has known
// dimensions in millimetres → convert to inches → multiply by 300 to
// get the minimum pixel count for "sharp" reproduction.

const MM_PER_INCH = 25.4;

const A_SIZES_MM: Array<{ code: string; widthMm: number; heightMm: number }> = [
  { code: 'A1', widthMm: 594, heightMm: 841 },
  { code: 'A2', widthMm: 420, heightMm: 594 },
  { code: 'A3', widthMm: 297, heightMm: 420 },
  { code: 'A4', widthMm: 210, heightMm: 297 },
];

function pixelsForSize(widthMm: number, heightMm: number, dpi = 300) {
  return {
    minWidth: Math.ceil((widthMm / MM_PER_INCH) * dpi),
    minHeight: Math.ceil((heightMm / MM_PER_INCH) * dpi),
  };
}

/**
 * Given a master's pixel dimensions, return the largest A-size it
 * prints sharply at. Returns null if the master is too small even
 * for A4 (so the product page just hides the badge).
 *
 * Compares against the size's *long* edge against the master's *long*
 * edge — orientation-agnostic. Works for portrait and landscape.
 */
export function largestSharpPrintSize(
  widthPx: number,
  heightPx: number,
  dpi = 300,
): string | null {
  const masterLong = Math.max(widthPx, heightPx);
  const masterShort = Math.min(widthPx, heightPx);

  for (const size of A_SIZES_MM) {
    const { minWidth, minHeight } = pixelsForSize(size.widthMm, size.heightMm, dpi);
    const sizeLong = Math.max(minWidth, minHeight);
    const sizeShort = Math.min(minWidth, minHeight);
    if (masterLong >= sizeLong && masterShort >= sizeShort) {
      return size.code;
    }
  }
  return null;
}
