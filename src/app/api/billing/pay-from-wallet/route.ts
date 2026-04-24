export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const schema = z.object({
  bookingId: z.string().cuid(),
  amountCents: z.number().int().positive(),
  type: z.enum(['DEPOSIT', 'MONTHLY_FEE']),
});

/**
 * POST /api/billing/pay-from-wallet
 *
 * Deducts a care payment from the family's Care Wallet and records:
 * - WalletTransaction (PAYMENT) for the care amount
 * - WalletTransaction (PAYMENT) for the CareLinkAI service fee
 * - Payment record linked to the booking
 *
 * CareLinkAI charges a service fee (default 2.5%, set via WALLET_FEE_PCT env var).
 * Total deducted = amount + fee. Returns 400 if balance is insufficient.
 */
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request', details: parsed.error.flatten() }, { status: 400 });
  }
  const { bookingId, amountCents, type } = parsed.data;

  const feePct = parseFloat(process.env.WALLET_FEE_PCT ?? '2.5') / 100;
  const feeCents = Math.round(amountCents * feePct);
  const totalCents = amountCents + feeCents;
  const amountDollars = amountCents / 100;
  const feeDollars = feeCents / 100;
  const totalDollars = totalCents / 100;

  // Verify the booking belongs to this user's family
  const family = await prisma.family.findUnique({
    where: { userId: session.user.id },
    include: { wallet: true },
  });
  if (!family) {
    return NextResponse.json({ error: 'Family not found' }, { status: 404 });
  }

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: { id: true, familyId: true },
  });
  if (!booking || booking.familyId !== family.id) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
  }

  // Auto-create wallet if it doesn't exist
  const wallet = family.wallet ?? await prisma.familyWallet.create({
    data: { familyId: family.id, balance: 0 },
  });

  const currentBalance = parseFloat(wallet.balance.toString());
  if (currentBalance < totalDollars) {
    return NextResponse.json({
      error: `Insufficient balance. You need $${totalDollars.toFixed(2)} (including ${(feePct * 100).toFixed(1)}% service fee) but only have $${currentBalance.toFixed(2)}.`,
    }, { status: 400 });
  }

  const newBalance = currentBalance - totalDollars;

  // All DB writes in a single transaction
  await prisma.$transaction(async (tx) => {
    // Deduct from wallet
    await tx.familyWallet.update({
      where: { id: wallet.id },
      data: { balance: newBalance },
    });

    // Care payment transaction
    await tx.walletTransaction.create({
      data: {
        walletId: wallet.id,
        amount: amountDollars,
        type: 'PAYMENT',
        description: type === 'MONTHLY_FEE' ? 'Monthly care payment' : 'Deposit payment',
      },
    });

    // Service fee transaction
    await tx.walletTransaction.create({
      data: {
        walletId: wallet.id,
        amount: feeDollars,
        type: 'PAYMENT',
        description: `CareLinkAI service fee (${(feePct * 100).toFixed(1)}%)`,
      },
    });

    // Payment record linked to booking
    await tx.payment.create({
      data: {
        userId: session.user.id,
        bookingId,
        amount: amountDollars,
        status: 'COMPLETED',
        type,
        description: type === 'MONTHLY_FEE' ? 'Monthly care payment via Care Wallet' : 'Deposit via Care Wallet',
      },
    });
  });

  return NextResponse.json({ success: true, newBalance });
}
