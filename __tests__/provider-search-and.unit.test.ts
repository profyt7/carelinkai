/**
 * Pre-launch polish 2 (items 4–5, API). Fails if provider text search and city/state filters stop
 * ANDing (they used to share one OR, so either alone matched), or the default order stops being
 * verified first, then name ("recency" keeps newest first; the retired rating sort falls back).
 */
import fs from 'fs';
import path from 'path';

const findMany = jest.fn(async () => [] as unknown[]);
const count = jest.fn(async () => 0);
const groupBy = jest.fn(async () => [] as unknown[]);
jest.mock('@/lib/prisma', () => ({
  prisma: {
    provider: { findMany: (...a: unknown[]) => findMany(...(a as [])), count: (...a: unknown[]) => count(...(a as [])) },
    providerReview: { groupBy: (...a: unknown[]) => groupBy(...(a as [])) },
  },
}));
jest.mock('@/lib/mockMode', () => ({ isMockModeEnabled: () => false }));
jest.mock('@/lib/mockMode.server', () => ({ isMockViewerAllowed: async () => false }));

const read = (p: string) => fs.readFileSync(path.join(process.cwd(), p), 'utf8');

describe('4/5. provider search API', () => {
  const OLD = process.env;
  beforeEach(() => { process.env = { ...OLD }; delete process.env.PROVIDER_BOOST_ENABLED; findMany.mockClear(); });
  afterAll(() => { process.env = OLD; });
  const get = async (qs: string) => {
    const { GET } = await import('@/app/api/marketplace/providers/route');
    const res = await GET(new Request(`http://localhost/api/marketplace/providers?${qs}`));
    expect(res.status).toBe(200);
    return (findMany.mock.calls[0] as any[])[0] as { where: any; orderBy: unknown };
  };

  it('q + city + state are separate AND clauses; no top-level OR', async () => {
    const { where } = await get('q=acme&city=Cleveland&state=OH');
    expect(where.OR).toBeUndefined();
    const and = JSON.stringify(where.AND);
    expect(and).toContain('"contains":"acme"');
    expect(where.AND).toEqual(expect.arrayContaining([
      { coverageArea: { path: ['cities'], array_contains: 'Cleveland' } },
      { coverageArea: { path: ['states'], array_contains: 'OH' } },
    ]));
    const qClause = where.AND.find((c: any) => c.OR && JSON.stringify(c).includes('acme'));
    expect(qClause.OR).toHaveLength(3);
  });

  it('default order is verified first, then name; "recency" keeps newest first; old rating sort falls back', async () => {
    expect((await get('')).orderBy).toEqual([{ isVerified: 'desc' }, { businessName: 'asc' }, { id: 'asc' }]);
    findMany.mockClear();
    expect((await get('sortBy=ratingDesc')).orderBy).toEqual([{ isVerified: 'desc' }, { businessName: 'asc' }, { id: 'asc' }]);
    findMany.mockClear();
    expect((await get('sortBy=recency')).orderBy).toEqual([{ createdAt: 'desc' }]);
  });

});
