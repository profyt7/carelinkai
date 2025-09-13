import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { checkFamilyMembership } from "@/lib/services/family";
import { z } from "zod";

// Validate request body
const depositSchema = z.object({
  amountCents: z.number().int().min(100).positive(),
  familyId: z.string().cuid().optional(),
});

/**
 * POST /api/billing/deposit
 * 
 * Creates a Stripe PaymentIntent for funding the family wallet
 * Requires authentication and family membership
 */
export async function POST(request: NextRequest) {
  try {
    // Get session and verify authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validationResult = depositSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: "Invalid request parameters", 
          details: validationResult.error.format() 
        },
        { status: 400 }
      );
    }

    const { amountCents, familyId: providedFamilyId } = validationResult.data;

    // Determine effective familyId
    let effectiveFamilyId = providedFamilyId;
    
    if (!effectiveFamilyId) {
      // Find the first family membership for the user
      const membership = await prisma.familyMember.findFirst({
        where: { userId: session.user.id },
        select: { familyId: true }
      });
      
      if (!membership) {
        return NextResponse.json(
          { error: "No family found for user" },
          { status: 404 }
        );
      }
      
      effectiveFamilyId = membership.familyId;
    }

    // Check if user is a member of the family
    const isMember = await checkFamilyMembership(
      session.user.id,
      effectiveFamilyId
    );
    
    if (!isMember) {
      return NextResponse.json(
        { error: "Not a member of this family" },
        { status: 403 }
      );
    }

    // Find or create wallet for the family
    let wallet = await prisma.familyWallet.findUnique({
      where: { familyId: effectiveFamilyId }
    });

    if (!wallet) {
      // Create a new wallet with default balance of 0
      wallet = await prisma.familyWallet.create({
        data: {
          familyId: effectiveFamilyId,
          balance: 0
        }
      });
    }

    // Handle development environment without Stripe keys
    if (
      process.env.NODE_ENV !== "production" &&
      !process.env["STRIPE_SECRET_KEY"]
    ) {
      console.log('Using mock Stripe response in development');
      return NextResponse.json({
        clientSecret: null,
        mock: true,
        mockAmount: amountCents / 100,
        mockWalletId: wallet.id
      });
    }

    // Ensure Stripe customer exists
    let customerId = wallet.stripeCustomerId;
    
    if (!customerId) {
      // Get user details for creating customer
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { email: true, firstName: true, lastName: true }
      });
      
      if (!user || !user.email) {
        return NextResponse.json(
          { error: "User information incomplete" },
          { status: 500 }
        );
      }

      // Check if customer already exists with this email
      const customerSearch = await stripe.customers.search({
        query: `email:'${user.email}'`,
        limit: 1
      });

      if (customerSearch.data.length > 0) {
        // Use existing customer (non-null assertion since length > 0)
        customerId = customerSearch.data[0]!.id;
      } else {
        // Create new customer
        const customer = await stripe.customers.create({
          email: user.email,
          name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
          metadata: {
            userId: session.user.id,
            familyId: effectiveFamilyId
          }
        });
        customerId = customer.id;
      }

      // Save customer ID to wallet
      await prisma.familyWallet.update({
        where: { id: wallet.id },
        data: { stripeCustomerId: customerId }
      });
    }

    // Create PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: 'usd',
      customer: customerId,
      automatic_payment_methods: { enabled: true },
      metadata: {
        walletId: wallet.id,
        familyId: effectiveFamilyId,
        userId: session.user.id,
        type: 'wallet_deposit'
      }
    });

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret
    });

  } catch (error) {
    console.error("Error creating payment intent:", error);
    return NextResponse.json(
      { error: "Failed to create payment intent" },
      { status: 500 }
    );
  }
}
