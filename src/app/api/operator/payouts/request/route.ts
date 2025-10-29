import { NextRequest, NextResponse } from "next/server";
import { requireAnyRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { z } from "zod";

const requestSchema = z.object({
  amount: z.number().positive("Amount must be positive"),
  description: z.string().optional(),
});

/**
 * POST /api/operator/payouts/request
 * Request a payout to the operator's connected Stripe account
 * Requires OPERATOR role
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

    const transfer = await stripe.transfers.create({
      amount: Math.round(amount * 100),
      currency: 'usd',
      destination: accountId,
      metadata: {
        userId: session!.user!.id!,
        operatorId: operator.id,
        description: description || 'Operator payout',
      },
    });
    const transferStatus = (transfer as any).status ?? "pending";

    return NextResponse.json({ transferId: transfer.id, amount, status: transferStatus });
  } catch (error) {
    console.error("Error processing payout request:", error);
    return NextResponse.json({ error: "Failed to process payout request" }, { status: 500 });
  }
}