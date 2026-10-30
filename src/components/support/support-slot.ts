/**
 * Result-heavy pages where the support launcher sits in the page header instead of floating: their
 * full-width cards are links and buttons almost everywhere, so a floating control would either cover
 * them or be hidden most of the time. The header slot is always visible and its menu opens in flow.
 */
export const SUPPORT_SLOT_PATHS = ['/search', '/marketplace/providers'] as const;

export function isSupportSlotPath(pathname: string | null | undefined): boolean {
  return Boolean(pathname && (SUPPORT_SLOT_PATHS as readonly string[]).includes(pathname));
}
