/**
 * Static product branding for the public-facing screens (landing page, auth).
 *
 * One place to change the wordmark, so the marketing and auth components never
 * hard-code the product name inline.
 */
export const BRAND = {
  /** Full product name, used as the primary wordmark. */
  productTitle: "WUJHA PMO",
  /** Owning company. */
  companyName: "WUJHA",
  /** Positioning line under the wordmark. */
  suiteName: "ERP Ecosystem",
  /** Short mark used where only a glyph fits (logo tiles, favicons). */
  monogram: "W",
} as const;
