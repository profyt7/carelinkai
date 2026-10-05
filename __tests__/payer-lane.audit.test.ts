/**
 * OL-114 audit (2026-10-05) — see docs/audits/OL-114_PAYER_SOURCE_AUDIT_2026-10-05.md
 *
 * Part A — lane proof in the sprint's own terms: private pay + LTC insurance go
 *          to the FEE lane; Medicaid-waiver / Medicare Advantage / VA go to the
 *          FREE lane.
 *
 * Part B — TRIPWIRE documenting a gap, not desired behavior: the inquiry →
 *          resident conversion queues a placement-fee Stripe invoice item
 *          WITHOUT consulting the payer source / fee lane. When that path is
 *          gated (proposed fix in the audit doc), flip these expectations.
 */

import { jest } from '@jest/globals';

// ---- Part B mocks (must be hoisted before the service import) --------------
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
  affiliate: { findUnique: jest.fn(async () => null) },
  $transaction: jest.fn(async (fn: any) => fn(tx)),
};

jest.mock('@prisma/client', () => ({
  // The service (on main) still constructs its own client; hand it the mock.
  PrismaClient: jest.fn(() => mockPrisma),
  ResidentStatus: { PENDING: 'PENDING', ACTIVE: 'ACTIVE' },
}));
jest.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));
jest.mock('@/lib/stripe', () => ({
  stripe: { invoiceItems: { create: jest.fn(async () => ({ id: 'ii_1' })) } },
}));

import { deriveFeeLane, type PayerSource } from '@/lib/payer/payer-source';
import { convertInquiryToResident } from '@/lib/services/inquiry-conversion';
import { stripe } from '@/lib/stripe';

const flush = () => new Promise((r) => setTimeout(r, 0));

// ---- Part A ----------------------------------------------------------------
describe('OL-114 lane proof', () => {
  it('private pay and LTC insurance → fee lane', () => {
    expect(deriveFeeLane('PRIVATE_FUNDS')).toBe('FEE_ELIGIBLE');
    expect(deriveFeeLane('LTC_INSURANCE')).toBe('FEE_ELIGIBLE');
  });

  it('Medicaid waiver, Medicare Advantage and VA → free lane (never a fee)', () => {
    for (const federal of ['MEDICAID_WAIVER', 'MEDICARE_ADVANTAGE', 'VA_BENEFITS'] as const) {
      expect(deriveFeeLane(federal)).toBe('FREE_LANE');
    }
  });

  it('"not sure", blank and unknown values are UNKNOWN — never silently fee-eligible', () => {
    expect(deriveFeeLane('NOT_SURE')).toBe('UNKNOWN');
    expect(deriveFeeLane(null)).toBe('UNKNOWN');
    expect(deriveFeeLane(undefined)).toBe('UNKNOWN');
    expect(deriveFeeLane('SELF_PAY' as PayerSource)).toBe('UNKNOWN');
  });
});

// ---- Part B ----------------------------------------------------------------
function inquiryFixture(payerSource: PayerSource | null) {
  return {
    id: 'inq-1',
    familyId: 'fam-1',
    homeId: 'home-1',
    status: 'QUALIFIED',
    convertedToResidentId: null,
    affiliateCode: null,
    contactEmail: 'fam@example.com',
    payerSource,
    family: { id: 'fam-1', phone: null, referredByCode: null, user: { firstName: 'Fam', lastName: 'Ily', email: 'fam@example.com', phone: null } },
    home: { operator: { id: 'op-1', userId: 'user-op-1', stripeCustomerId: 'cus_123' } },
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

describe('TRIPWIRE (known gap, OL-124): conversion bills without checking the fee lane', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.PLACEMENT_FEE_CENTS = '50000';
  });

  it('a FREE_LANE (Medicaid waiver) conversion still records a PLACEMENT_FEE payment and queues a Stripe invoice item', async () => {
    mockPrisma.inquiry.findUnique.mockResolvedValue(inquiryFixture('MEDICAID_WAIVER'));

    const result = await convertInquiryToResident(conversion);
    await flush();

    expect(result.success).toBe(true);
    // ⚠️ This is the gap: deriveFeeLane('MEDICAID_WAIVER') === 'FREE_LANE', yet…
    expect(mockPrisma.payment.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ type: 'PLACEMENT_FEE', amount: 500 }) })
    );
    expect((stripe as any).invoiceItems.create).toHaveBeenCalledWith(
      expect.objectContaining({ customer: 'cus_123', amount: 50000, metadata: expect.objectContaining({ type: 'PLACEMENT_FEE' }) })
    );
  });

  it('the same happens when payerSource is unanswered (UNKNOWN lane)', async () => {
    mockPrisma.inquiry.findUnique.mockResolvedValue(inquiryFixture(null));

    await convertInquiryToResident(conversion);
    await flush();

    expect(mockPrisma.payment.create).toHaveBeenCalledTimes(1);
    expect((stripe as any).invoiceItems.create).toHaveBeenCalledTimes(1);
  });

  it('without a Stripe customer the fee is still recorded as a PENDING payment (manual collection)', async () => {
    const fixture = inquiryFixture('VA_BENEFITS');
    fixture.home.operator.stripeCustomerId = null as any;
    mockPrisma.inquiry.findUnique.mockResolvedValue(fixture);

    await convertInquiryToResident(conversion);
    await flush();

    expect(mockPrisma.payment.create).toHaveBeenCalledTimes(1);
    expect((stripe as any).invoiceItems.create).not.toHaveBeenCalled();
  });
});
