/**
 * fix/public-api-truth-privacy: an admin price edit appends a `pricing.updated` EntityEvent
 * (same transaction) with the source, the date, who made it and the old / new values.
 */
import { jest } from '@jest/globals';

const BEFORE = { startingPriceMonthly: 4000, priceRangeLow: null, priceRangeHigh: null, priceSource: 'PUBLIC', priceUpdatedAt: new Date('2026-09-01T00:00:00Z'), priceMin: null, priceMax: null };
const tx: any = {
  assistedLivingHome: {
    findUnique: jest.fn(async () => BEFORE),
    update: jest.fn(async ({ data }: any) => ({ ...BEFORE, ...data })),
  },
  entityEvent: { create: jest.fn(async () => ({})) },
};
const mockPrisma: any = {
  $transaction: jest.fn(async (fn: any) => fn(tx)),
  facilityQuoteReport: { findMany: jest.fn(async () => []) },
  entityEvent: tx.entityEvent,
};
jest.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));

import { setHomePricing } from '@/lib/pricing/pricing';

it('logs old and new value, source ADMIN, actor and date in the same transaction', async () => {
  const view = await setHomePricing({ homeId: 'home-1', source: 'OPERATOR' as never, startingPriceMonthly: 4650, actor: { userId: 'admin-1', role: 'ADMIN' }, eventSource: 'ADMIN' as never });
  expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
  expect(tx.entityEvent.create).toHaveBeenCalledTimes(1);
  const row = (tx.entityEvent.create.mock.calls[0] as any)[0].data;
  expect(row).toMatchObject({ entityType: 'HOME', entityId: 'home-1', eventType: 'pricing.updated', field: 'pricing', source: 'ADMIN' });
  expect(JSON.stringify(row)).toContain('admin-1');
  expect(row.oldValue).toMatchObject({ startingPriceMonthly: 4000, priceSource: 'PUBLIC', priceUpdatedAt: '2026-09-01T00:00:00.000Z', priceRangeLow: null });
  expect(row.newValue).toMatchObject({ startingPriceMonthly: 4650, priceSource: 'OPERATOR' });
  expect(row.occurredAt).toBeInstanceOf(Date);
  expect(row.newValue.priceUpdatedAt).toBe(row.occurredAt.toISOString());
  expect(view.amount).toBe(4650);
});

it('the admin pricing route passes the signed-in admin as the actor', () => {
  const src = require('node:fs').readFileSync(require('node:path').join(process.cwd(), 'src/app/api/admin/homes/[id]/pricing/route.ts'), 'utf8');
  expect(src).toContain('actor: { userId: admin.id, role: admin.role }');
});
