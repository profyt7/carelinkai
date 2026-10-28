/**
 * OL-185 (c) — an affiliate commission (AffiliateReferral + PENDING
 * AFFILIATE_COMMISSION payout) only accrues on Convert when:
 *   PLACEMENT_FEE_ENABLED is on AND the payer lane is FEE_ELIGIBLE (private
 *   funds / LTC insurance) AND the placement-fee Stripe invoice item was created.
 * Otherwise nothing is written and one structured skip line is logged.
 */
import { jest } from '@jest/globals';

const tx = {
  resident: { create: jest.fn(async () => ({ id: 'res-1' })) },
  familyContact: { create: jest.fn(async () => ({})) },
  inquiry: { update: jest.fn(async () => ({})) },
};
const mockPrisma: any = {
  inquiry: { findUnique: jest.fn() },
  payment: {
    create: jest.fn(async () => ({ id: 'pay-1' })),
    update: jest.fn(async () => ({})),
  },
  affiliate: { findUnique: jest.fn() },
  affiliateReferral: {
    findFirst: jest.fn(async () => null),
    create: jest.fn(async () => ({})),
    update: jest.fn(async () => ({})),
  },
  $transaction: jest.fn(async (fn: any) => fn(tx)),
};

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn(() => mockPrisma),
  ResidentStatus: { PENDING: 'PENDING', ACTIVE: 'ACTIVE' },
}));
jest.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));
jest.mock('@/lib/stripe', () => ({
  stripe: { invoiceItems: { create: jest.fn() } },
}));

import type { PayerSource } from '@/lib/payer/payer-source';
import { affiliateCommissionBlockReason, convertInquiryToResident } from '@/lib/services/inquiry-conversion';
import { stripe } from '@/lib/stripe';

const invoiceCreate = (stripe as any).invoiceItems.create as jest.Mock<(...a: any[]) => Promise<any>>;
const flush = async () => {
  for (let i = 0; i < 5; i++) await new Promise((r) => setTimeout(r, 0));
};

function inquiryFixture(payerSource: PayerSource | null, stripeCustomerId: string | null = 'cus_123') {
  return {
    id: 'inq-1',
    familyId: 'fam-1',
    homeId: 'home-1',
    status: 'QUALIFIED',
    convertedToResidentId: null,
    affiliateCode: 'AFF123',
    contactEmail: 'fam@example.com',
    payerSource,
    family: { id: 'fam-1', phone: null, referredByCode: null, user: { firstName: 'Fam', lastName: 'Ily', email: 'fam@example.com', phone: null } },
    home: { operator: { id: 'op-1', userId: 'user-op-1', stripeCustomerId } },
  };
}

const conversion = {
  inquiryId: 'cjld2cjxh0000qzrmn831i7rn',
  convertedByUserId: 'cjld2cyuq0000t3rmniod1foy',
  firstName: 'Ada',
  lastName: 'Lovelace',
  dateOfBirth: '1940-01-01',
  gender: 'FEMALE' as const,
};

describe('affiliateCommissionBlockReason (pure)', () => {
  const on = { PLACEMENT_FEE_ENABLED: '1' } as any;
  const off = { PLACEMENT_FEE_ENABLED: '' } as any;
  it('flag off blocks every lane, even with an invoice', () => {
    expect(affiliateCommissionBlockReason('PRIVATE_FUNDS', { invoiced: true }, off)).toBe('disabled');
  });
  it('free lane and unknown lane block', () => {
    expect(affiliateCommissionBlockReason('MEDICAID_WAIVER', { invoiced: true }, on)).toBe('free_lane');
    expect(affiliateCommissionBlockReason(null, { invoiced: true }, on)).toBe('unknown_lane');
    expect(affiliateCommissionBlockReason('NOT_SURE', { invoiced: true }, on)).toBe('unknown_lane');
  });
  it('fee lane without an invoice item blocks', () => {
    expect(affiliateCommissionBlockReason('PRIVATE_FUNDS', { invoiced: false }, on)).toBe('no_invoice');
  });
  it('flag on + fee lane + invoice item → allowed', () => {
    expect(affiliateCommissionBlockReason('PRIVATE_FUNDS', { invoiced: true }, on)).toBeNull();
    expect(affiliateCommissionBlockReason('LTC_INSURANCE', { invoiced: true }, on)).toBeNull();
  });
});

describe('Convert → affiliate commission (OL-185)', () => {
  const originalEnabled = process.env.PLACEMENT_FEE_ENABLED;
  let info: jest.SpiedFunction<typeof console.info>;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.PLACEMENT_FEE_CENTS = '50000';
    delete process.env.PLACEMENT_FEE_ENABLED;
    invoiceCreate.mockResolvedValue({ id: 'ii_1' });
    mockPrisma.affiliate.findUnique.mockResolvedValue({ id: 'aff-1', userId: 'user-aff-1', commissionRate: null, commissionTier: 'STANDARD' });
    info = jest.spyOn(console, 'info').mockImplementation(() => undefined);
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });
  afterEach(() => {
    jest.restoreAllMocks();
    if (originalEnabled === undefined) delete process.env.PLACEMENT_FEE_ENABLED;
    else process.env.PLACEMENT_FEE_ENABLED = originalEnabled;
  });

  const commissionWrites = () =>
    mockPrisma.payment.create.mock.calls.filter((c: any[]) => c[0].data.type === 'AFFILIATE_COMMISSION');
  function skipReason(): string | undefined {
    const line = info.mock.calls.map((c) => String(c[0])).find((s) => s.includes('affiliate_commission_skipped'));
    return line ? JSON.parse(line).reason : undefined;
  }
  function expectNoCommission(reason: string) {
    expect(commissionWrites()).toHaveLength(0);
    expect(mockPrisma.affiliateReferral.create).not.toHaveBeenCalled();
    expect(mockPrisma.affiliateReferral.update).not.toHaveBeenCalled();
    expect(skipReason()).toBe(reason);
  }

  it('flag off + private pay: no referral, no pending payout (skip reason disabled)', async () => {
    mockPrisma.inquiry.findUnique.mockResolvedValue(inquiryFixture('PRIVATE_FUNDS'));
    expect((await convertInquiryToResident(conversion)).success).toBe(true);
    await flush();
    expectNoCommission('disabled');
  });

  it.each(['MEDICAID_WAIVER', 'MEDICARE_ADVANTAGE', 'VA_BENEFITS'] as const)(
    'flag on + %s (free lane): no commission (free_lane)',
    async (payer) => {
      process.env.PLACEMENT_FEE_ENABLED = '1';
      mockPrisma.inquiry.findUnique.mockResolvedValue(inquiryFixture(payer));
      await convertInquiryToResident(conversion);
      await flush();
      expectNoCommission('free_lane');
    }
  );

  it('flag on + payer unknown: no commission (unknown_lane)', async () => {
    process.env.PLACEMENT_FEE_ENABLED = '1';
    mockPrisma.inquiry.findUnique.mockResolvedValue(inquiryFixture(null));
    await convertInquiryToResident(conversion);
    await flush();
    expectNoCommission('unknown_lane');
  });

  it('flag on + private pay but operator has no Stripe customer (fee only PENDING for manual collection): no commission', async () => {
    process.env.PLACEMENT_FEE_ENABLED = '1';
    mockPrisma.inquiry.findUnique.mockResolvedValue(inquiryFixture('PRIVATE_FUNDS', null));
    await convertInquiryToResident(conversion);
    await flush();
    expect(invoiceCreate).not.toHaveBeenCalled();
    expectNoCommission('no_invoice');
  });

  it('flag on + private pay but the invoice item fails: no commission', async () => {
    process.env.PLACEMENT_FEE_ENABLED = '1';
    invoiceCreate.mockRejectedValueOnce(new Error('stripe down'));
    mockPrisma.inquiry.findUnique.mockResolvedValue(inquiryFixture('PRIVATE_FUNDS'));
    await convertInquiryToResident(conversion);
    await flush();
    expectNoCommission('no_invoice');
  });

  it('flag on + private pay but the placement-fee Payment row cannot be written: no commission', async () => {
    process.env.PLACEMENT_FEE_ENABLED = '1';
    mockPrisma.payment.create.mockRejectedValueOnce(new Error('db down'));
    mockPrisma.inquiry.findUnique.mockResolvedValue(inquiryFixture('PRIVATE_FUNDS'));
    await convertInquiryToResident(conversion);
    await flush();
    expect(invoiceCreate).not.toHaveBeenCalled();
    expectNoCommission('no_invoice');
  });

  it('flag on + private pay + invoice item created: referral + PENDING commission (20% of the fee)', async () => {
    process.env.PLACEMENT_FEE_ENABLED = '1';
    mockPrisma.inquiry.findUnique.mockResolvedValue(inquiryFixture('PRIVATE_FUNDS'));
    await convertInquiryToResident(conversion);
    await flush();

    expect(invoiceCreate).toHaveBeenCalledTimes(1);
    expect(mockPrisma.affiliateReferral.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ affiliateId: 'aff-1', status: 'CONVERTED', commissionAmount: 100 }) })
    );
    expect(commissionWrites()).toHaveLength(1);
    expect(commissionWrites()[0][0].data).toMatchObject({ userId: 'user-aff-1', amount: 100, status: 'PENDING', type: 'AFFILIATE_COMMISSION' });
    expect(skipReason()).toBeUndefined();
    // The commission is written after the fee's invoice item, never before.
    const order = mockPrisma.payment.create.mock.invocationCallOrder;
    expect(invoiceCreate.mock.invocationCallOrder[0]).toBeLessThan(order[order.length - 1]);
  });

  it('no affiliate code: no affiliate lookup at all', async () => {
    process.env.PLACEMENT_FEE_ENABLED = '1';
    mockPrisma.inquiry.findUnique.mockResolvedValue({ ...inquiryFixture('PRIVATE_FUNDS'), affiliateCode: null });
    await convertInquiryToResident(conversion);
    await flush();
    expect(mockPrisma.affiliate.findUnique).not.toHaveBeenCalled();
    expect(commissionWrites()).toHaveLength(0);
  });
});
