/**
 * OL-185 — server-side payable balance for self-serve payouts.
 *
 * A payout may only move money the platform actually holds on a user's behalf.
 * The request amount is never trusted; it is checked against this ledger.
 *
 * Ledgers by role (what the schema supports today):
 * - OPERATOR: Care Wallet booking payments. A family paying a booking from its
 *   wallet (`/api/billing/pay-from-wallet`) writes a COMPLETED Payment of type
 *   DEPOSIT or MONTHLY_FEE with `bookingId` set; the funds sit in the platform
 *   account and are owed to the operator of the booking's home (the 2.5% wallet
 *   fee is a separate wallet transaction, not part of `amount`). Prior payouts
 *   are Payment rows of type OPERATOR_PAYOUT on the operator's user; PENDING,
 *   PROCESSING and COMPLETED all count as drawn, so a payout in flight cannot
 *   be drawn twice. REFUNDED / FAILED earnings are excluded. There is no
 *   dispute model, so "non-disputed" means "not refunded".
 * - CAREGIVER: none. Approved timesheets are owed by the operator, but no step
 *   charges the operator for them, so the platform holds nothing for the
 *   caregiver. The route returns 503 until a funded ledger exists.
 */
import type { Prisma, PrismaClient } from '@prisma/client';

export type PayoutRole = 'CAREGIVER' | 'OPERATOR';
export type PayoutLedger = 'operator_care_wallet' | null;

export const PAYOUT_LEDGERS: Record<PayoutRole, PayoutLedger> = {
  OPERATOR: 'operator_care_wallet',
  CAREGIVER: null,
};

export const OPERATOR_EARNING_TYPES = ['DEPOSIT', 'MONTHLY_FEE'] as const;
export const DRAWN_PAYOUT_STATUSES = ['PENDING', 'PROCESSING', 'COMPLETED'] as const;

export interface PayableBalance {
  ledger: Exclude<PayoutLedger, null>;
  earningsCents: number;
  earningCount: number;
  priorPayoutsCents: number;
  payoutCount: number;
  payableCents: number;
}

type Db = Pick<PrismaClient, 'payment'> | Prisma.TransactionClient;

const toCents = (v: unknown): number => Math.round(Number(v?.toString?.() ?? v ?? 0) * 100);

export async function computeOperatorPayableBalance(
  db: Db,
  operator: { id: string; userId: string }
): Promise<PayableBalance> {
  const [earnings, payouts] = await Promise.all([
    db.payment.aggregate({
      where: {
        bookingId: { not: null },
        status: 'COMPLETED',
        type: { in: [...OPERATOR_EARNING_TYPES] },
        booking: { home: { operatorId: operator.id } },
      },
      _sum: { amount: true },
      _count: { _all: true },
    }),
    db.payment.aggregate({
      where: {
        userId: operator.userId,
        type: 'OPERATOR_PAYOUT',
        status: { in: [...DRAWN_PAYOUT_STATUSES] },
      },
      _sum: { amount: true },
      _count: { _all: true },
    }),
  ]);

  const earningsCents = toCents(earnings._sum.amount);
  const priorPayoutsCents = toCents(payouts._sum.amount);
  return {
    ledger: 'operator_care_wallet',
    earningsCents,
    earningCount: earnings._count._all,
    priorPayoutsCents,
    payoutCount: payouts._count._all,
    payableCents: Math.max(0, earningsCents - priorPayoutsCents),
  };
}

/**
 * Returns null when `requestedCents` may be paid out, otherwise why not.
 * The cap is the computed balance: anything above it is rejected, never trimmed.
 */
export function payoutRejectReason(
  requestedCents: number,
  balance: Pick<PayableBalance, 'payableCents'>
): 'invalid_amount' | 'no_balance' | 'exceeds_balance' | null {
  if (!Number.isInteger(requestedCents) || requestedCents <= 0) return 'invalid_amount';
  if (balance.payableCents <= 0) return 'no_balance';
  if (requestedCents > balance.payableCents) return 'exceeds_balance';
  return null;
}
