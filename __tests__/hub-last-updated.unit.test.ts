/**
 * Hub "Last updated" is data: the newest of updatedAt and the verification stamps over the hub's own
 * public-listing filter — never a hard-coded string, never a guess on a DB error.
 */
const aggregate = jest.fn();
jest.mock('@/lib/prisma', () => ({ prisma: { assistedLivingHome: { aggregate: (a: unknown) => aggregate(a) } } }));

import { formatLastUpdated, latestPublicListingUpdate, publicListingsWhere } from '@/lib/directory/public-listings';
import fs from 'fs';
import path from 'path';

beforeEach(() => aggregate.mockReset());

it('takes the newest of updatedAt and every verification stamp, over the hub filter', async () => {
  aggregate.mockResolvedValue({ _max: {
    updatedAt: new Date('2026-11-20T10:00:00Z'),
    availabilityVerifiedAt: new Date('2026-11-25T15:00:00Z'),
    priceUpdatedAt: null,
    medicaidWaiverVerifiedAt: new Date('2026-10-16T00:00:00Z'),
  } });
  const d = await latestPublicListingUpdate({ careLevel: 'ASSISTED' });
  expect(d?.toISOString()).toBe('2026-11-25T15:00:00.000Z');
  expect(aggregate.mock.calls[0][0].where).toEqual(publicListingsWhere({ careLevel: 'ASSISTED' })); // ACTIVE, non-demo
  expect(formatLastUpdated(d!)).toBe('Nov 25, 2026');
});

it('no listings / no stamps → null; a DB error → null (no date is shown rather than a wrong one)', async () => {
  aggregate.mockResolvedValue({ _max: { updatedAt: null, availabilityVerifiedAt: null, priceUpdatedAt: null, medicaidWaiverVerifiedAt: null } });
  expect(await latestPublicListingUpdate({ careLevel: 'ASSISTED' })).toBeNull();
  aggregate.mockRejectedValue(new Error('db down'));
  expect(await latestPublicListingUpdate({ careLevel: 'ASSISTED' })).toBeNull();
});

it('formats in Cleveland time (a late-evening ET update keeps its ET date)', () => {
  expect(formatLastUpdated(new Date('2026-11-26T03:30:00Z'))).toBe('Nov 25, 2026');
});

it('the assisted-living hub no longer hard-codes its date', () => {
  const src = fs.readFileSync(path.join(process.cwd(), 'src/app/cleveland/assisted-living/page.tsx'), 'utf8');
  expect(src).not.toMatch(/Last updated 20\d\d-\d\d-\d\d/);
  expect(src).toContain('latestPublicListingUpdate');
});
