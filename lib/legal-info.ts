// Single source of truth for business identity on legal pages.
//
// Placeholder values are rendered as a <span class="legal__placeholder">
// so they're obvious to reviewers and impossible to miss before launch.
// Once Jacques has a registered address / VAT number / permit, swap the
// constants here — all pages update in one step.

export const LEGAL = {
  /** Full legal name of the trader. */
  name: 'Jacques Brosius',
  /**
   * Trading name shown on the site. Sole trader does business as
   * "Linework Studio" but the legal identity is the natural person.
   */
  tradingName: 'Linework Studio',
  /** "Luxembourg" alone isn't enough for compliance — this is flagged. */
  country: 'Luxembourg',
  /**
   * MUST be filled before any marketing push or Stripe live-mode switch.
   * EU e-commerce directive requires a geographic address.
   */
  address: null as string | null, // e.g. "12 rue de Example, L-1234 Luxembourg"
  /** VAT / TVA number — null until registered. */
  vatNumber: null as string | null, // e.g. "LU12345678"
  /** Autorisation d'établissement (Luxembourg business permit). */
  businessPermit: null as string | null,
  /** RCS number if the trader is registered with the Registre de Commerce. */
  rcsNumber: null as string | null,
  /** Contact email — also the Stripe admin email. */
  email: 'brosiusjacques@gmail.com',
} as const;

/**
 * Render a value if present, otherwise a visually-flagged placeholder so
 * any missing legal info is glaringly obvious in a pre-launch review.
 */
export function legalValue(
  value: string | null,
  placeholder: string,
): { kind: 'value' | 'placeholder'; text: string } {
  if (value && value.trim().length > 0) return { kind: 'value', text: value };
  return { kind: 'placeholder', text: placeholder };
}
