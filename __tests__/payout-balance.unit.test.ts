/**
 * OL-185 — the server-side payable balance (src/lib/payouts/balance.ts) and the
 * TIMESHEET_PAYOUTS_ENABLED flag parser.
 */
import { jest } from '@jest/globals';
import {
  PAYOUT_LEDGERS,
  computeOperatorPayableBalance,
  payoutRejectReason,
} from '@/lib/payouts/balance';
import { isTimesheetPayoutsEnabled } from '@/lib/payouts/flags';

function fakeDb(earnings: unknown, payouts: unknown, counts = { earnings: 3, payouts: 2 }) {
  const aggregate = jest.fn<(...a: any[]) => Promise<any>>()
    .mockResolvedValueOnce({ _sum: { amount: earnings }, _count: { _all: counts.earnings } })
    .mockResolvedValueOnce({ _sum: { amount: payouts }, _count: { _all: counts.payouts } });
  return { db: { payment: { aggregate } } as any, aggregate };
}

describe('PAYOUT_LEDGERS', () => {
  it('operators have the Care Wallet ledger; caregivers have none (route answers 503)', () => {
    expect(PAYOUT_LEDGERS).toEqual({ OPERATOR: 'operator_care_wallet', CAREGIVER: null });
  });
});

describe('computeOperatorPayableBalance', () => {
  it('earnings minus prior payouts, in cents, with the counts behind them', async () => {
    // Prisma returns Decimal; anything with toString() works.
    const { db } = fakeDb({ toString: () => '1234.56' }, { toString: () => '200.06' });
    expect(await computeOperatorPayableBalance(db, { id: 'op-1', userId: 'u-1' })).toEqual({
      ledger: 'operator_care_wallet',
      earningsCents: 123456,
      earningCount: 3,
      priorPayoutsCents: 20006,
      payoutCount: 2,
      payableCents: 103450,
    });
  });

  it('no rows at all → zero balance', async () => {
    const { db } = fakeDb(null, null, { earnings: 0, payouts: 0 });
    const b = await computeOperatorPayableBalance(db, { id: 'op-1', userId: 'u-1' });
    expect(b).toMatchObject({ earningsCents: 0, priorPayoutsCents: 0, payableCents: 0 });
  });

  it('payouts above earnings (e.g. a refunded booking) floor at zero, never negative', async () => {
    const { db } = fakeDb(100, 150);
    expect((await computeOperatorPayableBalance(db, { id: 'op-1', userId: 'u-1' })).payableCents).toBe(0);
  });

  it('earnings: COMPLETED Care Wallet booking payments for this operator\'s homes; payouts: drawn OPERATOR_PAYOUT rows', async () => {
    const { db, aggregate } = fakeDb(0, 0);
    await computeOperatorPayableBalance(db, { id: 'op-9', userId: 'u-9' });
    expect(aggregate.mock.calls[0][0]).toMatchObject({
      where: {
        bookingId: { not: null },
        status: 'COMPLETED',
        type: { in: ['DEPOSIT', 'MONTHLY_FEE'] },
        booking: { home: { operatorId: 'op-9' } },
      },
    });
    expect(aggregate.mock.calls[1][0]).toMatchObject({
      where: { userId: 'u-9', type: 'OPERATOR_PAYOUT', status: { in: ['PENDING', 'PROCESSING', 'COMPLETED'] } },
    });
  });
});

describe('payoutRejectReason', () => {
  it('rejects non-positive or fractional cents', () => {
    expect(payoutRejectReason(0, { payableCents: 100 })).toBe('invalid_amount');
    expect(payoutRejectReason(-5, { payableCents: 100 })).toBe('invalid_amount');
    expect(payoutRejectReason(1.5, { payableCents: 100 })).toBe('invalid_amount');
  });
  it('rejects when nothing is payable', () => {
    expect(payoutRejectReason(1, { payableCents: 0 })).toBe('no_balance');
  });
  it('rejects anything above the balance — never trims it down', () => {
    expect(payoutRejectReason(101, { payableCents: 100 })).toBe('exceeds_balance');
  });
  it('allows up to and including the balance', () => {
    expect(payoutRejectReason(100, { payableCents: 100 })).toBeNull();
    expect(payoutRejectReason(1, { payableCents: 100 })).toBeNull();
  });
});

describe('isTimesheetPayoutsEnabled', () => {
  it('unset / empty / 0 / false / garbage → off; 1 / true / yes / on → on', () => {
    for (const v of [undefined, '', '0', 'false', 'no', 'off', 'maybe']) {
      expect(isTimesheetPayoutsEnabled({ TIMESHEET_PAYOUTS_ENABLED: v } as any)).toBe(false);
    }
    for (const v of ['1', 'true', 'TRUE', ' yes ', 'on']) {
      expect(isTimesheetPayoutsEnabled({ TIMESHEET_PAYOUTS_ENABLED: v } as any)).toBe(true);
    }
  });
});
