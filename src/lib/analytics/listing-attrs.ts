import type { FunnelEvents } from './events';

/**
 * OL-226: data attributes for a listing card container; FunnelTracking reads them on a click
 * through to /homes/<id>. Only allowlisted facts (id, position, source, availability state,
 * photo/price/claimed booleans) — track() re-validates them before anything is sent.
 * Plain module so server components (directory ListingCard) can call it.
 */
export function listingTrackAttrs(a: {
  id: string;
  position: number;
  source: FunnelEvents['listing_clicked']['source'];
  verified: boolean;
  hasPhoto: boolean;
  hasPrice: boolean;
  claimed?: boolean;
}): Record<string, string> {
  const attrs: Record<string, string> = {
    'data-track-listing': a.id,
    'data-track-position': String(a.position),
    'data-track-source': a.source,
    'data-track-availability': a.verified ? 'verified' : 'unverified',
    'data-track-has-photo': String(a.hasPhoto),
    'data-track-has-price': String(a.hasPrice),
  };
  if (typeof a.claimed === 'boolean') attrs['data-track-claimed'] = String(a.claimed);
  return attrs;
}
