/**
 * fix/public-api-truth-privacy:
 *  1. a logged-out GET of /api/search and /api/homes/[id] carries no email address and no
 *     operator personal name — the operator's business name only;
 *  2. /api/search no longer emits a capacity-derived `availability` number.
 */

import { jest } from '@jest/globals';
import { NextRequest } from 'next/server';

const mockPrisma: any = {
  assistedLivingHome: { findMany: jest.fn(), count: jest.fn(), findUnique: jest.fn() },
  user: { findUnique: jest.fn(async () => null) },
  inquiry: { count: jest.fn(async () => 0) },
  entityEvent: { findMany: jest.fn(async () => []) },
  facilityQuoteReport: { findMany: jest.fn(async () => []) },
};

jest.mock('@prisma/client', () => ({
  CareLevel: { INDEPENDENT: 'INDEPENDENT', ASSISTED: 'ASSISTED', MEMORY_CARE: 'MEMORY_CARE', SKILLED_NURSING: 'SKILLED_NURSING' },
}));
jest.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));
jest.mock('next-auth/next', () => ({ getServerSession: jest.fn(async () => null) }));
jest.mock('@/lib/auth', () => ({ authOptions: {} }));
jest.mock('@/lib/audit', () => ({ createAuditLogFromRequest: jest.fn(async () => undefined) }));
jest.mock('@/lib/ai-matching', () => ({
  calculateAIMatchScore: jest.fn(() => 50),
  calculateAIMatchBreakdown: jest.fn(() => ({})),
}));
jest.mock('@/lib/claim-engine/inquiry-claim-notification', () => ({ isUnclaimedHome: jest.fn(() => false) }));
jest.mock('@/lib/claims/self-serve', () => ({ listingClaimState: jest.fn(async () => 'CLAIMED') }));
jest.mock('@/lib/placeholder-images', () => ({ placeholderImageFor: jest.fn(() => '/placeholder.jpg') }));

import { GET as searchGET } from '@/app/api/search/route';
import { GET as homeGET } from '@/app/api/homes/[id]/route';

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;

const HOME = {
  id: 'home-1',
  name: 'Lakeview Assisted Living',
  description: 'A home.',
  tagline: null,
  status: 'ACTIVE',
  isDemo: false,
  capacity: 40,
  currentOccupancy: 12, // capacity math would say "28 available" — must never appear
  priceMin: 4000,
  priceMax: 6000,
  careLevel: ['ASSISTED'],
  amenities: [],
  genderRestriction: null,
  phone: '216-555-0100',
  updatedAt: new Date(),
  availabilityVerifiedAt: null,
  availabilityCount: null,
  availabilitySource: null,
  priceSource: null,
  startingPriceMonthly: null,
  priceUpdatedAt: null,
  isFeatured: false,
  featuredUntil: null,
  medicaidWaiverStatus: 'ACCEPTING_NEW',
  medicaidWaiverSource: 'AI_CALL',
  medicaidWaiverVerifiedAt: new Date('2026-10-12T15:05:00Z'),
  address: { street: '1 Main St', street2: null, city: 'Cleveland', state: 'OH', zipCode: '44113', latitude: null, longitude: null },
  operator: { id: 'op-1', companyName: 'Lakeview Senior Living LLC', user: { firstName: 'Olivia', lastName: 'Operator', email: 'olivia.operator@lakeview.example' } },
  photos: [],
  reviews: [],
};

beforeEach(() => {
  jest.clearAllMocks();
  mockPrisma.assistedLivingHome.findMany.mockImplementation(async () => [HOME]);
  mockPrisma.assistedLivingHome.count.mockImplementation(async () => 1);
  mockPrisma.assistedLivingHome.findUnique.mockImplementation(async () => HOME);
});

describe('logged-out GET /api/search', () => {
  it('has no email address and no operator personal name anywhere in the body', async () => {
    const res = await searchGET(new NextRequest('http://localhost/api/search?location=Cleveland'));
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).not.toMatch(EMAIL_RE);
    expect(text).not.toContain('Olivia');
    expect(text).not.toContain('"Operator"');
    const body = JSON.parse(text);
    expect(body.results[0].operator).toEqual({ company: 'Lakeview Senior Living LLC' });
  });
  it('emits no capacity-derived availability field', async () => {
    const body = await (await searchGET(new NextRequest('http://localhost/api/search?location=Cleveland'))).json();
    expect(body.results[0]).not.toHaveProperty('availability');
    expect(JSON.stringify(body)).not.toContain('"availability":28');
  });
  it('"has availability" filter keeps only verified openings, not empty beds', async () => {
    const body = await (await searchGET(new NextRequest('http://localhost/api/search?availability=true'))).json();
    expect(body.results).toHaveLength(0);
  });
});

describe('logged-out GET /api/homes/[id]', () => {
  it('has no email address and no operator personal name anywhere in the body', async () => {
    const res = await homeGET(new NextRequest('http://localhost/api/homes/home-1'), { params: { id: 'home-1' } });
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).not.toMatch(EMAIL_RE);
    expect(text).not.toContain('Olivia');
    const body = JSON.parse(text);
    const data = body.data ?? body.home ?? body;
    expect(data.operator).toEqual({ company: 'Lakeview Senior Living LLC' });
  });
  it('the waiver note names the real source and date', async () => {
    const body = await (await homeGET(new NextRequest('http://localhost/api/homes/home-1'), { params: { id: 'home-1' } })).json();
    const data = body.data ?? body.home ?? body;
    expect(data.medicaidWaiver).toMatchObject({ source: 'AI_CALL', verifiedAt: '2026-10-12T15:05:00.000Z' });
    expect(data.medicaidWaiver.note).toContain('verified Oct 12, 2026');
    expect(data.medicaidWaiver.note).not.toMatch(/Western Reserve/);
  });
});
