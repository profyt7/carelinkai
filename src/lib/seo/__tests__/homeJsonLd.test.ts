import { buildHomeJsonLd, type HomeForJsonLd } from '../homeJsonLd';

const baseHome: HomeForJsonLd = {
  id: 'test-home-id',
  name: 'Maple Grove Senior Living',
  description: 'A warm, family-run home in Cleveland.',
  aiGeneratedDescription: null,
  careLevel: ['ASSISTED', 'MEMORY_CARE'],
  amenities: ['Wi-Fi', 'Garden'],
  capacity: 40,
  priceMin: 4500,
  priceMax: 7200,
  address: {
    street: '1234 Main St',
    street2: null,
    city: 'Shaker Heights',
    state: 'OH',
    zipCode: '44120',
    country: 'US',
    latitude: 41.4737,
    longitude: -81.5371,
  },
  photos: [
    { url: 'https://cdn.example.com/a.jpg', caption: null, isPrimary: false, sortOrder: 2 },
    { url: 'https://cdn.example.com/b.jpg', caption: null, isPrimary: true, sortOrder: 0 },
  ],
};

describe('buildHomeJsonLd', () => {
  it('emits a LodgingBusiness with canonical URL and id', () => {
    const ld = buildHomeJsonLd(baseHome);
    expect(ld['@type']).toBe('LodgingBusiness');
    expect(ld['@context']).toBe('https://schema.org');
    expect(ld['@id']).toBe('https://getcarelinkai.com/homes/test-home-id');
    expect(ld.url).toBe('https://getcarelinkai.com/homes/test-home-id');
    expect(ld.name).toBe('Maple Grove Senior Living');
  });

  it('prefers aiGeneratedDescription when present, falls back to description', () => {
    const withAi = { ...baseHome, aiGeneratedDescription: 'AI-generated copy.' };
    expect(buildHomeJsonLd(withAi).description).toBe('AI-generated copy.');
    expect(buildHomeJsonLd(baseHome).description).toBe('A warm, family-run home in Cleveland.');
  });

  it('emits address + geo when present', () => {
    const ld = buildHomeJsonLd(baseHome);
    expect(ld.address).toMatchObject({
      '@type': 'PostalAddress',
      streetAddress: '1234 Main St',
      addressLocality: 'Shaker Heights',
      addressRegion: 'OH',
      postalCode: '44120',
      addressCountry: 'US',
    });
    expect(ld.geo).toMatchObject({
      '@type': 'GeoCoordinates',
      latitude: 41.4737,
      longitude: -81.5371,
    });
  });

  it('omits geo when lat/long are missing', () => {
    const noGeo: HomeForJsonLd = {
      ...baseHome,
      address: { ...baseHome.address!, latitude: null, longitude: null },
    };
    expect(buildHomeJsonLd(noGeo).geo).toBeUndefined();
  });

  it('sorts photos isPrimary-first, then by sortOrder', () => {
    const ld = buildHomeJsonLd(baseHome);
    expect(ld.image).toEqual([
      'https://cdn.example.com/b.jpg',
      'https://cdn.example.com/a.jpg',
    ]);
  });

  it('omits image when there are no photos', () => {
    const ld = buildHomeJsonLd({ ...baseHome, photos: [] });
    expect(ld.image).toBeUndefined();
  });

  it('emits priceRange band based on priceMax', () => {
    expect(buildHomeJsonLd({ ...baseHome, priceMin: 2000, priceMax: 2500 }).priceRange).toBe('$');
    expect(buildHomeJsonLd({ ...baseHome, priceMin: 3500, priceMax: 4500 }).priceRange).toBe('$$');
    expect(buildHomeJsonLd({ ...baseHome, priceMin: 6000, priceMax: 7500 }).priceRange).toBe('$$$');
    expect(buildHomeJsonLd({ ...baseHome, priceMin: 9000, priceMax: 11000 }).priceRange).toBe('$$$$');
  });

  it('omits priceRange when both prices are null', () => {
    const ld = buildHomeJsonLd({ ...baseHome, priceMin: null, priceMax: null });
    expect(ld.priceRange).toBeUndefined();
    expect(ld.makesOffer).toBeUndefined();
  });

  it('emits makesOffer Offer with PriceSpecification when both prices set', () => {
    const ld = buildHomeJsonLd(baseHome);
    expect(ld.makesOffer).toMatchObject([
      {
        '@type': 'Offer',
        priceCurrency: 'USD',
        priceSpecification: {
          '@type': 'PriceSpecification',
          minPrice: 4500,
          maxPrice: 7200,
          priceCurrency: 'USD',
          unitText: 'MONTH',
        },
      },
    ]);
  });

  it('maps careLevel enum + amenities into amenityFeature', () => {
    const ld = buildHomeJsonLd(baseHome);
    const features = ld.amenityFeature as Array<{ name: string }>;
    const names = features.map((f) => f.name);
    expect(names).toContain('Assisted Living');
    expect(names).toContain('Memory Care');
    expect(names).toContain('Wi-Fi');
    expect(names).toContain('Garden');
  });

  it('does NOT include aggregateRating or review fields (v1 omission)', () => {
    const ld = buildHomeJsonLd(baseHome);
    expect(ld.aggregateRating).toBeUndefined();
    expect(ld.review).toBeUndefined();
  });

  it('emits numberOfRooms when capacity is present', () => {
    expect(buildHomeJsonLd(baseHome).numberOfRooms).toBe(40);
    expect(buildHomeJsonLd({ ...baseHome, capacity: 0 }).numberOfRooms).toBeUndefined();
    expect(buildHomeJsonLd({ ...baseHome, capacity: null }).numberOfRooms).toBeUndefined();
  });

  it('handles missing address gracefully', () => {
    const noAddress = { ...baseHome, address: null };
    const ld = buildHomeJsonLd(noAddress);
    expect(ld.address).toBeUndefined();
    expect(ld.geo).toBeUndefined();
  });
});
