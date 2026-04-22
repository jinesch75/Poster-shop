/**
 * Diagonal repeating "LINEWORK · STUDIO" watermark overlay.
 * Used on every poster preview (cards, hero, product page) so customers
 * can't just screen-grab the artwork. In Session 2 this rendering will
 * be baked into the uploaded preview files via Sharp server-side, so
 * we'll get real image-level protection too — the overlay here remains
 * on DOM for cosmetic consistency.
 */
type WatermarkProps = {
  /** How many diagonal text rows to render (default 9) */
  lines?: number;
  /** Font size in px (default auto via CSS) */
  fontSize?: number;
};

const WM_TEXT =
  'LINEWORK · STUDIO · LINEWORK · STUDIO · LINEWORK · STUDIO · LINEWORK · STUDIO';

export function Watermark({ lines = 9, fontSize }: WatermarkProps) {
  return (
    <div className="watermark-overlay" aria-hidden="true">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="wm-line"
          style={fontSize ? { fontSize: `${fontSize}px` } : undefined}
        >
          {WM_TEXT}
        </div>
      ))}
    </div>
  );
}
