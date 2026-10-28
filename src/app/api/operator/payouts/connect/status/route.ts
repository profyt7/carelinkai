export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";
import { requireAnyRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";

/**
 * GET /api/operator/payouts/connect/status
 * Retrieves the Stripe Connect account status for an operator
 * Requires OPERATOR role
 */
export async function GET(request: NextRequest) {
  try {
    const { session, error } = await requireAnyRole(["OPERATOR"] as any, { forbiddenMessage: "Only operators can access payout features" });
    if (error) return error;

    const operator = await prisma.operator.findUnique({
      where: { userId: session!.user!.id! },
      include: { user: true }
    });
    if (!operator) return NextResponse.json({ error: "Operator record not found" }, { status: 404 });

    const preferences = (operator.user.preferences as any) || {};
    const accountId = (preferences as any).stripeConnectAccountId as string | undefined;

    if (!accountId) {
      return NextResponse.json({
        connected: false,
        detailsSubmitted: false,
        chargesEnabled: false,
        payoutsEnabled: false,
      });
    }

    const account = await stripe.accounts.retrieve(accountId);

    return NextResponse.json({
      connected: true,
      detailsSubmitted: account.details_submitted,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
    });
  } catch (error) {
    console.error("Error retrieving Connect account status:", error);
    return NextResponse.json({ error: "Failed to retrieve Connect account status" }, { status: 500 });
  }
}