/**
 * OL-171 — shared brand class names for the public pages (hub, suburb,
 * concierge, listing, search) so buttons, cards and the hero band look like
 * the homepage. Brand gradient #3978FC → #7253B7 (primary-500 → secondary-500);
 * buttons with white text start one shade darker (primary-600, #2d60ca) so
 * the label keeps ≥ 4.5:1 contrast end to end.
 */

export const BTN_PRIMARY =
  'inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-primary-600 to-secondary-500 px-6 py-3 font-semibold text-white shadow-md transition-opacity hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2';

export const BTN_SECONDARY =
  'inline-flex items-center justify-center gap-2 rounded-lg border-2 border-primary-600 bg-white px-6 py-3 font-semibold text-primary-700 transition-colors hover:bg-primary-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2';

/** Card surface matching the homepage value-prop cards. */
export const CARD = 'rounded-2xl border border-neutral-200 bg-white shadow-sm transition hover:border-primary-500/40 hover:shadow-lg';

/** Soft tint of the brand gradient for hero bands (dark text on top stays AA). */
export const HERO_BAND = 'relative overflow-hidden border-b border-primary-500/10 bg-gradient-to-br from-primary-50 via-white to-secondary-50';

export const EYEBROW = 'text-sm font-semibold uppercase tracking-wide text-primary-700';

export const SECTION_TINT = 'border-y border-neutral-200 bg-white';
