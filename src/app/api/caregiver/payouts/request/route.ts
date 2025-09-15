import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { z } from "zod";

// Validate payout request
const payoutRequestSchema = z.object({
  amount: z.number().positive("Amount must be positive"),
  currency: z.string().default("usd"),
  description: z.string().optional(),
});

/**
 * POST /api/caregiver/payouts/request
 * 
 * Requests a payout to a caregiver's Stripe Connect account
 * Requires authentication, CAREGIVER role, and a connected Stripe account
 */
export async function POST(request: NextRequest) {
  try {
    // Get session and verify authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify user has CAREGIVER role
    if (session.user.role !== "CAREGIVER") {
      return NextResponse.json({ error: "Only caregivers can request payouts" }, { status: 403 });
    }

    // Parse request body
    const body = await request.json().catch(() => ({}));
    
    // Validate input
    const validationResult = payoutRequestSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validationResult.error.format() },
        { status: 400 }
      );
    }

    const { amount, currency, description } = validationResult.data;

    // Find caregiver record for current user
    const caregiver = await prisma.caregiver.findUnique({
      where: { userId: session.user.id },
      include: { user: true }
    });

    if (!caregiver) {
      return NextResponse.json({ error: "Caregiver record not found" }, { status: 404 });
    }

    // Get current user preferences (or initialize empty object)
    const preferences = (caregiver.user.preferences as any) || {};
    
    // Check if user has a Connect account ID
    const accountId = (preferences as any).stripeConnectAccountId as string | undefined;
    
    // If no account exists, return error
    if (!accountId) {
      return NextResponse.json(
        { error: "No connected Stripe account found. Please complete onboarding first." },
        { status: 400 }
      );
    }
    
    // Retrieve the account from Stripe to check status
    const account = await stripe.accounts.retrieve(accountId);
    
    // Check if payouts are enabled
    if (!account.payouts_enabled) {
      return NextResponse.json(
        { error: "Payouts are not enabled for your account. Please complete account verification." },
        { status: 400 }
      );
    }
    
    // Convert amount from dollars to cents for Stripe
    const amountInCents = Math.round(amount * 100);
    
    // Create a transfer to the connected account
    const transfer = await stripe.transfers.create({
      amount: amountInCents,
      currency,
      destination: accountId,
      metadata: {
        caregiverId: caregiver.id,
        userId: session.user.id,
      },
      description: description || `Payout to ${session.user.name}`,
    });
    
    // Create payment record
    await prisma.payment.create({
      data: {
        userId: session.user.id,
        amount,
        type: "CAREGIVER_PAYMENT",
        status: "PROCESSING",
        stripePaymentId: transfer.id,
        description: description || "Caregiver payout",
      }
    });
    
    // Return the transfer ID
    return NextResponse.json({
      transferId: transfer.id,
    });
    
  } catch (error) {
    console.error("Error processing payout request:", error);
    return NextResponse.json(
      { error: "Failed to process payout request" },
      { status: 500 }
    );
  }
}
