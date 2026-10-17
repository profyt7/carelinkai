/**
 * Sprint W3 item 6 — schema.org JSON-LD builders + /llms.txt content.
 *
 *  - a field with no data is OMITTED (never '' / null / [] / {});
 *  - telephone only for claimed listings; no operator email anywhere;
 *  - inspection facts (counts + dates) only — no grades;
 *  - ItemList positions + listing URLs; Organization shape; llms.txt sections.
 */

import {
  buildListingJsonLd,
  buildListingsItemListJsonLd,
  buildOrganizationJsonLd,
  buildPagesItemListJsonLd,
  compact,
  FEE_MODEL_LINE,
} from '@/lib/seo/jsonld';
import { buildLlmsTxt } from '@/lib/seo/llms-txt';
import { DIRECTORY_UNCLAIMED_EMAIL, toPublicListing, type PublicListingRow } from '@/lib/directory/public-listings';

const NOW = new Date('2026-10-13T12:00:00Z').getTime();

const fullRow = (overrides: Partial<PublicListingRow> = {}): PublicListingRow => ({
  id: 'home-1',
  name: 'Maple Grove Assisted Living',
  description: 'A 16-bed home in Westlake.',
  careLevel: ['ASSISTED', 'MEMORY_CARE'],
  capacity: 16,
  phone: '+12165550100',
  websiteUrl: 'https://maplegrove.example',
  googleRating: 4.6,
  googleRatingCount: 23,
  availabilityCount: 2,
  availabilityVerifiedAt: new Date('2026-10-11T09:00:00Z'),
  availabilitySource: 'SMS' as never,
  startingPriceMonthly: 4800,
  priceSource: 'OPERATOR' as never,
  priceUpdatedAt: new Date('2026-10-01T00:00:00Z'),
  odhLicenseNumber: '2406R',
  address: { street: '1 Main St', city: 'Westlake', state: 'OH', zipCode: '44145', latitude: 41.45, longitude: -81.92 },
  photos: [{ url: 'https://res.cloudinary.com/x/photo.jpg' }],
  facilityInspections: [
    { surveyDate: '2026-03-04', surveyType: 'Standard', citationCount: 2 },
    { surveyDate: '2025-02-10', surveyType: 'Standard', citationCount: 0 },
  ],
  operator: { user: { email: 'owner@maplegrove.example' } },
  ...overrides,
});

const prop = (ld: Record<string, unknown>, name: string) =>
  (ld.additionalProperty as Array<{ name: string; value: unknown }>).find((p) => p.name === name)?.value;

function walk(v: unknown, visit: (x: unknown) => void) {
  visit(v);
  if (Array.isArray(v)) v.forEach((x) => walk(x, visit));
  else if (v && typeof v === 'object') Object.values(v as object).forEach((x) => walk(x, visit));
}

describe('compact', () => {
  it('strips empty strings, nulls, undefined, NaN, empty arrays and objects recursively', () => {
    expect(
      compact({ a: '', b: null, c: undefined, d: NaN, e: [], f: {}, g: { h: '', i: 'ok' }, j: [null, '', 'x', { k: '' }], l: 0, m: false })
    ).toEqual({ g: { i: 'ok' }, j: ['x'], l: 0, m: false });
  });
});

describe('buildListingJsonLd', () => {
  it('emits the full LocalBusiness document for a claimed, verified listing', () => {
    const ld = buildListingJsonLd(toPublicListing(fullRow(), NOW));
    expect(ld).toMatchObject({
      '@context': 'https://schema.org',
      '@type': 'LocalBusiness',
      '@id': 'https://getcarelinkai.com/homes/home-1',
      url: 'https://getcarelinkai.com/homes/home-1',
      name: 'Maple Grove Assisted Living',
      description: 'A 16-bed home in Westlake.',
      image: 'https://res.cloudinary.com/x/photo.jpg',
      telephone: '+12165550100',
      sameAs: 'https://maplegrove.example',
      address: { '@type': 'PostalAddress', streetAddress: '1 Main St', addressLocality: 'Westlake', addressRegion: 'OH', postalCode: '44145', addressCountry: 'US' },
      geo: { '@type': 'GeoCoordinates', latitude: 41.45, longitude: -81.92 },
      identifier: { '@type': 'PropertyValue', propertyID: 'Ohio Department of Health license number', value: '2406R' },
      priceRange: 'From $4,800/month',
    });
    const offers = ld.makesOffer as Array<Record<string, any>>;
    expect(offers.map((o) => o.itemOffered.name)).toEqual(['Assisted Living', 'Memory Care']);
    expect(offers[0].priceSpecification).toMatchObject({ '@type': 'UnitPriceSpecification', price: 4800, priceCurrency: 'USD', unitText: 'MONTH' });
    expect(offers[1].priceSpecification).toBeUndefined();

    expect(prop(ld, 'Verified availability')).toBe('Verified');
    expect(prop(ld, 'Availability verified at')).toBe('2026-10-11T09:00:00.000Z');
    expect(prop(ld, 'Openings (verified)')).toBe(2);
    expect(prop(ld, 'ODH surveys on file')).toBe(2);
    expect(prop(ld, 'Most recent ODH survey date')).toBe('2026-03-04');
    expect(prop(ld, 'Citations on most recent ODH survey')).toBe(2);
    expect(prop(ld, 'Total ODH citations on file')).toBe(2);
    expect(String(prop(ld, 'Free Medicaid lane'))).toMatch(/Medicaid, Medicare or the VA/);
    expect(prop(ld, 'Listing verified by operator')).toBe('Yes');
  });

  it('OMITS fields with no data instead of emitting empty strings', () => {
    const ld = buildListingJsonLd(
      toPublicListing(
        fullRow({
          description: '',
          phone: '',
          websiteUrl: null,
          photos: [],
          address: null,
          odhLicenseNumber: '',
          startingPriceMonthly: null,
          priceRangeLow: null,
          priceMin: null,
          facilityInspections: [],
          availabilityVerifiedAt: null,
          availabilityCount: null,
        }),
        NOW
      )
    );
    for (const k of ['description', 'telephone', 'sameAs', 'image', 'address', 'geo', 'identifier', 'priceRange', 'areaServed']) {
      expect({ key: k, present: k in ld }).toEqual({ key: k, present: false });
    }
    expect(prop(ld, 'Verified availability')).toBe('Contact to confirm');
    expect(prop(ld, 'Availability verified at')).toBeUndefined();
    expect(prop(ld, 'Openings (verified)')).toBeUndefined();
    expect(prop(ld, 'ODH surveys on file')).toBe(0);
    expect(prop(ld, 'Most recent ODH survey date')).toBeUndefined();
    expect(prop(ld, 'Total ODH citations on file')).toBeUndefined();
    // the offer still names the care types, just without a price
    expect((ld.makesOffer as any[])[0].priceSpecification).toBeUndefined();
    // nothing empty anywhere in the document
    walk(ld, (x) => {
      expect(x).not.toBe('');
      expect(x).not.toBeNull();
      if (Array.isArray(x)) expect(x.length).toBeGreaterThan(0);
    });
  });

  it('never publishes a phone for an unclaimed listing, and never an email', () => {
    const ld = buildListingJsonLd(toPublicListing(fullRow({ operator: { user: { email: DIRECTORY_UNCLAIMED_EMAIL } } }), NOW));
    expect(ld.telephone).toBeUndefined();
    expect(prop(ld, 'Listing verified by operator')).toBe('No (public-records listing)');
    const s = JSON.stringify(ld);
    expect(s).not.toMatch(/@[a-z0-9.-]+\.[a-z]{2,}/i); // no email-shaped string
    expect(s).not.toContain(DIRECTORY_UNCLAIMED_EMAIL);
    expect(s).not.toContain('owner@');
  });

  it('a stale verification is "Contact to confirm" with no count and no timestamp', () => {
    const ld = buildListingJsonLd(toPublicListing(fullRow({ availabilityVerifiedAt: new Date('2026-08-01T00:00:00Z') }), NOW));
    expect(prop(ld, 'Verified availability')).toBe('Contact to confirm');
    expect(prop(ld, 'Availability verified at')).toBeUndefined();
    expect(prop(ld, 'Openings (verified)')).toBeUndefined();
  });

  it('inspection data is facts only — no grade words', () => {
    const s = JSON.stringify(buildListingJsonLd(toPublicListing(fullRow(), NOW))).toLowerCase();
    expect(s).not.toMatch(/grade|score|rating:\s*"?[a-f]"?|excellent|poor/);
  });
});

describe('ItemList builders', () => {
  it('Carousel: each ListItem is position + item ONLY (never url/name beside item) — W5-4 / G6', () => {
    const a = toPublicListing(fullRow(), NOW);
    const b = toPublicListing(
      fullRow({ id: 'home-2', name: 'Second Home', address: { city: 'Parma', state: 'OH' }, photos: [], startingPriceMonthly: null, priceRangeLow: null, priceMin: null, operator: { user: { email: DIRECTORY_UNCLAIMED_EMAIL } } }),
      NOW,
    );
    const ld = buildListingsItemListJsonLd({ url: 'https://getcarelinkai.com/cleveland/assisted-living', name: 'AL', listings: [a, b] });
    expect(ld).toMatchObject({ '@type': 'ItemList', numberOfItems: 2, url: 'https://getcarelinkai.com/cleveland/assisted-living' });
    const items = ld.itemListElement as any[];
    expect(items.map((i) => i.position)).toEqual([1, 2]);
    for (const it of items) {
      expect(it['@type']).toBe('ListItem');
      expect(Object.keys(it).sort()).toEqual(['@type', 'item', 'position']);
      expect('url' in it).toBe(false);
      expect('name' in it).toBe(false);
      // The INVALID shape Google flagged: url/name on the ListItem together with item.
      expect(('url' in it || 'name' in it) && 'item' in it).toBe(false);
      expect(it.item).toMatchObject({ '@type': 'LocalBusiness' });
      expect(it.item['@id']).toBe(it.item.url);
      expect(typeof it.item.name).toBe('string');
      expect(it.item.url).toMatch(/^https:\/\/getcarelinkai\.com\/homes\//);
    }
    // Full entity where the facts exist: image, telephone (claimed), priceRange (published price), full address.
    expect(items[0].item).toMatchObject({
      '@id': 'https://getcarelinkai.com/homes/home-1',
      name: 'Maple Grove Assisted Living',
      url: 'https://getcarelinkai.com/homes/home-1',
      image: 'https://res.cloudinary.com/x/photo.jpg',
      telephone: '+12165550100',
      priceRange: 'From $4,800/month',
      address: { '@type': 'PostalAddress', streetAddress: '1 Main St', addressLocality: 'Westlake', addressRegion: 'OH', postalCode: '44145', addressCountry: 'US' },
    });
    // …and OMITTED where they do not: placeholder photo, unclaimed phone, no published price.
    expect(items[1].item).toMatchObject({ '@type': 'LocalBusiness', name: 'Second Home', address: { addressLocality: 'Parma', addressRegion: 'OH', addressCountry: 'US' } });
    for (const k of ['image', 'telephone', 'priceRange']) expect({ key: k, present: k in items[1].item }).toEqual({ key: k, present: false });
    expect(JSON.stringify(ld)).not.toMatch(/@[a-z0-9.-]+\.[a-z]{2,}/i);
    expect(JSON.stringify(ld)).not.toContain('placeholder');
  });

  it('a family-reported average price is never published as priceRange', () => {
    const l = toPublicListing(fullRow({ startingPriceMonthly: null, priceRangeLow: null, priceMin: null }), NOW);
    (l as any).pricing = { ...l.pricing, hasPrice: true, amount: 5000, source: 'FAMILY_AVG' };
    const ld = buildListingsItemListJsonLd({ url: 'https://getcarelinkai.com/x', name: 'x', listings: [l] });
    expect('priceRange' in (ld.itemListElement as any[])[0].item).toBe(false);
  });

  it('page lists carry positions and names', () => {
    const ld = buildPagesItemListJsonLd({ url: 'https://getcarelinkai.com/cleveland', name: 'Dir', pages: [{ url: 'https://getcarelinkai.com/cleveland/memory-care', name: 'Memory care' }] });
    expect((ld.itemListElement as any[])[0]).toEqual({ '@type': 'ListItem', position: 1, url: 'https://getcarelinkai.com/cleveland/memory-care', name: 'Memory care' });
  });
});

describe('buildOrganizationJsonLd', () => {
  it('describes CareLinkAI without any contact email', () => {
    const ld = buildOrganizationJsonLd();
    expect(ld).toMatchObject({ '@type': 'Organization', name: 'CareLinkAI', url: 'https://getcarelinkai.com', logo: 'https://getcarelinkai.com/logo.png' });
    expect(JSON.stringify(ld)).not.toMatch(/@[a-z0-9.-]+\.[a-z]{2,}/i);
    expect(JSON.stringify(ld)).toContain(FEE_MODEL_LINE);
  });
});

describe('llms.txt', () => {
  const txt = buildLlmsTxt();
  it('covers what CareLinkAI is, verified vs self-reported, availability, the fee model and links', () => {
    expect(txt).toMatch(/^# CareLinkAI/);
    expect(txt).toContain('## What is verified vs self-reported');
    expect(txt).toContain('## How availability is confirmed');
    expect(txt).toContain('## Fee model');
    expect(txt).toContain(FEE_MODEL_LINE);
    expect(txt).toContain('https://getcarelinkai.com/sitemap.xml');
    expect(txt).toContain('https://getcarelinkai.com/cleveland/assisted-living/westlake');
    expect(txt).toContain('https://getcarelinkai.com/cleveland/memory-care');
  });
  it('states the fee model in one line: free to search, homes never pay, optional $399 family-paid concierge with the refund, free lane; no facility fee', () => {
    expect(FEE_MODEL_LINE).toMatch(/^Free for families to search and contact homes\./);
    expect(FEE_MODEL_LINE).toMatch(/Homes never pay to be listed or ranked/);
    expect(FEE_MODEL_LINE).toMatch(/Family Concierge: \$399 flat for private-pay families/);
    expect(FEE_MODEL_LINE).toMatch(/refunded if there is no verified shortlist within 2 business days/);
    expect(FEE_MODEL_LINE).toMatch(/Medicaid, Medicare or the VA always get our help free/);
    expect(FEE_MODEL_LINE).not.toMatch(/paid by the facility|move-in|placement fee/i);
    expect(FEE_MODEL_LINE.includes('\n')).toBe(false);
  });
  it('publishes no email address', () => {
    expect(txt).not.toMatch(/@[a-z0-9.-]+\.[a-z]{2,}/i);
  });
});
