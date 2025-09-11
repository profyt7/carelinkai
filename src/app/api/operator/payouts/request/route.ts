import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { z } from "zod";

// Validate request body schema
const requestSchema = z.object({
  amount: z.number().positive("Amount must be positive"),
  description: z.string().optional(),
});

/**
 * POST /api/operator/payouts/request
 * 
 * Request a payout to the operator's connected Stripe account
 * Requires authentication and OPERATOR role
 */
export async function POST(request: NextRequest) {
  try {
    // Get session and verify authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify user has OPERATOR role
    if (session.user.role !== "OPERATOR") {
      return NextResponse.json({ error: "Only operators can request payouts" }, { status: 403 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validationResult = requestSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid request data", details: validationResult.error.format() },
        { status: 400 }
      );
    }
    
    const { amount, description } = validationResult.data;

    // Find operator record for current user
    const operator = await prisma.operator.findUnique({
      where: { userId: session.user.id },
      include: { user: true }
    });

    if (!operator) {
      return NextResponse.json({ error: "Operator record not found" }, { status: 404 });
    }

    // Get current user preferences
    const preferences = operator.user.preferences || {};
    
    // Check if user has a Connect account ID
    const accountId = preferences.stripeConnectAccountId;
    
    if (!accountId) {
      return NextResponse.json(
        { error: "No connected account found. Please complete onboarding first." },
        { status: 400 }
      );
    }
    
    // Retrieve the Connect account to verify status
    const account = await stripe.accounts.retrieve(accountId);
    
    // Check if payouts are enabled
    if (!account.payouts_enabled) {
      return NextResponse.json(
        { error: "Payouts are not enabled for your account. Please complete account verification." },
        { status: 400 }
      );
    }
    
    // Create a transfer to the connected account
    // Convert dollar amount to cents for Stripe
    const transfer = await stripe.transfers.create({
      amount: Math.round(amount * 100),
      currency: 'usd',
      destination: accountId,
      metadata: {
        userId: session.user.id,
        operatorId: operator.id,
        description: description || 'Operator payout',
      },
    });
    
    // Return the transfer ID
    return NextResponse.json({
      transferId: transfer.id,
      amount: amount,
      status: transfer.status,
    });
    
  } catch (error) {
    console.error("Error processing payout request:", error);
    return NextResponse.json(
      { error: "Failed to process payout request" },
      { status: 500 }
    );
  }
}
