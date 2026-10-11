/**
 * OL-114 audit + OL-124 gate — see docs/audits/OL-114_PAYER_SOURCE_AUDIT_2026-10-05.md
 *
 * Part A — lane proof in the sprint's own terms: private pay + LTC insurance go
 *          to the FEE lane; Medicaid-waiver / Medicare Advantage / VA go to the
 *          FREE lane.
 *
 * Part B — the OL-124 gate on inquiry → resident conversion:
 *          - PLACEMENT_FEE_ENABLED unset/0 → never bills (no Payment row, no
 *            Stripe invoice item), one structured skip log line;
 *          - enabled + FEE_ELIGIBLE → bills (Payment row + Stripe invoice item);
 *          - enabled + FREE_LANE (Medicaid waiver / MA / VA) → never bills;
 *          - enabled + UNKNOWN (not sure / missing) → never bills.
 *
 * (Before the gate this file was a tripwire pinning the opposite behavior.)
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
  // The service may still construct its own client on this branch; hand it the mock.
  PrismaClient: jest.fn(() => mockPrisma),
  ResidentStatus: { PENDING: 'PENDING', ACTIVE: 'ACTIVE' },
}));
jest.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));
jest.mock('@/lib/stripe', () => ({
  stripe: { invoiceItems: { create: jest.fn(async () => ({ id: 'ii_1' })) } },
}));

import { deriveFeeLane, type PayerSource } from '@/lib/payer/payer-source';
import {
  convertInquiryToResident,
  isPlacementFeeEnabled,
  placementFeeBlockReason,
} from '@/lib/services/inquiry-conversion';
import { stripe } from '@/lib/stripe';

const flush = () => new Promise((r) => setTimeout(r, 0));
const invoiceCreate = (stripe as any).invoiceItems.create as jest.Mock;

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

// ---- Part B: the gate as a pure function -----------------------------------
describe('OL-124 gate: placementFeeBlockReason / isPlacementFeeEnabled', () => {
  it('flag parsing: unset, empty, 0, false → off; 1/true/yes/on → on', () => {
    for (const v of [undefined, '', '0', 'false', 'no', 'off', 'maybe']) {
      expect(isPlacementFeeEnabled({ PLACEMENT_FEE_ENABLED: v } as any)).toBe(false);
    }
    for (const v of ['1', 'true', 'TRUE', 'yes', 'on']) {
      expect(isPlacementFeeEnabled({ PLACEMENT_FEE_ENABLED: v } as any)).toBe(true);
    }
  });

  it('disabled: blocked with reason "disabled" for every lane, including FEE_ELIGIBLE', () => {
    const env = { PLACEMENT_FEE_ENABLED: '' } as any;
    expect(placementFeeBlockReason('PRIVATE_FUNDS', env)).toEqual({ lane: 'FEE_ELIGIBLE', reason: 'disabled' });
    expect(placementFeeBlockReason('MEDICAID_WAIVER', env)).toEqual({ lane: 'FREE_LANE', reason: 'disabled' });
    expect(placementFeeBlockReason(null, env)).toEqual({ lane: 'UNKNOWN', reason: 'disabled' });
  });

  it('enabled: only FEE_ELIGIBLE may fire', () => {
    const env = { PLACEMENT_FEE_ENABLED: '1' } as any;
    expect(placementFeeBlockReason('PRIVATE_FUNDS', env)).toBeNull();
    expect(placementFeeBlockReason('LTC_INSURANCE', env)).toBeNull();
    for (const federal of ['MEDICAID_WAIVER', 'MEDICARE_ADVANTAGE', 'VA_BENEFITS'] as const) {
      expect(placementFeeBlockReason(federal, env)).toEqual({ lane: 'FREE_LANE', reason: 'free_lane' });
    }
    expect(placementFeeBlockReason('NOT_SURE', env)).toEqual({ lane: 'UNKNOWN', reason: 'unknown_lane' });
    expect(placementFeeBlockReason(null, env)).toEqual({ lane: 'UNKNOWN', reason: 'unknown_lane' });
    expect(placementFeeBlockReason(undefined, env)).toEqual({ lane: 'UNKNOWN', reason: 'unknown_lane' });
  });
});

// ---- Part B: end-to-end through convertInquiryToResident -------------------
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

describe('OL-124 gate on conversion', () => {
  const originalEnabled = process.env.PLACEMENT_FEE_ENABLED;
  let info: jest.SpiedFunction<typeof console.info>;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.PLACEMENT_FEE_CENTS = '50000';
    delete process.env.PLACEMENT_FEE_ENABLED;
    info = jest.spyOn(console, 'info').mockImplementation(() => undefined);
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
  });
  afterEach(() => {
    jest.restoreAllMocks();
    if (originalEnabled === undefined) delete process.env.PLACEMENT_FEE_ENABLED;
    else process.env.PLACEMENT_FEE_ENABLED = originalEnabled;
  });

  function skipLog(): any {
    const line = info.mock.calls.map((c) => String(c[0])).find((s) => s.includes('placement_fee_skipped'));
    expect(line).toBeDefined();
    return JSON.parse(line as string);
  }

  it('disabled (flag unset) + FEE_ELIGIBLE: conversion succeeds, nothing is billed, one structured skip line', async () => {
    mockPrisma.inquiry.findUnique.mockResolvedValue(inquiryFixture('PRIVATE_FUNDS'));

    const result = await convertInquiryToResident(conversion);
    await flush();

    expect(result.success).toBe(true);
    expect(mockPrisma.payment.create).not.toHaveBeenCalled();
    expect(invoiceCreate).not.toHaveBeenCalled();
    expect(skipLog()).toMatchObject({
      event: 'placement_fee_skipped',
      inquiryId: conversion.inquiryId,
      operatorId: 'op-1',
      payerSource: 'PRIVATE_FUNDS',
      lane: 'FEE_ELIGIBLE',
      reason: 'disabled',
      ref: 'OL-124',
    });
  });

  it('disabled explicitly ("0") + FEE_ELIGIBLE: nothing is billed', async () => {
    process.env.PLACEMENT_FEE_ENABLED = '0';
    mockPrisma.inquiry.findUnique.mockResolvedValue(inquiryFixture('LTC_INSURANCE'));
    await convertInquiryToResident(conversion);
    await flush();
    expect(mockPrisma.payment.create).not.toHaveBeenCalled();
    expect(invoiceCreate).not.toHaveBeenCalled();
    expect(skipLog().reason).toBe('disabled');
  });

  it('enabled + FEE_ELIGIBLE (private funds): records the PLACEMENT_FEE payment and queues the Stripe invoice item', async () => {
    process.env.PLACEMENT_FEE_ENABLED = '1';
    mockPrisma.inquiry.findUnique.mockResolvedValue(inquiryFixture('PRIVATE_FUNDS'));

    const result = await convertInquiryToResident(conversion);
    await flush();

    expect(result.success).toBe(true);
    expect(mockPrisma.payment.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ type: 'PLACEMENT_FEE', amount: 500 }) })
    );
    expect(invoiceCreate).toHaveBeenCalledWith(
      expect.objectContaining({ customer: 'cus_123', amount: 50000, metadata: expect.objectContaining({ type: 'PLACEMENT_FEE' }) })
    );
    expect(info.mock.calls.map((c) => String(c[0])).some((s) => s.includes('placement_fee_skipped'))).toBe(false);
  });

  it('enabled + LTC insurance: fires too', async () => {
    process.env.PLACEMENT_FEE_ENABLED = '1';
    mockPrisma.inquiry.findUnique.mockResolvedValue(inquiryFixture('LTC_INSURANCE'));
    await convertInquiryToResident(conversion);
    await flush();
    expect(mockPrisma.payment.create).toHaveBeenCalledTimes(1);
    expect(invoiceCreate).toHaveBeenCalledTimes(1);
  });

  it.each(['MEDICAID_WAIVER', 'MEDICARE_ADVANTAGE', 'VA_BENEFITS'] as const)(
    'enabled + %s (free lane): conversion succeeds, nothing is billed, skip reason free_lane',
    async (payer) => {
      process.env.PLACEMENT_FEE_ENABLED = '1';
      mockPrisma.inquiry.findUnique.mockResolvedValue(inquiryFixture(payer));

      const result = await convertInquiryToResident(conversion);
      await flush();

      expect(result.success).toBe(true);
      expect(mockPrisma.payment.create).not.toHaveBeenCalled();
      expect(invoiceCreate).not.toHaveBeenCalled();
      expect(skipLog()).toMatchObject({ payerSource: payer, lane: 'FREE_LANE', reason: 'free_lane' });
    }
  );

  it('enabled + unanswered payer source (unknown lane): nothing is billed, skip reason unknown_lane', async () => {
    process.env.PLACEMENT_FEE_ENABLED = '1';
    mockPrisma.inquiry.findUnique.mockResolvedValue(inquiryFixture(null));

    await convertInquiryToResident(conversion);
    await flush();

    expect(mockPrisma.payment.create).not.toHaveBeenCalled();
    expect(invoiceCreate).not.toHaveBeenCalled();
    expect(skipLog()).toMatchObject({ payerSource: null, lane: 'UNKNOWN', reason: 'unknown_lane' });
  });

  it('enabled + "not sure" (unknown lane): nothing is billed', async () => {
    process.env.PLACEMENT_FEE_ENABLED = '1';
    mockPrisma.inquiry.findUnique.mockResolvedValue(inquiryFixture('NOT_SURE'));
    await convertInquiryToResident(conversion);
    await flush();
    expect(mockPrisma.payment.create).not.toHaveBeenCalled();
    expect(invoiceCreate).not.toHaveBeenCalled();
  });

  it('enabled + FEE_ELIGIBLE but no Stripe customer: payment recorded PENDING, no invoice item (unchanged)', async () => {
    process.env.PLACEMENT_FEE_ENABLED = '1';
    const fixture = inquiryFixture('PRIVATE_FUNDS');
    fixture.home.operator.stripeCustomerId = null as any;
    mockPrisma.inquiry.findUnique.mockResolvedValue(fixture);
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);

    await convertInquiryToResident(conversion);
    await flush();

    expect(mockPrisma.payment.create).toHaveBeenCalledTimes(1);
    expect(invoiceCreate).not.toHaveBeenCalled();
  });
});
