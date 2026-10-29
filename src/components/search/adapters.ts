import type { SearchResultItem } from '@/lib/searchService';
import type { PriceLineView } from '@/components/ui/PriceLine';
import { PLACEHOLDER_IMAGES } from '@/lib/placeholder-images';
import { getCloudinaryThumbnail, isCloudinaryUrl } from '@/lib/cloudinaryUrl';
import type { SearchResultHome } from './SearchResultCard';

/**
 * OL-216 — the one place a /api/search result becomes a SearchResultCard home.
 * The API payload is unchanged; this only reshapes it:
 *  - /api/search fills a photo-less home with a stock placeholder URL, so the
 *    card can't tell from `imageUrl` alone. A PLACEHOLDER_IMAGES match means
 *    "no real photo" → the card shows HomeImagePlaceholder instead.
 *  - Real Cloudinary photos get the same thumbnail transform the old cards used.
 *  - The payload carries no per-home Medicaid waiver data, so that line stays off.
 */
export function toSearchResultHome(item: SearchResultItem): SearchResultHome {
  const placeholder = !item.imageUrl || PLACEHOLDER_IMAGES.includes(item.imageUrl);
  const p = item.pricing;
  const pricing: PriceLineView | null = p
    ? {
        hasPrice: p.hasPrice,
        amount: p.amount,
        low: p.low ?? null,
        high: p.high ?? null,
        source: p.source as PriceLineView['source'],
        sourceLabel: p.sourceLabel,
        familyReportCount: p.familyReportCount ?? 0,
      }
    : null;
  return {
    id: item.id,
    name: item.name,
    address: item.address ? { city: item.address.city, state: item.address.state } : null,
    careLevel: item.careLevel,
    imageUrl: placeholder ? null : isCloudinaryUrl(item.imageUrl!) ? getCloudinaryThumbnail(item.imageUrl!) : item.imageUrl,
    photoIsPlaceholder: placeholder,
    availabilityFreshness: item.availabilityFreshness ?? null,
    pricing,
    googleRating: item.googleRating ?? null,
    googleRatingCount: item.googleRatingCount ?? null,
    isFeatured: !!item.isFeatured,
    isUnclaimed: !!item.isUnclaimed,
    medicaidWaiver: null,
  };
}
