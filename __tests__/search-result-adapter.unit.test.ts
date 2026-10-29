/**
 * OL-216 — toSearchResultHome maps a /api/search result to the SearchResultCard shape
 * without inventing anything: a stock placeholder photo becomes "no photo", pricing
 * keeps its source, and there is no waiver line (the search payload has no waiver data).
 */
import { toSearchResultHome } from '@/components/search/adapters';
import { PLACEHOLDER_IMAGES } from '@/lib/placeholder-images';
import type { SearchResultItem } from '@/lib/searchService';

const base = (over: Partial<SearchResultItem> = {}): SearchResultItem =>
  ({
    id: 'h1',
    name: 'Beachwood Gardens',
    description: 'd',
    address: { street: '1 Main', city: 'Beachwood', state: 'OH', zipCode: '44122' },
    careLevel: ['ASSISTED'],
    priceRange: { min: null, max: null, formattedMin: null, formattedMax: null },
    capacity: 60,
    availability: 8,
    gender: 'ALL',
    amenities: [],
    imageUrl: 'https://example.org/photo.jpg',
    operator: null,
    aiMatchScore: 50,
    ...over,
  }) as SearchResultItem;

describe('toSearchResultHome', () => {
  it('treats the API stock placeholder as no photo', () => {
    const h = toSearchResultHome(base({ imageUrl: PLACEHOLDER_IMAGES[3] }));
    expect(h.photoIsPlaceholder).toBe(true);
    expect(h.imageUrl).toBeNull();
  });

  it('keeps a real photo and thumbnails Cloudinary URLs', () => {
    expect(toSearchResultHome(base()).imageUrl).toBe('https://example.org/photo.jpg');
    const cl = toSearchResultHome(base({ imageUrl: 'https://res.cloudinary.com/x/image/upload/v1/carelinkai/homes/a.jpg' }));
    expect(cl.photoIsPlaceholder).toBe(false);
    expect(cl.imageUrl).toContain('res.cloudinary.com');
    expect(cl.imageUrl).not.toBe('https://res.cloudinary.com/x/image/upload/v1/carelinkai/homes/a.jpg');
  });

  it('carries pricing with its source and range, and defaults the optional fields', () => {
    const h = toSearchResultHome(
      base({ pricing: { hasPrice: true, amount: 4800, source: 'OPERATOR', sourceLabel: 'operator-provided Oct 2026', display: 'x', transparent: true, low: 4800, high: 6200 } }),
    );
    expect(h.pricing).toEqual({ hasPrice: true, amount: 4800, low: 4800, high: 6200, source: 'OPERATOR', sourceLabel: 'operator-provided Oct 2026', familyReportCount: 0 });
    expect(toSearchResultHome(base()).pricing).toBeNull();
  });

  it('passes availability, rating, featured and unclaimed through and never adds a waiver line', () => {
    const availability = { fresh: true, count: 3, source: 'AI_CALL', verifiedAt: '2026-10-26T12:00:00.000Z', label: 'Verified', badge: true };
    const h = toSearchResultHome(base({ availabilityFreshness: availability, googleRating: 4.6, googleRatingCount: 128, isFeatured: true, isUnclaimed: true }));
    expect(h.availabilityFreshness).toBe(availability);
    expect([h.googleRating, h.googleRatingCount, h.isFeatured, h.isUnclaimed]).toEqual([4.6, 128, true, true]);
    expect(h.medicaidWaiver).toBeNull();
    expect(h.address).toEqual({ city: 'Beachwood', state: 'OH' });
  });

  it('defaults missing flags to false / null', () => {
    const h = toSearchResultHome(base({ address: null }));
    expect([h.isFeatured, h.isUnclaimed, h.googleRating, h.availabilityFreshness, h.address]).toEqual([false, false, null, null, null]);
  });
});
