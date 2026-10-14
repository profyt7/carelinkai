/**
 * Sprint W4 0c — suburb empty-state guard:
 *  - the guard counts with the page's exact filter (ACTIVE, non-demo, ASSISTED,
 *    case-insensitive city allow-list);
 *  - an empty suburb logs a WARN carrying the live count and the filter;
 *  - a non-empty DB + zero rendered rows is reported as a failed listings query;
 *  - a count error never throws (count: null, empty: true, error message).
 */

jest.mock('@/lib/prisma', () => ({
  prisma: { assistedLivingHome: { count: jest.fn(), findMany: jest.fn() } },
}));
jest.mock('@/lib/sentry', () => ({ captureError: jest.fn() }));

import { prisma } from '@/lib/prisma';
import { SUBURBS, findSuburb } from '@/lib/directory/suburbs';
import { publicListingsWhere } from '@/lib/directory/public-listings';
import {
  describeSuburbFilter,
  reportSuburbListings,
  suburbListingsQuery,
  warnSuburbEmptyState,
} from '@/lib/directory/suburb-guard';

const count = prisma.assistedLivingHome.count as jest.Mock;

afterEach(() => jest.clearAllMocks());

describe('suburb empty-state guard', () => {
  it('uses the page filter: ACTIVE, non-demo, ASSISTED, case-insensitive cities', () => {
    const parma = findSuburb('parma')!;
    expect(publicListingsWhere(suburbListingsQuery(parma))).toEqual({
      status: 'ACTIVE',
      isDemo: false,
      careLevel: { has: 'ASSISTED' },
      address: {
        is: {
          OR: [
            { city: { equals: 'Parma', mode: 'insensitive' } },
            { city: { equals: 'Parma Heights', mode: 'insensitive' } },
          ],
        },
      },
    });
    expect(suburbListingsQuery(parma, 24).take).toBe(24);
    expect(describeSuburbFilter(parma)).toBe(
      'status=ACTIVE isDemo=false careLevel has ASSISTED address.city in [Parma, Parma Heights] (case-insensitive)'
    );
  });

  it('reports the live count per suburb in registry order and flags empties', async () => {
    count.mockImplementation(async ({ where }: { where: { address: { is: { OR: Array<{ city: { equals: string } }> } } } }) => {
      const city = where.address.is.OR[0].city.equals;
      return city === 'Lakewood' ? 0 : 3;
    });
    const reports = await reportSuburbListings();
    expect(reports.map((r) => r.slug)).toEqual(SUBURBS.map((s) => s.slug));
    expect(reports.find((r) => r.slug === 'lakewood')).toMatchObject({ count: 0, empty: true });
    expect(reports.find((r) => r.slug === 'beachwood')).toMatchObject({ count: 3, empty: false });
    expect(count).toHaveBeenCalledTimes(SUBURBS.length);
    for (const call of count.mock.calls) expect(call[0].where).toMatchObject({ status: 'ACTIVE', isDemo: false });
  });

  it('warnSuburbEmptyState logs the live count and the filter', async () => {
    count.mockResolvedValue(0);
    const warn = jest.fn();
    const lakewood = findSuburb('lakewood')!;
    const report = await warnSuburbEmptyState(lakewood, 0, { warn });
    expect(report).toMatchObject({ slug: 'lakewood', count: 0, empty: true });
    expect(warn).toHaveBeenCalledTimes(1);
    const [msg, ctx] = warn.mock.calls[0];
    expect(msg).toContain('/cleveland/assisted-living/lakewood');
    expect(ctx).toMatchObject({
      feature: 'suburb-empty-state',
      suburb: 'lakewood',
      liveCount: 0,
      rendered: 0,
      filter: 'status=ACTIVE isDemo=false careLevel has ASSISTED address.city in [Lakewood] (case-insensitive)',
    });
    expect(ctx.reason).toMatch(/no live non-demo ASSISTED home/);
  });

  it('distinguishes a failed listings query (DB has homes, page got none)', async () => {
    count.mockResolvedValue(4);
    const warn = jest.fn();
    await warnSuburbEmptyState(findSuburb('beachwood')!, 0, { warn });
    expect(warn.mock.calls[0][1]).toMatchObject({ liveCount: 4, rendered: 0 });
    expect(warn.mock.calls[0][1].reason).toMatch(/listings query failed/);
  });

  it('never throws when the count query fails', async () => {
    count.mockRejectedValue(new Error('db down'));
    const warn = jest.fn();
    const report = await warnSuburbEmptyState(findSuburb('westlake')!, 0, { warn });
    expect(report).toMatchObject({ count: null, empty: true, error: 'db down' });
    expect(warn.mock.calls[0][1]).toMatchObject({ liveCount: null, reason: 'count query failed', error: 'db down' });
  });
});
