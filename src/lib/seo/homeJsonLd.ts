/**
 * LodgingBusiness JSON-LD builder for AssistedLivingHome.
 *
 * Used by `src/app/homes/[id]/layout.tsx` to emit schema.org structured data
 * for senior-living facility detail pages, giving Google enough context to
 * surface them as rich results.
 *
 * Design notes:
 *  - We use `LodgingBusiness` (subclass of `LocalBusiness`) because Google's
 *    rich-results guidance treats senior-living facilities as lodging-adjacent.
 *  - `aggregateRating` and `review` are intentionally NOT included in v1.
 *    Google requires that aggregateRating reflect the reviews actually shown
 *    on the page. Until we confirm the on-page review rendering matches what
 *    we'd emit here, we omit it (better silence than a Google penalty).
 *  - `priceRange` uses the schema.org convention of '$' marks rather than the
 *    raw priceMin/priceMax, but if both values exist we emit the explicit
 *    range too via `offers.priceSpecification`.
 *  - The builder is pure and side-effect-free — easy to unit-test.
 */

const SITE_URL = 'https://getcarelinkai.com';

export type HomeForJsonLd = {
  id: string;
  name: string;
  description: string;
  aiGeneratedDescription?: string | null;
  careLevel: Array<'INDEPENDENT' | 'ASSISTED' | 'MEMORY_CARE' | 'SKILLED_NURSING'>;
  amenities: string[];
  priceMin?: number | null;
  priceMax?: number | null;
  capacity?: number | null;
  address?: {
    street: string;
    street2?: string | null;
    city: string;
    state: string;
    zipCode: string;
    country?: string | null;
    latitude?: number | null;
    longitude?: number | null;
  } | null;
  photos?: Array<{
    url: string;
    caption?: string | null;
    isPrimary: boolean;
    sortOrder: number;
  }>;
};

const CARE_LEVEL_LABELS: Record<HomeForJsonLd['careLevel'][number], string> = {
  INDEPENDENT: 'Independent Living',
  ASSISTED: 'Assisted Living',
  MEMORY_CARE: 'Memory Care',
  SKILLED_NURSING: 'Skilled Nursing',
};

function toPriceRangeBand(priceMin?: number | null, priceMax?: number | null): string | undefined {
  const ref = priceMax ?? priceMin;
  if (ref == null) return undefined;
  if (ref < 3000) return '$';
  if (ref < 5000) return '$$';
  if (ref < 8000) return '$$$';
  return '$$$$';
}

function sortedPhotoUrls(home: HomeForJsonLd): string[] {
  if (!home.photos || home.photos.length === 0) return [];
  return [...home.photos]
    .sort((a, b) => {
      if (a.isPrimary !== b.isPrimary) return a.isPrimary ? -1 : 1;
      return a.sortOrder - b.sortOrder;
    })
    .map((p) => p.url)
    .filter((u): u is string => !!u);
}

export function buildHomeJsonLd(home: HomeForJsonLd): Record<string, unknown> {
  const canonicalUrl = `${SITE_URL}/homes/${home.id}`;
  const description = home.aiGeneratedDescription?.trim() || home.description;

  const jsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'LodgingBusiness',
    '@id': canonicalUrl,
    name: home.name,
    description,
    url: canonicalUrl,
  };

  // Address (PostalAddress)
  if (home.address) {
    const a = home.address;
    const streetAddress = [a.street, a.street2].filter(Boolean).join(', ');
    jsonLd.address = {
      '@type': 'PostalAddress',
      streetAddress,
      addressLocality: a.city,
      addressRegion: a.state,
      postalCode: a.zipCode,
      addressCountry: a.country || 'US',
    };

    // Geo (GeoCoordinates) — only if both lat/long are present
    if (typeof a.latitude === 'number' && typeof a.longitude === 'number') {
      jsonLd.geo = {
        '@type': 'GeoCoordinates',
        latitude: a.latitude,
        longitude: a.longitude,
      };
    }
  }

  // Images
  const photoUrls = sortedPhotoUrls(home);
  if (photoUrls.length > 0) {
    jsonLd.image = photoUrls;
  }

  // Price range band ('$' / '$$' / '$$$' / '$$$$')
  const priceBand = toPriceRangeBand(home.priceMin, home.priceMax);
  if (priceBand) {
    jsonLd.priceRange = priceBand;
  }

  // Amenity features — combine domain amenities[] with the careLevel[] enum labels
  const careLevelLabels = home.careLevel.map((cl) => CARE_LEVEL_LABELS[cl]).filter(Boolean);
  const amenityNames = [...new Set([...careLevelLabels, ...home.amenities])];
  if (amenityNames.length > 0) {
    jsonLd.amenityFeature = amenityNames.map((name) => ({
      '@type': 'LocationFeatureSpecification',
      name,
      value: true,
    }));
  }

  // Total rooms (capacity = total beds, a reasonable proxy)
  if (typeof home.capacity === 'number' && home.capacity > 0) {
    jsonLd.numberOfRooms = home.capacity;
  }

  // Explicit price range as an offer when both ends are known
  if (typeof home.priceMin === 'number' && typeof home.priceMax === 'number' && home.priceMax >= home.priceMin) {
    jsonLd.makesOffer = [
      {
        '@type': 'Offer',
        priceCurrency: 'USD',
        priceSpecification: {
          '@type': 'PriceSpecification',
          minPrice: home.priceMin,
          maxPrice: home.priceMax,
          priceCurrency: 'USD',
          unitText: 'MONTH',
        },
      },
    ];
  }

  return jsonLd;
}
