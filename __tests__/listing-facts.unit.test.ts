/**
 * OL-173: the listing page never states capacity / availability / staffing /
 * amenities that no operator, admin or verified call set.
 */
import fs from 'fs';
import path from 'path';
import {
  listingFacts,
  verifiedFieldsFromEvents,
  AVAILABILITY_UNKNOWN_TEXT,
  AMENITIES_UNVERIFIED_LABEL,
  DESCRIPTION_UNVERIFIED_NOTE,
} from '@/lib/homes/listing-facts';
import { resolveMapTileConfig, OSM_TILE_URL, OSM_ATTRIBUTION } from '@/lib/maps/tiles';

// An unclaimed / dev-seeded listing as /api/homes/:id serves it: seed default
// capacity 100, occupancy 0 (→ legacy availability 100), a seeded amenity, no
// verified availability and no operator/admin history rows.
const unclaimedFixture = {
  capacity: 100,
  availability: 100,
  amenities: ['wifi'],
  verifiedFields: [] as string[],
  availabilityFreshness: { fresh: false, count: null, label: 'Contact to confirm availability' },
  unclaimed: true,
};

describe('listingFacts — unclaimed / unverified listing', () => {
  const f = listingFacts(unclaimedFixture);

  it('hides the seeded capacity', () => {
    expect(f.capacity).toBeNull();
  });

  it('says "Availability: contact to confirm" — never a count or waitlist', () => {
    expect(f.availability.known).toBe(false);
    expect(f.availability.line).toBe(AVAILABILITY_UNKNOWN_TEXT);
    expect(f.availability.headline).toBe('Contact to confirm');
    const all = JSON.stringify(f);
    expect(all).not.toMatch(/waitlist|100|0 residents|0 beds|spots? available/i);
  });

  it('never makes a staffing claim', () => {
    expect(f.staffing).toBeNull();
  });

  it('puts amenities under the "Reported features" heading', () => {
    expect(f.amenities.verified).toBe(false);
    expect(f.amenities.items).toEqual(['wifi']);
    expect(f.amenities.label).toBe(AMENITIES_UNVERIFIED_LABEL);
    expect(f.amenities.heading).toBe('Reported features — confirm on your tour');
  });

  it('treats a stale verification as unknown', () => {
    const stale = listingFacts({ ...unclaimedFixture, availabilityFreshness: { fresh: false, count: 4 } });
    expect(stale.availability.known).toBe(false);
    expect(stale.availability.line).toBe(AVAILABILITY_UNKNOWN_TEXT);
  });

  it('handles missing / zero values without "0 Residents"', () => {
    const z = listingFacts({ capacity: 0, verifiedFields: ['capacity'], amenities: null, availabilityFreshness: null });
    expect(z.capacity).toBeNull();
    expect(z.amenities.items).toEqual([]);
    expect(z.amenities.label).toBeNull();
  });
});

describe('listingFacts — operator-backed listing', () => {
  it('shows operator-set capacity and fresh verified availability', () => {
    const f = listingFacts({
      capacity: 24,
      amenities: ['Garden', 'Chapel'],
      verifiedFields: ['capacity', 'amenities'],
      availabilityFreshness: { fresh: true, count: 3, label: 'Availability verified today · 3 openings' },
    });
    expect(f.capacity).toBe(24);
    expect(f.availability).toEqual({
      known: true,
      headline: '3 open',
      detail: 'Availability verified today · 3 openings',
      line: 'Availability: 3 openings reported',
    });
    expect(f.amenities.verified).toBe(true);
    expect(f.amenities.label).toBeNull();
    expect(f.staffing).toBeNull();
  });

  it('a verified zero is "no openings reported", not "waitlist"', () => {
    const f = listingFacts({ availabilityFreshness: { fresh: true, count: 0, label: 'Availability verified today · 0 openings' } });
    expect(f.availability.headline).toBe('No openings reported');
    expect(JSON.stringify(f.availability)).not.toMatch(/waitlist/i);
  });
});

describe('verifiedFieldsFromEvents', () => {
  it('keeps only OPERATOR / ADMIN / VA_CALL writes to tracked fields', () => {
    expect(
      verifiedFieldsFromEvents([
        { field: 'capacity', source: 'SYSTEM' },
        { field: 'capacity', source: 'IMPORT' },
        { field: 'amenities', source: 'AI_CALL' },
        { field: 'priceMin', source: 'OPERATOR' },
        { field: null, source: 'OPERATOR' },
      ]),
    ).toEqual([]);
    expect(
      verifiedFieldsFromEvents([
        { field: 'amenities', source: 'VA_CALL' },
        { field: 'capacity', source: 'ADMIN' },
      ]),
    ).toEqual(['capacity', 'amenities']);
  });
});

describe('map tiles (OL-173)', () => {
  it('defaults to keyless OSM tiles with the required attribution', () => {
    const t = resolveMapTileConfig(undefined, undefined);
    expect(t.url).toBe(OSM_TILE_URL);
    expect(t.url).toBe('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png');
    expect(t.attribution).toBe(OSM_ATTRIBUTION);
    expect(t.attribution).toContain('https://www.openstreetmap.org/copyright');
    expect(t.attribution).toContain('OpenStreetMap</a> contributors');
  });

  it('honours a valid override and keeps OSM attribution when none is given', () => {
    const url = 'https://tiles.example.org/{z}/{x}/{y}.png';
    expect(resolveMapTileConfig(url, 'Example')).toMatchObject({ url, attribution: 'Example' });
    expect(resolveMapTileConfig(url, '')).toMatchObject({ url, attribution: OSM_ATTRIBUTION });
  });

  it('ignores a malformed override', () => {
    expect(resolveMapTileConfig('http://insecure/{z}/{x}/{y}.png', 'x').url).toBe(OSM_TILE_URL);
    expect(resolveMapTileConfig('https://no-template.example', 'x').url).toBe(OSM_TILE_URL);
  });

  it('no map component still points at the CARTO basemaps', () => {
    for (const f of ['src/components/search/SimpleMap.tsx', 'src/components/search/InteractiveMap.tsx']) {
      const src = fs.readFileSync(path.join(process.cwd(), f), 'utf8');
      expect({ f, carto: /cartocdn/.test(src) }).toEqual({ f, carto: false });
    }
  });
});

describe('listing page copy (OL-173)', () => {
  const src = fs.readFileSync(path.join(process.cwd(), 'src/app/homes/[id]/page.tsx'), 'utf8');
  // The page has a single, real-data render (the mock listing was removed),
  // so the whole file is checked.
  const real = src;

  it('makes no CareCredit partnership claim', () => {
    expect(src).not.toMatch(/partnered with CareCredit/i);
    expect(src).toContain('{CARECREDIT_TITLE}');
  });

  it('real-data render has no hardcoded staffing / waitlist / static capacity copy', () => {
    expect(real).not.toMatch(/24\/7 On-Site|24\/7 care staff on-site|Waitlist only|Currently on waitlist/);
    expect(real).not.toMatch(/realHome\.capacity\}|realHome\.availability\s*>/);
  });
});

describe('OL-176 — imported / enriched listing (Windsor Heights shape)', () => {
  // As scripts/enrich-batch2-held-homes.ts writes it: no EntityEvent rows.
  const windsor = {
    description: 'Private suites with ensuite baths, 24/7 support, and chef-created MIND-diet dining …',
    tagline: 'Where every day shines',
    gender: null,
    amenities: ['24/7 on-site support', 'Chef-prepared MIND-diet dining', 'Sensory spa'],
    verifiedFields: [] as string[],
    availabilityFreshness: null,
  };

  it('amenities are reported features, never verified', () => {
    const f = listingFacts(windsor);
    expect(f.amenities).toEqual({
      items: windsor.amenities,
      verified: false,
      heading: 'Reported features — confirm on your tour',
      label: 'Reported features — confirm on your tour',
    });
  });

  it('the description carries the public-sources note and the tagline is hidden', () => {
    const f = listingFacts(windsor);
    expect(f.description.verified).toBe(false);
    expect(f.description.note).toBe(DESCRIPTION_UNVERIFIED_NOTE);
    expect(f.description.tagline).toBeNull();
  });

  it('an empty or unverified gender restriction is never "All genders welcome"', () => {
    expect(listingFacts(windsor).gender).toBeNull();
    expect(listingFacts({ ...windsor, gender: 'ALL' }).gender).toBeNull();
  });

  it('a seed / import event source does not verify anything', () => {
    const ev = [
      { field: 'amenities', source: 'IMPORT' },
      { field: 'description', source: 'SYSTEM' },
      { field: 'genderRestriction', source: null },
    ];
    expect(verifiedFieldsFromEvents(ev)).toEqual([]);
  });

  it('OPERATOR / ADMIN / VA_CALL writes show the values as-is', () => {
    const verifiedFields = verifiedFieldsFromEvents([
      { field: 'amenities', source: 'OPERATOR' },
      { field: 'description', source: 'ADMIN' },
      { field: 'genderRestriction', source: 'VA_CALL' },
    ]);
    expect(verifiedFields).toEqual(['amenities', 'description', 'genderRestriction']);
    const f = listingFacts({ ...windsor, gender: 'FEMALE', verifiedFields });
    expect(f.amenities.heading).toBe('Amenities & Services');
    expect(f.amenities.label).toBeNull();
    expect(f.description).toEqual({ text: windsor.description, verified: true, note: null, tagline: windsor.tagline });
    expect(f.gender).toBe('Female residents only');
    expect(listingFacts({ ...windsor, gender: 'ALL', verifiedFields }).gender).toBe('All genders welcome');
  });
});

describe('OL-176 — listing page + API source', () => {
  const page = fs.readFileSync(path.join(process.cwd(), 'src/app/homes/[id]/page.tsx'), 'utf8');
  const api = fs.readFileSync(path.join(process.cwd(), 'src/app/api/homes/[id]/route.ts'), 'utf8');

  it('amenity checkmarks only render on the verified branch', () => {
    expect(page).toMatch(/facts\.amenities\.verified \? \(\s*<FiCheck/);
    expect(page).toContain('data-testid="amenities-heading"');
    expect(page).not.toContain('Amenities & Services</h2>');
  });

  it('description, tagline and gender come from listingFacts, not the raw home', () => {
    expect(page).toContain('{facts.description.text');
    expect(page).toContain('facts.description.tagline');
    expect(page).not.toMatch(/realHome\.tagline|realHome\.gender/);
    expect(page).not.toContain('All genders welcome');
  });

  it('no unbacked promises: no "within 24 hours", no "typically included" statement', () => {
    expect(page).not.toMatch(/within 24 hours|What's typically included/);
  });

  it('the API never defaults gender to ALL and never exposes the directory placeholder as the operator', () => {
    expect(api).not.toContain("home.genderRestriction || 'ALL'");
    expect(api).toContain('operator: home.operator && !unclaimed');
  });
});
