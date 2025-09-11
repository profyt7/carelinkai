import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";

/**
 * GET /api/operator/payouts/connect/status
 * 
 * Retrieves the Stripe Connect account status for an operator
 * Requires authentication and OPERATOR role
 */
export async function GET(request: NextRequest) {
  try {
    // Get session and verify authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify user has OPERATOR role
    if (session.user.role !== "OPERATOR") {
      return NextResponse.json({ error: "Only operators can access payout features" }, { status: 403 });
    }

    // Find operator record for current user
    const operator = await prisma.operator.findUnique({
      where: { userId: session.user.id },
      include: { user: true }
    });

    if (!operator) {
      return NextResponse.json({ error: "Operator record not found" }, { status: 404 });
    }

    // Get current user preferences (or initialize empty object)
    const preferences = operator.user.preferences || {};
    
    // Check if user has a Connect account ID
    const accountId = preferences.stripeConnectAccountId;
    
    // If no account exists, return default status
    if (!accountId) {
      return NextResponse.json({
        connected: false,
        detailsSubmitted: false,
        chargesEnabled: false,
        payoutsEnabled: false,
      });
    }
    
    // Retrieve the Connect account from Stripe
    const account = await stripe.accounts.retrieve(accountId);
    
    // Return the account status
    return NextResponse.json({
      connected: true,
      detailsSubmitted: account.details_submitted,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
    });
    
  } catch (error) {
    console.error("Error retrieving Connect account status:", error);
    return NextResponse.json(
      { error: "Failed to retrieve Connect account status" },
      { status: 500 }
    );
  }
}
