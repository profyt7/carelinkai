/**
 * OL-258: no demo/seed/test caregiver ever reaches a family through a marketplace query, and a seeded
 * "CLEAR" background check is never shown without a completed provider (Checkr) order.
 *
 * Live data on 11/01: 56 visible caregiver profiles, ~0 real (46 seeded Bay Area, ~8 older seeds with no
 * city, test accounts); 53 had backgroundCheckStatus CLEAR from seeds.
 */
import fs from 'fs';
import path from 'path';
import {
  realCaregiverWhere,
  demoCaregiverReasons,
  isRealMarketplaceCaregiver,
  displayBackgroundCheckStatus,
  DEMO_CAREGIVER_EMAIL_SUFFIXES,
} from '@/lib/marketplace/real-caregivers';

const findMany = jest.fn(async (_args?: any) => [] as any[]);
const count = jest.fn(async (_args?: any) => 0);
const groupBy = jest.fn(async () => [] as unknown[]);
let session: any = null;
let mockViewer = false;
jest.mock('@/lib/prisma', () => ({
  prisma: {
    caregiver: { findMany: (a: any) => findMany(a), count: (a: any) => count(a) },
    caregiverReview: { groupBy: () => groupBy() },
    marketplaceCategory: { findMany: async () => [] },
  },
}));
jest.mock('next-auth/next', () => ({ getServerSession: async () => session }));
jest.mock('next-auth', () => ({ getServerSession: async () => session }));
jest.mock('@/lib/auth', () => ({ authOptions: {} }));
jest.mock('@/lib/rateLimit', () => ({
  rateLimitAsync: async () => ({ allowed: true, remaining: 59, resetMs: 60_000 }),
  getClientIp: () => '127.0.0.1',
  buildRateLimitHeaders: () => ({}),
}));
jest.mock('@/lib/mockMode', () => ({ isMockModeEnabled: () => true }));
jest.mock('@/lib/mockMode.server', () => ({ isMockViewerAllowed: async () => mockViewer }));

const ROOT = path.join(__dirname, '..');
const read = (p: string) => fs.readFileSync(path.join(ROOT, p), 'utf8');

const cg = (over: Partial<{ isDemo: boolean; email: string; addresses: { city: string; state: string }[]; visible: boolean }> = {}) => ({
  isVisibleInMarketplace: over.visible ?? true,
  user: { isDemo: over.isDemo ?? false, email: over.email ?? 'jane@gmail.com', addresses: over.addresses ?? [{ city: 'Cleveland', state: 'OH' }] },
});

describe('who counts as a real marketplace caregiver', () => {
  it('a Cleveland, OH caregiver with a normal email is real', () => {
    expect(isRealMarketplaceCaregiver(cg())).toBe(true);
    expect(isRealMarketplaceCaregiver(cg({ addresses: [{ city: 'Parma', state: 'Ohio' }] }))).toBe(true);
  });
  it('Bay Area seeds, no-address seeds, isDemo, seed/test emails and hidden rows are not', () => {
    expect(demoCaregiverReasons(cg({ addresses: [{ city: 'Palo Alto', state: 'CA' }] }))).toEqual(['not in Ohio']);
    expect(demoCaregiverReasons(cg({ addresses: [] }))).toEqual(['no address']);
    expect(demoCaregiverReasons(cg({ addresses: [{ city: '', state: 'OH' }] }))).toEqual(['not in Ohio']);
    expect(demoCaregiverReasons(cg({ isDemo: true }))).toEqual(['isDemo']);
    expect(demoCaregiverReasons(cg({ email: 'sarah.johnson@carelink.demo' }))).toEqual(['demo email']);
    expect(demoCaregiverReasons(cg({ email: 'cg+seed@carelinkai.com' }))).toEqual(['demo email']);
    expect(demoCaregiverReasons(cg({ email: 'friendtest4@test.carelinkai.com', addresses: [] }))).toEqual(['demo email', 'no address']);
    expect(demoCaregiverReasons(cg({ visible: false }))).toEqual(['hidden']);
  });
  it('the Prisma filter encodes the same rule', () => {
    const w: any = realCaregiverWhere();
    expect(w.isVisibleInMarketplace).toBe(true);
    expect(w.user.isDemo).toBe(false);
    expect(w.user.NOT.map((n: any) => n.email.endsWith)).toEqual([...DEMO_CAREGIVER_EMAIL_SUFFIXES]);
    expect(JSON.stringify(w.user.addresses.some)).toContain('"equals":"OH"');
    expect(w.user.addresses.some.NOT).toEqual({ city: '' });
  });
});

describe('background check: shown only from a completed provider order', () => {
  it('no order → NOT_STARTED (the seeded CLEAR column is ignored)', () => {
    expect(displayBackgroundCheckStatus([])).toBe('NOT_STARTED');
    expect(displayBackgroundCheckStatus(undefined)).toBe('NOT_STARTED');
  });
  it('CLEAR needs a provider report id and a completion date', () => {
    expect(displayBackgroundCheckStatus([{ status: 'CLEAR', completedAt: new Date(), checkrReportId: null }])).toBe('NOT_STARTED');
    expect(displayBackgroundCheckStatus([{ status: 'CLEAR', completedAt: null, checkrReportId: 'rep_1' }])).toBe('PENDING');
    expect(displayBackgroundCheckStatus([{ status: 'CLEAR', completedAt: new Date(), checkrReportId: 'rep_1' }])).toBe('CLEAR');
    expect(displayBackgroundCheckStatus([{ status: 'CONSIDER', completedAt: new Date(), checkrReportId: 'rep_1' }])).toBe('CONSIDER');
  });
});

describe('GET /api/marketplace/caregivers in production', () => {
  const OLD = process.env;
  beforeEach(() => {
    process.env = { ...OLD, NODE_ENV: 'production', BACKGROUND_CHECKS_ENABLED: 'true' } as NodeJS.ProcessEnv;
    findMany.mockReset().mockResolvedValue([]);
    count.mockReset().mockResolvedValue(0);
    session = { user: { id: 'u1', role: 'FAMILY' } };
    mockViewer = false;
  });
  afterAll(() => { process.env = OLD; });
  const get = async (qs = '') => {
    const { GET } = await import('@/app/api/marketplace/caregivers/route');
    return GET(new Request(`http://localhost/api/marketplace/caregivers?${qs}`));
  };
  const realClause = JSON.stringify(realCaregiverWhere());

  it('logged out → 401, no query runs', async () => {
    session = null;
    const res = await get();
    expect(res.status).toBe(401);
    expect(findMany).not.toHaveBeenCalled();
  });

  it('every list query (page, cursor, radius, filters) is ANDed with the real-caregiver filter', async () => {
    for (const qs of ['', 'cursor=abc', 'lat=41.5&lng=-81.7&radiusMiles=25', 'q=ann&city=Cleveland&state=OH&minRate=15']) {
      findMany.mockClear(); count.mockClear();
      const res = await get(qs);
      expect(res.status).toBe(200);
      for (const call of findMany.mock.calls) expect(JSON.stringify(call[0].where.AND[0])).toBe(realClause);
      for (const call of count.mock.calls) expect(JSON.stringify(call[0].where.AND[0])).toBe(realClause);
      expect(findMany).toHaveBeenCalled();
    }
  });

  it('the ids path (favorites) is filtered too, not just by id', async () => {
    await get('ids=a,b');
    const where = findMany.mock.calls[0]![0].where;
    expect(JSON.stringify(where.AND[0])).toBe(realClause);
    expect(where.AND[1]).toEqual({ id: { in: ['a', 'b'] } });
  });

  it('0 real caregivers → an empty list, never mock/seed profiles (non-admin)', async () => {
    const res = await get();
    const body = await res.json();
    expect(body.data).toEqual([]);
    expect(res.headers.get('cache-control')).toBe('private, max-age=15');
  });

  it('a seeded CLEAR column with no provider order shows NOT_STARTED and no "Background Check Clear" badge', async () => {
    findMany.mockResolvedValue([{
      id: 'c1', hourlyRate: null, yearsExperience: 2, specialties: [], bio: null, isPro: false, createdAt: new Date(),
      backgroundCheckStatus: 'CLEAR', backgroundCheckOrders: [],
      user: { id: 'u2', firstName: 'Ann', lastName: 'Lee', profileImageUrl: null, addresses: [{ city: 'Cleveland', state: 'OH' }] },
    }]);
    count.mockResolvedValue(1);
    const body = await (await get()).json();
    expect(body.data[0].backgroundCheckStatus).toBe('NOT_STARTED');
    expect(body.data[0].badges).not.toContain('Background Check Clear');
  });
});

describe('every marketplace caregiver query uses the filter (source guard)', () => {
  const FILES = [
    'src/app/api/marketplace/caregivers/route.ts',
    'src/app/marketplace/caregivers/[id]/page.tsx',
    'src/app/api/matching/recommendations/route.ts',
  ];
  it.each(FILES)('%s: each prisma.caregiver query applies realCaregiverWhere()', (f) => {
    const src = read(f);
    const queries = [...src.matchAll(/prisma\.caregiver\.(findMany|findFirst|findUnique|count)\(\s*\{([\s\S]{0,200})/g)];
    expect(queries.length).toBeGreaterThan(0);
    for (const q of queries) {
      if (/where:\s*\{\s*userId:\s*\{\s*in/.test(q[2]!)) continue; // availability join: resolves ids only, ANDed later
      if (/where:\s*\{\s*userId:\s*session\.user\.id\s*\}/.test(q[2]!)) continue; // the signed-in caregiver's own profile
      expect(q[2]).toMatch(/realCaregiverWhere\(\)|listWhere|allowAny/);
    }
  });
  it('the profile page serves mock caregivers only to mock viewers (non-production or a production admin)', () => {
    expect(read('src/app/marketplace/caregivers/[id]/page.tsx')).toMatch(/isMockCaregiverId && mockViewer/);
  });
  it('no family-facing caregiver payload uses the raw backgroundCheckStatus column', () => {
    for (const f of [...FILES, 'src/app/api/favorites/all/route.ts']) {
      expect(read(f)).not.toMatch(/backgroundCheckStatus:\s*(fav\.)?caregiver\.backgroundCheckStatus/);
    }
  });
  it('the marketplace shows the honest onboarding empty state, not seeded profiles', () => {
    const page = read('src/app/marketplace/page.tsx');
    expect(page).toContain('data-testid="caregivers-empty-onboarding"');
    expect(page).toContain('We&apos;re onboarding Cleveland caregivers now');
    expect(page).toContain('Post your job free and we&apos;ll notify you when a caregiver applies.');
    expect(page).toContain('href="/marketplace/listings/new"');
  });
});
