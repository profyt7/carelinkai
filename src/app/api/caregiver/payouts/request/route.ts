import { NextRequest, NextResponse } from "next/server";
import { requireAnyRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { z } from "zod";

const payoutRequestSchema = z.object({
  amount: z.number().positive("Amount must be positive"),
  currency: z.string().default("usd"),
  description: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const { session, error } = await requireAnyRole(["CAREGIVER"] as any, { forbiddenMessage: "Only caregivers can request payouts" });
    if (error) return error;

    const body = await request.json().catch(() => ({}));
    const validationResult = payoutRequestSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json({ error: "Invalid input", details: validationResult.error.format() }, { status: 400 });
    }

    const { amount, currency, description } = validationResult.data;

    const caregiver = await prisma.caregiver.findUnique({ where: { userId: session!.user!.id! }, include: { user: true } });
    if (!caregiver) return NextResponse.json({ error: "Caregiver record not found" }, { status: 404 });

    const preferences = (caregiver.user.preferences as any) || {};
    const accountId = (preferences as any).stripeConnectAccountId as string | undefined;
    if (!accountId) return NextResponse.json({ error: "No connected Stripe account found. Please complete onboarding first." }, { status: 400 });

    const account = await stripe.accounts.retrieve(accountId);
    if (!account.payouts_enabled) {
      return NextResponse.json({ error: "Payouts are not enabled for your account. Please complete account verification." }, { status: 400 });
    }

    const amountInCents = Math.round(amount * 100);
    const transfer = await stripe.transfers.create({
      amount: amountInCents,
      currency,
      destination: accountId,
      metadata: { caregiverId: caregiver.id, userId: session!.user!.id! },
      description: description || `Payout to ${session!.user!.name}`,
    });

    await prisma.payment.create({
      data: {
        userId: session!.user!.id!,
        amount,
        type: "CAREGIVER_PAYMENT",
        status: "PROCESSING",
        stripePaymentId: transfer.id,
        description: description || "Caregiver payout",
      }
    });

    return NextResponse.json({ transferId: transfer.id });
  } catch (error) {
    console.error("Error processing payout request:", error);
    return NextResponse.json({ error: "Failed to process payout request" }, { status: 500 });
  }
}