/**
 * OL-112: the public directory APIs must never surface demo/tutorial homes to
 * a logged-out viewer.
 *
 *  - GET /api/search          → whereClause.isDemo === false (search page + map markers)
 *  - GET /api/homes/search    → where.isDemo === false (was missing — this PR)
 *  - GET /api/homes/[id]      → demo home + no session → 404; with a session → 200
 */

import { jest } from '@jest/globals';
import { NextRequest } from 'next/server';

// ---- shared Prisma mock ----------------------------------------------------
const mockPrisma: any = {
  assistedLivingHome: {
    findMany: jest.fn(async () => []),
    count: jest.fn(async () => 0),
    findUnique: jest.fn(),
  },
  homeReview: { groupBy: jest.fn(async () => []) },
  user: { findUnique: jest.fn(async () => null) },
  inquiry: { count: jest.fn(async () => 0) },
  facilityInspection: { findMany: jest.fn(async () => []) },
  facilityQuoteReport: { findMany: jest.fn(async () => []) },
};

jest.mock('@prisma/client', () => ({
  // /api/homes/search still constructs its own client on this branch
  PrismaClient: jest.fn(() => mockPrisma),
  CareLevel: { INDEPENDENT: 'INDEPENDENT', ASSISTED: 'ASSISTED', MEMORY_CARE: 'MEMORY_CARE', SKILLED_NURSING: 'SKILLED_NURSING' },
}));
jest.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));
jest.mock('next-auth/next', () => ({ getServerSession: jest.fn(async () => null) }));
jest.mock('next-auth', () => ({ getServerSession: jest.fn(async () => null) }));
jest.mock('@/lib/auth', () => ({ authOptions: {} }));
jest.mock('@/lib/audit', () => ({
  createAuditLog: jest.fn(async () => undefined),
  createAuditLogFromRequest: jest.fn(async () => undefined),
}));
jest.mock('@/lib/sentry', () => ({ captureError: jest.fn() }));
jest.mock('@/lib/ai-matching', () => ({
  calculateAIMatchScore: jest.fn(() => 50),
  calculateAIMatchBreakdown: jest.fn(() => ({})),
}));
jest.mock('@/lib/claim-engine/inquiry-claim-notification', () => ({ isUnclaimedHome: jest.fn(() => false) }));
jest.mock('@/lib/placeholder-images', () => ({ placeholderImageFor: jest.fn(() => '/placeholder.jpg') }));

import { getServerSession as getServerSessionNext } from 'next-auth/next';
import { GET as searchGET } from '@/app/api/search/route';
import { GET as homesSearchGET } from '@/app/api/homes/search/route';
import { GET as homeDetailGET } from '@/app/api/homes/[id]/route';

const sessionNext = getServerSessionNext as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  mockPrisma.assistedLivingHome.findMany.mockResolvedValue([]);
  mockPrisma.assistedLivingHome.count.mockResolvedValue(0);
  sessionNext.mockResolvedValue(null);
});

describe('GET /api/search (public search page + map markers)', () => {
  it('filters isDemo:false for a logged-out request', async () => {
    const res = await searchGET(new NextRequest('http://localhost/api/search?location=Cleveland&limit=10'));
    expect(res.status).toBe(200);
    const where = mockPrisma.assistedLivingHome.findMany.mock.calls[0][0].where;
    expect(where.status).toBe('ACTIVE');
    expect(where.isDemo).toBe(false);
  });

  it('the markers (map) path shares the same demo filter', async () => {
    await searchGET(new NextRequest('http://localhost/api/search?markers=1'));
    const where = mockPrisma.assistedLivingHome.findMany.mock.calls[0][0].where;
    expect(where.isDemo).toBe(false);
    expect(mockPrisma.assistedLivingHome.count.mock.calls[0][0].where.isDemo).toBe(false);
  });
});

describe('GET /api/homes/search (legacy listing API)', () => {
  it('filters isDemo:false and status ACTIVE', async () => {
    const res = await homesSearchGET(new NextRequest('http://localhost/api/homes/search?limit=10'));
    expect(res.status).toBe(200);
    const where = mockPrisma.assistedLivingHome.findMany.mock.calls[0][0].where;
    expect(where.status).toBe('ACTIVE');
    expect(where.isDemo).toBe(false);
    expect(mockPrisma.assistedLivingHome.count.mock.calls[0][0].where.isDemo).toBe(false);
  });
});

describe('GET /api/homes/[id] (detail)', () => {
  const demoHome = {
    id: 'home-demo',
    name: 'Tutorial Demo Home',
    isDemo: true,
    status: 'ACTIVE',
    operatorId: 'op-1',
    address: null,
    photos: [],
    operator: { user: { firstName: 'Op', lastName: 'Demo', email: 'demo.operator@carelinkai.test' } },
    reviews: [],
    careLevel: ['ASSISTED'],
    amenities: [],
  };

  it('a logged-out viewer gets 404 for a demo home', async () => {
    mockPrisma.assistedLivingHome.findUnique.mockResolvedValue(demoHome);
    const res = await homeDetailGET(new NextRequest('http://localhost/api/homes/home-demo'), {
      params: { id: 'home-demo' },
    } as any);
    expect(res.status).toBe(404);
  });

  it('a signed-in viewer (tutorial / admin) still gets the demo home', async () => {
    mockPrisma.assistedLivingHome.findUnique.mockResolvedValue(demoHome);
    sessionNext.mockResolvedValue({ user: { email: 'demo.admin@carelinkai.test' } });
    const res = await homeDetailGET(new NextRequest('http://localhost/api/homes/home-demo'), {
      params: { id: 'home-demo' },
    } as any);
    expect(res.status).toBe(200);
  });

  it('a logged-out viewer still gets a live home', async () => {
    mockPrisma.assistedLivingHome.findUnique.mockResolvedValue({ ...demoHome, id: 'home-live', isDemo: false });
    const res = await homeDetailGET(new NextRequest('http://localhost/api/homes/home-live'), {
      params: { id: 'home-live' },
    } as any);
    expect(res.status).toBe(200);
  });
});
