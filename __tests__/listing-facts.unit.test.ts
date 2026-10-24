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

  it('labels amenities as reported by the home', () => {
    expect(f.amenities.verified).toBe(false);
    expect(f.amenities.items).toEqual(['wifi']);
    expect(f.amenities.label).toBe(AMENITIES_UNVERIFIED_LABEL);
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
  // The real-data branch ends where the mock-mode render (`home.name`) begins.
  const start = src.indexOf('if (!showMock) {');
  const end = src.indexOf('<BrowseShell title={`Home Details - ${home.name}`}>');
  const real = src.slice(start, end);

  it('locates the real-data branch', () => {
    expect(start).toBeGreaterThan(0);
    expect(end).toBeGreaterThan(start);
  });

  it('makes no CareCredit partnership claim', () => {
    expect(src).not.toMatch(/partnered with CareCredit/i);
    expect(src).toContain('Financing option (CareCredit)');
  });

  it('real-data render has no hardcoded staffing / waitlist / static capacity copy', () => {
    expect(real).not.toMatch(/24\/7 On-Site|24\/7 care staff on-site|Waitlist only|Currently on waitlist/);
    expect(real).not.toMatch(/realHome\.capacity\}|realHome\.availability\s*>/);
  });
});
