/**
 * OL-197: GET /api/search pages through one deterministic order — relevance (or
 * price) first, then updatedAt desc, then id — so paging never repeats or skips
 * a home, even when Postgres returns rows in a different order on every query.
 */

import { jest } from '@jest/globals';
import { NextRequest } from 'next/server';

const mockPrisma: any = {
  assistedLivingHome: { findMany: jest.fn(), count: jest.fn() },
  user: { findUnique: jest.fn(async () => null) },
};

jest.mock('@prisma/client', () => ({
  CareLevel: { INDEPENDENT: 'INDEPENDENT', ASSISTED: 'ASSISTED', MEMORY_CARE: 'MEMORY_CARE', SKILLED_NURSING: 'SKILLED_NURSING' },
}));
jest.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));
jest.mock('next-auth/next', () => ({ getServerSession: jest.fn(async () => null) }));
jest.mock('@/lib/auth', () => ({ authOptions: {} }));
jest.mock('@/lib/ai-matching', () => ({
  calculateAIMatchScore: jest.fn(() => 50),
  calculateAIMatchBreakdown: jest.fn(() => ({})),
}));
jest.mock('@/lib/claim-engine/inquiry-claim-notification', () => ({ isUnclaimedHome: jest.fn(() => false) }));
jest.mock('@/lib/placeholder-images', () => ({ placeholderImageFor: jest.fn(() => '/placeholder.jpg') }));

import { GET } from '@/app/api/search/route';

const NOW = Date.now();
const DAY = 86_400_000;
const TOTAL = 47;

// Many deliberate ties: 4 shared updatedAt values, repeated prices, and equal
// relevance scores, so only the id can settle the order of most homes.
const HOMES = Array.from({ length: TOTAL }, (_, i) => ({
  id: `home-${String((i * 17) % TOTAL).padStart(3, '0')}`,
  name: `Home ${i}`,
  description: null,
  tagline: null,
  status: 'ACTIVE',
  isDemo: false,
  capacity: 10,
  currentOccupancy: i % 3 === 0 ? 10 : 7, // every third home is full
  priceMin: 3000 + (i % 5) * 500,
  priceMax: 5000 + (i % 4) * 500,
  careLevel: ['ASSISTED'],
  amenities: [],
  genderRestriction: null,
  phone: null,
  updatedAt: new Date(NOW - (i % 4) * DAY),
  availabilityVerifiedAt: i % 6 === 0 ? new Date(NOW - DAY) : null, // fresh-availability boost
  availabilityCount: i % 6 === 0 ? 2 : null,
  priceSource: i % 5 === 0 ? 'OPERATOR' : null, // transparent-pricing boost
  startingPriceMonthly: i % 5 === 0 ? 4200 : null,
  priceUpdatedAt: i % 5 === 0 ? new Date(NOW - DAY) : null,
  isFeatured: i % 7 === 0,
  featuredUntil: null,
  address: { street: '1 Main St', street2: null, city: 'Cleveland', state: 'OH', zipCode: '44113', latitude: null, longitude: null },
  operator: { user: { firstName: 'Op', lastName: 'Erator', email: 'op@example.test' } },
  photos: [],
}));

// Seeded PRNG: each query returns the rows in a different order, like a table
// scan with no ORDER BY.
let seed = 1;
function shuffled<T>(rows: readonly T[]): T[] {
  const out = [...rows];
  for (let i = out.length - 1; i > 0; i--) {
    seed = (seed * 16807) % 2147483647;
    const j = seed % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockPrisma.assistedLivingHome.findMany.mockImplementation(async () => shuffled(HOMES));
  mockPrisma.assistedLivingHome.count.mockImplementation(async () => HOMES.length);
});

async function search(qs: string) {
  const res = await GET(new NextRequest(`http://localhost/api/search?${qs}`));
  expect(res.status).toBe(200);
  return res.json();
}

async function pageThrough(filter: string, limit: number) {
  const ids: string[] = [];
  let totalPages = 1;
  let totalResults = 0;
  for (let page = 1; page <= totalPages; page++) {
    const body = await search(`${filter}&page=${page}&limit=${limit}`);
    totalPages = body.pagination.totalPages;
    totalResults = body.pagination.totalResults;
    ids.push(...body.results.map((r: any) => r.id));
  }
  return { ids, totalResults };
}

describe.each([
  ['relevance (default)', 'location=Cleveland', TOTAL],
  ['price_low', 'sortBy=price_low', TOTAL],
  ['price_high', 'sortBy=price_high', TOTAL],
  ['availability=true filter', 'availability=true', HOMES.filter((h) => h.capacity > h.currentOccupancy).length],
])('GET /api/search paging — %s', (_label, filter, expected) => {
  it.each([7, 10])('pages of %i: every home exactly once, no duplicates, no gaps', async (limit) => {
    const { ids, totalResults } = await pageThrough(filter, limit);
    expect(totalResults).toBe(expected);
    expect(ids).toHaveLength(expected);
    expect(new Set(ids).size).toBe(expected);
  });

  it('the pages concatenate to the single-page order', async () => {
    const all = (await search(`${filter}&page=1&limit=50`)).results.map((r: any) => r.id);
    const { ids } = await pageThrough(filter, 10);
    expect(ids).toEqual(all);
  });
});

it('ties end in updatedAt desc, then id asc', async () => {
  const body = await search('sortBy=price_low&limit=50');
  const byId = new Map(HOMES.map((h) => [h.id, h]));
  const rows = body.results.map((r: any) => byId.get(r.id)!);
  for (let i = 1; i < rows.length; i++) {
    const [a, b] = [rows[i - 1], rows[i]];
    if (a.priceMin !== b.priceMin) {
      expect(a.priceMin).toBeLessThan(b.priceMin);
    } else if (a.updatedAt.getTime() !== b.updatedAt.getTime()) {
      expect(a.updatedAt.getTime()).toBeGreaterThan(b.updatedAt.getTime());
    } else {
      expect(a.id < b.id).toBe(true);
    }
  }
});

it('queries the DB with a deterministic ORDER BY and no OFFSET', async () => {
  await search('page=3&limit=10');
  const args = mockPrisma.assistedLivingHome.findMany.mock.calls[0][0];
  expect(args.orderBy).toEqual([{ updatedAt: 'desc' }, { id: 'asc' }]);
  expect(args.skip).toBeUndefined();
});

it('a page past the end is empty, not a repeat', async () => {
  const body = await search('page=99&limit=10');
  expect(body.results).toEqual([]);
  expect(body.pagination.totalResults).toBe(TOTAL);
});
