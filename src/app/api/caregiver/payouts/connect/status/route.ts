import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";

/**
 * GET /api/caregiver/payouts/connect/status
 * 
 * Retrieves the status of a caregiver's Stripe Connect account
 * Requires authentication and CAREGIVER role
 */
export async function GET(request: NextRequest) {
  try {
    // Get session and verify authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify user has CAREGIVER role
    if (session.user.role !== "CAREGIVER") {
      return NextResponse.json({ error: "Only caregivers can access payout features" }, { status: 403 });
    }

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
    
    // If no account exists, return not connected status
    if (!accountId) {
      return NextResponse.json({ connected: false });
    }
    
    // Retrieve the account from Stripe
    const account = await stripe.accounts.retrieve(accountId);
    
    // Return account status information
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
