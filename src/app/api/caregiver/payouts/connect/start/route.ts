import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";

/**
 * POST /api/caregiver/payouts/connect/start
 * 
 * Creates a Stripe Connect account for a caregiver if one doesn't exist
 * Returns an account onboarding link
 * Requires authentication and CAREGIVER role
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
    
    // Check if user already has a Connect account ID
    let accountId = (preferences as any).stripeConnectAccountId as string | undefined;
    
    // If no account exists, create one
    if (!accountId) {
      // Create a Stripe Connect Express account
      const account = await stripe.accounts.create({
        type: 'express',
        country: 'US',
        email: session.user.email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_type: 'individual',
        business_profile: {
          mcc: '8050', // Healthcare services
          product_description: 'Caregiving services',
        },
        metadata: {
          userId: session.user.id,
          caregiverId: caregiver.id,
        },
      });
      
      // Store the account ID in user preferences
      accountId = account.id;
      
      // Update user preferences
      await prisma.user.update({
        where: { id: session.user.id },
        data: {
          preferences: {
            ...preferences,
            stripeConnectAccountId: accountId,
          },
        },
      });
    }
    
    // Get the app URL from environment or default to localhost
    const appUrl = process.env['APP_URL'] || 'http://localhost:3000';
    
    // Create an account link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${appUrl}/settings/payouts?refresh=true`,
      return_url: `${appUrl}/settings/payouts?success=true`,
      type: 'account_onboarding',
    });
    
    // Return the onboarding URL
    return NextResponse.json({
      url: accountLink.url,
    });
    
  } catch (error) {
    console.error("Error creating Connect account:", error);
    return NextResponse.json(
      { error: "Failed to create Connect account" },
      { status: 500 }
    );
  }
}
