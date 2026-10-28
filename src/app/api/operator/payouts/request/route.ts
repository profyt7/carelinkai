
// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { requireAnyRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { logger } from "@/lib/logger";
import { computeOperatorPayableBalance, payoutRejectReason, type PayableBalance } from "@/lib/payouts/balance";
import { z } from "zod";

const requestSchema = z.object({
  amount: z.number().positive("Amount must be positive"),
  description: z.string().optional(),
});

/**
 * POST /api/operator/payouts/request
 * Request a payout to the operator's connected Stripe account
 * Requires OPERATOR role
 *
 * OL-185: the amount is checked against the server-computed payable balance
 * (src/lib/payouts/balance.ts). The payout row is reserved under a per-operator
 * advisory lock before the transfer, so concurrent requests cannot both draw
 * the same balance.
 */
export async function POST(request: NextRequest) {
  try {
    const { session, error } = await requireAnyRole(["OPERATOR"] as any, { forbiddenMessage: "Only operators can request payouts" });
    if (error) return error;

    const body = await request.json();
    const validationResult = requestSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json({ error: "Invalid request data", details: validationResult.error.format() }, { status: 400 });
    }

    const { amount, description } = validationResult.data;

    const operator = await prisma.operator.findUnique({
      where: { userId: session!.user!.id! },
      include: { user: true }
    });
    if (!operator) return NextResponse.json({ error: "Operator record not found" }, { status: 404 });

    const preferences = (operator.user.preferences as any) || {};
    const accountId = (preferences as any).stripeConnectAccountId as string | undefined;
    if (!accountId) {
      return NextResponse.json({ error: "No connected account found. Please complete onboarding first." }, { status: 400 });
    }

    const account = await stripe.accounts.retrieve(accountId);
    if (!account.payouts_enabled) {
      return NextResponse.json({ error: "Payouts are not enabled for your account. Please complete account verification." }, { status: 400 });
    }

    const requestedCents = Math.round(amount * 100);

    // Compute the balance and reserve the payout atomically.
    const reservation = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`payout:operator:${operator.id}`}))`;
      const balance = await computeOperatorPayableBalance(tx, { id: operator.id, userId: operator.userId });
      const reason = payoutRejectReason(requestedCents, balance);
      if (reason) return { ok: false as const, reason, balance };
      const payout = await tx.payment.create({
        data: {
          userId: operator.userId,
          amount: requestedCents / 100,
          type: "OPERATOR_PAYOUT",
          status: "PENDING",
          description: description || "Operator payout",
        },
        select: { id: true },
      });
      return { ok: true as const, payout, balance };
    });

    const basis = basisOf(reservation.balance);
    if (!reservation.ok) {
      logger.warn("payout_rejected", { role: "OPERATOR", operatorId: operator.id, requestedCents, reason: reservation.reason, ...basis });
      return NextResponse.json(
        {
          error: reservation.reason === "no_balance"
            ? "No payable balance"
            : "Requested amount exceeds your payable balance",
          payableBalance: reservation.balance.payableCents / 100,
        },
        { status: 400 }
      );
    }

    const payoutId = reservation.payout.id;
    let transfer;
    try {
      transfer = await stripe.transfers.create(
        {
          amount: requestedCents,
          currency: 'usd',
          destination: accountId,
          metadata: {
            userId: session!.user!.id!,
            operatorId: operator.id,
            payoutPaymentId: payoutId,
            description: description || 'Operator payout',
          },
        },
        { idempotencyKey: `operator-payout-${payoutId}` }
      );
    } catch (err) {
      // Release the reservation so the balance is not held by a transfer that never happened.
      await prisma.payment.update({ where: { id: payoutId }, data: { status: "FAILED" } }).catch(() => {});
      logger.error("payout_transfer_failed", { role: "OPERATOR", operatorId: operator.id, payoutPaymentId: payoutId, requestedCents, ...basis });
      throw err;
    }

    await prisma.payment.update({
      where: { id: payoutId },
      data: { status: "PROCESSING", stripePaymentId: transfer.id },
    });
    logger.info("payout_transfer", {
      role: "OPERATOR",
      operatorId: operator.id,
      payoutPaymentId: payoutId,
      transferId: transfer.id,
      requestedCents,
      ...basis,
    });

    const transferStatus = (transfer as any).status ?? "pending";
    return NextResponse.json({ transferId: transfer.id, amount: requestedCents / 100, status: transferStatus });
  } catch (error) {
    console.error("Error processing payout request:", error);
    return NextResponse.json({ error: "Failed to process payout request" }, { status: 500 });
  }
}

function basisOf(b: PayableBalance) {
  return {
    ledger: b.ledger,
    earningsCents: b.earningsCents,
    earningCount: b.earningCount,
    priorPayoutsCents: b.priorPayoutsCents,
    payoutCount: b.payoutCount,
    payableCents: b.payableCents,
  };
}
